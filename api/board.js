// Shared storage for the Five-Stack Board, backed by Upstash Redis.
// GET  /api/board[?since=<version>]  -> whole board (anyone with the link can view)
// POST /api/board                    -> write; needs the x-team-code header to match TEAM_CODE
// Works with either Upstash's REST API (KV_REST_API_URL + token) or a plain Redis connection string (REDIS_URL).
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "redis";

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TCP_URL = process.env.REDIS_URL || process.env.KV_URL;
const TEAM_CODE = process.env.TEAM_CODE || "";

const KEY = "fsb:";
// Collection -> max number of entries
const COLLECTIONS = { players: 50, comps: 200, scrims: 1000, avail: 20000, fearless: 5, scouting: 20 };
const MAX_DOC_BYTES = 20000;
const MAX_BATCH = 100;
const AVAIL_KEEP_DAYS = 70;

// One shared connection per warm function instance
let tcpClient = null;
async function tcp() {
  if (tcpClient && tcpClient.isReady) return tcpClient;
  if (!tcpClient) {
    tcpClient = createClient({ url: TCP_URL, socket: { connectTimeout: 5000, reconnectStrategy: (n) => (n > 3 ? false : 200 * n) } });
    tcpClient.on("error", (e) => console.error("redis", e.message));
  }
  if (!tcpClient.isOpen) await tcpClient.connect();
  return tcpClient;
}

async function redis(commands) {
  if (!REST_URL || !REST_TOKEN) {
    const c = await tcp();
    // Sent in the same tick, so node-redis pipelines them
    return Promise.all(commands.map((cmd) => c.sendCommand(cmd.map(String))));
  }
  const r = await fetch(`${REST_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`Redis HTTP ${r.status}`);
  const out = await r.json();
  for (const o of out) if (o.error) throw new Error(o.error);
  return out.map((o) => o.result);
}

function codeMatches(given) {
  if (!TEAM_CODE || typeof given !== "string" || !given) return false;
  const a = createHash("sha256").update(given.trim()).digest();
  const b = createHash("sha256").update(TEAM_CODE).digest();
  return timingSafeEqual(a, b);
}

function hashToList(flat) {
  const out = [];
  for (let i = 0; i < flat.length; i += 2) {
    try { out.push({ ...JSON.parse(flat[i + 1]), id: flat[i] }); } catch { /* skip corrupt row */ }
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!(REST_URL && REST_TOKEN) && !TCP_URL) {
    return res.status(503).json({ error: "The board's database isn't connected yet. Connect Upstash Redis to this project in Vercel, then redeploy." });
  }
  try {
    if (req.method === "GET") {
      const [ver] = await redis([["GET", KEY + "version"]]);
      const version = Number(ver || 0);
      if (req.query && req.query.since !== undefined && Number(req.query.since) === version) {
        return res.status(200).json({ unchanged: true, version });
      }
      const cols = Object.keys(COLLECTIONS);
      const replies = await redis([...cols.map((c) => ["HGETALL", KEY + c]), ["GET", KEY + "meta"]]);
      const out = { version };
      cols.forEach((c, i) => { out[c] = hashToList(replies[i] || []); });
      // Old availability is kept in Redis but not sent, so the payload stays small
      const cutoff = new Date(Date.now() - AVAIL_KEEP_DAYS * 864e5).toISOString().slice(0, 10);
      out.avail = out.avail.filter((a) => typeof a.date === "string" && a.date >= cutoff);
      try { out.meta = replies[cols.length] ? JSON.parse(replies[cols.length]) : {}; } catch { out.meta = {}; }
      return res.status(200).json(out);
    }

    if (req.method === "POST") {
      if (!TEAM_CODE) return res.status(503).json({ error: "No team code is set on the server. Add TEAM_CODE in the Vercel project settings, then redeploy." });
      if (!codeMatches(req.headers["x-team-code"])) return res.status(401).json({ error: "That team code isn't right." });

      let body = req.body || {};
      if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
      const { action, col, id, data } = body;

      if (action === "verify") return res.status(200).json({ ok: true });

      if (action === "meta") {
        const teamName = String((data && data.teamName) || "").trim().slice(0, 40);
        await redis([["SET", KEY + "meta", JSON.stringify({ teamName })], ["INCR", KEY + "version"]]);
        return res.status(200).json({ ok: true });
      }

      const ops = action === "batch" ? body.ops : [{ action, col, id, data }];
      if (!Array.isArray(ops) || !ops.length || ops.length > MAX_BATCH) return res.status(400).json({ error: "That request isn't valid." });

      // Validate everything before writing anything
      const commands = [];
      const newPerCol = {};
      for (const op of ops) {
        if (!op || !Object.hasOwn(COLLECTIONS, op.col) || typeof op.id !== "string" || !/^[\w-]{1,64}$/.test(op.id)) {
          return res.status(400).json({ error: "That request isn't valid." });
        }
        if (op.action === "delete") { commands.push(["HDEL", KEY + op.col, op.id]); continue; }
        if (op.action !== "set" || !op.data || typeof op.data !== "object" || Array.isArray(op.data)) {
          return res.status(400).json({ error: "That request isn't valid." });
        }
        const clean = { ...op.data };
        delete clean.id;
        const json = JSON.stringify(clean);
        if (Buffer.byteLength(json) > MAX_DOC_BYTES) return res.status(413).json({ error: "That entry is too long to save. Shorten the notes and try again." });
        commands.push(["HSET", KEY + op.col, op.id, json]);
        (newPerCol[op.col] ??= new Set()).add(op.id);
      }

      // Capacity check per collection, counting only ids that don't exist yet
      const cols = Object.keys(newPerCol);
      if (cols.length) {
        const checks = [];
        for (const c of cols) { checks.push(["HLEN", KEY + c]); for (const i of newPerCol[c]) checks.push(["HEXISTS", KEY + c, i]); }
        const replies = await redis(checks);
        let k = 0;
        for (const c of cols) {
          const count = Number(replies[k++]);
          let added = 0;
          for (const _ of newPerCol[c]) if (!Number(replies[k++])) added++;
          if (added && count + added > COLLECTIONS[c]) return res.status(409).json({ error: "The board is full. Delete some old entries, then try again." });
        }
      }

      commands.push(["INCR", KEY + "version"]);
      await redis(commands);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (e) {
    console.error(e);
    if (tcpClient) { try { tcpClient.disconnect(); } catch {} tcpClient = null; }
    return res.status(500).json({ error: "The board's database didn't respond. Try again in a moment." });
  }
}
