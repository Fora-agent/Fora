# Fora

**Trading agents you can actually check.**

Fora turns trading ideas into agents for tokenized stocks on Robinhood Chain. You write the rules, the agent trades every hour, and every decision is written down in plain words. The AI can only say no.

- App: [foraagent.xyz](https://www.foraagent.xyz)
- X: [@fora_agent](https://x.com/fora_agent)

This repository contains the core of Fora: the **data layer** that collects real Robinhood Chain prices, and the **strategy engine** that every agent runs. It is the same code behind the numbers on the website, so anyone can replay the agents and check the results.

---

## How an agent works

Every hour, every agent runs the same six steps, in the same order:

1. **Read prices** from the main Uniswap pool of each token on Robinhood Chain
2. **Run the rules**: buy, sell or wait, how much, and when to exit
3. **AI check** (optional): can veto a signal, never sizes a trade or skips a stop loss
4. **Paper trade** at that hour's price, with virtual money and a 0.5% cost per trade
5. **Say why**, in plain words. Holding counts too
6. **Keep the record**, hour by hour, next to simply holding the same tokens

### Strategies

| Strategy | Buys when | Sells when |
|---|---|---|
| Momentum (`mom`) | Up more than 3% in 24h and above its 24h average | Price drops below its 24h average, or stop loss |
| Mean reversion (`mr`) | Unusual drop: z score below −2 vs its 24h average | Price is back above its 24h average, or stop loss |

Every agent also has a stop loss and a maximum position size, and waits 12 hours before re-entering a market it just sold.

### House agents

| Agent | Strategy | Markets |
|---|---|---|
| Chip Breakout | Momentum | NVDA, MU, TSM |
| Big Tech Dips | Mean reversion | GOOGL, META, NVDA |
| Index Dip Buyer | Mean reversion | SPY, QQQ |
| Meme Rebound | Mean reversion | GME, AMC |
| Palantir Trend | Momentum | PLTR |
| ETH Trend | Momentum | WETH |
| Crypto Stocks Dip | Mean reversion | MSTR, CRCL |
| Gold & Oil Dip | Mean reversion | GLD, USO |

---

## Markets and data

Fora tracks 20 stock and ETF tokens plus ETH on Robinhood Chain (chain ID 4663). Prices come from [DexPaprika](https://dexpaprika.com), which indexes the Uniswap pools on the chain. Every token and pool address is listed in [`src/markets.js`](src/markets.js) and can be checked on the [Robinhood Chain explorer](https://robinhoodchain.blockscout.com).

The worker refreshes prices every hour, backfills recent history from each pool, and keeps up to 31 days of hourly prices in Cloudflare KV.

---

## Repository

```
src/
  markets.js      tokens and pools tracked on Robinhood Chain
  data.js         price collection, history backfill, KV storage
  strategies.js   the strategy engine and house agents
  worker.js       Cloudflare Worker: /api/data, /health, hourly cron
examples/
  replay.mjs      replay every house agent on live data
test/
  strategies.test.mjs
```

The web app at foraagent.xyz is built on top of this core and is not part of this repository.

---

## Check the numbers yourself

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/<your-account>/fora.git
cd fora
node examples/replay.mjs
```

This downloads the live price history from foraagent.xyz, replays all eight house agents with the exact rules above, and prints a leaderboard with each agent's return next to just holding, plus the latest decisions.

Run the tests:

```bash
npm test
```

---

## Run your own copy

1. Install dependencies: `npm install`
2. Create a KV namespace: `npx wrangler kv namespace create FORA_KV`, then paste the id into `wrangler.toml`
3. Optional: add a free DexPaprika key for 7 days of backfill: `npx wrangler secret put DEXPAPRIKA_KEY`
4. Deploy: `npm run deploy`

### API

| Route | Returns |
|---|---|
| `GET /api/data` | hourly price history for every market, aligned by hour |
| `GET /health` | KV status, last update and hours collected |

---

## Notes

- Agents trade virtual money at real prices. No funds move.
- Results depend on the price history collected so far and change every hour.

## License

[MIT](LICENSE)
