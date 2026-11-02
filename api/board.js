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
const COLLECTIONS = new Set(["players", "comps"]);
const MAX_DOC_BYTES = 20000;
const MAX_ROWS = 200;

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
      const [players, comps, meta] = await redis([["HGETALL", KEY + "players"], ["HGETALL", KEY + "comps"], ["GET", KEY + "meta"]]);
      let m = {};
      try { m = meta ? JSON.parse(meta) : {}; } catch { m = {}; }
      return res.status(200).json({ version, players: hashToList(players || []), comps: hashToList(comps || []), meta: m });
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

      if (!COLLECTIONS.has(col) || typeof id !== "string" || !/^[\w-]{1,64}$/.test(id)) {
        return res.status(400).json({ error: "That request isn't valid." });
      }

      if (action === "delete") {
        await redis([["HDEL", KEY + col, id], ["INCR", KEY + "version"]]);
        return res.status(200).json({ ok: true });
      }

      if (action === "set") {
        if (!data || typeof data !== "object" || Array.isArray(data)) return res.status(400).json({ error: "That request isn't valid." });
        const clean = { ...data };
        delete clean.id;
        const json = JSON.stringify(clean);
        if (Buffer.byteLength(json) > MAX_DOC_BYTES) return res.status(413).json({ error: "That entry is too long to save. Shorten the notes and try again." });
        const [exists, count] = await redis([["HEXISTS", KEY + col, id], ["HLEN", KEY + col]]);
        if (!exists && count >= MAX_ROWS) return res.status(409).json({ error: "The board is full. Delete some players or comps, then try again." });
        await redis([["HSET", KEY + col, id, json], ["INCR", KEY + "version"]]);
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: "That request isn't valid." });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (e) {
    console.error(e);
    if (tcpClient) { try { tcpClient.disconnect(); } catch {} tcpClient = null; }
    return res.status(500).json({ error: "The board's database didn't respond. Try again in a moment." });
  }
}
