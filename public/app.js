(function () {
"use strict";

/* ---------- Language ---------- */
const LANG_KEY = "fsb-lang";
const DE = window.FSB_DE || {};
let LANG = (() => { try { const s = localStorage.getItem(LANG_KEY); if (s === "de" || s === "en") return s; } catch (e) {} return /^de\b/i.test(navigator.language || "") ? "de" : "en"; })();
function t(s, v) { let o = (LANG === "de" && DE[s]) || s; if (v) o = o.replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m)); return o; }
function tn(n, one, many, v) { return t(n === 1 ? one : many, { n, ...(v || {}) }); }
function locale() { return LANG === "de" ? "de-DE" : "en-GB"; }
function setLang(l) {
  LANG = l; try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
  document.documentElement.lang = l;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-label]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nLabel)); el.title = t(el.dataset.i18nLabel); });
  document.querySelectorAll(".lang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === l)));
  render();
}

/* ---------- Game data ---------- */
const ROLES = [
  { k: "top", code: "TOP", name: "Top" },
  { k: "jungle", code: "JGL", name: "Jungle" },
  { k: "mid", code: "MID", name: "Mid" },
  { k: "bot", code: "ADC", name: "ADC" },
  { k: "support", code: "SUP", name: "Support" },
];
const ROLE = Object.fromEntries(ROLES.map(r => [r.k, r]));
const SVG = (d) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const I = {
  plus: SVG('<path d="M12 5v14M5 12h14"/>'),
  edit: SVG('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  x: SVG('<path d="M18 6 6 18M6 6l12 12"/>'),
  check: SVG('<path d="M20 6 9 17l-5-5"/>'),
  left: SVG('<path d="m15 18-6-6 6-6"/>'),
  right: SVG('<path d="m9 18 6-6-6-6"/>'),
  bolt: SVG('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  key: SVG('<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14 9l2 2"/>'),
  lock: SVG('<rect x="4" y="11" width="16" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  trash: SVG('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  copy: SVG('<rect x="9" y="9" width="13" height="13" rx="1"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
  sync: SVG('<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>'),
  cal: SVG('<rect x="3" y="4" width="18" height="18" rx="1"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
};
function ri(k) { return ROLE[k] ? `<i class="ri" data-r="${k}" aria-hidden="true"></i>` : ""; }
const TIERS = [
  { k: "main", name: "Main" },
  { k: "comfort", name: "Comfort" },
  { k: "pocket", name: "Pocket" },
  { k: "learning", name: "Learning" },
];
const TIER = Object.fromEntries(TIERS.map(x => [x.k, x]));
const RANKS = ["Unranked", "Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"];
const DIVS = ["IV", "III", "II", "I"];
const STYLES = ["Carry", "Playmaker", "Weakside", "Enabler", "Flexible"];
const ARCHETYPES = [
  { k: "engage", name: "Hard engage", hint: "Force fights on your terms" },
  { k: "pick", name: "Pick", hint: "Catch someone, then take objectives" },
  { k: "poke", name: "Poke / siege", hint: "Chip them down before fights" },
  { k: "protect", name: "Protect the carry", hint: "Front-to-back, peel your hypercarry" },
  { k: "split", name: "Split push", hint: "1-3-1 or 1-4 side-lane pressure" },
  { k: "skirmish", name: "Skirmish", hint: "Early 2v2s and river fights" },
  { k: "scaling", name: "Scaling", hint: "Survive early, win late" },
];
const ARCH = Object.fromEntries(ARCHETYPES.map(a => [a.k, a]));
const FORMATS = ["Bo1", "Bo3", "Bo5", "Block (2 games)", "Block (3 games)"];
const STRENGTH_TAGS = ["Laning", "Teamfighting", "Roaming", "Vision control", "Shotcalling", "Mechanics", "Wave management", "Early game", "Scaling", "Objective setup", "Map awareness", "Communication", "Tilt resistance", "Wide champion pool"];
const WEAK_TAGS = ["Overextends", "Low vision score", "Tilts easily", "Weak vs. ganks", "Small champion pool", "Passive laning", "Late rotations", "Teamfight positioning", "Coinflip plays", "Quiet on comms", "Falls off late", "Overforces"];

// Name : damage (P physical, M magic, X mixed) + T for frontline/tank
const CHAMP_RAW = "Aatrox:P;Ahri:M;Akali:M;Akshan:P;Alistar:MT;Ambessa:P;Amumu:MT;Anivia:M;Annie:M;Aphelios:P;Ashe:P;Aurelion Sol:M;Aurora:M;Azir:M;Bard:M;Bel'Veth:P;Blitzcrank:MT;Brand:M;Braum:MT;Briar:P;Caitlyn:P;Camille:P;Cassiopeia:M;Cho'Gath:MT;Corki:X;Darius:P;Diana:M;Dr. Mundo:XT;Draven:P;Ekko:M;Elise:M;Evelynn:M;Ezreal:P;Fiddlesticks:M;Fiora:P;Fizz:M;Galio:MT;Gangplank:P;Garen:P;Gnar:PT;Gragas:MT;Graves:P;Gwen:M;Hecarim:P;Heimerdinger:M;Hwei:M;Illaoi:P;Irelia:P;Ivern:M;Janna:M;Jarvan IV:PT;Jax:X;Jayce:P;Jhin:P;Jinx:P;K'Sante:PT;Kai'Sa:X;Kalista:P;Karma:M;Karthus:M;Kassadin:M;Katarina:X;Kayle:X;Kayn:P;Kennen:M;Kha'Zix:P;Kindred:P;Kled:P;Kog'Maw:X;LeBlanc:M;Lee Sin:P;Leona:MT;Lillia:M;Lissandra:M;Lucian:P;Lulu:M;Lux:M;Malphite:MT;Malzahar:M;Maokai:MT;Master Yi:P;Mel:M;Milio:M;Miss Fortune:P;Mordekaiser:M;Morgana:M;Naafiri:P;Nami:M;Nasus:P;Nautilus:MT;Neeko:M;Nidalee:M;Nilah:P;Nocturne:P;Nunu & Willump:MT;Olaf:P;Orianna:M;Ornn:XT;Pantheon:P;Poppy:PT;Pyke:P;Qiyana:P;Quinn:P;Rakan:M;Rammus:MT;Rek'Sai:P;Rell:MT;Renata Glasc:M;Renekton:P;Rengar:P;Riven:P;Rumble:M;Ryze:M;Samira:P;Sejuani:MT;Senna:P;Seraphine:M;Sett:PT;Shaco:X;Shen:XT;Shyvana:X;Singed:MT;Sion:PT;Sivir:P;Skarner:PT;Smolder:P;Sona:M;Soraka:M;Swain:M;Sylas:M;Syndra:M;Tahm Kench:MT;Taliyah:M;Talon:P;Taric:MT;Teemo:M;Thresh:MT;Tristana:P;Trundle:PT;Tryndamere:P;Twisted Fate:M;Twitch:P;Udyr:XT;Urgot:P;Varus:P;Vayne:P;Veigar:M;Vel'Koz:M;Vex:M;Vi:P;Viego:P;Viktor:M;Vladimir:M;Volibear:XT;Warwick:X;Wukong:P;Xayah:P;Xerath:M;Xin Zhao:P;Yasuo:P;Yone:P;Yorick:P;Yunara:P;Yuumi:M;Zac:MT;Zed:P;Zeri:P;Ziggs:M;Zilean:M;Zoe:M;Zyra:M";
const CHAMPS = new Map();
CHAMP_RAW.split(";").forEach(e => { const [n, c] = e.split(":"); CHAMPS.set(n.toLowerCase(), { name: n, d: c[0], t: c.includes("T") }); });
const DMG_LABEL = { P: "AD", M: "AP", X: "Mixed" };
document.getElementById("champList").innerHTML = [...CHAMPS.values()].map(c => `<option value="${esc(c.name)}"></option>`).join("");

const EXAMPLE = {
  meta: { teamName: "Our Team" },
  players: [
    { id: "ex-p1", example: true, name: "Rook", ign: "Rook#EUW", rank: "Emerald", div: "II", primaryRole: "top", secondaryRoles: ["jungle"], style: "Weakside",
      champions: [{ champ: "Ornn", role: "top", tier: "main" }, { champ: "K'Sante", role: "top", tier: "comfort" }, { champ: "Gnar", role: "top", tier: "comfort" }, { champ: "Sejuani", role: "jungle", tier: "pocket" }, { champ: "Aatrox", role: "top", tier: "learning" }],
      strengths: ["Teamfighting", "Tilt resistance"], weaknesses: ["Late rotations"], notes: "Happy to go even on a tank while we play around bot side." },
    { id: "ex-p2", example: true, name: "Moss", ign: "Moss#EUW", rank: "Diamond", div: "IV", primaryRole: "jungle", secondaryRoles: ["support"], style: "Playmaker",
      champions: [{ champ: "Vi", role: "jungle", tier: "main" }, { champ: "Xin Zhao", role: "jungle", tier: "main" }, { champ: "Lee Sin", role: "jungle", tier: "comfort" }, { champ: "Sejuani", role: "jungle", tier: "comfort" }, { champ: "Lillia", role: "jungle", tier: "pocket" }],
      strengths: ["Early game", "Objective setup", "Shotcalling"], weaknesses: ["Overforces", "Low vision score"], notes: "" },
    { id: "ex-p3", example: true, name: "Kestrel", ign: "Kestrel#EUW", rank: "Emerald", div: "I", primaryRole: "mid", secondaryRoles: ["top"], style: "Carry",
      champions: [{ champ: "Orianna", role: "mid", tier: "main" }, { champ: "Ahri", role: "mid", tier: "main" }, { champ: "Syndra", role: "mid", tier: "comfort" }, { champ: "Taliyah", role: "mid", tier: "pocket" }, { champ: "Sylas", role: "mid", tier: "learning" }],
      strengths: ["Mechanics", "Roaming", "Wave management"], weaknesses: ["Tilts easily"], notes: "Wants jungle attention for the first two waves on Orianna." },
    { id: "ex-p4", example: true, name: "Vane", ign: "Vane#EUW", rank: "Diamond", div: "IV", primaryRole: "bot", secondaryRoles: ["mid"], style: "Carry",
      champions: [{ champ: "Jinx", role: "bot", tier: "main" }, { champ: "Kai'Sa", role: "bot", tier: "main" }, { champ: "Ezreal", role: "bot", tier: "comfort" }, { champ: "Varus", role: "bot", tier: "comfort" }, { champ: "Ashe", role: "bot", tier: "pocket" }],
      strengths: ["Teamfight positioning", "Scaling"], weaknesses: ["Passive laning", "Quiet on comms"], notes: "" },
    { id: "ex-p5", example: true, name: "Pell", ign: "Pell#EUW", rank: "Emerald", div: "III", primaryRole: "support", secondaryRoles: ["jungle"], style: "Enabler",
      champions: [{ champ: "Nautilus", role: "support", tier: "main" }, { champ: "Rakan", role: "support", tier: "main" }, { champ: "Lulu", role: "support", tier: "comfort" }, { champ: "Braum", role: "support", tier: "comfort" }, { champ: "Thresh", role: "support", tier: "learning" }],
      strengths: ["Vision control", "Communication"], weaknesses: ["Small champion pool"], notes: "" },
    { id: "ex-p6", example: true, name: "Juno", ign: "Juno#EUW", rank: "Platinum", div: "I", primaryRole: "mid", secondaryRoles: ["support", "bot"], sub: true, style: "Flexible",
      champions: [{ champ: "Lux", role: "mid", tier: "comfort" }, { champ: "Viktor", role: "mid", tier: "comfort" }, { champ: "Karma", role: "support", tier: "main" }, { champ: "Seraphine", role: "support", tier: "comfort" }, { champ: "Ezreal", role: "bot", tier: "pocket" }],
      strengths: ["Wide champion pool", "Communication"], weaknesses: [], notes: "Sub for mid, support and ADC." },
  ],
  comps: [
    { id: "ex-c1", example: true, name: "Dive bot", archetype: "engage",
      picks: { top: { champ: "Ornn", playerId: "ex-p1" }, jungle: { champ: "Vi", playerId: "ex-p2" }, mid: { champ: "Orianna", playerId: "ex-p3" }, bot: { champ: "Kai'Sa", playerId: "ex-p4" }, support: { champ: "Rakan", playerId: "ex-p5" } },
      winCondition: "Group for second dragon. Vi ult or Rakan engage onto their carry, Orianna shockwave follows.", weakAgainst: "Disengage and peel (Janna, Gragas). Long poke before objectives.", bans: "Janna, Poppy, Ziggs", notes: "" },
    { id: "ex-c2", example: true, name: "Front-to-back Jinx", archetype: "protect",
      picks: { top: { champ: "K'Sante", playerId: "ex-p1" }, jungle: { champ: "Sejuani", playerId: "ex-p2" }, mid: { champ: "Syndra", playerId: "ex-p3" }, bot: { champ: "Jinx", playerId: "ex-p4" }, support: { champ: "Lulu", playerId: "ex-p5" } },
      winCondition: "Reach three items on Jinx. K'Sante and Lulu peel, fight around Baron once vision is set.", weakAgainst: "Early dive and invades before 15 minutes.", bans: "Draven, Nilah, Vi", notes: "" },
  ],
};

/* ---------- State ---------- */
const COLS = ["players", "comps", "scrims", "avail", "fearless", "scouting"];
const VIEWS = ["roster", "team", "comps", "draft", "schedule", "fearless", "scouting"];
const S = { players: [], comps: [], scrims: [], avail: [], fearless: [], scouting: [], meta: {}, mode: "loading", loaded: false, readOnly: false, stale: false, view: "roster", error: "", weekOffset: 0, scoutDraft: null, roleFilter: "all", pendingRender: false };
const LS_KEY = "five-stack-board-v2";
const ME_KEY = "fsb-me";

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function champInfo(name) { return name ? CHAMPS.get(String(name).trim().toLowerCase()) : null; }
function champName(name) { const c = champInfo(name); return c ? c.name : String(name || "").trim(); }
let ICONS = {};
function initials(name) { const w = String(name || "").split(/[^A-Za-z0-9]+/).filter(Boolean); if (!w.length) return "?"; return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase(); }
function champIcon(name, size) {
  const n = champName(name); if (!n) return "";
  const src = ICONS[n.toLowerCase()];
  const cls = "ci" + (size ? " " + size : "");
  return src ? `<span class="${cls}"><img src="${esc(src)}" alt="" loading="lazy"></span>` : `<span class="${cls}" aria-hidden="true">${esc(initials(n))}</span>`;
}
function playerById(id) { return S.players.find(p => p.id === id); }
function roleIdx(k) { const i = ROLES.findIndex(r => r.k === k); return i < 0 ? 9 : i; }
function sortedPlayers() { return [...S.players].sort((a, b) => roleIdx(a.primaryRole) - roleIdx(b.primaryRole) || String(a.name).localeCompare(b.name)); }
function rankText(p) { if (!p.rank) return ""; if (p.rank === "Unranked") return t("Unranked"); return ["Master", "Grandmaster", "Challenger"].includes(p.rank) || !p.div ? t(p.rank) : t(p.rank) + " " + p.div; }
function lines(s) { return String(s || "").split("\n").map(x => x.trim()).filter(Boolean); }
function getMe() { try { return localStorage.getItem(ME_KEY) || ""; } catch (e) { return ""; } }
function setMe(id) { try { if (id) localStorage.setItem(ME_KEY, id); else localStorage.removeItem(ME_KEY); } catch (e) {} }

let toastTimer;
function toast(msg) { const el = document.getElementById("toast"); el.hidden = true; el.innerHTML = I.check + `<span>${esc(msg)}</span>`; void el.offsetWidth; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 3200); }

/* ---------- Storage: Vercel API, or this browser when no API answers ---------- */
function localPersist() { try { const o = { meta: S.meta }; COLS.forEach(c => { o[c] = S[c]; }); localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) {} }
function startLocal() {
  let d = null; try { const raw = localStorage.getItem(LS_KEY); if (raw) d = JSON.parse(raw); } catch (e) {}
  d = d || exampleBoard();
  S.mode = "local"; COLS.forEach(c => { S[c] = d[c] || []; }); S.meta = d.meta || {}; S.loaded = true;
  render();
}

const API = "/api/board";
const CODE_KEY = "five-stack-board-team-code";
let apiVersion = null, pollTimer = null;
function getCode() { try { return localStorage.getItem(CODE_KEY) || ""; } catch (e) { return S.code || ""; } }
function setCode(c) { S.code = c; try { if (c) localStorage.setItem(CODE_KEY, c); else localStorage.removeItem(CODE_KEY); } catch (e) {} }

async function apiFetch(force) {
  const r = await fetch(API + (apiVersion != null && !force ? `?since=${apiVersion}` : ""), { cache: "no-store" });
  let j = null; try { j = await r.json(); } catch (e) {}
  if (r.status === 503 && j && j.error) { S.error = j.error; render(); return; }
  if (!r.ok || !j) throw new Error("HTTP " + r.status);
  if (j.unchanged) return;
  apiVersion = j.version; COLS.forEach(c => { S[c] = j[c] || []; }); S.meta = j.meta || {};
  S.loaded = true; S.stale = false; S.error = "";
  render();
  maybeAutoSync();
}
async function poll(force) {
  clearTimeout(pollTimer);
  try { await apiFetch(force); if (S.stale) { S.stale = false; render(); } }
  catch (e) { S.stale = true; render(); }
  if (!document.hidden && !S.error) pollTimer = setTimeout(poll, 5000);
}
function startApi() {
  S.mode = "api"; S.readOnly = !getCode();
  render(); poll(true);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
}
async function apiWrite(body) {
  const code = getCode();
  if (!code) { S.readOnly = true; render(); toast(t("Enter the team code to make changes.")); return false; }
  let r;
  try { r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", "x-team-code": code }, body: JSON.stringify(body) }); }
  catch (e) { toast(t("Couldn't save. Check your connection and try again.")); poll(true); return false; }
  let j = null; try { j = await r.json(); } catch (e) {}
  if (r.status === 401) { setCode(""); S.readOnly = true; poll(true); toast(t("The team code has changed. Unlock editing with the new code.")); return false; }
  if (!r.ok) { toast((j && j.error) || t("Couldn't save. Try again in a moment.")); poll(true); return false; }
  poll(true); return true;
}
function openCodeSheet() {
  openSheet(t("Unlock editing"), `<p class="formhint">${esc(t("Anyone with the link can view the board. To make changes, enter your team's code. This device remembers it."))}</p>
    <label class="f"><span>${esc(t("Team code"))}</span><input id="teamCode" name="tcode" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" required placeholder="${esc(t("Ask your captain"))}"></label>`, {
    submitLabel: t("Unlock"),
    onSubmit: async (f) => {
      const code = f.tcode.value.trim();
      if (!code) { toast(t("Enter the team code first.")); return false; }
      let r; try { r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", "x-team-code": code }, body: JSON.stringify({ action: "verify" }) }); }
      catch (e) { toast(t("Couldn't check the code. Check your connection and try again.")); return false; }
      if (r.status === 401) { toast(t("That team code isn't right.")); f.tcode.select(); return false; }
      if (!r.ok) { let j = null; try { j = await r.json(); } catch (e) {} toast((j && j.error) || t("Couldn't check the code. Try again in a moment.")); return false; }
      setCode(code); S.readOnly = false; render(); toast(t("Editing unlocked")); setTimeout(maybeAutoSync, 500); return true;
    },
  });
}

async function writeDoc(col, id, data) {
  const clean = JSON.parse(JSON.stringify(data)); delete clean.id;
  clean.updatedAt = new Date().toISOString();
  const list = S[col];
  const i = list.findIndex(x => x.id === id); const row = { ...clean, id };
  if (i >= 0) list[i] = row; else list.push(row);
  if (S.mode === "api") { render(); const ok = await apiWrite({ action: "set", col, id, data: clean }); if (!ok) render(); return ok; }
  localPersist(); render(); return true;
}
async function deleteDoc(col, id) {
  S[col] = S[col].filter(x => x.id !== id);
  if (S.mode === "api") { render(); const ok = await apiWrite({ action: "delete", col, id }); if (!ok) render(); return ok; }
  localPersist(); render(); return true;
}
async function saveMeta(meta) {
  S.meta = { ...S.meta, ...meta };
  if (S.mode === "api") { if (!(await apiWrite({ action: "meta", data: { teamName: S.meta.teamName } }))) return false; }
  else localPersist();
  renderHeader(); return true;
}
async function writeMany(ops) {
  const stamp = new Date().toISOString();
  ops = ops.map(o => o.action === "delete" ? o : { ...o, data: { ...JSON.parse(JSON.stringify(o.data)), updatedAt: stamp } });
  ops.forEach(o => { if (o.data) delete o.data.id; if (o.action === "delete") S[o.col] = S[o.col].filter(x => x.id !== o.id); else { const l = S[o.col]; const i = l.findIndex(x => x.id === o.id); const row = { ...o.data, id: o.id }; if (i >= 0) l[i] = row; else l.push(row); } });
  render();
  if (S.mode !== "api") { localPersist(); return true; }
  for (let i = 0; i < ops.length; i += 100) { if (!(await apiWrite({ action: "batch", ops: ops.slice(i, i + 100) }))) return false; }
  return true;
}
async function loadExamples() {
  const ex = exampleBoard();
  const ops = [];
  for (const c of COLS) for (const row of ex[c]) {
    if ((c === "scouting" || c === "fearless") && S[c].some(x => x.id === row.id)) continue;
    ops.push({ action: "set", col: c, id: row.id, data: row });
  }
  if (await writeMany(ops)) toast(t("Example team loaded"));
}
async function clearExamples() {
  const ops = [];
  COLS.forEach(c => S[c].filter(x => x.example).forEach(x => ops.push({ action: "delete", col: c, id: x.id })));
  if (await writeMany(ops)) toast(t("Examples cleared"));
}

/* ---------- Dates ---------- */
const READY_N = 5;
function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function parseYmd(s) { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function weekStart(offset) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7); return d; }
function weekDates(offset) { const s = weekStart(offset); return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; }); }
function fmt(d, opts) { try { return d.toLocaleDateString(locale(), opts || { day: "numeric", month: "short" }); } catch (e) { return ymd(d); } }
function wd(d) { return fmt(d, { weekday: "short" }).replace(/\.$/, ""); }
function todayYmd() { return ymd(new Date()); }

/* ---------- Schedule data ---------- */
function squad() {
  const me = getMe();
  return sortedPlayers().sort((a, b) => (a.id === me ? -1 : 0) - (b.id === me ? -1 : 0) || (a.sub ? 1 : 0) - (b.sub ? 1 : 0));
}
function availId(date, pid) { return `${date}_${pid}`; }
function availOf(pid, date) { const a = S.avail.find(x => x.id === availId(date, pid)); return a ? a.status : ""; }
function dayInfo(date) {
  const ps = S.players;
  const yes = ps.filter(p => availOf(p.id, date) === "yes");
  const starters = ps.filter(p => !p.sub);
  const startersIn = starters.length >= 5 && starters.every(p => availOf(p.id, date) === "yes");
  return { yes, ready: yes.length >= READY_N, startersIn };
}
function cntText(n) { return n > READY_N ? `${READY_N}+${n - READY_N}` : `${n}/${READY_N}`; }
function scrimsOn(date) { return S.scrims.filter(x => x.date === date).sort((a, b) => String(a.time).localeCompare(String(b.time))); }
function upcomingScrims() { const td = todayYmd(); return S.scrims.filter(x => x.date >= td).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)); }
function pastScrims() { const td = todayYmd(); return S.scrims.filter(x => x.date < td).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)); }
function recordOf(list) { const r = { w: 0, l: 0, d: 0 }; list.forEach(x => { if (x.result === "win") r.w++; else if (x.result === "loss") r.l++; else if (x.result === "draw") r.d++; }); return r; }
function sameTeam(a, b) { return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase() && !!String(a || "").trim(); }

