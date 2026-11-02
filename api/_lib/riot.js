// Shared Riot API helpers for rank sync, match history and opponent scouting.
// The key lives only in the RIOT_API_KEY environment variable and never reaches the browser.

export const RIOT_KEY = process.env.RIOT_API_KEY || "";
export const DEFAULT_PLATFORM = (process.env.RIOT_DEFAULT_PLATFORM || "euw1").toLowerCase();
export const PLATFORMS = {
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe", me1: "europe",
  na1: "americas", br1: "americas", la1: "americas", la2: "americas",
  kr: "asia", jp1: "asia",
  oc1: "sea", ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", vn2: "sea",
};
// Ranked Solo/Duo and Flex
export const RANKED_QUEUES = new Set([420, 440]);
const POSITIONS = { TOP: "top", JUNGLE: "jungle", MIDDLE: "mid", BOTTOM: "bot", UTILITY: "support" };

export class RiotError extends Error { constructor(status, retryAfter) { super(`Riot ${status}`); this.status = status; this.retryAfter = retryAfter; } }

export async function riot(host, path) {
  const r = await fetch(`https://${host}.api.riotgames.com${path}`, { headers: { "X-Riot-Token": RIOT_KEY }, signal: AbortSignal.timeout(7000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new RiotError(r.status, Number(r.headers.get("retry-after")) || 0);
  return r.json();
}

export function splitRiotId(ign) {
  const m = String(ign || "").trim().match(/^(.{3,16})#([A-Za-z0-9]{2,5})$/u);
  return m ? { name: m[1].trim(), tag: m[2] } : null;
}

// Platform (euw1) -> routing hosts for account-v1 and match-v5
export function routing(server) {
  const s = String(server || "").toLowerCase();
  const platform = PLATFORMS[s] ? s : DEFAULT_PLATFORM;
  const region = PLATFORMS[platform];
  return { platform, region, accountRegion: region === "sea" ? "asia" : region };
}

export async function puuidFor(riotId, accountRegion) {
  const rid = splitRiotId(riotId);
  if (!rid) return null;
  const acc = await riot(accountRegion, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(rid.name)}/${encodeURIComponent(rid.tag)}`);
  return acc ? acc.puuid : null;
}

export async function rankedMatchIds(region, puuid, count) {
  return (await riot(region, `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?type=ranked&start=0&count=${count}`)) || [];
}

// One game from one player's view, kept small: [matchId, champion, role, win 1/0, kills, deaths, assists, start time]
// Remakes and non-ranked queues come back as null so they're skipped but still marked as seen.
export async function gameFor(region, matchId, puuid) {
  const m = await riot(region, `/lol/match/v5/matches/${encodeURIComponent(matchId)}`);
  const info = m && m.info;
  if (!info || !RANKED_QUEUES.has(info.queueId) || info.gameDuration < 300) return null;
  const p = (info.participants || []).find((x) => x.puuid === puuid);
  if (!p || p.gameEndedInEarlySurrender) return null;
  return [matchId, p.championName, POSITIONS[p.teamPosition] || "", p.win ? 1 : 0, p.kills, p.deaths, p.assists, info.gameStartTimestamp];
}

// Runs async jobs a few at a time so a burst of match lookups stays polite to Riot's rate limit
export async function inBatches(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

export function riotFailure(e) {
  if (e instanceof RiotError && (e.status === 401 || e.status === 403)) return { status: 502, error: "Riot rejected the API key. Check RIOT_API_KEY in Vercel; a development key expires after 24 hours." };
  if (e instanceof RiotError && e.status === 429) return { status: 429, error: "Riot's rate limit was reached. Try again in a couple of minutes.", retryAfter: e.retryAfter };
  return null;
}
