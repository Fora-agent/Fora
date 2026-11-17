import { test } from "node:test";
import assert from "node:assert/strict";
import { backtest, normalize, HOUSE_AGENTS, START_CASH } from "../src/strategies.js";

// Build fake /api/data JSON from price arrays
const fake = (series) => ({
  ok: true, start: 0, hours: Math.max(...Object.values(series).map((a) => a.length)),
  markets: Object.keys(series).map((s) => ({ s, name: s })), series,
});
const flat = (n, p = 100) => Array.from({ length: n }, () => p);

test("no trades on flat prices", () => {
  const r = backtest(normalize(fake({ AAA: flat(100) })), { s: "mom", m: ["AAA"], sl: 9, mp: 80 });
  assert.equal(r.trades, 0);
  assert.equal(r.ret, 0);
  assert.equal(r.log[0][1], "HOLD");
});

test("momentum buys a strong rise and records why", () => {
  const a = flat(40).concat(Array.from({ length: 30 }, (_, i) => 100 * (1 + 0.004 * (i + 1))));
  const r = backtest(normalize(fake({ AAA: a })), { s: "mom", m: ["AAA"], sl: 9, mp: 80 });
  const buy = r.log.find((l) => l[1] === "BUY");
  assert.ok(buy, "expected a BUY");
  assert.match(buy[3], /Strong trend, buying/);
});

test("stop loss always triggers", () => {
  const a = flat(30).concat([96, 90, 80, 70, 60, 60, 60]);
  const r = backtest(normalize(fake({ AAA: a })), { s: "mr", m: ["AAA"], sl: 6, mp: 100 });
  assert.ok(r.log.some((l) => /Stop loss hit/.test(l[3])), "expected a stop loss sell");
});

test("every trade pays the 0.5% cost", () => {
  const a = flat(30).concat([90, 100, 100, 100]); // dip then full rebound to the same price
  const r = backtest(normalize(fake({ AAA: a })), { s: "mr", m: ["AAA"], sl: 20, mp: 100 });
  assert.equal(r.trades, 2);
  assert.ok(r.eq.at(-1) < START_CASH * 1.12, "costs are charged");
});

test("house agents are well formed", () => {
  for (const a of HOUSE_AGENTS) {
    assert.ok(["mom", "mr"].includes(a.s));
    assert.ok(a.m.length >= 1 && a.m.length <= 3);
    assert.ok(a.sl >= 2 && a.sl <= 25);
  }
});