/* ---------- Fearless data ---------- */
function series() { const f = S.fearless.find(x => x.id === "series"); return { enabled: false, game: 1, locked: [], ...(f || {}) }; }
function lockedEntry(champ) {
  if (!champ) return null;
  const s = series(); if (!s.enabled) return null;
  const n = champName(champ).toLowerCase();
  return (s.locked || []).find(l => champName(l.champ).toLowerCase() === n) || null;
}
async function saveSeries(next) { const cur = S.fearless.find(x => x.id === "series"); const data = { ...series(), ...next }; delete data.id; if (cur && cur.example) data.example = true; return writeDoc("fearless", "series", data); }

/* ---------- Scouting data ---------- */
const SCOUT_FIELDS = ["opponent", "matchDate", "powerPicks", "weaknesses", "gameplan"];
function scoutSaved() { return S.scouting.find(x => x.id === "next") || {}; }
function scoutValues() { return { ...Object.fromEntries(SCOUT_FIELDS.map(k => [k, scoutSaved()[k] || ""])), ...(S.scoutDraft || {}) }; }
function mentionedChamps(text) {
  const s = " " + String(text || "").toLowerCase().replace(/\.(?=\s|$)/g, " ").replace(/[^a-z0-9'.& ]+/g, " ") + " ";
  const found = [];
  for (const c of CHAMPS.values()) { const n = c.name.toLowerCase(); if (s.includes(" " + n + " ") && !found.includes(c.name)) found.push(c.name); }
  return found.slice(0, 16);
}

/* ---------- Analysis ---------- */
function poolHas(p, champ) { const n = champName(champ).toLowerCase(); return (p.champions || []).find(c => champName(c.champ).toLowerCase() === n); }
function compStats(comp) {
  let ad = 0, ap = 0, front = 0, known = 0, filled = 0;
  const flags = [], perPick = {};
  for (const r of ROLES) {
    const pk = (comp.picks || {})[r.k] || {};
    const info = champInfo(pk.champ);
    const out = { info, note: null };
    if (pk.champ) filled++;
    if (info) { known++; if (info.d === "P") ad += 1; else if (info.d === "M") ap += 1; else { ad += .5; ap += .5; } if (info.t) front++; }
    const pl = pk.playerId ? playerById(pk.playerId) : null;
    if (pk.champ && pl) {
      const entry = poolHas(pl, pk.champ);
      if (!entry) out.note = { cls: "bad", text: t("Not in {name}'s pool", { name: pl.name }) };
      else if (entry.tier === "learning") out.note = { cls: "warn", text: t("{name} is still learning this", { name: pl.name }) };
      else if (entry.tier === "pocket") out.note = { cls: "warn", text: t("Pocket pick") };
      else out.note = { cls: "good", text: t(TIER[entry.tier].name + " pick") };
      if (pl.primaryRole !== r.k && !(pl.secondaryRoles || []).includes(r.k)) flags.push({ cls: "warn", text: t("{name} is off-role at {role}", { name: pl.name, role: r.code }) });
    } else if (pk.champ && !pk.playerId) out.note = { cls: "warn", text: t("No player assigned") };
    const lk = lockedEntry(pk.champ);
    if (lk) { out.note = { cls: "bad", text: t("Used in game {g} (fearless)", { g: lk.game }) }; out.locked = true; }
    perPick[r.k] = out;
  }
  const ids = ROLES.map(r => ((comp.picks || {})[r.k] || {}).playerId).filter(Boolean);
  [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].forEach(id => { const p = playerById(id); if (p) flags.push({ cls: "bad", text: t("{name} is assigned twice", { name: p.name }) }); });
  const nLocked = Object.values(perPick).filter(x => x.locked).length;
  if (nLocked) flags.push({ cls: "bad", text: tn(nLocked, "{n} pick locked by fearless draft", "{n} picks locked by fearless draft") });
  const total = ad + ap;
  if (known >= 4) {
    if (ap / total < 0.25) flags.push({ cls: "warn", text: t("Almost all AD: easy for them to stack armor") });
    else if (ad / total < 0.25) flags.push({ cls: "warn", text: t("Almost all AP: easy for them to stack magic resist") });
    if (front === 0) flags.push({ cls: "bad", text: t("No frontline") });
  }
  if (filled < 5) flags.push({ cls: "warn", text: tn(5 - filled, "{n} pick open", "{n} picks open") });
  const pickIssues = Object.values(perPick).some(x => x.note && x.note.cls !== "good");
  if (!flags.length && !pickIssues && filled === 5) flags.push({ cls: "good", text: t("Balanced damage, everyone on a practised pick") });
  return { ad, ap, total, front, perPick, flags };
}

/* ---------- Example board ---------- */
function exampleBoard() {
  const b = JSON.parse(JSON.stringify(EXAMPLE));
  const days = weekDates(0).map(ymd);
  const prev = weekDates(-1).map(ymd);
  // Tue and Sat reach five; Thu is one short
  const pattern = { "ex-p1": "yyyyny ", "ex-p2": "nyyyyyn", "ex-p3": "yy yyyn", "ex-p4": "ny nyy ", "ex-p5": "yyyy yy", "ex-p6": " y nyyy" };
  b.avail = [];
  Object.entries(pattern).forEach(([pid, pat]) => [...pat].forEach((ch, i) => { if (ch === "y" || ch === "n") b.avail.push({ id: availId(days[i], pid), example: true, date: days[i], playerId: pid, status: ch === "y" ? "yes" : "no" }); }));
  b.scrims = [
    { id: "ex-s0", example: true, date: prev[3], time: "19:30", opponent: "Northgate Esports", format: "Bo3", result: "loss", score: "1-2", review: "Lost both games where Azir got picked. Ban him next time.", vod: "" },
    { id: "ex-s00", example: true, date: prev[5], time: "18:00", opponent: "Lowtide Gaming", format: "Bo3", result: "win", score: "2-0", review: "Early dragon setups worked well.", vod: "" },
    { id: "ex-s1", example: true, date: days[1], time: "19:00", opponent: "Northgate Esports", format: "Bo3", notes: "Fearless draft. Lobby invite from their captain." },
    { id: "ex-s2", example: true, date: days[3], time: "20:00", opponent: "Crimson Vale Academy", format: "Bo1", notes: "" },
    { id: "ex-s3", example: true, date: days[5], time: "17:00", opponent: "Lowtide Gaming", format: "Block (3 games)", notes: "Practice the protect-the-carry comp." },
  ];
  b.fearless = [{ id: "series", example: true, enabled: true, game: 2, locked: [
    { champ: "Ornn", game: 1, side: "us" }, { champ: "Vi", game: 1, side: "us" }, { champ: "Orianna", game: 1, side: "us" }, { champ: "Kai'Sa", game: 1, side: "us" }, { champ: "Rakan", game: 1, side: "us" },
    { champ: "Azir", game: 1, side: "them" }, { champ: "Lee Sin", game: 1, side: "them" }, { champ: "Jinx", game: 1, side: "them" },
  ] }];
  b.scouting = [{ id: "next", example: true, opponent: "Northgate Esports", matchDate: days[1],
    powerPicks: "Azir and Taliyah in mid: their mid player is a control mage one-trick\nLee Sin and Xin Zhao for early jungle pressure\nBan: Azir, Lee Sin, Kalista",
    weaknesses: "Bot lane gets caught without vision after 15 minutes\nTop plays weakside and rarely teleports bot\nSlow to contest the first Void Grubs",
    gameplan: "Play for early dragons around our bot lane with Vi and Rakan\nBan Azir; first-pick Orianna if it's open\nGroup mid after first tower and force the fight at second dragon" }];
  return b;
}

/* ---------- Header ---------- */
function renderHeader() {
  document.getElementById("teamName").textContent = S.meta.teamName || t("Our Team");
  document.getElementById("renameBtn").hidden = S.readOnly;
  const st = document.getElementById("status"), tx = document.getElementById("statusText");
  st.className = "status";
  if (S.mode === "loading") tx.textContent = t("Connecting…");
  else if (S.mode === "local") { st.classList.add("local"); tx.textContent = t("Saved in this browser only"); }
  else if (S.stale) { st.classList.add("local"); tx.textContent = t("Reconnecting…"); }
  else if (S.readOnly) { st.classList.add("ro"); tx.textContent = t("View only"); }
  else tx.textContent = t("Live with your team");
  const cb = document.getElementById("codeBtn");
  cb.hidden = S.mode !== "api" || !!S.error;
  if (S.mode === "api") {
    if (S.readOnly) { cb.className = "btn small primary"; cb.innerHTML = I.key + `<span>${esc(t("Unlock editing"))}</span>`; cb.removeAttribute("aria-label"); cb.title = ""; }
    else { cb.className = "iconbtn"; cb.innerHTML = I.lock; cb.setAttribute("aria-label", t("Lock editing on this device")); cb.title = t("Lock editing on this device"); }
  }
  document.getElementById("nPlayers").textContent = S.players.length || "";
  document.getElementById("nComps").textContent = S.comps.length || "";
  document.getElementById("nScrims").textContent = upcomingScrims().length || "";
  const sr = series(); document.getElementById("nLocked").textContent = sr.enabled && sr.locked.length ? sr.locked.length : "";
  document.querySelectorAll(".tabs a").forEach(a => { if (a.dataset.view === S.view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
}

/* ---------- Render ---------- */
function render() {
  renderHeader();
  const v = document.getElementById("view");
  if (S.error) { v.innerHTML = `<div class="notice warn">${esc(S.error)}</div>`; return; }
  if (!S.loaded) { v.innerHTML = `<div class="skel" aria-busy="true"><p class="hint">${esc(S.stale ? t("The team data can't be reached yet. It will appear here as soon as it loads.") : t("Loading the board…"))}</p><div class="sk"></div><div class="sk"></div></div>`; return; }
  // Don't replace the view while someone is typing in it; render again once they leave the field
  const ae = document.activeElement;
  if (ae && v.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && v.dataset.shown === S.view) { S.pendingRender = true; return; }
  S.pendingRender = false;
  const hasEx = COLS.some(c => S[c].some(x => x.example));
  const exBanner = hasEx && !S.readOnly ? `<div class="notice"><span>${t("You're looking at <b>example data</b>. Add your own team, then clear the examples.")}</span><button class="btn small" data-act="clear-ex" type="button">${esc(t("Clear examples"))}</button></div>` : "";
  const views = { roster: viewRoster, team: viewTeam, comps: viewComps, draft: viewDraft, schedule: viewSchedule, fearless: viewFearless, scouting: viewScouting };
  v.innerHTML = (views[S.view] || viewRoster)() + exBanner;
  if (v.dataset.shown === S.view) v.classList.add("settled"); else { v.classList.remove("settled"); v.dataset.shown = S.view; }
}
function pagehead(title, desc, actions) { return `<div class="pagehead"><div><h2>${esc(title)}</h2><p>${esc(desc)}</p></div>${actions ? `<div class="actions">${actions}</div>` : ""}</div>`; }
function btn(act, label, icon, cls, extra) { return `<button class="btn${cls ? " " + cls : ""}" data-act="${act}" type="button"${extra || ""}>${icon || ""}${esc(label)}</button>`; }
function unlockRow() { return S.mode === "api" ? `<div class="row">${btn("unlock", t("Unlock editing"), I.key, "primary")}</div>` : ""; }

/* ---------- Roster ---------- */
function viewEmptyRoster() {
  return `<div class="empty"><h3>${esc(t("No players yet"))}</h3><p>${esc(t("Add each player with their roles, champion pool, and what they're good and bad at. Everyone who opens this page sees the same board."))}</p>
  ${S.readOnly ? unlockRow() : `<div class="row">${btn("add-player", t("Add a player"), I.plus, "primary")}${btn("load-ex", t("Load an example team"))}</div>`}</div>`;
}
function lineupStrip() {
  const ps = S.players;
  return `<div class="lineup">${ROLES.map(r => {
    const mains = ps.filter(p => p.primaryRole === r.k && !p.sub);
    const subs = ps.filter(p => !mains.includes(p) && (p.primaryRole === r.k || (p.secondaryRoles || []).includes(r.k)));
    const state = !mains.length ? ["bad", t("Open")] : subs.length ? ["", t("Covered")] : ["warn", t("No backup")];
    return `<div class="slot${mains.length ? "" : " open"}"><div class="slot-top"><span class="role">${ri(r.k)}${r.code}</span><span class="state ${state[0]}">${esc(state[1])}</span></div>
      <div class="who">${mains.length ? esc(mains.map(m => m.name).join(" / ")) : "—"}</div>
      <div class="meta">${subs.length ? esc(t(mains.length ? "Backup: {names}" : "Can fill: {names}", { names: subs.map(s => s.name).join(", ") })) : esc(mains.length ? t("Nobody else plays this") : t("Nobody plays this yet"))}</div></div>`;
  }).join("")}</div>`;
}
function viewRoster() {
  const canSync = S.mode === "api" && !S.readOnly && S.players.some(p => p.ign);
  const top = pagehead(t("Roster"), t("Who plays what, how deep their pools go, and where they need cover."), S.readOnly ? "" : (canSync ? btn("rank-sync", rankBusy ? t("Syncing ranks…") : t("Sync ranks"), I.sync, "", rankBusy ? " disabled" : "") : "") + btn("add-player", t("Add player"), I.plus, "primary"));
  if (!S.players.length) return top + viewEmptyRoster();
  const f = S.roleFilter;
  const plays = (p, k) => p.primaryRole === k || (p.secondaryRoles || []).includes(k);
  const shown = sortedPlayers().sort((a, b) => (a.sub ? 1 : 0) - (b.sub ? 1 : 0)).filter(p => f === "all" || plays(p, f));
  const filters = `<div class="filters" role="group" aria-label="${esc(t("Filter by role"))}"><button class="fchip" type="button" data-act="filter" data-val="all" aria-pressed="${f === "all"}">${esc(t("All"))} <span class="c">${S.players.length}</span></button>${ROLES.map(r => `<button class="fchip" type="button" data-act="filter" data-val="${r.k}" aria-pressed="${f === r.k}">${ri(r.k)}${r.code} <span class="c">${S.players.filter(p => plays(p, r.k)).length}</span></button>`).join("")}</div>`;
  return top + lineupStrip() + filters + (shown.length ? `<div class="grid">${shown.map(playerCard).join("")}</div>` : `<div class="empty"><h3>${esc(t("Nobody plays {role}", { role: ROLE[f]?.name || "" }))}</h3><p>${esc(t("No player has this as a main or backup role yet."))}</p></div>`);
}
function playerCard(p) {
  const r = ROLE[p.primaryRole];
  const secs = (p.secondaryRoles || []).filter(k => k !== p.primaryRole).map(k => ROLE[k]?.code).filter(Boolean);
  const pool = TIERS.map(tr => {
    const cs = (p.champions || []).filter(c => (c.tier || "comfort") === tr.k);
    if (!cs.length) return "";
    return `<div class="tier-row"><span class="label">${esc(t(tr.name))}</span><div class="chips">${cs.map(c => { const lk = lockedEntry(c.champ); return `<span class="chip ${tr.k}${lk ? " locked" + (lk.side === "them" ? " them" : "") : ""}"${lk ? ` title="${esc(t("Used in game {g} (fearless)", { g: lk.game }))}"` : ""}>${champIcon(c.champ)}${esc(champName(c.champ))}${lk ? `<small>G${lk.game}</small>` : c.role && c.role !== p.primaryRole && ROLE[c.role] ? `<small>${ROLE[c.role].code}</small>` : ""}</span>`; }).join("")}</div></div>`;
  }).join("");
  const li = (arr) => arr && arr.length ? arr.map(x => `<li>${esc(t(x))}</li>`).join("") : `<li class="none">${esc(t("None added"))}</li>`;
  const rk = rankText(p);
  return `<article class="card">
    <div class="card-head">
      <span class="role-tile">${r ? ri(r.k) + r.code : "—"}</span>
      <div><h3>${esc(p.name || t("Unnamed"))}${p.ign ? `<span class="ign">${esc(p.ign)}</span>` : ""}</h3>
        <div class="meta-line">${p.sub ? `<span class="subtag">${esc(t("Sub"))}</span>` : ""}${p.example ? `<span class="tag-ex">${esc(t("Example"))}</span>` : ""}${p.ranked && p.ranked.solo ? `<span class="rank" data-rk="${esc(p.ranked.solo.tier.toLowerCase())}">${esc(t(cap1(p.ranked.solo.tier)) + (p.ranked.solo.division ? " " + p.ranked.solo.division : ""))}</span><span class="lp">${p.ranked.solo.lp} LP</span>` : rk ? `<span class="rank" data-rk="${esc(String(p.rank || "").toLowerCase())}">${esc(rk)}</span>` : ""}${p.style ? `<span>${esc(t(p.style))}</span>` : ""}${secs.length ? `<span>${esc(t("Also {roles}", { roles: secs.join(", ") }))}</span>` : ""}</div>
      </div>
      ${S.mode === "api" && !S.readOnly && p.ign ? `<button class="iconbtn${rankBusy && (!S.rankBusyIds || S.rankBusyIds.includes(p.id)) ? " spin" : ""}" data-act="rank-one" data-id="${esc(p.id)}" type="button" aria-label="${esc(t("Sync rank for {name}", { name: p.name }))}" title="${esc(p.ranked && p.ranked.syncedAt ? t("Rank synced {when}", { when: ago(p.ranked.syncedAt) }) : t("Sync rank from Riot"))}"${rankBusy ? " disabled" : ""}>${I.sync}</button>` : ""}
      ${S.readOnly ? "" : `<button class="iconbtn" data-act="edit-player" data-id="${esc(p.id)}" type="button" aria-label="${esc(t("Edit {name}", { name: p.name }))}" title="${esc(t("Edit"))}">${I.edit}</button>`}
    </div>
    <div class="card-body">
      ${rankedBlock(p)}
      <div class="pool" style="display:grid;gap:8px">${pool || `<span class="formhint">${esc(t("No champions added yet."))}</span>`}</div>
      <div class="sw"><div><span class="label">${esc(t("Strengths"))}</span><ul class="plus">${li(p.strengths)}</ul></div><div><span class="label">${esc(t("Weaknesses"))}</span><ul class="minus">${li(p.weaknesses)}</ul></div></div>
      ${p.notes ? `<p class="notes">${esc(p.notes)}</p>` : ""}
    </div>
  </article>`;
}

function rankedBlock(p) {
  const r = p.ranked; if (!r) return "";
  if (r.error === "not_found") return `<p class="rankrow warn">${esc(t("Riot ID {id} wasn't found on {server}. Check the spelling and the server in the player's settings.", { id: r.riotId || p.ign, server: (SERVERS.find(x => x[0] === r.platform) || [0, r.platform])[1] }))}</p>`;
  const rows = [["Solo/Duo", r.solo], ["Flex", r.flex]].filter(x => x[1]);
  if (!rows.length) return `<p class="rankrow"><span class="label">${esc(t("Ranked"))}</span><span class="hint">${esc(t("No ranked games this split"))}</span><span class="when">${esc(ago(r.syncedAt))}</span></p>`;
  return `<div class="rankrow">${rows.map(([q, e]) => `<span class="q"><span class="label">${esc(t(q))}</span><span>${esc(queueLine(e))}</span>${e.hotStreak ? `<span class="streak">${esc(t("Win streak"))}</span>` : ""}</span>`).join("")}<span class="when">${esc(ago(r.syncedAt))}</span></div>`;
}

/* ---------- Team map ---------- */
function viewTeam() {
  const top = pagehead(t("Team map"), t("Role coverage, champion depth per position, and the patterns across the whole team."));
  if (!S.players.length) return top + viewEmptyRoster();
  const ps = sortedPlayers();
  const rows = ps.map(p => `<tr><td>${esc(p.name)}${p.sub ? ` <span class="subtag">${esc(t("Sub"))}</span>` : ""}</td>${ROLES.map(r => {
    const n = (p.champions || []).filter(c => c.role === r.k && c.tier !== "learning").length;
    if (p.primaryRole === r.k) return `<td><span class="cell main">${esc(t("MAIN"))} · ${n}</span></td>`;
    if ((p.secondaryRoles || []).includes(r.k)) return `<td><span class="cell sec">${esc(t("ALT"))} · ${n}</span></td>`;
    if (n) return `<td><span class="cell pool">${n}</span></td>`;
    return `<td><span class="cell none">—</span></td>`;
  }).join("")}</tr>`).join("");
  const foot = `<tr><td class="label">${esc(t("Cover"))}</td>${ROLES.map(r => {
    const m = ps.filter(p => p.primaryRole === r.k && !p.sub).length, s = ps.filter(p => (p.primaryRole === r.k && p.sub) || ((p.secondaryRoles || []).includes(r.k) && p.primaryRole !== r.k)).length;
    return `<td>${!m ? `<span class="flag bad">${esc(t("No main"))}</span>` : !s ? `<span class="flag warn">${esc(t("No backup"))}</span>` : `<span class="flag good">${m}+${s}</span>`}</td>`;
  }).join("")}</tr>`;
  const coverage = `<section class="panel"><div class="panel-head"><h3>${esc(t("Role coverage"))}</h3><p class="hint">${esc(t("Numbers are draft-ready champions (main, comfort or pocket) per role."))}</p></div>
    <div class="scroll"><table class="cov"><thead><tr><th>${esc(t("Player"))}</th>${ROLES.map(r => `<th>${ri(r.k)}${r.code}</th>`).join("")}</tr></thead><tbody>${rows}</tbody><tfoot>${foot}</tfoot></table></div></section>`;
  const order = { main: 0, comfort: 1, pocket: 2, learning: 3 };
  const depth = ROLES.map(r => {
    const items = [];
    ps.forEach(p => (p.champions || []).forEach(c => { if (c.role === r.k) items.push({ c, p }); }));
    items.sort((a, b) => (order[a.c.tier] ?? 1) - (order[b.c.tier] ?? 1) || champName(a.c.champ).localeCompare(champName(b.c.champ)));
    const ready = items.filter(i => i.c.tier === "main" || i.c.tier === "comfort").length;
    return `<div class="depth-col"><header><span class="role">${ri(r.k)}${r.code}</span><span class="count">${esc(t("{n} ready", { n: ready }))}</span></header>
      ${ready < 3 ? `<span class="flag ${ready === 0 ? "bad" : "warn"}">${esc(ready === 0 ? t("No reliable picks") : t("Thin: easy to ban out"))}</span>` : ""}
      ${items.length ? items.map(i => `<div class="depth-item"><span><i class="tdot ${esc(i.c.tier)}"></i>${champIcon(i.c.champ, "md")}${esc(champName(i.c.champ))}</span><span class="by">${esc(i.p.name)}</span></div>`).join("") : `<span class="formhint">${esc(t("No champions"))}</span>`}</div>`;
  }).join("");
  const depthPanel = `<section class="panel"><div class="panel-head"><h3>${esc(t("Champion depth by position"))}</h3><div class="legend">${TIERS.map(x => `<span><i class="tdot ${x.k}"></i>${esc(t(x.name))}</span>`).join("")}</div></div>
    <p class="hint">${esc(t("A position with fewer than three main or comfort picks can be banned out in draft."))}</p><div class="depth">${depth}</div></section>`;
  const byChamp = new Map();
  ps.forEach(p => (p.champions || []).forEach(c => { const n = champName(c.champ); if (!n) return; const k = n.toLowerCase(); if (!byChamp.has(k)) byChamp.set(k, { name: n, entries: [] }); if (!byChamp.get(k).entries.some(e => e.p.id === p.id)) byChamp.get(k).entries.push({ p, c }); }));
  const shared = [...byChamp.values()].filter(x => x.entries.length > 1);
  const sharedPanel = `<section class="panel"><h3>${esc(t("Shared champions"))}</h3><p class="hint">${esc(t("Champions in more than one pool. Across roles they're flex picks; in the same role, agree on who gets them."))}</p>
    ${shared.length ? `<ul class="list">${shared.map(x => { const roles = new Set(x.entries.map(e => e.c.role)); return `<li><span style="display:flex;align-items:center;gap:8px;min-width:0">${champIcon(x.name, "md")}<span><b>${esc(x.name)}</b> <span class="hint">${esc(x.entries.map(e => `${e.p.name} (${ROLE[e.c.role]?.code || "?"})`).join(", "))}</span></span></span><span class="flag ${roles.size > 1 ? "good" : "warn"}">${esc(roles.size > 1 ? t("Flex pick") : t("Same role"))}</span></li>`; }).join("")}</ul>` : `<span class="formhint">${esc(t("No overlapping champions yet."))}</span>`}</section>`;
  let ad = 0, ap = 0, fr = 0, cnt = 0;
  ps.forEach(p => (p.champions || []).forEach(c => { if (c.tier !== "main" && c.tier !== "comfort") return; const i = champInfo(c.champ); if (!i) return; cnt++; if (i.d === "P") ad++; else if (i.d === "M") ap++; else { ad += .5; ap += .5; } if (i.t) fr++; }));
  const tot = ad + ap || 1;
  const dmgPanel = `<section class="panel"><h3>${esc(t("Damage across reliable picks"))}</h3><p class="hint">${esc(t("Main and comfort champions only. A lopsided team is easier to itemize against."))}</p>
    <div class="dbar"><span class="ad" style="width:${(ad / tot * 100).toFixed(1)}%"></span><span class="ap" style="width:${(ap / tot * 100).toFixed(1)}%"></span></div>
    <div class="dlegend"><span class="a"><b>${Math.round(ad / tot * 100)}%</b> AD</span><span class="p"><b>${Math.round(ap / tot * 100)}%</b> AP</span><span><b>${fr}</b> ${esc(t("frontline options"))}</span><span><b>${cnt}</b> ${esc(t("champions"))}</span></div></section>`;
  const tally = (key) => { const m = new Map(); ps.forEach(p => (p[key] || []).forEach(x => { const k = x.toLowerCase(); if (!m.has(k)) m.set(k, { x, who: [] }); m.get(k).who.push(p.name); })); return [...m.values()].sort((a, b) => b.who.length - a.who.length || a.x.localeCompare(b.x)); };
  const tagList = (arr) => arr.length ? `<ul class="list">${arr.map(x => `<li><span>${esc(t(x.x))}</span><span class="count">${esc(x.who.join(", "))}</span></li>`).join("")}</ul>` : `<span class="formhint">${esc(t("Nothing added yet."))}</span>`;
  return top + coverage + depthPanel + `<div class="two">${sharedPanel}${dmgPanel}</div><div class="two"><section class="panel"><h3>${esc(t("Team strengths"))}</h3>${tagList(tally("strengths"))}</section><section class="panel"><h3>${esc(t("Weaknesses to cover"))}</h3>${tagList(tally("weaknesses"))}</section></div>`;
}

/* ---------- Comps ---------- */
function viewComps() {
  const top = pagehead(t("Comps"), t("Full five-player drafts. Each pick is checked against that player's pool, and the comp gets a damage and frontline read."), S.readOnly ? "" : btn("add-comp", t("New comp"), I.plus, "primary"));
  if (!S.comps.length) return top + `<div class="empty"><h3>${esc(t("No comps yet"))}</h3><p>${esc(t("A comp is five champions with a player on each, a win condition, and what it's weak against."))}</p>${S.readOnly ? "" : `<div class="row">${btn("add-comp", t("Plan a comp"), I.plus, "primary")}</div>`}</div>`;
  return top + `<div class="comps">${[...S.comps].sort((a, b) => String(a.name).localeCompare(b.name)).map(compCard).join("")}</div>`;
}
function compCard(c) {
  const st = compStats(c);
  const a = ARCH[c.archetype];
  const picks = ROLES.map(r => {
    const pk = (c.picks || {})[r.k] || {};
    const pl = pk.playerId ? playerById(pk.playerId) : null;
    const pp = st.perPick[r.k];
    return `<div class="pick"><span class="role">${ri(r.k)}${r.code}</span>
      <div class="portrait">${pk.champ ? champIcon(pk.champ, "lg") : `<span class="empty-slot"></span>`}<div style="display:grid;gap:3px;min-width:0"><div class="champ${pk.champ ? "" : " empty-pick"}">${pk.champ ? esc(champName(pk.champ)) : esc(t("Open"))}</div><div class="player">${pl ? esc(pl.name) : esc(pk.playerId ? t("Removed player") : t("No player"))}</div></div></div>
      ${pp.info ? `<span class="dmg ${pp.info.d}">${esc(t(DMG_LABEL[pp.info.d]))}${pp.info.t ? " · " + esc(t("Frontline")) : ""}</span>` : ""}
      ${pp.note ? `<span class="pf ${pp.note.cls}">${esc(pp.note.text)}</span>` : ""}</div>`;
  }).join("");
  const tot = st.total || 1;
  return `<article class="comp">
    <div class="comp-head"><div><span class="arch">${esc(a ? t(a.name) : t("No archetype"))}${c.example ? `<span class="tag-ex">${esc(t("Example"))}</span>` : ""}</span><h3>${esc(c.name || t("Untitled comp"))}</h3></div>
      ${S.readOnly ? "" : btn("edit-comp", t("Edit"), I.edit, "small", ` data-id="${esc(c.id)}"`)}</div>
    <div class="picks">${picks}</div>
    <div class="comp-body">
      <div class="profile"><div class="dbar" role="img" aria-label="${esc(t("Damage split {ad}% AD, {ap}% AP", { ad: Math.round(st.ad / tot * 100), ap: Math.round(st.ap / tot * 100) }))}"><span class="ad" style="width:${(st.ad / tot * 100).toFixed(1)}%"></span><span class="ap" style="width:${(st.ap / tot * 100).toFixed(1)}%"></span></div>
        <div class="dlegend"><span class="a"><b>${Math.round(st.ad / tot * 100)}%</b> AD</span><span class="p"><b>${Math.round(st.ap / tot * 100)}%</b> AP</span><span><b>${st.front}</b> ${esc(t("frontline"))}</span></div></div>
      <div class="flags">${st.flags.map(f => `<span class="flag ${f.cls}">${esc(f.text)}</span>`).join("")}</div>
      <div class="plan">
        <div><span class="label">${esc(t("Win condition"))}</span><p class="${c.winCondition ? "" : "na"}">${esc(c.winCondition || t("Not written yet"))}</p></div>
        <div><span class="label">${esc(t("Weak against"))}</span><p class="${c.weakAgainst ? "" : "na"}">${esc(c.weakAgainst || t("Not written yet"))}</p></div>
        <div><span class="label">${esc(t("Target bans"))}</span><p class="${c.bans ? "" : "na"}">${esc(c.bans || t("None"))}</p></div>
      </div>
      ${c.notes ? `<p class="notes">${esc(c.notes)}</p>` : ""}
    </div></article>`;
}

/* ---------- Schedule ---------- */
function viewSchedule() {
  const acts = (S.players.length ? btn("copy-week", t("Copy for Discord"), I.copy) + btn("ics", t("Export calendar"), I.cal) : "") + (S.readOnly ? "" : btn("add-scrim", t("Add scrim"), I.plus, "primary"));
  const top = pagehead(t("Schedule"), t("Everyone marks the days they can play. A day lights up as ready once {n} players are free.", { n: READY_N }), acts);
  if (!S.players.length) return top + `<div class="empty"><h3>${esc(t("Add your players first"))}</h3><p>${esc(t("The schedule lists everyone on the roster. Add your starters and subs on the Roster tab, then come back to mark availability."))}</p></div>`;
  const dates = weekDates(S.weekOffset), keys = dates.map(ymd), today = todayYmd();
  const ps = squad(), me = getMe();
  const info = keys.map(dayInfo);
  const off = S.weekOffset;
  const rel = off === 0 ? t("This week") : off === 1 ? t("Next week") : off === -1 ? t("Last week") : off > 0 ? t("In {n} weeks", { n: off }) : t("{n} weeks ago", { n: -off });
  const readyCount = info.filter(x => x.ready).length;
  const bar = `<div class="weekbar">
    <div class="weeknav"><button class="iconbtn" type="button" data-act="week" data-val="-1" aria-label="${esc(t("Previous week"))}">${I.left}</button>
      <div class="weeklabel"><b>${esc(fmt(dates[0]))} – ${esc(fmt(dates[6]))}</b><span>${esc(rel)}${readyCount ? " · " + esc(tn(readyCount, "{n} day ready", "{n} days ready")) : ""}</span></div>
      <button class="iconbtn" type="button" data-act="week" data-val="1" aria-label="${esc(t("Next week"))}">${I.right}</button>
      ${off ? btn("week", t("Today"), "", "small ghost", ` data-val="0"`) : ""}</div>
    <div class="mebar"><label for="meSel">${esc(t("I am"))}</label><select id="meSel" data-me="1"><option value="">${esc(t("Choose your name"))}</option>${ps.map(p => `<option value="${esc(p.id)}"${p.id === me ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
      <span class="legend"><span><i class="av-dot yes"></i>${esc(t("Available"))}</span><span><i class="av-dot no"></i>${esc(t("Busy"))}</span><span><i class="av-dot"></i>${esc(t("Not set"))}</span></span></div></div>`;
  const hint = S.readOnly ? (S.mode === "api" ? `<p class="formhint">${esc(t("Unlock editing to mark your availability."))}</p>` : "") : `<p class="formhint">${esc(t("Tap a box to switch between available, busy and not set."))}</p>`;
  const stLabel = (s) => s === "yes" ? t("available") : s === "no" ? t("busy") : t("not set");
  const cellBtn = (p, k, i) => {
    const s = availOf(p.id, k);
    const label = `${p.name}, ${wd(dates[i])} ${fmt(dates[i])}: ${stLabel(s)}`;
    return `<button class="av ${s}" type="button" data-act="avail" data-pid="${esc(p.id)}" data-date="${k}" aria-label="${esc(label)}" title="${esc(label)}"${S.readOnly ? " disabled" : ""}>${s === "yes" ? I.check : s === "no" ? I.x : ""}</button>`;
  };
  const scrimChip = (x, ready) => `<button class="scrim-chip${ready ? "" : " short"}" type="button" data-act="edit-scrim" data-id="${esc(x.id)}"${S.readOnly ? " disabled" : ""}><b>${esc(x.time || "--:--")}</b><span>${esc(x.opponent || "TBD")}</span></button>`;
  const head = keys.map((k, i) => `<th class="${info[i].ready ? "ready" : ""}${k === today ? " today" : ""}" scope="col">
      <div class="dh"><span class="dn">${esc(wd(dates[i]))}</span><span class="dd">${esc(fmt(dates[i]))}</span></div>
      ${info[i].ready ? `<span class="ready-tag">${I.bolt}${esc(t("Ready for scrims"))}</span>` : ""}
      <div class="dscrims">${scrimsOn(k).map(x => scrimChip(x, info[i].ready)).join("")}</div>
      ${S.readOnly ? "" : `<button class="add-day" type="button" data-act="add-scrim" data-date="${k}" aria-label="${esc(t("Add scrim on {day}", { day: wd(dates[i]) }))}">${I.plus}</button>`}</th>`).join("");
  const rows = ps.map((p, pi) => `<tr class="${p.id === me ? "me" : ""}${p.sub && (pi === 0 || !ps[pi - 1].sub) && p.id !== me ? " first-sub" : ""}"><th scope="row"><span class="who-cell"><span class="role">${ri(p.primaryRole)}${ROLE[p.primaryRole]?.code || ""}</span><span class="nm">${esc(p.name)}</span>${p.sub ? `<span class="subtag">${esc(t("Sub"))}</span>` : ""}</span></th>${keys.map((k, i) => `<td class="${info[i].ready ? "ready" : ""}">${cellBtn(p, k, i)}</td>`).join("")}</tr>`).join("");
  const foot = `<tr><th scope="row" class="label">${esc(t("Available"))}</th>${info.map(x => `<td class="${x.ready ? "ready" : ""}"><span class="cnt ${x.ready ? "ok" : x.yes.length >= READY_N - 1 ? "near" : ""}">${cntText(x.yes.length)}</span>${x.ready ? `<small>${esc(x.startersIn ? t("Starting five") : t("With subs"))}</small>` : ""}</td>`).join("")}</tr>`;
  const table = `<div class="scroll avail-wrap"><table class="avail"><thead><tr><th scope="col" class="corner label">${esc(t("Player"))}</th>${head}</tr></thead><tbody>${rows}</tbody><tfoot>${foot}</tfoot></table></div>`;
  const cards = `<div class="daycards">${keys.map((k, i) => `<section class="daycard${info[i].ready ? " ready" : ""}${k === today ? " today" : ""}">
      <header><div><span class="dn">${esc(wd(dates[i]))}</span> <span class="dd">${esc(fmt(dates[i]))}</span></div><div class="dc-right">${info[i].ready ? `<span class="ready-tag">${I.bolt}${esc(t("Ready"))}</span>` : ""}<span class="cnt ${info[i].ready ? "ok" : info[i].yes.length >= READY_N - 1 ? "near" : ""}">${cntText(info[i].yes.length)}</span></div></header>
      ${scrimsOn(k).length || !S.readOnly ? `<div class="dscrims">${scrimsOn(k).map(x => scrimChip(x, info[i].ready)).join("")}${S.readOnly ? "" : `<button class="add-day inline" type="button" data-act="add-scrim" data-date="${k}">${I.plus}${esc(t("Scrim"))}</button>`}</div>` : ""}
      <div class="dc-players">${ps.map(p => `<div class="dc-p${p.id === me ? " me" : ""}"><span class="nm">${esc(p.name)}</span>${cellBtn(p, k, i)}</div>`).join("")}</div></section>`).join("")}</div>`;
  return top + bar + hint + table + cards + `<div class="two">${upcomingPanel()}${historyPanel()}</div>`;
}
function scrimMeta(x) { return [x.time, x.format ? t(x.format) : ""].filter(Boolean).join(" · "); }
function upcomingPanel() {
  const up = upcomingScrims();
  return `<section class="panel"><h3>${esc(t("Upcoming scrims"))}</h3>${up.length ? `<ul class="matches">${up.map(x => { const d = dayInfo(x.date), dt = parseYmd(x.date); return `<li>
      <div class="sdate"><b>${esc(wd(dt))}</b><span>${esc(fmt(dt))}</span></div>
      <div class="smain"><b>${esc(x.opponent || "TBD")}</b><span>${esc(scrimMeta(x))}${x.notes ? " · " + esc(x.notes) : ""}</span></div>
      <span class="flag ${d.ready ? "good" : d.yes.length >= READY_N - 1 ? "warn" : "bad"}">${esc(d.ready ? (d.startersIn ? t("Starting five") : t("With subs")) : t("{n} of {m} free", { n: d.yes.length, m: READY_N }))}</span>
      ${S.readOnly ? "" : `<button class="iconbtn" type="button" data-act="edit-scrim" data-id="${esc(x.id)}" aria-label="${esc(t("Edit scrim against {team}", { team: x.opponent }))}">${I.edit}</button>`}</li>`; }).join("")}</ul>` : `<span class="formhint">${esc(t("No scrims booked yet."))}</span>`}</section>`;
}
function resultTag(x) { return x.result ? `<span class="res ${x.result}">${esc(t({ win: "Win", loss: "Loss", draw: "Draw" }[x.result]))}${x.score ? " " + esc(x.score) : ""}</span>` : `<span class="res none">${esc(t("No result"))}</span>`; }
function historyPanel() {
  const past = pastScrims();
  const rec = recordOf(past);
  const played = rec.w + rec.l + rec.d;
  return `<section class="panel"><div class="panel-head"><h3>${esc(t("Match history"))}</h3>${played ? `<div class="record"><span class="big"><span class="w">${rec.w}</span>–<span class="l">${rec.l}</span>${rec.d ? `–${rec.d}` : ""}</span><span class="hint">${esc(t("{p}% wins over {n} scrims", { p: Math.round(rec.w / played * 100), n: played }))}</span></div>` : ""}</div>
    ${past.length ? `<ul class="matches">${past.slice(0, 8).map(x => { const dt = parseYmd(x.date); return `<li>
      <div class="sdate"><b>${esc(wd(dt))}</b><span>${esc(fmt(dt))}</span></div>
      <div class="smain"><b>${esc(x.opponent || "TBD")}</b><span>${x.review ? esc(x.review) : esc(scrimMeta(x))}${x.vod ? ` · <a href="${esc(safeUrl(x.vod))}" target="_blank" rel="noopener">VOD</a>` : ""}</span></div>
      ${resultTag(x)}
      ${S.readOnly ? "" : `<button class="iconbtn" type="button" data-act="edit-scrim" data-id="${esc(x.id)}" aria-label="${esc(t("Edit scrim against {team}", { team: x.opponent }))}">${I.edit}</button>`}</li>`; }).join("")}</ul>` : `<span class="formhint">${esc(t("Past scrims show up here. Add the result and a short review after each one."))}</span>`}</section>`;
}
function safeUrl(u) { return /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "#"; }

function editScrim(id, date) {
  const x = id ? S.scrims.find(s => s.id === id) : null;
  const d = x || { date: date || todayYmd(), time: "19:00", format: "Bo3" };
  const radio = (v, label) => `<label><input type="radio" name="sres" value="${v}"${(d.result || "") === v ? " checked" : ""}>${esc(label)}</label>`;
  openSheet(x ? t("Scrim vs {team}", { team: x.opponent || "TBD" }) : t("Add scrim"), `
  <fieldset><legend>${esc(t("Scrim"))}</legend>
    <label class="f"><span>${esc(t("Opponent"))}</span><input id="sOpp" name="opp" required value="${esc(d.opponent || "")}" placeholder="${esc(t("Team name"))}" list="oppList"></label>
    <datalist id="oppList">${[...new Set(S.scrims.map(s => s.opponent).filter(Boolean))].map(o => `<option value="${esc(o)}"></option>`).join("")}</datalist>
    <div class="frow"><label class="f"><span>${esc(t("Date"))}</span><input id="sDate" name="sdate" type="date" required value="${esc(d.date)}"></label>
    <label class="f"><span>${esc(t("Start time"))}</span><input id="sTime" name="stime" type="time" value="${esc(d.time || "")}"></label>
    <label class="f"><span>${esc(t("Format"))}</span><select id="sFmt" name="sfmt">${FORMATS.map(f => opt(f, t(f), d.format === f)).join("")}</select></label></div>
    <p class="formhint" id="sAvail"></p>
    <label class="f"><span>${esc(t("Notes"))}</span><textarea id="sNotes" name="snotes" rows="2" placeholder="${esc(t("e.g. Fearless draft, lobby details"))}">${esc(d.notes || "")}</textarea></label>
  </fieldset>
  <fieldset><legend>${esc(t("Result"))}</legend>
    <p class="formhint">${esc(t("Fill this in after the scrim. It feeds the match history and your record against this team."))}</p>
    <div class="frow"><div class="f"><span>${esc(t("Outcome"))}</span><div class="radio-row">${radio("", t("Not played"))}${radio("win", t("Win"))}${radio("loss", t("Loss"))}${radio("draw", t("Draw"))}</div></div>
    <label class="f"><span>${esc(t("Score"))}</span><input id="sScore" name="sscore" value="${esc(d.score || "")}" placeholder="2-1" maxlength="12"></label></div>
    <label class="f"><span>${esc(t("Review"))}</span><textarea id="sReview" name="sreview" rows="3" placeholder="${esc(t("What worked, what to fix next time"))}">${esc(d.review || "")}</textarea></label>
    <label class="f"><span>${esc(t("VOD link"))}</span><input id="sVod" name="svod" type="url" value="${esc(d.vod || "")}" placeholder="https://"></label>
  </fieldset>`, {
    onSubmit: async (f) => {
      const opponent = f.opp.value.trim();
      if (!opponent) { toast(t("Add the opponent's name before saving.")); f.opp.focus(); return false; }
      if (!f.sdate.value) { toast(t("Pick a date for the scrim.")); f.sdate.focus(); return false; }
      const res = (f.querySelector('[name="sres"]:checked') || {}).value || "";
      const data = { date: f.sdate.value, time: f.stime.value, opponent, format: f.sfmt.value, notes: f.snotes.value.trim(), result: res, score: f.sscore.value.trim(), review: f.sreview.value.trim(), vod: f.svod.value.trim() };
      if (x && x.example) data.example = true;
      const ok = await writeDoc("scrims", x ? x.id : uid("s-"), data);
      if (ok) toast(x ? t("Scrim updated") : t("Scrim vs {team} added", { team: opponent }));
      return ok;
    },
    onDelete: x ? async () => { const ok = await deleteDoc("scrims", x.id); if (ok) toast(t("Scrim removed")); return ok; } : null,
    deleteLabel: t("Remove scrim"),
  });
  const form = document.getElementById("sheetForm");
  const showAvail = () => { const k = form.sdate.value; const el = document.getElementById("sAvail"); if (!k) { el.textContent = ""; return; } const di = dayInfo(k); el.innerHTML = di.ready ? `<span class="flag good">${esc(t("{n} players free that day", { n: di.yes.length }))}${di.startersIn ? ", " + esc(t("starting five ready")) : ""}</span>` : `<span class="flag ${di.yes.length >= READY_N - 1 ? "warn" : "bad"}">${esc(t("Only {n} of {m} free that day", { n: di.yes.length, m: READY_N }))}${di.yes.length ? ": " + esc(di.yes.map(p => p.name).join(", ")) : ""}</span>`; };
  form.sdate.addEventListener("change", showAvail); showAvail();
}

function weekSummary() {
  const dates = weekDates(S.weekOffset), keys = dates.map(ymd);
  const out = [`**${S.meta.teamName || t("Our Team")} · ${fmt(dates[0])} – ${fmt(dates[6])}**`];
  keys.forEach((k, i) => {
    const di = dayInfo(k), sc = scrimsOn(k);
    const missing = S.players.filter(p => !p.sub && availOf(p.id, k) !== "yes").map(p => p.name);
    let line = `${wd(dates[i])} ${fmt(dates[i])}: ${di.ready ? "✅ " + t("Ready") : "⏳ " + cntText(di.yes.length)}`;
    if (sc.length) line += " · " + sc.map(x => `${x.time || ""} vs ${x.opponent}${x.format ? " (" + t(x.format) + ")" : ""}`.trim()).join(", ");
    if (!di.ready && missing.length && missing.length <= 3) line += " · " + t("missing: {names}", { names: missing.join(", ") });
    out.push(line);
  });
  return out.join("\n");
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast(t("Copied. Paste it into Discord.")); }
  catch (e) {
    openSheet(t("Copy for Discord"), `<label class="f"><span>${esc(t("Select all and copy"))}</span><textarea id="copyBox" rows="10" readonly>${esc(text)}</textarea></label>`, { submitLabel: t("Done"), onSubmit: async () => true });
    const b = document.getElementById("copyBox"); if (b) { b.focus(); b.select(); }
  }
}
function downloadIcs() {
  const up = upcomingScrims();
  if (!up.length) { toast(t("No upcoming scrims to export.")); return; }
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const escIcs = (s) => String(s || "").replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const evs = up.map(x => {
    const [h, m] = (x.time || "19:00").split(":").map(Number);
    const start = parseYmd(x.date); start.setHours(h || 0, m || 0, 0, 0);
    const hours = /Bo5/.test(x.format) ? 4 : /Bo3|3 games/.test(x.format) ? 3 : /2 games/.test(x.format) ? 2 : 1;
    const end = new Date(start.getTime() + hours * 3600e3);
    return ["BEGIN:VEVENT", `UID:${x.id}@five-stack-board`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escIcs(`Scrim vs ${x.opponent}${x.format ? " (" + x.format + ")" : ""}`)}`, x.notes ? `DESCRIPTION:${escIcs(x.notes)}` : "", "END:VEVENT"].filter(Boolean).join("\r\n");
  });
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Five-Stack Board//EN", "CALSCALE:GREGORIAN", ...evs, "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "scrims.ics"; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast(tn(up.length, "{n} scrim exported", "{n} scrims exported"));
}

/* ---------- Fearless ---------- */
function viewFearless() {
  const s = series(), canEdit = !S.readOnly;
  const top = pagehead(t("Fearless draft"), t("In a fearless series every champion can only be played once. Lock the picks from each game to see which comfort picks are still open."), canEdit ? `<button class="btn" data-act="fl-reset" type="button"${s.locked.length ? "" : " disabled"}>${esc(t("Reset series"))}</button>` : "");
  if (!S.players.length) return top + `<div class="empty"><h3>${esc(t("No champion pools yet"))}</h3><p>${esc(t("Add players and their comfort champions on the Roster tab. They'll appear here sorted by position."))}</p></div>`;
  const sw = `<button class="switch" type="button" role="switch" aria-checked="${s.enabled}" data-act="fl-toggle"${canEdit ? "" : " disabled"}><span class="knob"></span><span>${esc(t("Fearless"))} ${esc(s.enabled ? t("on") : t("off"))}</span></button>`;
  const games = `<div class="seg" role="group" aria-label="${esc(t("Game being drafted"))}">${[1, 2, 3].map(g => `<button type="button" data-act="fl-game" data-val="${g}" aria-pressed="${s.game === g}"${canEdit && s.enabled ? "" : " disabled"}>${esc(t("Game {g}", { g }))}</button>`).join("")}</div>`;
  const order = { main: 0, comfort: 1, pocket: 2 };
  const pools = ROLES.map(r => {
    const entries = [];
    S.players.forEach(p => (p.champions || []).forEach(c => { if (c.role === r.k && c.tier !== "learning" && champName(c.champ)) entries.push({ p, c }); }));
    entries.sort((a, b) => (a.p.sub ? 1 : 0) - (b.p.sub ? 1 : 0) || (order[a.c.tier] ?? 1) - (order[b.c.tier] ?? 1));
    const left = entries.filter(e => !lockedEntry(e.c.champ)).length;
    const byPlayer = new Map(); entries.forEach(e => { if (!byPlayer.has(e.p.id)) byPlayer.set(e.p.id, { p: e.p, cs: [] }); byPlayer.get(e.p.id).cs.push(e.c); });
    const chip = (c) => {
      const lk = lockedEntry(c.champ), tag = canEdit && s.enabled ? "button" : "span";
      const title = lk ? t("Used in game {g}", { g: lk.game }) + (tag === "button" ? ". " + t("Tap to unlock.") : "") : tag === "button" ? t("Tap to lock for game {g}", { g: s.game }) : t(TIER[c.tier]?.name || "");
      return `<${tag} class="chip ${esc(c.tier)}${lk ? " locked" + (lk.side === "them" ? " them" : "") : ""}"${tag === "button" ? ` type="button" data-act="fl-lock" data-champ="${esc(champName(c.champ))}" aria-pressed="${!!lk}"` : ""} title="${esc(title)}">${champIcon(c.champ)}${esc(champName(c.champ))}${lk ? `<small>G${lk.game}</small>` : ""}</${tag}>`;
    };
    return `<section class="fl-col"><header><span class="role">${ri(r.k)}${esc(r.name)}</span><span class="fl-left ${!s.enabled ? "" : left === 0 ? "bad" : left <= 2 ? "warn" : "good"}">${esc(s.enabled ? t("{n} of {m} open", { n: left, m: entries.length }) : tn(entries.length, "{n} pick", "{n} picks"))}</span></header>
      ${byPlayer.size ? [...byPlayer.values()].map(({ p, cs }) => `<div class="fl-player"><span class="label">${esc(p.name)}${p.sub ? " · " + esc(t("Sub")) : ""}</span><div class="chips">${cs.map(chip).join("")}</div></div>`).join("") : `<span class="formhint">${esc(t("No comfort picks for {role} yet.", { role: r.name }))}</span>`}</section>`;
  }).join("");
  const byGame = [1, 2, 3].map(g => ({ g, xs: s.locked.filter(l => l.game === g) })).filter(x => x.xs.length);
  const lockedPanel = `<section class="panel"><div class="panel-head"><h3>${esc(t("Locked this series"))}</h3><span class="legend"><span><i class="av-dot" style="background:var(--blue);border:0"></i>${esc(t("Our pick"))}</span><span><i class="av-dot" style="background:var(--red);border:0"></i>${esc(t("Their pick"))}</span></span></div>
    ${byGame.length ? byGame.map(({ g, xs }) => `<div class="fl-game"><span class="label">${esc(t("Game {g}", { g }))}</span><div class="chips">${xs.map(l => `<span class="chip lockitem ${l.side === "them" ? "them" : "us"}">${champIcon(l.champ)}${esc(champName(l.champ))}${canEdit ? `<button class="x" type="button" data-act="fl-unlock" data-champ="${esc(champName(l.champ))}" aria-label="${esc(t("Unlock {champ}", { champ: champName(l.champ) }))}">${I.x}</button>` : ""}</span>`).join("")}</div></div>`).join("") : `<span class="formhint">${esc(s.enabled ? t("Nothing locked yet. Tap champions above as they're picked in game {g}.", { g: s.game }) : t("Turn on fearless draft to start a series."))}</span>`}
    ${canEdit && s.enabled ? `<form class="fl-add" id="flAdd"><input id="flChamp" name="flchamp" list="champList" placeholder="${esc(t("Lock any champion, e.g. an enemy pick"))}" autocomplete="off" aria-label="${esc(t("Champion to lock"))}"><select id="flSide" name="flside" aria-label="${esc(t("Who picked it"))}">${opt("them", t("Their pick"), true)}${opt("us", t("Our pick"), false)}</select><button class="btn" type="submit">${I.lock}${esc(t("Lock for game {g}", { g: s.game }))}</button></form>` : ""}</section>`;
  return top + `<div class="fl-bar">${sw}${games}<span class="formhint">${s.enabled ? t("Now drafting <b>game {g}</b>.", { g: s.game }) + (canEdit ? " " + esc(t("Tap a champion to lock it; tap again to unlock.")) : "") : esc(t("Locked champions are only greyed out while fearless is on."))}</span></div>
    <div class="fl-grid">${pools}</div>` + lockedPanel;
}

/* ---------- Scouting ---------- */
function viewScouting() {
  const v = scoutValues(), saved = scoutSaved();
  const dirty = !!S.scoutDraft && SCOUT_FIELDS.some(k => (S.scoutDraft[k] ?? (saved[k] || "")) !== (saved[k] || ""));
  const ro = S.readOnly;
  const next = upcomingScrims()[0];
  const top = pagehead(t("Scouting"), t("Notes on the next team you play: what they're best at, where they're weak, and how we plan to win."));
  const nextCard = next && !sameTeam(next.opponent, v.opponent) ? `<div class="notice"><span>${esc(t("Next scrim: {team} on {date}", { team: next.opponent, date: fmt(parseYmd(next.date), { weekday: "short", day: "numeric", month: "short" }) + (next.time ? ", " + next.time : "") }))}</span>${ro ? "" : btn("scout-use-next", t("Scout this team"), "", "small")}</div>` : "";
  const past = S.scrims.filter(x => sameTeam(x.opponent, v.opponent) && x.result);
  const rec = recordOf(past);
  const champs = mentionedChamps(v.powerPicks);
  const dossier = `<section class="dossier">
      <div style="display:grid;gap:6px;min-width:0"><span class="vs">${esc(t("Next opponent"))}</span>
        ${ro ? `<span class="opp-name">${esc(v.opponent || t("Not set"))}</span>` : `<input class="opp-input" id="sc_opponent" data-scout="opponent" value="${esc(v.opponent)}" placeholder="${esc(t("Team name"))}" aria-label="${esc(t("Next opponent"))}" list="oppList2"><datalist id="oppList2">${[...new Set(S.scrims.map(s => s.opponent).filter(Boolean))].map(o => `<option value="${esc(o)}"></option>`).join("")}</datalist>`}</div>
      <div class="meta">${ro ? (v.matchDate ? `<span class="dt">${esc(fmt(parseYmd(v.matchDate), { weekday: "long", day: "numeric", month: "long" }))}</span>` : "") : `<label class="label" for="sc_matchDate">${esc(t("Match date"))}</label><input id="sc_matchDate" data-scout="matchDate" type="date" value="${esc(v.matchDate)}">`}
        ${past.length ? `<span class="hint">${esc(t("Our record vs them"))}: <b class="num" style="font-size:18px"><span style="color:var(--good)">${rec.w}</span>–<span style="color:var(--red)">${rec.l}</span>${rec.d ? "–" + rec.d : ""}</b></span>` : ""}</div>
      ${champs.length ? `<div class="champs"><span class="label">${esc(t("Their power picks"))}</span><div class="chips">${champs.map(c => `<span class="chip">${champIcon(c, "md")}${esc(c)}</span>`).join("")}</div></div>` : ""}
    </section>`;
  const area = (k, cls, title, hint, ph) => `<section class="scout-box ${cls}"><h3>${esc(title)}</h3><p class="hint">${esc(hint)}</p>${ro ? `<p class="scout-text${v[k] ? "" : " na"}">${esc(v[k] || t("Nothing written yet."))}</p>` : `<textarea id="sc_${k}" data-scout="${k}" rows="8" placeholder="${esc(ph)}" aria-label="${esc(title)}">${esc(v[k])}</textarea>`}</section>`;
  const reviews = past.filter(x => x.review).slice(0, 3);
  const savedAt = saved.updatedAt ? new Date(saved.updatedAt) : null;
  const status = dirty ? `<span class="unsaved">${esc(t("Unsaved changes"))}</span>` : `<span class="formhint">${esc(savedAt ? t("Saved {when}", { when: savedAt.toLocaleString(locale(), { weekday: "short", hour: "2-digit", minute: "2-digit" }) }) : t("Not saved yet"))}</span>`;
  return top + nextCard + dossier + `<div class="scout-grid">
      ${area("powerPicks", "pp", t("Power picks & bans"), t("Their best champions and what we should ban."), t("e.g. Azir mid is their comfort pick. Ban Azir, Lee Sin"))}
      ${area("weaknesses", "wk", t("Weaknesses"), t("Where they're vulnerable: lanes, timings, habits."), t("e.g. Bot lane overextends without vision"))}
      ${area("gameplan", "gp", t("Our gameplan"), t("How we play this match."), t("e.g. Play for early dragons, group after first tower"))}
    </div>
    ${ro ? "" : `<div class="savebar">${status}<div class="right">${dirty ? btn("scout-discard", t("Discard")) : ""}<button class="btn primary" type="button" data-act="scout-save"${dirty ? "" : " disabled"}>${I.check}${esc(t("Save notes"))}</button></div></div>`}
    ${reviews.length ? `<section class="panel"><h3>${esc(t("Last time against them"))}</h3><ul class="matches">${reviews.map(x => { const dt = parseYmd(x.date); return `<li><div class="sdate"><b>${esc(wd(dt))}</b><span>${esc(fmt(dt))}</span></div><div class="smain"><span style="white-space:normal;color:var(--fg)">${esc(x.review)}</span></div>${resultTag(x)}</li>`; }).join("")}</ul></section>` : ""}`;
}
async function saveScouting() {
  if (!S.scoutDraft) return;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const data = scoutValues(); data.opponent = data.opponent.trim();
  const ok = await writeDoc("scouting", "next", data);
  if (ok) { S.scoutDraft = null; render(); toast(t("Scouting notes saved")); }
}

/* ---------- Rank sync ---------- */
const SERVERS = [["euw1", "EUW"], ["eun1", "EUNE"], ["na1", "NA"], ["kr", "KR"], ["br1", "BR"], ["la1", "LAN"], ["la2", "LAS"], ["oc1", "OCE"], ["tr1", "TR"], ["ru", "RU"], ["jp1", "JP"], ["me1", "ME"], ["sg2", "SG"], ["tw2", "TW"], ["vn2", "VN"], ["th2", "TH"], ["ph2", "PH"]];
const RANK_STALE_MS = 6 * 3600e3;
let rankBusy = false, rankAutoDone = false;
function ago(iso) {
  const ms = Date.now() - Date.parse(iso); if (!(ms >= 0)) return "";
  const m = Math.round(ms / 60000);
  if (m < 1) return t("just now");
  if (m < 60) return t("{n} min ago", { n: m });
  const h = Math.round(m / 60); if (h < 48) return t("{n} h ago", { n: h });
  return t("{n} days ago", { n: Math.round(h / 24) });
}
function queueLine(q) {
  if (!q) return "";
  const games = q.wins + q.losses;
  return `${t(cap1(q.tier))}${q.division ? " " + q.division : ""} · ${q.lp} LP · ${games ? Math.round(q.wins / games * 100) : 0}% ${t("of {n}", { n: games })}`;
}
function cap1(s) { s = String(s || ""); return s.charAt(0) + s.slice(1).toLowerCase(); }
async function syncRanks(ids, opts) {
  opts = opts || {};
  if (rankBusy || S.mode !== "api" || S.readOnly) return;
  rankBusy = true; S.rankBusyIds = ids || null; render();
  try {
    const r = await fetch("/api/rank", { method: "POST", headers: { "Content-Type": "application/json", "x-team-code": getCode() }, body: JSON.stringify({ ids: ids || [], force: !!opts.force }) });
    let j = null; try { j = await r.json(); } catch (e) {}
    if (r.status === 503 && j && j.code === "no_key") { S.rankOff = true; if (!opts.quiet) toast(t("Rank sync isn't set up yet. Add RIOT_API_KEY in Vercel.")); return; }
    if (!r.ok) { if (!opts.quiet) toast((j && j.error) || t("Rank sync failed. Try again in a moment.")); return; }
    S.rankOff = false;
    const res = j.results || [];
    const ok = res.filter(x => x.status === "ok").length, nf = res.filter(x => x.status === "not_found"), noid = res.filter(x => x.status === "no_riot_id");
    await poll(true);
    if (!opts.quiet || nf.length) {
      const parts = [];
      if (ok) parts.push(tn(ok, "Rank updated for {n} player", "Ranks updated for {n} players"));
      if (nf.length) parts.push(t("Riot ID not found: {names}", { names: nf.map(x => x.name).join(", ") }));
      if (noid.length && !opts.quiet) parts.push(t("No Riot ID: {names}", { names: noid.map(x => x.name).join(", ") }));
      if (!res.length && !opts.quiet) parts.push(t("Ranks are already up to date."));
      if (j.warning) parts.push(j.warning);
      if (parts.length) toast(parts.join(" · "));
    }
  } catch (e) { if (!opts.quiet) toast(t("Rank sync failed. Try again in a moment.")); }
  finally { rankBusy = false; S.rankBusyIds = null; render(); }
}
function maybeAutoSync() {
  if (rankAutoDone || S.mode !== "api" || S.readOnly || S.rankOff) return;
  rankAutoDone = true;
  const stale = S.players.filter(p => p.ign && !p.example && (!p.ranked || !p.ranked.syncedAt || Date.now() - Date.parse(p.ranked.syncedAt) > RANK_STALE_MS || p.ranked.riotId !== p.ign));
  if (stale.length) setTimeout(() => syncRanks(stale.map(p => p.id), { quiet: true }), 1500);
}

/* ---------- Draft simulator ---------- */
// Tournament order: 3 bans each, 3 picks (B R R B B R), 2 bans each starting with red, 2 picks (R B B R)
const DRAFT_ORDER = [
  ["B", "ban"], ["R", "ban"], ["B", "ban"], ["R", "ban"], ["B", "ban"], ["R", "ban"],
  ["B", "pick"], ["R", "pick"], ["R", "pick"], ["B", "pick"], ["B", "pick"], ["R", "pick"],
  ["R", "ban"], ["B", "ban"], ["R", "ban"], ["B", "ban"],
  ["R", "pick"], ["B", "pick"], ["B", "pick"], ["R", "pick"],
];
const DRAFT_KEY = "fsb-draft";
function loadDraft() { try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); if (d && Array.isArray(d.seq)) return { side: "B", opp: "", seq: [], roles: {}, filter: "all", ...d }; } catch (e) {} return { side: "B", opp: "", seq: [], roles: {}, filter: "all" }; }
function saveDraft() { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(S.draft)); } catch (e) {} }
function draftParts() {
  const d = S.draft, out = { B: { bans: [], picks: [] }, R: { bans: [], picks: [] } };
  d.seq.forEach((c, i) => { const [side, kind] = DRAFT_ORDER[i]; out[side][kind === "ban" ? "bans" : "picks"].push(c); });
  return out;
}
function draftUsed() { return new Set(S.draft.seq.filter(Boolean).map(c => c.toLowerCase())); }
function poolEntries(champ) { const n = champName(champ).toLowerCase(); const out = []; S.players.forEach(p => (p.champions || []).forEach(c => { if (champName(c.champ).toLowerCase() === n && c.tier !== "learning") out.push({ p, c }); })); return out; }
function starterFor(role) { return S.players.find(p => p.primaryRole === role && !p.sub) || S.players.find(p => p.primaryRole === role) || S.players.find(p => (p.secondaryRoles || []).includes(role)) || null; }
// Our picks -> roles: manual choice first, then the role it sits in someone's pool, then whatever is left
function assignRoles(picks) {
  const map = {}, used = new Set();
  picks.forEach(c => { const r = S.draft.roles[c]; if (r && !used.has(r)) { map[c] = r; used.add(r); } });
  picks.forEach(c => { if (map[c]) return; const order = { main: 0, comfort: 1, pocket: 2 }; const cands = poolEntries(c).sort((a, b) => (a.p.sub ? 1 : 0) - (b.p.sub ? 1 : 0) || (order[a.c.tier] ?? 1) - (order[b.c.tier] ?? 1)).map(e => e.c.role); const r = cands.find(x => !used.has(x)); if (r) { map[c] = r; used.add(r); } });
  picks.forEach(c => { if (map[c]) return; const r = ROLES.map(x => x.k).find(x => !used.has(x)); if (r) { map[c] = r; used.add(r); } });
  return map;
}
function threats() { return mentionedChamps(scoutValues().powerPicks); }

