/**
 * Fora API worker (Cloudflare Workers).
 *
 *   GET /api/data   hourly price history for every market (JSON)
 *   GET /health     status: KV bound, last update, hours collected
 *   cron            refreshes prices every hour
 *
 * The public website at https://www.foraagent.xyz runs on this same data layer.
 */
import { apiData, loadHist, update, JSON_HEADERS } from "./data.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }
    if (url.pathname === "/api/data") {
      try {
        return await apiData(request, env, ctx);
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, reason: "error", message: String((e && e.message) || e) }), { status: 500, headers: JSON_HEADERS });
      }
    }
    if (url.pathname === "/health" || url.pathname === "/") {
      const kv = !!env.FORA_KV;
      let updated = null, hours = 0;
      if (kv) {
        const h = await loadHist(env);
        updated = h.updated;
        hours = h.start === null ? 0 : Math.max(0, ...Object.values(h.series).map((a) => a.length));
      }
      return new Response(JSON.stringify({ ok: true, app: "fora", kv, updated, hours, routes: ["/api/data", "/health"] }), { headers: JSON_HEADERS });
    }
    return new Response("Not found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    if (!env.FORA_KV) return;
    ctx.waitUntil(update(env));
  },
};
