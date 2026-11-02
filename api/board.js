// Shared storage for the Five-Stack Board, backed by Upstash Redis.
// GET  /api/board[?since=<version>]  -> whole board (anyone with the link can view)
// POST /api/board                    -> write; needs the x-team-code header to match TEAM_CODE
import { redis, codeMatches, KEY, TEAM_CODE, storeConfigured, resetConnection } from "./_lib/store.js";

// Collection -> max number of entries
const COLLECTIONS = { players: 50, comps: 200, scrims: 1000, avail: 20000, fearless: 5, scouting: 20 };
const MAX_DOC_BYTES = 20000;
const MAX_BATCH = 100;
const AVAIL_KEEP_DAYS = 70;

function hashToList(flat) {
  const out = [];
  for (let i = 0; i < flat.length; i += 2) {
    try { out.push({ ...JSON.parse(flat[i + 1]), id: flat[i] }); } catch { /* skip corrupt row */ }
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!storeConfigured()) {
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
    resetConnection();
    return res.status(500).json({ error: "The board's database didn't respond. Try again in a moment." });
  }
}