function viewDraft() {
  if (!S.draft) S.draft = loadDraft();
  const d = S.draft, step = d.seq.length, done = step >= DRAFT_ORDER.length;
  const cur = done ? null : DRAFT_ORDER[step];
  const us = d.side, them = us === "B" ? "R" : "B";
  const parts = draftParts(), used = draftUsed(), fl = series(), th = threats();
  const ourName = S.meta.teamName || t("Our Team"), oppName = d.opp || t("Opponent");
  const sideName = (s) => s === us ? ourName : oppName;
  const acts = `${btn("dr-undo", t("Undo"), "", "", step ? "" : " disabled")}${btn("dr-reset", t("Reset"), "", "", step ? "" : " disabled")}`;
  const top = pagehead(t("Draft simulator"), t("Run a full tournament draft: 5 bans and 5 picks per side in the real order. Your pools, fearless locks and scouting threats are marked on every champion."), acts);

  const phase = done ? `<div class="phase done"><b>${esc(t("Draft complete"))}</b></div>`
    : `<div class="phase ${cur[0] === "B" ? "blue" : "red"}"><span class="label">${esc(t("Step {n} of {m}", { n: step + 1, m: DRAFT_ORDER.length }))}</span><b>${esc(t(cur[0] === "B" ? "Blue" : "Red"))} ${esc(t(cur[1] === "ban" ? "ban" : "pick"))} ${cur[1] === "ban" ? (cur[0] === "B" ? parts.B.bans.length + 1 : parts.R.bans.length + 1) : (cur[0] === "B" ? parts.B.picks.length + 1 : parts.R.picks.length + 1)}</b><span class="hint">${esc(cur[0] === us ? t("Your turn") : t("{team}'s turn", { team: oppName }))}</span>${cur[1] === "ban" ? btn("dr-skip", t("No ban"), "", "small ghost") : ""}</div>`;
  const setup = `<div class="dr-setup"><div class="seg" role="group" aria-label="${esc(t("Our side"))}"><button type="button" data-act="dr-side" data-val="B" aria-pressed="${us === "B"}">${esc(t("We're blue"))}</button><button type="button" data-act="dr-side" data-val="R" aria-pressed="${us === "R"}">${esc(t("We're red"))}</button></div>
    <label class="dr-opp"><span class="label">${esc(t("Opponent"))}</span><input id="drOpp" data-dr="opp" value="${esc(d.opp)}" placeholder="${esc(scoutValues().opponent || t("Team name"))}"></label>${phase}</div>`;

  const roleMap = assignRoles(parts[us].picks.filter(Boolean));
  const col = (s) => {
    const bans = parts[s].bans, picks = parts[s].picks, isUs = s === us;
    const banSlots = Array.from({ length: 5 }, (_, i) => { const c = bans[i]; const curHere = cur && cur[0] === s && cur[1] === "ban" && i === bans.length; return `<span class="bslot${curHere ? " now" : ""}${c === null ? " skipped" : ""}" title="${esc(c || "")}">${c ? champIcon(c, "md") : c === null ? "—" : ""}</span>`; }).join("");
    const pickSlots = Array.from({ length: 5 }, (_, i) => {
      const c = picks[i]; const curHere = cur && cur[0] === s && cur[1] === "pick" && i === picks.length;
      if (!c) return `<div class="pslot${curHere ? " now" : ""}"><span class="empty-slot"></span><span class="hint">${curHere ? esc(t("Picking…")) : ""}</span></div>`;
      let meta = "";
      if (isUs) {
        const role = roleMap[c], pl = role ? starterFor(role) : null;
        meta = `<select class="dr-role" data-dr-role="${esc(c)}" aria-label="${esc(t("Role for {champ}", { champ: c }))}">${ROLES.map(r => opt(r.k, r.code, role === r.k)).join("")}</select><span class="hint">${pl ? esc(pl.name) : ""}</span>`;
      } else if (th.includes(c)) meta = `<span class="flag bad">${esc(t("Power pick"))}</span>`;
      return `<div class="pslot filled">${champIcon(c, "lg")}<div class="pmeta"><b>${esc(c)}</b>${meta}</div></div>`;
    }).join("");
    return `<section class="dr-col ${s === "B" ? "blue" : "red"}${isUs ? " us" : ""}"><header><span class="side-tag">${esc(t(s === "B" ? "Blue side" : "Red side"))}</span><b>${esc(sideName(s))}</b></header><div class="bans">${banSlots}</div><div class="picks-col">${pickSlots}</div></section>`;
  };

  // Champion pool grid
  const f = d.filter || "all";
  const inPool = new Map(); S.players.forEach(p => (p.champions || []).forEach(c => { if (c.tier === "learning") return; const n = champName(c.champ); if (!n) return; if (!inPool.has(n)) inPool.set(n, []); inPool.get(n).push({ p, c }); }));
  let list = [...CHAMPS.values()].map(c => c.name);
  if (f === "pool") list = list.filter(n => inPool.has(n));
  else if (f === "threats") list = list.filter(n => th.includes(n));
  else if (ROLE[f]) list = list.filter(n => (inPool.get(n) || []).some(e => e.c.role === f));
  const tiles = list.map(n => {
    const lk = lockedEntry(n), isUsed = used.has(n.toLowerCase()), entries = inPool.get(n) || [];
    const dis = done || isUsed || !!lk;
    const who = entries.map(e => `${e.p.name} (${ROLE[e.c.role]?.code || "?"})`).join(", ");
    const title = isUsed ? t("Already picked or banned") : lk ? t("Used in game {g}", { g: lk.game }) : who ? t("In pool: {who}", { who }) : n;
    return `<button class="dtile${entries.length ? " ours" : ""}${th.includes(n) ? " threat" : ""}${isUsed ? " used" : ""}${lk ? " locked" : ""}" type="button" data-act="dr-pick" data-champ="${esc(n)}" data-n="${esc(n.toLowerCase())}" title="${esc(title)}"${dis ? " disabled" : ""}>${champIcon(n, "dt")}<span>${esc(n)}</span>${lk ? `<small>G${lk.game}</small>` : ""}</button>`;
  }).join("");
  const fbtn = (k, label) => `<button class="fchip" type="button" data-act="dr-filter" data-val="${k}" aria-pressed="${f === k}">${label}</button>`;
  const pool = `<section class="dr-pool"><div class="dr-tools"><input id="drSearch" type="search" data-dr-search="1" placeholder="${esc(t("Search champion"))}" autocomplete="off" aria-label="${esc(t("Search champion"))}">
      <div class="filters">${fbtn("all", esc(t("All")))}${fbtn("pool", esc(t("Our pool")))}${ROLES.map(r => fbtn(r.k, ri(r.k) + r.code)).join("")}${th.length ? fbtn("threats", esc(t("Threats"))) : ""}</div></div>
    <div class="dgrid" id="drGrid">${tiles || `<span class="formhint">${esc(t("No champions match this filter."))}</span>`}</div>
    <div class="legend"><span><i class="lg-ours"></i>${esc(t("In our pool"))}</span><span><i class="lg-threat"></i>${esc(t("Scouted threat"))}</span>${fl.enabled ? `<span><i class="lg-locked"></i>${esc(t("Locked by fearless"))}</span>` : ""}</div></section>`;

  // Our side: suggestions and read
  const ourPicks = parts[us].picks.filter(Boolean);
  const openRoles = ROLES.filter(r => !Object.values(roleMap).includes(r.k));
  let sugg = "";
  if (cur && cur[0] === us && cur[1] === "pick" && openRoles.length) {
    sugg = `<div class="sugg"><span class="label">${esc(t("Comfort picks still open"))}</span>${openRoles.map(r => {
      const pl = starterFor(r.k); if (!pl) return "";
      const order = { main: 0, comfort: 1, pocket: 2 };
      const cs = (pl.champions || []).filter(c => c.role === r.k && c.tier !== "learning" && !used.has(champName(c.champ).toLowerCase()) && !lockedEntry(c.champ)).sort((a, b) => (order[a.tier] ?? 1) - (order[b.tier] ?? 1)).slice(0, 4);
      return `<div class="sugg-row"><span class="role">${ri(r.k)}${r.code}</span><span class="hint">${esc(pl.name)}</span><div class="chips">${cs.length ? cs.map(c => `<button class="chip ${esc(c.tier)}" type="button" data-act="dr-pick" data-champ="${esc(champName(c.champ))}">${champIcon(c.champ)}${esc(champName(c.champ))}</button>`).join("") : `<span class="flag bad">${esc(t("Nothing left"))}</span>`}</div></div>`;
    }).join("")}</div>`;
  } else if (cur && cur[0] === us && cur[1] === "ban") {
    const left = th.filter(n => !used.has(n.toLowerCase()) && !lockedEntry(n));
    if (left.length) sugg = `<div class="sugg"><span class="label">${esc(t("Ban suggestions from scouting"))}</span><div class="chips">${left.slice(0, 6).map(n => `<button class="chip" type="button" data-act="dr-pick" data-champ="${esc(n)}">${champIcon(n)}${esc(n)}</button>`).join("")}</div></div>`;
  }
  let read = "";
  if (ourPicks.length) {
    const comp = { picks: {} };
    ourPicks.forEach(c => { const r = roleMap[c]; if (r) comp.picks[r] = { champ: c, playerId: starterFor(r)?.id || "" }; });
    const st = compStats(comp), tot = st.total || 1;
    const notes = ROLES.map(r => { const pp = st.perPick[r.k]; return pp && pp.note && pp.note.cls !== "good" && comp.picks[r.k] ? `<span class="flag ${pp.note.cls}">${esc(comp.picks[r.k].champ)}: ${esc(pp.note.text)}</span>` : ""; }).join("");
    read = `<div class="dr-read"><span class="label">${esc(t("Our comp so far"))}</span><div class="dbar"><span class="ad" style="width:${(st.ad / tot * 100).toFixed(1)}%"></span><span class="ap" style="width:${(st.ap / tot * 100).toFixed(1)}%"></span></div>
      <div class="dlegend"><span class="a"><b>${Math.round(st.ad / tot * 100)}%</b> AD</span><span class="p"><b>${Math.round(st.ap / tot * 100)}%</b> AP</span><span><b>${st.front}</b> ${esc(t("frontline"))}</span></div>
      <div class="flags">${notes}${st.flags.filter(x => !/open$|offen$/.test(x.text)).map(x => `<span class="flag ${x.cls}">${esc(x.text)}</span>`).join("")}</div></div>`;
  }
  const finish = ourPicks.length && !S.readOnly ? `<div class="dr-finish">${btn("dr-save-comp", t("Save our picks as a comp"), I.plus)}${btn("dr-lock", fl.enabled ? t("Lock picks for fearless game {g}", { g: fl.game }) : t("Start fearless series with these picks"), I.lock, done ? "primary" : "")}</div>` : "";
  const side = `<section class="panel dr-side">${sugg}${read || `<p class="hint">${esc(t("Your team's damage split and warnings appear here once you pick."))}</p>`}${finish}</section>`;

  return top + setup + `<div class="draft">${col("B")}${pool}${col("R")}</div>` + side;
}
function draftPick(champ) {
  const d = S.draft; if (d.seq.length >= DRAFT_ORDER.length) return;
  const n = champName(champ);
  if (champ !== null && (draftUsed().has(n.toLowerCase()) || lockedEntry(n))) return;
  d.seq.push(champ === null ? null : n); saveDraft();
  const el = document.getElementById("drSearch"); if (el) { el.value = ""; el.blur(); }
  render();
}
async function draftSaveComp() {
  const d = S.draft, parts = draftParts(), us = d.side, them = us === "B" ? "R" : "B";
  const ours = parts[us].picks.filter(Boolean), map = assignRoles(ours);
  const picks = {}; ours.forEach(c => { const r = map[c]; if (r) picks[r] = { champ: c, playerId: starterFor(r)?.id || "" }; });
  const name = d.opp ? t("Draft vs {team}", { team: d.opp }) : t("Draft {date}", { date: fmt(new Date()) });
  const ok = await writeDoc("comps", uid("c-"), { name, archetype: "", picks, winCondition: "", weakAgainst: parts[them].picks.filter(Boolean).length ? t("Their picks: {list}", { list: parts[them].picks.filter(Boolean).join(", ") }) : "", bans: parts[us].bans.filter(Boolean).join(", "), notes: "" });
  if (ok) toast(t("Saved as \"{name}\" on the Comps tab", { name }));
}
async function draftLockFearless() {
  const d = S.draft, parts = draftParts(), us = d.side, them = us === "B" ? "R" : "B";
  const sr = series(); const have = new Set(sr.locked.map(l => champName(l.champ).toLowerCase()));
  const add = [];
  parts[us].picks.filter(Boolean).forEach(c => { if (!have.has(c.toLowerCase())) add.push({ champ: c, game: sr.game, side: "us" }); });
  parts[them].picks.filter(Boolean).forEach(c => { if (!have.has(c.toLowerCase())) add.push({ champ: c, game: sr.game, side: "them" }); });
  const nextGame = Math.min(3, sr.game + 1);
  const ok = await saveSeries({ enabled: true, locked: [...sr.locked, ...add], game: sr.enabled ? nextGame : 2 });
  if (ok) { const g = sr.enabled ? sr.game : 1; d.seq = []; d.roles = {}; saveDraft(); render(); toast(t("Game {g} picks locked. The board is ready for the next game.", { g })); }
}

