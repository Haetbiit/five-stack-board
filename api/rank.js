// Rank sync: looks up each player's Riot ID with the Riot API and stores their ranked data on the player.
// POST /api/rank  { ids?: string[], force?: boolean }   needs the x-team-code header
// The Riot key lives only in the RIOT_API_KEY environment variable and never reaches the browser.
import { redis, codeMatches, KEY, TEAM_CODE, storeConfigured, resetConnection } from "./_lib/store.js";

const RIOT_KEY = process.env.RIOT_API_KEY || "";
const DEFAULT_PLATFORM = (process.env.RIOT_DEFAULT_PLATFORM || "euw1").toLowerCase();
const PLATFORMS = {
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe", me1: "europe",
  na1: "americas", br1: "americas", la1: "americas", la2: "americas",
  kr: "asia", jp1: "asia",
  oc1: "sea", ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", vn2: "sea",
};
const FRESH_MS = 20 * 60 * 1000; // don't call Riot again for a player synced in the last 20 minutes
const MAX_PLAYERS = 10;
const APEX = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

class RiotError extends Error { constructor(status, retryAfter) { super(`Riot ${status}`); this.status = status; this.retryAfter = retryAfter; } }

async function riot(host, path) {
  const r = await fetch(`https://${host}.api.riotgames.com${path}`, { headers: { "X-Riot-Token": RIOT_KEY }, signal: AbortSignal.timeout(7000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new RiotError(r.status, Number(r.headers.get("retry-after")) || 0);
  return r.json();
}

function splitRiotId(ign) {
  const m = String(ign || "").trim().match(/^(.{3,16})#([A-Za-z0-9]{2,5})$/u);
  return m ? { name: m[1].trim(), tag: m[2] } : null;
}
function cap(s) { return s.charAt(0) + s.slice(1).toLowerCase(); }
function entryOut(e) { return e ? { tier: e.tier, division: APEX.has(e.tier) ? "" : e.rank, lp: e.leaguePoints, wins: e.wins, losses: e.losses, hotStreak: !!e.hotStreak } : null; }

async function syncOne(p) {
  const rid = splitRiotId(p.ign);
  if (!rid) return { status: "no_riot_id" };
  const platform = PLATFORMS[(p.server || DEFAULT_PLATFORM).toLowerCase()] ? (p.server || DEFAULT_PLATFORM).toLowerCase() : DEFAULT_PLATFORM;
  const region = PLATFORMS[platform];
  const accountRegion = region === "sea" ? "asia" : region;
  const old = p.ranked || {};
  let puuid = old.puuid && old.riotId === p.ign && old.platform === platform ? old.puuid : null;
  if (!puuid) {
    const acc = await riot(accountRegion, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(rid.name)}/${encodeURIComponent(rid.tag)}`);
    if (!acc) return { status: "not_found", ranked: { ...old, riotId: p.ign, platform, error: "not_found", syncedAt: new Date().toISOString() } };
    puuid = acc.puuid;
  }
  const entries = (await riot(platform, `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`)) || [];
  const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
  const flex = entries.find((e) => e.queueType === "RANKED_FLEX_SR");
  return { status: "ok", ranked: { puuid, riotId: p.ign, platform, solo: entryOut(solo), flex: entryOut(flex), error: null, syncedAt: new Date().toISOString() } };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed." }); }
  if (!storeConfigured()) return res.status(503).json({ error: "The board's database isn't connected yet." });
  if (!TEAM_CODE || !codeMatches(req.headers["x-team-code"])) return res.status(401).json({ error: "That team code isn't right." });
  if (!RIOT_KEY) return res.status(503).json({ code: "no_key", error: "Rank sync isn't set up yet. Add RIOT_API_KEY in the Vercel project settings, then redeploy." });

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
  const force = !!body.force;

  try {
    const flat = (await redis([["HGETALL", KEY + "players"]]))[0] || [];
    const players = [];
    for (let i = 0; i < flat.length; i += 2) { try { players.push({ id: flat[i], data: JSON.parse(flat[i + 1]) }); } catch {} }
    const wanted = Array.isArray(body.ids) && body.ids.length ? new Set(body.ids.map(String)) : null;
    const now = Date.now();
    const todo = players
      .filter((p) => !wanted || wanted.has(p.id))
      .filter((p) => force || !p.data.ranked || !p.data.ranked.syncedAt || now - Date.parse(p.data.ranked.syncedAt) > FRESH_MS || p.data.ranked.riotId !== p.data.ign)
      .slice(0, MAX_PLAYERS);

    const results = [];
    const writes = [];
    let stopped = null;
    for (const p of todo) {
      try {
        const out = await syncOne(p.data);
        results.push({ id: p.id, name: p.data.name, status: out.status });
        if (out.ranked) {
          const next = { ...p.data, ranked: out.ranked, updatedAt: new Date().toISOString() };
          // Keep the manual rank fields in step with Solo/Duo so every view shows the synced rank
          if (out.ranked.solo) { next.rank = cap(out.ranked.solo.tier); next.div = out.ranked.solo.division || ""; }
          writes.push(["HSET", KEY + "players", p.id, JSON.stringify(next)]);
        }
      } catch (e) {
        if (e instanceof RiotError && (e.status === 401 || e.status === 403)) { stopped = { status: 502, error: "Riot rejected the API key. Check RIOT_API_KEY in Vercel; a development key expires after 24 hours." }; break; }
        if (e instanceof RiotError && e.status === 429) { stopped = { status: 429, error: "Riot's rate limit was reached. Try again in a couple of minutes.", retryAfter: e.retryAfter }; break; }
        console.error("rank sync", p.id, e.message);
        results.push({ id: p.id, name: p.data.name, status: "error" });
      }
    }
    if (writes.length) await redis([...writes, ["INCR", KEY + "version"]]);
    const skipped = players.filter((p) => (!wanted || wanted.has(p.id)) && !todo.includes(p)).length;
    if (stopped && !results.length) return res.status(stopped.status).json({ error: stopped.error, retryAfter: stopped.retryAfter || 0 });
    return res.status(200).json({ ok: true, results, skipped, warning: stopped ? stopped.error : null });
  } catch (e) {
    console.error(e);
    resetConnection();
    return res.status(500).json({ error: "Rank sync failed. Try again in a moment." });
  }
}
