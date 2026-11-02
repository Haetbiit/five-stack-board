// Opponent scouting: looks up the other team's Riot IDs and returns each player's rank, main role and most-played
// champions from their recent ranked games. Nothing is stored here; the page saves the report with the scouting notes.
// POST /api/scout  { riotIds: string[], server?: string }   needs the x-team-code header
import { codeMatches, TEAM_CODE, storeConfigured } from "./_lib/store.js";
import { RIOT_KEY, riot, routing, puuidFor, rankedMatchIds, gameFor, inBatches, riotFailure, splitRiotId } from "./_lib/riot.js";

const MAX_IDS = 6;
const GAMES_EACH = 10; // about 13 Riot calls per player, so a full team fits a development key's 2-minute limit
const APEX = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed." }); }
  if (!storeConfigured()) return res.status(503).json({ error: "The board's database isn't connected yet." });
  if (!TEAM_CODE || !codeMatches(req.headers["x-team-code"])) return res.status(401).json({ error: "That team code isn't right." });
  if (!RIOT_KEY) return res.status(503).json({ code: "no_key", error: "Scouting with Riot needs RIOT_API_KEY in the Vercel project settings." });

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
  const riotIds = [...new Set((Array.isArray(body.riotIds) ? body.riotIds : []).map((x) => String(x).trim()).filter(Boolean))].slice(0, MAX_IDS);
  if (!riotIds.length) return res.status(400).json({ error: "Add at least one Riot ID (Name#TAG)." });
  const { platform, region, accountRegion } = routing(body.server);

  const players = [];
  let stopped = null;
  for (const riotId of riotIds) {
    if (!splitRiotId(riotId)) { players.push({ riotId, error: "invalid" }); continue; }
    try {
      const puuid = await puuidFor(riotId, accountRegion);
      if (!puuid) { players.push({ riotId, error: "not_found" }); continue; }
      const entries = (await riot(platform, `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`)) || [];
      const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5") || entries.find((e) => e.queueType === "RANKED_FLEX_SR");
      const ids = await rankedMatchIds(region, puuid, GAMES_EACH);
      const games = (await inBatches(ids, 5, (m) => gameFor(region, m, puuid))).filter(Boolean);
      const champs = new Map(), roles = new Map();
      for (const g of games) {
        const c = champs.get(g[1]) || [g[1], 0, 0]; c[1]++; c[2] += g[3]; champs.set(g[1], c);
        if (g[2]) roles.set(g[2], (roles.get(g[2]) || 0) + 1);
      }
      players.push({
        riotId,
        rank: solo ? { tier: solo.tier, division: APEX.has(solo.tier) ? "" : solo.rank, lp: solo.leaguePoints, wins: solo.wins, losses: solo.losses } : null,
        role: [...roles.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "",
        games: games.length,
        wins: games.reduce((n, g) => n + g[3], 0),
        champs: [...champs.values()].sort((a, b) => b[1] - a[1] || b[2] - a[2]).slice(0, 6),
      });
    } catch (e) {
      const f = riotFailure(e);
      if (f) { stopped = f; break; }
      console.error("scout", e.message);
      players.push({ riotId, error: "error" });
    }
  }
  if (stopped && !players.length) return res.status(stopped.status).json({ error: stopped.error, retryAfter: stopped.retryAfter || 0 });
  return res.status(200).json({ ok: true, platform, players, scoutedAt: new Date().toISOString(), warning: stopped ? stopped.error : null });
}