/* ---------- Editor drawer ---------- */
const overlay = document.getElementById("overlay");
let lastFocus = null;
function openSheet(title, bodyHtml, { onSubmit, onDelete, deleteLabel, submitLabel }) {
  lastFocus = document.activeElement;
  const saveText = submitLabel || t("Save");
  overlay.innerHTML = `<div class="scrim" data-act="close-scrim"><form class="sheet" id="sheetForm" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" novalidate>
    <div class="sheet-head"><h2 id="sheetTitle">${esc(title)}</h2><button class="iconbtn" type="button" data-act="close" aria-label="${esc(t("Close"))}">${I.x}</button></div>
    <div class="sheet-body">${bodyHtml}</div>
    <div class="sheet-foot">${onDelete ? `<div class="confirm" id="delWrap"></div>` : ""}
      <div class="right"><button class="btn" type="button" data-act="close">${esc(t("Cancel"))}</button><button class="btn primary" type="submit" id="saveBtn">${esc(saveText)}</button></div></div>
  </form></div>`;
  document.documentElement.classList.add("locked");
  const form = document.getElementById("sheetForm");
  form.addEventListener("submit", async (e) => { e.preventDefault(); const b = document.getElementById("saveBtn"); b.disabled = true; b.textContent = t("Saving…"); const ok = await onSubmit(form); if (ok !== false) closeSheet(); else { b.disabled = false; b.textContent = saveText; } });
  if (onDelete) {
    const w = document.getElementById("delWrap");
    const idle = () => { w.innerHTML = `<button class="btn danger" type="button">${I.trash}${esc(deleteLabel || t("Delete"))}</button>`; w.firstElementChild.addEventListener("click", ask); };
    const ask = () => {
      w.innerHTML = `<span>${esc(t("Delete for everyone?"))}</span><button class="btn danger small" type="button" id="delYes">${esc(t("Yes, delete"))}</button><button class="btn small" type="button" id="delNo">${esc(t("Keep"))}</button>`;
      document.getElementById("delYes").addEventListener("click", async () => { if (await onDelete()) closeSheet(); });
      document.getElementById("delNo").addEventListener("click", idle);
    };
    idle();
  }
  const first = form.querySelector("input:not([type=radio]), select, textarea"); if (first) first.focus();
}
function closeSheet() { overlay.innerHTML = ""; document.documentElement.classList.remove("locked"); if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} }
function opt(v, label, sel) { return `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(label)}</option>`; }

