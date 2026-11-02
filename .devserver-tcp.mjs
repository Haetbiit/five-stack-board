import http from "node:http"; import fs from "node:fs"; import path from "node:path";
// fake Upstash pipeline
const H = {}, K = {};
http.createServer((req, res) => { let b=""; req.on("data",c=>b+=c); req.on("end",()=>{
  const out = JSON.parse(b).map(([cmd,k,...a]) => { switch(cmd){
    case "GET": return {result: K[k] ?? null}; case "SET": K[k]=a[0]; return {result:"OK"};
    case "INCR": K[k]=String(Number(K[k]||0)+1); return {result:Number(K[k])};
    case "HGETALL": return {result: Object.entries(H[k]||{}).flat()};
    case "HSET": (H[k]??={})[a[0]]=a[1]; return {result:1}; case "HDEL": delete (H[k]||{})[a[0]]; return {result:1};
    case "HEXISTS": return {result: H[k]&&a[0] in H[k]?1:0}; case "HLEN": return {result:Object.keys(H[k]||{}).length};
  }});
  res.setHeader("content-type","application/json"); res.end(JSON.stringify(out)); }); }).listen(8788);
process.env.REDIS_URL="redis://127.0.0.1:6390"; process.env.TEAM_CODE="test-code";
const { default: handler } = await import(process.argv[2] + "/api/board.js");
http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/api/board") { let b=""; req.on("data",c=>b+=c); req.on("end", () => {
    req.query = Object.fromEntries(u.searchParams); try { req.body = b ? JSON.parse(b) : {}; } catch { req.body = b; }
    res.status = (c) => { res.statusCode = c; return res; }; res.json = (o) => { res.setHeader("content-type","application/json"); res.end(JSON.stringify(o)); return res; };
    handler(req, res); }); return; }
  const f = path.join(process.argv[2], "public", u.pathname === "/" ? "index.html" : u.pathname);
  if (!fs.existsSync(f)) { res.statusCode = 404; return res.end("nf"); }
  res.setHeader("content-type", f.endsWith(".html") ? "text/html" : "application/json"); res.end(fs.readFileSync(f));
}).listen(8787, () => console.log("up"));
