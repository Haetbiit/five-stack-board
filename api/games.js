// Match history: keeps each player's recent ranked games (Solo/Duo and Flex) on the player, so the board can show
// what they actually play and how it goes.
// POST /api/games  { ids?: string[], force?: boolean }   needs the x-team-code header
// Games are fetched in small batches: each call loads at most MATCH_BUDGET new games and reports how many are still
// pending, so a development key (100 requests per 2 minutes) can fill everyone in over a few calls.
import { redis, codeMatches, KEY, TEAM_CODE, storeConfigured, resetConnection } from "./_lib/store.js";
import { RIOT_KEY, routing, puuidFor, rankedMatchIds, gameFor, inBatches, riotFailure } from "./_lib/riot.js";

const WINDOW = 30;         // games kept per player
const MATCH_BUDGET = 30;   // new games fetched per call, across all players
const FRESH_MS = 10 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed." }); }
  if (!storeConfigured()) return res.status(503).json({ error: "The board's database isn't connected yet." });
  if (!TEAM_CODE || !codeMatches(req.headers["x-team-code"])) return res.status(401).json({ error: "That team code isn't right." });
  if (!RIOT_KEY) return res.status(503).json({ code: "no_key", error: "Match history needs RIOT_API_KEY in the Vercel project settings." });

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
  const force = !!body.force;

  try {
    const flat = (await redis([["HGETALL", KEY + "players"]]))[0] || [];
    const players = [];
    for (let i = 0; i < flat.length; i += 2) { try { players.push({ id: flat[i], data: JSON.parse(flat[i + 1]) }); } catch {} }
    const wanted = Array.isArray(body.ids) && body.ids.length ? new Set(body.ids.map(String)) : null;
    const now = Date.now();
    const todo = players.filter((p) => p.data.ign && !p.data.example && (!wanted || wanted.has(p.id)))
      .filter((p) => { const g = p.data.games; return force || !g || g.riotId !== p.data.ign || g.pending > 0 || !g.syncedAt || now - Date.parse(g.syncedAt) > FRESH_MS; });

    let budget = MATCH_BUDGET, stopped = null;
    const results = [], updates = new Map();
    for (const p of todo) {
      if (budget <= 0) { results.push({ id: p.id, name: p.data.name, status: "waiting" }); continue; }
      try {
        const { platform, region, accountRegion } = routing(p.data.server);
        const old = p.data.games && p.data.games.riotId === p.data.ign && p.data.games.platform === platform ? p.data.games : null;
        const ranked = p.data.ranked;
        let puuid = old && old.puuid ? old.puuid : ranked && ranked.puuid && ranked.riotId === p.data.ign && ranked.platform === platform ? ranked.puuid : null;
        if (!puuid) puuid = await puuidFor(p.data.ign, accountRegion);
        if (!puuid) { results.push({ id: p.id, name: p.data.name, status: "not_found" }); continue; }

        const ids = await rankedMatchIds(region, puuid, WINDOW);
        const seen = new Set(old ? old.seen || [] : []);
        const fresh = ids.filter((m) => !seen.has(m)).slice(0, budget);
        budget -= fresh.length;
        // If Riot cuts us off mid-batch, keep the games already loaded and stop after saving them
        let limited = null;
        const got = await inBatches(fresh, 5, async (m) => {
          if (limited) return undefined;
          try { return await gameFor(region, m, puuid); } catch (e) { if (riotFailure(e)) { limited = e; return undefined; } throw e; }
        });
        fresh.forEach((m, i) => { if (got[i] !== undefined) seen.add(m); });
        const inWindow = new Set(ids);
        const list = [...got.filter(Boolean), ...(old ? old.list || [] : [])]
          .filter((g, i, a) => inWindow.has(g[0]) && a.findIndex((x) => x[0] === g[0]) === i)
          .sort((a, b) => b[7] - a[7]);
        const keptSeen = ids.filter((m) => seen.has(m));
        const pending = ids.length - keptSeen.length;
        updates.set(p.id, { riotId: p.data.ign, platform, puuid, list, seen: keptSeen, pending, syncedAt: new Date().toISOString() });
        results.push({ id: p.id, name: p.data.name, status: "ok", added: got.filter(Boolean).length, pending });
        if (limited) { stopped = riotFailure(limited); break; }
      } catch (e) {
        const f = riotFailure(e);
        if (f) { stopped = f; break; }
        console.error("games", p.id, e.message);
        results.push({ id: p.id, name: p.data.name, status: "error" });
      }
    }

    if (updates.size) {
      // Re-read the players just before writing so edits made during the sync aren't lost
      const ids = [...updates.keys()];
      const latest = await redis(ids.map((id) => ["HGET", KEY + "players", id]));
      const writes = [];
      ids.forEach((id, i) => { let d; try { d = JSON.parse(latest[i]); } catch { return; } if (d) writes.push(["HSET", KEY + "players", id, JSON.stringify({ ...d, games: updates.get(id) })]); });
      if (writes.length) await redis([...writes, ["INCR", KEY + "version"]]);
    }
    const pending = results.reduce((n, r) => n + (r.pending || 0), 0) + results.filter((r) => r.status === "waiting").length;
    if (stopped && !results.length) return res.status(stopped.status).json({ error: stopped.error, retryAfter: stopped.retryAfter || 0 });
    return res.status(200).json({ ok: true, results, pending, warning: stopped ? stopped.error : null });
  } catch (e) {
    console.error(e);
    resetConnection();
    return res.status(500).json({ error: "Loading match history failed. Try again in a moment." });
  }
}