function champRow(c = {}) {
  return `<div class="crow">
    <input name="cChamp" list="champList" placeholder="${esc(t("Champion"))}" value="${esc(c.champ || "")}" aria-label="${esc(t("Champion"))}" autocomplete="off">
    <select name="cRole" aria-label="${esc(t("Role"))}">${ROLES.map(r => opt(r.k, r.code, c.role === r.k)).join("")}</select>
    <select name="cTier" aria-label="${esc(t("Comfort level"))}">${TIERS.map(x => opt(x.k, t(x.name), (c.tier || "comfort") === x.k)).join("")}</select>
    <button class="iconbtn" type="button" data-act="rm-row" aria-label="${esc(t("Remove champion"))}">${I.x}</button></div>`;
}
function editPlayer(id) {
  const p = id ? playerById(id) : null;
  const d = p || { primaryRole: (ROLES.find(r => !S.players.some(x => x.primaryRole === r.k)) || ROLES[0]).k, secondaryRoles: [], champions: [], strengths: [], weaknesses: [], rank: "", div: "" };
  const body = `
  <fieldset><legend>${esc(t("Player"))}</legend>
    <div class="frow"><label class="f"><span>${esc(t("Name"))}</span><input id="pName" name="name" required value="${esc(d.name || "")}" placeholder="${esc(t("What the team calls them"))}"></label>
    <label class="f"><span>Riot ID</span><input id="pIgn" name="ign" value="${esc(d.ign || "")}" placeholder="Name#TAG"></label>
    <label class="f"><span>${esc(t("Server"))}</span><select id="pServer" name="server">${SERVERS.map(([k, n]) => opt(k, n, (d.server || "euw1") === k)).join("")}</select></label></div>
    ${S.mode === "api" ? `<p class="formhint">${esc(t("With a Riot ID, rank and LP are synced from Riot automatically."))}</p>` : ""}
    <div class="frow"><label class="f"><span>${esc(t("Rank"))}</span><select id="pRank" name="rank">${opt("", "—", !d.rank)}${RANKS.map(r => opt(r, t(r), d.rank === r)).join("")}</select></label>
    <label class="f"><span>${esc(t("Division"))}</span><select id="pDiv" name="div">${opt("", "—", !d.div)}${DIVS.map(x => opt(x, x, d.div === x)).join("")}</select></label>
    <label class="f"><span>${esc(t("Playstyle"))}</span><select id="pStyle" name="style">${opt("", "—", !d.style)}${STYLES.map(s => opt(s, t(s), d.style === s)).join("")}</select></label>
    <label class="f"><span>${esc(t("Roster spot"))}</span><select id="pSpot" name="spot">${opt("starter", t("Starter"), !d.sub)}${opt("sub", t("Substitute"), !!d.sub)}</select></label></div>
  </fieldset>
  <fieldset><legend>${esc(t("Roles"))}</legend>
    <label class="f"><span>${esc(t("Main role"))}</span><select id="pRole" name="primaryRole">${ROLES.map(r => opt(r.k, r.name, d.primaryRole === r.k)).join("")}</select></label>
    <div class="f"><span>${esc(t("Can also play"))}</span><div class="checks">${ROLES.map(r => `<label><input type="checkbox" name="sec" value="${r.k}"${(d.secondaryRoles || []).includes(r.k) ? " checked" : ""}>${ri(r.k)}${r.code}</label>`).join("")}</div></div>
  </fieldset>
  <fieldset><legend>${esc(t("Champion pool"))}</legend>
    <p class="formhint">${esc(t("Main = scrim-ready. Comfort = solid. Pocket = situational counterpick. Learning = not draft-ready."))}</p>
    <div class="crows" id="crows">${(d.champions || []).map(champRow).join("")}</div>
    <div>${btn("add-row", t("Add champion"), I.plus, "small")}</div>
  </fieldset>
  <fieldset><legend>${esc(t("Strengths"))}</legend>
    <label class="f"><span>${esc(t("One per line"))}</span><textarea id="pStr" name="strengths" rows="3">${esc((d.strengths || []).map(x => t(x)).join("\n"))}</textarea></label>
    <div class="quick">${STRENGTH_TAGS.map(x => `<button class="chip" type="button" data-act="quick" data-target="pStr" data-val="${esc(t(x))}">+ ${esc(t(x))}</button>`).join("")}</div>
  </fieldset>
  <fieldset><legend>${esc(t("Weaknesses"))}</legend>
    <label class="f"><span>${esc(t("One per line"))}</span><textarea id="pWeak" name="weaknesses" rows="3">${esc((d.weaknesses || []).map(x => t(x)).join("\n"))}</textarea></label>
    <div class="quick">${WEAK_TAGS.map(x => `<button class="chip" type="button" data-act="quick" data-target="pWeak" data-val="${esc(t(x))}">+ ${esc(t(x))}</button>`).join("")}</div>
  </fieldset>
  <fieldset><legend>${esc(t("Notes"))}</legend><label class="f"><span>${esc(t("Anything the team should know"))}</span><textarea id="pNotes" name="notes" rows="3" placeholder="${esc(t("e.g. Plays better with early jungle attention"))}">${esc(d.notes || "")}</textarea></label></fieldset>`;
  openSheet(p ? t("Edit {name}", { name: p.name }) : t("Add player"), body, {
    onSubmit: async (f) => {
      const name = f.name.value.trim();
      if (!name) { toast(t("Give the player a name before saving.")); f.name.focus(); return false; }
      const champs = [];
      f.querySelectorAll(".crow").forEach(row => { const champ = champName(row.querySelector('[name="cChamp"]').value); if (champ) champs.push({ champ, role: row.querySelector('[name="cRole"]').value, tier: row.querySelector('[name="cTier"]').value }); });
      const data = { name, ign: f.ign.value.trim(), server: f.server.value, ranked: p && p.ranked ? p.ranked : undefined, rank: f.rank.value, div: f.div.value, style: f.style.value, sub: f.spot.value === "sub", primaryRole: f.primaryRole.value,
        secondaryRoles: [...f.querySelectorAll('[name="sec"]:checked')].map(x => x.value).filter(k => k !== f.primaryRole.value),
        champions: champs, strengths: lines(f.strengths.value), weaknesses: lines(f.weaknesses.value), notes: f.notes.value.trim() };
      if (p && p.example) data.example = true;
      const pid = p ? p.id : uid("p-");
      const ok = await writeDoc("players", pid, data);
      if (ok) toast(p ? t("Player saved") : t("{name} added", { name }));
      if (ok && data.ign && S.mode === "api" && !S.rankOff && (!p || p.ign !== data.ign || p.server !== data.server)) setTimeout(() => syncRanks([pid], { quiet: true }), 400);
      return ok;
    },
    onDelete: p ? async () => { const ok = await deleteDoc("players", p.id); if (ok) toast(t("{name} removed", { name: p.name })); return ok; } : null,
    deleteLabel: t("Remove player"),
  });
  if (!p) document.getElementById("crows").insertAdjacentHTML("beforeend", champRow({ role: d.primaryRole, tier: "main" }));
}
function sugChips(playerId, role) {
  const p = playerId ? playerById(playerId) : null;
  if (!p) return "";
  let cs = (p.champions || []).filter(c => c.role === role);
  if (!cs.length) cs = p.champions || [];
  const order = { main: 0, comfort: 1, pocket: 2, learning: 3 };
  cs = [...cs].sort((a, b) => (order[a.tier] ?? 1) - (order[b.tier] ?? 1));
  return cs.slice(0, 8).map(c => { const lk = lockedEntry(c.champ); return `<button class="chip ${esc(c.tier)}${lk ? " locked" : ""}" type="button" data-act="pick-sug" data-val="${esc(champName(c.champ))}">${champIcon(c.champ)}${esc(champName(c.champ))}</button>`; }).join("");
}
function editComp(id) {
  const c = id ? S.comps.find(x => x.id === id) : null;
  const d = c || { picks: {}, archetype: "engage" };
  const ps = sortedPlayers();
  const rows = ROLES.map(r => {
    const pk = (d.picks || {})[r.k] || {};
    let pid = pk.playerId;
    if (!c && !pid) { const m = ps.find(p => p.primaryRole === r.k && !p.sub); if (m) pid = m.id; }
    return `<div class="prow-wrap" data-role="${r.k}"><div class="prow"><span class="role-tile">${ri(r.k)}${r.code}</span>
      <select name="pl_${r.k}" aria-label="${esc(t("{role} player", { role: r.name }))}">${opt("", t("No player"), !pid)}${ps.map(p => opt(p.id, p.name + (p.primaryRole === r.k ? "" : ` (${ROLE[p.primaryRole]?.code || "?"})`), pid === p.id)).join("")}</select>
      <input name="ch_${r.k}" list="champList" placeholder="${esc(t("Champion"))}" value="${esc(pk.champ || "")}" aria-label="${esc(t("{role} champion", { role: r.name }))}" autocomplete="off"></div>
      <div class="prow"><span></span><div class="sugs">${sugChips(pid, r.k)}</div></div></div>`;
  }).join("");
  const body = `
  <fieldset><legend>${esc(t("Comp"))}</legend>
    <div class="frow"><label class="f"><span>${esc(t("Name"))}</span><input id="cName" name="cname" value="${esc(d.name || "")}" placeholder="${esc(t("e.g. Dive bot"))}"></label>
    <label class="f"><span>${esc(t("Archetype"))}</span><select id="cArch" name="archetype">${ARCHETYPES.map(a => opt(a.k, t(a.name), d.archetype === a.k)).join("")}</select></label></div>
    <p class="formhint" id="archHint">${esc(t(ARCH[d.archetype]?.hint || ""))}</p>
  </fieldset>
  <fieldset><legend>${esc(t("Picks"))}</legend><p class="formhint">${esc(t("Tap a champion from the player's pool, or type any champion."))}</p>${rows}</fieldset>
  <fieldset><legend>${esc(t("Game plan"))}</legend>
    <label class="f"><span>${esc(t("Win condition"))}</span><textarea id="cWin" name="win" rows="2" placeholder="${esc(t("How does this comp win games?"))}">${esc(d.winCondition || "")}</textarea></label>
    <label class="f"><span>${esc(t("Weak against"))}</span><textarea id="cWeak" name="weak" rows="2" placeholder="${esc(t("Comps or champions that shut it down"))}">${esc(d.weakAgainst || "")}</textarea></label>
    <label class="f"><span>${esc(t("Target bans"))}</span><input id="cBans" name="bans" value="${esc(d.bans || "")}" placeholder="${esc(t("Comma-separated"))}"></label>
    <label class="f"><span>${esc(t("Notes"))}</span><textarea id="cNotes" name="cnotes" rows="2">${esc(d.notes || "")}</textarea></label>
  </fieldset>`;
  openSheet(c ? t("Edit {name}", { name: c.name || t("comp") }) : t("New comp"), body, {
    onSubmit: async (f) => {
      const picks = {};
      ROLES.forEach(r => { picks[r.k] = { champ: champName(f["ch_" + r.k].value), playerId: f["pl_" + r.k].value }; });
      const data = { name: f.cname.value.trim() || t("Untitled comp"), archetype: f.archetype.value, picks, winCondition: f.win.value.trim(), weakAgainst: f.weak.value.trim(), bans: f.bans.value.trim(), notes: f.cnotes.value.trim() };
      if (c && c.example) data.example = true;
      const ok = await writeDoc("comps", c ? c.id : uid("c-"), data);
      if (ok) toast(t("Comp saved"));
      return ok;
    },
    onDelete: c ? async () => { const ok = await deleteDoc("comps", c.id); if (ok) toast(t("Comp deleted")); return ok; } : null,
    deleteLabel: t("Delete comp"),
  });
  const form = document.getElementById("sheetForm");
  form.archetype.addEventListener("change", () => { document.getElementById("archHint").textContent = t(ARCH[form.archetype.value]?.hint || ""); });
  ROLES.forEach(r => form["pl_" + r.k].addEventListener("change", (e) => { e.target.closest(".prow-wrap").querySelector(".sugs").innerHTML = sugChips(e.target.value, r.k); }));
}
function renameTeam() {
  openSheet(t("Rename team"), `<label class="f"><span>${esc(t("Team name"))}</span><input id="tName" name="tname" value="${esc(S.meta.teamName || "")}" placeholder="${esc(t("Our Team"))}" maxlength="40"></label>`, {
    onSubmit: async (f) => { const ok = await saveMeta({ teamName: f.tname.value.trim() }); if (ok) toast(t("Team renamed")); return ok; },
  });
}

