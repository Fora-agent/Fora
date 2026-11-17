/**
 * Fora data layer.
 * Collects hourly prices for every market from DexPaprika (Uniswap pools on
 * Robinhood Chain), backfills recent history, and keeps up to ~31 days in
 * Cloudflare KV. No API key is required; an optional free key gives 7 days
 * of backfill instead of 24 hours.
 */
import { MARKETS } from "./markets.js";

const API = "https://api.dexpaprika.com";
const NET = "robinhood";
const KV_KEY = "fora_hist_v1";
const MAX_HOURS = 24 * 31;           // keep ~31 days of hourly prices
const SEED_PER_RUN = 5;              // OHLCV backfill calls per run (stays under 15 req/min)
const MIN_GAP_MS = 50 * 60 * 1000;   // normal refresh interval (hourly cron + visitor fallback)
const SEED_GAP_MS = 90 * 1000;       // faster refresh while history is still being backfilled

const hourOf = (ms) => Math.floor(ms / 3600000);
const rnd = (p) => Number(Number(p).toPrecision(6));

async function dp(env, path) {
  const base = { accept: "application/json", "user-agent": "fora-worker/1.0" };
  const key = env.DEXPAPRIKA_KEY;
  let r = await fetch(API + path, { headers: key ? { ...base, authorization: key } : base });
  if (key && (r.status === 401 || r.status === 403) && !path.includes("/ohlcv")) {
    r = await fetch(API + path, { headers: base }); // bad key: fall back to keyless
  }
  if (!r.ok) throw new Error(`DexPaprika ${r.status} on ${path.split("?")[0]}`);
  return r.json();
}

function emptyHist() {
  return { v: 1, start: null, series: {}, seeded: {}, inv: {}, updated: null, lastRun: 0, errors: [] };
}

export async function loadHist(env) {
  const raw = await env.FORA_KV.get(KV_KEY);
  if (!raw) return emptyHist();
  try { return Object.assign(emptyHist(), JSON.parse(raw)); } catch { return emptyHist(); }
}

function setPoint(h, sym, hour, price, overwrite) {
  if (!(price > 0)) return;
  if (h.start === null) h.start = hour;
  if (hour < h.start) {
    const d = h.start - hour;
    for (const s in h.series) h.series[s] = new Array(d).fill(null).concat(h.series[s]);
    h.start = hour;
  }
  const arr = h.series[sym] || (h.series[sym] = []);
  const idx = hour - h.start;
  while (arr.length <= idx) arr.push(null);
  if (overwrite || arr[idx] == null) arr[idx] = rnd(price);
}

function align(h) {
  const lens = Object.values(h.series).map((a) => a.length);
  const end = lens.length ? Math.max(...lens) : 0;
  for (const s in h.series) { const a = h.series[s]; while (a.length < end) a.push(null); }
  if (end > MAX_HOURS) {
    const cut = end - MAX_HOURS;
    for (const s in h.series) h.series[s] = h.series[s].slice(cut);
    h.start += cut;
  }
}

const lastVal = (h, s) => { const a = h.series[s] || []; for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i]; return null; };
const seedTarget = (env) => (env.DEXPAPRIKA_KEY ? "7d" : "24h");
const fullySeeded = (h, env) => MARKETS.every((m) => h.seeded[m[0]] === "7d" || h.seeded[m[0]] === seedTarget(env));

export async function update(env) {
  const h = await loadHist(env);
  const now = Date.now();
  const hour = hourOf(now);
  const errors = [];

  // 1) Current price of every market: 3 batched calls (10 tokens max per call)
  for (let i = 0; i < MARKETS.length; i += 10) {
    const batch = MARKETS.slice(i, i + 10);
    try {
      const arr = await dp(env, `/networks/${NET}/multi/prices?tokens=${batch.map((m) => m[2]).join(",")}`);
      for (const x of arr || []) {
        const m = MARKETS.find((m) => m[2] === String(x.id).toLowerCase());
        if (m) setPoint(h, m[0], hour, x.price_usd, true);
      }
    } catch (e) { errors.push(String(e.message || e)); }
  }

  // 2) Backfill hourly history from each main pool (a few per run)
  const target = seedTarget(env);
  const depth = target === "7d" ? { start: "-7d", limit: 168 } : { start: "-24h", limit: 24 };
  let calls = 0;
  for (const m of MARKETS) {
    if (calls >= SEED_PER_RUN) break;
    const done = h.seeded[m[0]];
    if (done === "7d" || done === target) continue;
    calls++;
    try {
      let inv = h.inv[m[0]] ?? !!m[4];
      const url = (iv) => `/networks/${NET}/pools/${m[3]}/ohlcv?start=${depth.start}&interval=1h&limit=${depth.limit}&inversed=${iv}`;
      let c = await dp(env, url(inv));
      const cur = lastVal(h, m[0]);
      if (Array.isArray(c) && c.length && cur && Math.abs(c[c.length - 1].close / cur - 1) > 0.15) {
        inv = !inv; calls++; // wrong side of the pool: flip once
        c = await dp(env, url(inv));
      }
      h.inv[m[0]] = inv;
      if (Array.isArray(c)) {
        for (const k of c) {
          const hh = hourOf(Date.parse(k.time_open));
          if (hh < hour) setPoint(h, m[0], hh, k.close, false);
        }
      }
      h.seeded[m[0]] = target;
    } catch (e) {
      const msg = String(e.message || e);
      errors.push(msg);
      if (msg.includes(" 403 ")) h.seeded[m[0]] = target; // history window not allowed on this plan: skip
    }
  }

  align(h);
  h.updated = new Date(now).toISOString();
  h.lastRun = now;
  h.errors = errors.slice(0, 6);
  await env.FORA_KV.put(KV_KEY, JSON.stringify(h));
  return h;
}

export function publicPayload(h, env) {
  return {
    ok: true,
    source: "DexPaprika · Uniswap pools on Robinhood Chain",
    updated: h.updated,
    start: h.start,
    hours: h.start === null ? 0 : Math.max(0, ...Object.values(h.series).map((a) => a.length)),
    backfilling: !fullySeeded(h, env),
    markets: MARKETS.map((m) => ({ s: m[0], name: m[1], token: m[2], pool: m[3] })),
    series: h.series,
    errors: h.errors,
  };
}

export const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" };

export async function apiData(request, env, ctx) {
  if (!env.FORA_KV) {
    return new Response(JSON.stringify({ ok: false, reason: "no_kv", message: "Bind a KV namespace as FORA_KV to enable live data." }), { headers: JSON_HEADERS });
  }
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/data?v=1", request.url).toString(), { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let h = await loadHist(env);
  const age = Date.now() - (h.lastRun || 0);
  const seeding = !fullySeeded(h, env);
  if (h.start === null) {
    try { h = await update(env); } catch (e) { h.errors = [String(e.message || e)]; }
  } else if (age > MIN_GAP_MS || (seeding && age > SEED_GAP_MS)) {
    ctx.waitUntil(update(env).catch(() => {}));
  }
  const ttl = seeding ? 60 : 300;
  const res = new Response(JSON.stringify(publicPayload(h, env)), {
    headers: { ...JSON_HEADERS, "cache-control": `public, max-age=${ttl}` },
  });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
