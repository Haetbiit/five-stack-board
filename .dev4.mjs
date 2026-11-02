import http from "node:http"; import fs from "node:fs"; import path from "node:path";
process.env.REDIS_URL = "redis://127.0.0.1:6390"; process.env.TEAM_CODE = "test-code"; process.env.RIOT_API_KEY = "RGAPI-test";
const root = process.argv[2]; const calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (!u.includes("api.riotgames.com")) return realFetch(url, opts);
  calls.push(u.replace(/^https:\/\//, ""));
  const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  let m;
  if ((m = u.match(/by-riot-id\/([^/]+)\/([^/?]+)/))) { const n = decodeURIComponent(m[1]); return n === "Vane" ? j({ status: { status_code: 404 } }, 404) : j({ puuid: "puuid-" + n, gameName: n, tagLine: m[2] }); }
  if ((m = u.match(/entries\/by-puuid\/puuid-([^/?]+)/))) { const n = decodeURIComponent(m[1]); return j(n === "Juno" ? [] : [{ queueType: "RANKED_SOLO_5x5", tier: n === "Moss" ? "MASTER" : "EMERALD", rank: "II", leaguePoints: 54, wins: 70, losses: 50, hotStreak: n === "Rook" }, { queueType: "RANKED_FLEX_SR", tier: "GOLD", rank: "I", leaguePoints: 12, wins: 9, losses: 6 }]); }
  return j({}, 404);
};
const mods = {};
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const am = u.pathname.match(/^\/api\/(\w+)$/);
  if (u.pathname === "/__calls") { res.end(JSON.stringify(calls)); return; }
  if (am) { let b = ""; req.on("data", c => b += c); req.on("end", async () => {
    mods[am[1]] ??= (await import(path.join(root, "api", am[1] + ".js"))).default;
    req.query = Object.fromEntries(u.searchParams); try { req.body = b ? JSON.parse(b) : {}; } catch { req.body = b; }
    res.status = (c) => { res.statusCode = c; return res; }; res.json = (o) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); return res; };
    mods[am[1]](req, res); }); return; }
  const f = path.join(root, "public", u.pathname === "/" ? "index.html" : u.pathname);
  if (!fs.existsSync(f)) { res.statusCode = 404; return res.end("nf"); }
  res.setHeader("content-type", f.endsWith(".html") ? "text/html" : f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : "application/json"); res.end(fs.readFileSync(f));
}).listen(8787, () => console.log("up"));
