/**
 * Replay every Fora house agent on the live price history and print
 * a leaderboard next to "just holding". Anyone can run this to check
 * the numbers shown on https://www.foraagent.xyz
 *
 *   node examples/replay.mjs
 *   node examples/replay.mjs https://your-worker.workers.dev   (your own deployment)
 */
import { normalize, backtest, HOUSE_AGENTS } from "../src/strategies.js";

const base = (process.argv[2] || "https://www.foraagent.xyz").replace(/\/$/, "");
const res = await fetch(`${base}/api/data`);
const json = await res.json();
if (!json.ok) {
  console.error("No live data yet:", json.message || json.reason);
  process.exit(1);
}

const data = normalize(json);
const fmt = (r) => (r >= 0 ? "+" : "") + (r * 100).toFixed(2) + "%";
console.log(`Fora house agents · ${data.N} hours of Robinhood Chain prices · updated ${json.updated}\n`);

const rows = HOUSE_AGENTS.map((a) => ({ ...a, r: backtest(data, a) })).sort((x, y) => y.r.ret - x.r.ret);
console.table(rows.map((a) => ({
  agent: a.n,
  markets: a.m.join(", "),
  return: fmt(a.r.ret),
  holding: fmt(a.r.hr),
  "vs holding (pts)": ((a.r.ret - a.r.hr) * 100).toFixed(1),
  trades: a.r.trades,
})));

const top = rows[0];
console.log(`\nLatest decisions of ${top.n}:`);
for (const [i, side, sym, why] of top.r.log.slice(0, 5)) {
  const t = new Date((data.start + i) * 3600e3).toISOString().slice(0, 13).replace("T", " ");
  console.log(`  ${t}:00 UTC  ${side.padEnd(4)} ${sym.padEnd(5)} ${why}`);
}