/* ---------- Events ---------- */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  if (act === "close-scrim") { if (e.target === el) closeSheet(); return; }
  if (act === "close") return closeSheet();
  if (act === "add-player") return editPlayer(null);
  if (act === "edit-player") return editPlayer(el.dataset.id);
  if (act === "add-comp") return editComp(null);
  if (act === "edit-comp") return editComp(el.dataset.id);
  if (act === "unlock") return openCodeSheet();
  if (act === "week") { S.weekOffset = el.dataset.val === "0" ? 0 : S.weekOffset + Number(el.dataset.val); render(); return; }
  if (act === "avail") {
    if (S.readOnly) { toast(t("Unlock editing to mark availability.")); return; }
    const pid = el.dataset.pid, date = el.dataset.date, cur = availOf(pid, date);
    const nextSt = cur === "" ? "yes" : cur === "yes" ? "no" : "";
    const id = availId(date, pid);
    if (nextSt) writeDoc("avail", id, { date, playerId: pid, status: nextSt }); else deleteDoc("avail", id);
    return;
  }
  if (act === "add-scrim") return editScrim(null, el.dataset.date);
  if (act === "edit-scrim") return editScrim(el.dataset.id);
  if (act === "copy-week") return copyText(weekSummary());
  if (act === "rank-sync") return syncRanks(null, { force: true });
  if (act === "rank-one") return syncRanks([el.dataset.id], { force: true });
  if (act === "dr-pick") return draftPick(el.dataset.champ);
  if (act === "dr-skip") return draftPick(null);
  if (act === "dr-undo") { S.draft.seq.pop(); saveDraft(); render(); return; }
  if (act === "dr-reset") { if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.textContent = t("Click again to reset"); setTimeout(() => { if (el.isConnected) { el.dataset.confirm = ""; el.textContent = t("Reset"); } }, 4000); return; } S.draft.seq = []; S.draft.roles = {}; saveDraft(); render(); return; }
  if (act === "dr-side") { S.draft.side = el.dataset.val; saveDraft(); render(); return; }
  if (act === "dr-filter") { S.draft.filter = el.dataset.val; saveDraft(); render(); return; }
  if (act === "dr-save-comp") return draftSaveComp();
  if (act === "dr-lock") return draftLockFearless();
  if (act === "ics") return downloadIcs();
  if (act === "fl-toggle") { const sr = series(); saveSeries({ enabled: !sr.enabled }); toast(sr.enabled ? t("Fearless draft off") : t("Fearless draft on, game {g}", { g: sr.game })); return; }
  if (act === "fl-game") { saveSeries({ game: Number(el.dataset.val) }); return; }
  if (act === "fl-lock" || act === "fl-unlock") {
    const sr = series(), n = el.dataset.champ.toLowerCase();
    const has = sr.locked.find(l => champName(l.champ).toLowerCase() === n);
    if (act === "fl-unlock" && !has) return;
    saveSeries({ locked: has ? sr.locked.filter(l => l !== has) : [...sr.locked, { champ: el.dataset.champ, game: sr.game, side: "us" }] });
    return;
  }
  if (act === "fl-reset") {
    if (el.dataset.confirm !== "1") { el.dataset.confirm = "1"; el.classList.add("danger"); el.textContent = t("Click again to reset"); setTimeout(() => { if (el.isConnected) { el.dataset.confirm = ""; el.classList.remove("danger"); el.textContent = t("Reset series"); } }, 4000); return; }
    saveSeries({ locked: [], game: 1 }).then(ok => { if (ok) toast(t("Series reset to game 1")); });
    return;
  }
  if (act === "scout-save") return saveScouting();
  if (act === "scout-discard") { S.scoutDraft = null; render(); return; }
  if (act === "scout-use-next") { const nx = upcomingScrims()[0]; if (nx) { S.scoutDraft = { ...(S.scoutDraft || {}), opponent: nx.opponent, matchDate: nx.date }; render(); } return; }
  if (act === "filter") { S.roleFilter = el.dataset.val; render(); return; }
  if (act === "load-ex") return loadExamples();
  if (act === "clear-ex") return clearExamples();
  if (act === "add-row") { const rows = document.getElementById("crows"); rows.insertAdjacentHTML("beforeend", champRow({ role: document.getElementById("pRole").value, tier: "comfort" })); rows.lastElementChild.querySelector("input").focus(); return; }
  if (act === "rm-row") { el.closest(".crow").remove(); return; }
  if (act === "quick") { const ta = document.getElementById(el.dataset.target); const cur = lines(ta.value); if (!cur.some(x => x.toLowerCase() === el.dataset.val.toLowerCase())) { cur.push(el.dataset.val); ta.value = cur.join("\n"); } return; }
  if (act === "pick-sug") { el.closest(".prow-wrap").querySelector("input").value = el.dataset.val; return; }
});
document.getElementById("renameBtn").addEventListener("click", renameTeam);
document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));
document.addEventListener("change", (e) => {
  const ds = e.target.dataset || {};
  if (ds.me) { setMe(e.target.value); e.target.blur(); render(); }
  if (ds.drRole) { S.draft.roles[ds.drRole] = e.target.value; Object.keys(S.draft.roles).forEach(k => { if (k !== ds.drRole && S.draft.roles[k] === e.target.value) delete S.draft.roles[k]; }); saveDraft(); e.target.blur(); render(); }
});
document.addEventListener("submit", (e) => {
  if (e.target.id !== "flAdd") return;
  e.preventDefault();
  const inp = e.target.flchamp, info = champInfo(inp.value);
  if (!info) { toast(t("Pick a champion from the list.")); inp.focus(); return; }
  const sr = series();
  if (lockedEntry(info.name)) { toast(t("{champ} is already locked.", { champ: info.name })); return; }
  inp.value = ""; inp.blur();
  saveSeries({ locked: [...sr.locked, { champ: info.name, game: sr.game, side: e.target.flside.value }] }).then(ok => { if (ok) toast(t("{champ} locked for game {g}", { champ: info.name, g: sr.game })); });
});
document.addEventListener("input", (e) => {
  const ds = e.target.dataset || {};
  if (ds.drSearch) { const q = e.target.value.trim().toLowerCase(); document.querySelectorAll("#drGrid .dtile").forEach(b => { b.hidden = !!q && !b.dataset.n.includes(q); }); return; }
  if (ds.dr === "opp") { S.draft.opp = e.target.value; saveDraft(); return; }
  const k = ds.scout;
  if (!k) return;
  S.scoutDraft = { ...(S.scoutDraft || {}), [k]: e.target.value };
  const sb = document.querySelector(".savebar");
  if (sb) {
    sb.querySelector('[data-act="scout-save"]').disabled = false;
    const st = sb.firstElementChild; if (st && !st.classList.contains("unsaved")) st.outerHTML = `<span class="unsaved">${esc(t("Unsaved changes"))}</span>`;
    if (!sb.querySelector('[data-act="scout-discard"]')) sb.querySelector(".right").insertAdjacentHTML("afterbegin", btn("scout-discard", t("Discard")));
  }
});
document.getElementById("view").addEventListener("focusout", () => setTimeout(() => { if (S.pendingRender) render(); }, 0));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay.innerHTML) closeSheet();
  if (e.key === "Enter" && e.target.dataset && e.target.dataset.drSearch) { e.preventDefault(); const first = [...document.querySelectorAll("#drGrid .dtile")].find(b => !b.hidden && !b.disabled); if (first) draftPick(first.dataset.champ); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && S.view === "scouting" && !S.readOnly && !overlay.innerHTML) { e.preventDefault(); saveScouting(); }
});
window.addEventListener("beforeunload", (e) => { if (S.scoutDraft && document.querySelector(".unsaved")) { e.preventDefault(); e.returnValue = ""; } });
document.getElementById("codeBtn").addEventListener("click", () => {
  if (S.readOnly) return openCodeSheet();
  setCode(""); S.readOnly = true; render(); toast(t("Editing locked on this device"));
});

function route() { const h = (location.hash || "").slice(1); S.view = VIEWS.includes(h) ? h : "roster"; render(); const a = document.querySelector(`.tabs a[data-view="${S.view}"]`); if (a && a.scrollIntoView) a.scrollIntoView({ block: "nearest", inline: "nearest" }); }
window.addEventListener("hashchange", route);
setLang(LANG);
route();

fetch("champ-icons.json").then(r => r.ok ? r.json() : null).then(j => { if (j && typeof j === "object") { ICONS = {}; for (const k in j) if (typeof j[k] === "string" && j[k].startsWith("data:image/")) ICONS[k.toLowerCase()] = j[k]; render(); } }).catch(() => {});

(async function boot() {
  try { const r = await fetch(API + "?since=-1", { cache: "no-store" }); if (r.status !== 404 && (r.headers.get("content-type") || "").includes("json")) { startApi(); return; } } catch (e) {}
  startLocal();
})();
})();
