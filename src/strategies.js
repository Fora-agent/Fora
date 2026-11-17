/**
 * Fora strategy engine.
 *
 * Every agent follows the same hourly loop: read prices, run its rules,
 * paper trade at that hour's price, and write down why. This file is the
 * exact rule set used by the agents on https://www.foraagent.xyz
 *
 * Rules decide. An optional AI co-pilot may only veto a signal; it never
 * sizes a trade or skips a stop loss (the co-pilot is not part of this file).
 */

export const LOOKBACK = 24;      // hours used for the average, z score and 24h change
export const COST = 0.005;       // 0.5% charged on every simulated trade (fees + slippage)
export const START_CASH = 10000; // virtual dollars per agent
const COOLDOWN = 12;             // hours to wait before re-entering a market after a sell

/** House agents that run on the public leaderboard. */
export const HOUSE_AGENTS = [
  { n: "Chip Breakout", s: "mom", m: ["NVDA", "MU", "TSM"], sl: 9, mp: 80 },
  { n: "Big Tech Dips", s: "mr", m: ["GOOGL", "META", "NVDA"], sl: 9, mp: 80 },
  { n: "Index Dip Buyer", s: "mr", m: ["SPY", "QQQ"], sl: 6, mp: 100 },
  { n: "Meme Rebound", s: "mr", m: ["GME", "AMC"], sl: 12, mp: 60 },
  { n: "Palantir Trend", s: "mom", m: ["PLTR"], sl: 9, mp: 80 },
  { n: "ETH Trend", s: "mom", m: ["WETH"], sl: 10, mp: 80 },
  { n: "Crypto Stocks Dip", s: "mr", m: ["MSTR", "CRCL"], sl: 12, mp: 70 },
  { n: "Gold & Oil Dip", s: "mr", m: ["GLD", "USO"], sl: 6, mp: 90 },
];
// s:  "mom" = momentum, "mr" = mean reversion
// m:  markets (up to 3)
// sl: stop loss in %
// mp: max % of the agent's value per position

const pct = (r) => (r >= 0 ? "+" : "−") + Math.abs(r * 100).toFixed(1) + "%";

/**
 * Turn the JSON from GET /api/data into aligned, forward-filled price arrays.
 * @returns {{syms:string[], start:number, N:number, P:Object<string,number[]>}}
 */
export function normalize(json) {
  const N = json.hours;
  const P = {};
  const syms = json.markets.map((m) => m.s).filter((s) => (json.series[s] || []).some((v) => v != null));
  for (const s of syms) {
    const a = (json.series[s] || []).slice(0, N);
    while (a.length < N) a.push(null);
    const first = a.findIndex((v) => v != null);
    let last = null;
    P[s] = a.map((v, i) => { if (v != null) last = v; return i < first ? null : last; });
  }
  return { syms, start: json.start, N, P };
}

/**
 * Replay one agent over the price data, hour by hour.
 * @param {{N:number, P:Object<string,number[]>}} data  output of normalize()
 * @param {{s:"mom"|"mr", m:string[], sl:number, mp:number}} cfg
 * @returns result with equity curve, holding curve, trades and a decision log
 */
export function backtest(data, cfg, from = 0) {
  const { N, P } = data;
  const W = LOOKBACK;
  const m = cfg.m.filter((s) => P[s]);
  const start = Math.max(W, from);
  let cash = START_CASH;
  const pos = {}, cool = {};
  let trades = 0, wins = 0, sells = 0, decisions = 0, peak = START_CASH, dd = 0;
  const eq = [], log = [];

  const ma = (a, i) => { let s = 0; for (let j = i - W + 1; j <= i; j++) s += a[j]; return s / W; };
  const sd = (a, i, mu) => { let s = 0; for (let j = i - W + 1; j <= i; j++) s += (a[j] - mu) ** 2; return Math.sqrt(s / W); };
  const value = (i) => Object.keys(pos).reduce((s, k) => s + pos[k].q * P[k][i], cash);

  for (let i = start; i < N; i++) {
    for (const t of m) {
      const a = P[t];
      if (a[i - W] == null || a[i] == null) continue;
      decisions++;
      const p = a[i], avg = ma(a, i), ch = p / a[i - W] - 1, z = (p - avg) / (sd(a, i, avg) || 1e-9);
      const ps = pos[t];

      if (ps) {
        // In a position: check the exit rules
        const g = p / ps.e - 1;
        let why = null;
        if (g <= -cfg.sl / 100) why = `Stop loss hit: ${(g * 100).toFixed(1)}% below entry. Selling.`;
        else if (cfg.s === "mr" && p >= avg) why = `Price is back above its 24h average (z ${z.toFixed(2)}). Taking the rebound.`;
        else if (cfg.s === "mom" && p < avg * 0.995) why = `Trend broke: price $${p.toFixed(2)} below 24h average $${avg.toFixed(2)}. Selling.`;
        if (why) {
          cash += ps.q * p * (1 - COST);
          trades++; sells++;
          if (p * (1 - COST) > ps.e * (1 + COST)) wins++;
          log.push([i, "SELL", t, why]);
          delete pos[t];
          cool[t] = i;
        }
      } else if (!(cool[t] && i - cool[t] < COOLDOWN)) {
        // Flat: check the entry rules
        let why = null;
        if (cfg.s === "mr" && z < -2) why = `Unusual drop: z ${z.toFixed(2)} below −2 vs the 24h average. Buying the dip.`;
        if (cfg.s === "mom" && ch > 0.03 && p > avg) why = `Up ${pct(ch)} in 24h and above the 24h average. Strong trend, buying.`;
        if (why) {
          const amt = Math.min(cash, (value(i) * cfg.mp) / 100);
          if (amt > 50) {
            pos[t] = { q: (amt * (1 - COST)) / p, e: p };
            cash -= amt;
            trades++;
            log.push([i, "BUY", t, why]);
          }
        }
      }
    }
    const v = value(i);
    eq.push(v);
    peak = Math.max(peak, v);
    dd = Math.min(dd, v / peak - 1);
  }

  // Benchmark: split the same cash equally across the same markets and hold
  const hold = [];
  for (let i = start; i < N; i++) {
    let v = 0, k = 0;
    for (const t of m) {
      const a = P[t];
      const b = a[start] ?? a.find((x) => x != null);
      if (b && a[i]) { v += ((START_CASH / m.length) * a[i]) / b; k++; }
    }
    hold.push(k ? (v * m.length) / k : START_CASH);
  }

  // Latest hour: if nothing happened, record why the agent waited
  const last = N - 1;
  if (N > start) {
    const t = m[0], a = P[t];
    if (a && a[last] != null && a[last - W] != null) {
      const avg = ma(a, last);
      if (!log.length || log[log.length - 1][0] < last) {
        log.push([last, "HOLD", t, pos[t]
          ? `Holding. Price $${a[last].toFixed(2)} is still on the right side of its 24h average $${avg.toFixed(2)}.`
          : `Waiting. No rule triggered this hour at $${a[last].toFixed(2)} (24h average $${avg.toFixed(2)}).`]);
      }
    }
  }

  const ret = eq.length ? eq[eq.length - 1] / START_CASH - 1 : 0;
  const hr = hold.length ? hold[hold.length - 1] / START_CASH - 1 : 0;
  return { eq, hold, start, trades, wins, sells, dd, decisions, log: log.reverse(), ret, hr, ready: N > start + 1 };
}
