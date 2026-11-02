// Shared helpers for the API functions: Redis access and the team-code check.
// Works with either Upstash's REST API (KV_REST_API_URL + token) or a plain Redis connection string (REDIS_URL).
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "redis";

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TCP_URL = process.env.REDIS_URL || process.env.KV_URL;
export const TEAM_CODE = process.env.TEAM_CODE || "";
export const KEY = "fsb:";
export const storeConfigured = () => !!((REST_URL && REST_TOKEN) || TCP_URL);

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
export function resetConnection() { if (tcpClient) { try { tcpClient.disconnect(); } catch {} tcpClient = null; } }

export async function redis(commands) {
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

export function codeMatches(given) {
  if (!TEAM_CODE || typeof given !== "string" || !given) return false;
  const a = createHash("sha256").update(given.trim()).digest();
  const b = createHash("sha256").update(TEAM_CODE).digest();
  return timingSafeEqual(a, b);
}
