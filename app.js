// Game Suy Luận — Tìm Thủ Phạm, bản v1 chuẩn bị.
// Không có bước build. Chạy bằng cách mở index.html sau khi đã thay
// window.__FIREBASE_CONFIG__ bằng config thật (xem README.md).
// Firebase chỉ dùng Realtime Database + Anonymous Auth, không dùng Firestore.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, set, update, push, get, onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const show = (id, on = true) => $(id).classList.toggle("hidden", !on);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));


// ---------- Original cute bean characters (SVG, inspired by round bean style) ----------
// No copied assets/logos/names: simple original round body + visor + hat variation.
const CHAR_COLORS = ["#e63b3b", "#2f7de1", "#2fae5f", "#f2b705", "#e86fb0", "#f07d1a", "#8b5cf6", "#17b8c4", "#7cb342", "#ef6c00"];
function hashStr(s) { let h = 0; for (const ch of String(s ?? "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
function colorFor(key) { return CHAR_COLORS[hashStr(key) % CHAR_COLORS.length]; }
function beanSVG(key, ghost = false) {
  const color = ghost ? "#94a3b8" : colorFor(key);
  const v = hashStr(key) % 4;
  let hat = "";
  if (v === 1) hat = '<path d="M36 18 Q50 0 64 18" fill="#facc15" stroke="#111827" stroke-width="3"/>';
  if (v === 2) hat = '<line x1="50" y1="18" x2="50" y2="6" stroke="#111827" stroke-width="3"/><circle cx="50" cy="6" r="6" fill="#e86fb0" stroke="#111827" stroke-width="2"/>';
  if (v === 3) hat = '<path d="M38 20 L44 6 L50 16 L56 6 L62 20 Z" fill="#facc15" stroke="#111827" stroke-width="2"/>';
  return `<svg viewBox="0 0 100 110" aria-hidden="true"><rect x="14" y="16" width="72" height="78" rx="34" fill="${color}" stroke="#111827" stroke-width="3"/>${hat}<ellipse cx="50" cy="48" rx="27" ry="17" fill="${ghost ? "#e2e8f0" : "#cfe8ff"}" stroke="#111827" stroke-width="3"/><ellipse cx="58" cy="43" rx="8" ry="5" fill="#fff" opacity=".9"/><rect x="20" y="84" width="24" height="12" rx="6" fill="#111827"/><rect x="56" y="84" width="24" height="12" rx="6" fill="#111827"/></svg>`;
}
function sceneSVG(typeLabel) {
  if (typeLabel === "Trộm cắp") return `<svg viewBox="0 0 520 220"><rect width="520" height="220" fill="#fef3c7"/><rect x="40" y="50" width="200" height="110" fill="#a16207" stroke="#111827" stroke-width="3"/><rect x="60" y="70" width="160" height="70" fill="#fde68a" stroke="#111827" stroke-width="2"/><rect x="100" y="95" width="80" height="45" fill="none" stroke="#dc2626" stroke-width="3" stroke-dasharray="8 6"/><text x="140" y="122" text-anchor="middle" font-size="20" font-weight="800" fill="#991b1b">TRỐNG!</text><rect x="300" y="60" width="150" height="100" fill="#fff" stroke="#111827" stroke-width="3"/><line x1="310" y1="70" x2="440" y2="150" stroke="#dc2626" stroke-width="4"/><text x="375" y="185" text-anchor="middle" font-size="18" font-weight="800" fill="#111827">Ngăn kéo bị mở</text></svg>`;
  if (typeLabel === "Loại một người chơi") return `<svg viewBox="0 0 520 220"><rect width="520" height="220" fill="#e0e7ff"/><ellipse cx="120" cy="180" rx="90" ry="12" fill="#c7d2fe"/><rect x="90" y="80" width="70" height="70" rx="10" fill="#94a3b8" stroke="#111827" stroke-width="3" transform="rotate(-18 125 115)"/><rect x="70" y="150" width="14" height="40" fill="#64748b"/><ellipse cx="220" cy="185" rx="14" ry="7" fill="#475569"/><ellipse cx="270" cy="180" rx="14" ry="7" fill="#475569"/><ellipse cx="320" cy="175" rx="14" ry="7" fill="#475569"/><text x="380" y="90" font-size="20" font-weight="800" fill="#312e81">Ghế đổ…</text><text x="380" y="118" font-size="20" font-weight="800" fill="#312e81">người đâu rồi?</text></svg>`;
  return `<svg viewBox="0 0 520 220"><rect width="520" height="220" fill="#dbeafe"/><rect x="60" y="60" width="180" height="110" rx="12" fill="#1e293b" stroke="#111827" stroke-width="3"/><rect x="80" y="80" width="140" height="70" fill="#93c5fd"/><path d="M150 80 L170 110 L190 80" fill="none" stroke="#dc2626" stroke-width="4"/><text x="150" y="185" text-anchor="middle" font-size="18" font-weight="800" fill="#111827">Màn hình nứt!</text><path d="M300 50 L315 75 L330 50 L345 75" fill="#facc15" stroke="#111827" stroke-width="2"/><text x="320" y="130" font-size="20" font-weight="800" fill="#111827">Có dấu vết lạ</text><text x="320" y="158" font-size="20" font-weight="800" fill="#111827">ở hiện trường</text></svg>`;
}
function clueIcon(typeLabel, i) {
  if (typeLabel === "Trộm cắp") return i === 0 ? "🔑" : "🧵";
  if (typeLabel === "Loại một người chơi") return i === 0 ? "🪑" : "👣";
  return i === 0 ? "🔧" : "👣";
}

const PHASE_LABELS = {
  lobby: "Chờ người chơi",
  secret: "Nhận nhiệm vụ bí mật",
  investigation: "Di chuyển — tìm dấu vết",
  vote: "Bỏ phiếu",
  reveal: "Công bố kết quả",
};

const LOCATIONS = ["Phòng họp", "Kho đồ", "Hành lang", "Sân sau", "Phòng ăn", "Sảnh chính"];
const SABOTAGE_OBJECTS = ["máy chiếu", "quạt trần", "đèn chính", "ổ điện", "bảng trắng"];
const THEFT_ITEMS = ["chìa khóa kho", "chiếc ví chung", "cuốn sổ ghi chép", "chiếc điện thoại bàn", "hộp đồ dùng chung"];

function randomOf(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // bỏ I, O, 0, 1 cho khỏi nhầm
  let out = "";
  for (let i = 0; i < 4; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ---------- Mission + clues ----------
// Manh mối chỉ nhắc địa điểm / đồ vật / dấu vết, KHÔNG nêu tên thủ phạm.
function generateMission(players, culpritUid) {
  const type = randomOf(["sabotage", "theft", "eliminate"]);
  const location = randomOf(LOCATIONS);
  if (type === "sabotage") {
    const object = randomOf(SABOTAGE_OBJECTS);
    return {
      type, typeLabel: "Phá phách", location, object,
      detail: `Phá hỏng ${object} ở ${location}.`,
      scene: `Hiện trường ở ${location}: ${object} bị phá hỏng, không dùng được nữa.`,
      clues: [
        `${object} ở ${location} bị ngắt dây / làm lệch khớp, còn dấu vết công cụ lạ.`,
        `Có dấu chân ướt dẫn từ ${location} ra hành lang, nhưng không đủ rõ để nhận ra là của ai.`,
      ],
    };
  }
  if (type === "theft") {
    const item = randomOf(THEFT_ITEMS);
    return {
      type, typeLabel: "Trộm cắp", location, item,
      detail: `Trộm ${item} ở ${location}.`,
      scene: `Hiện trường ở ${location}: ${item} vốn để ở đó đã biến mất.`,
      clues: [
        `${item} vốn để ở ${location} đã không còn ở chỗ cũ.`,
        `Ngăn kéo / kệ ở ${location} bị mở ra, còn lại một sợi chỉ lạ, không đủ để nhận diện người.`,
      ],
    };
  }
  // eliminate: nạn nhân là 1 người chơi khác, được chọn ngẫu nhiên.
  const others = players.filter((p) => p.uid !== culpritUid);
  const victim = others.length ? randomOf(others) : null;
  return {
    type, typeLabel: "Loại một người chơi", location,
    victimUid: victim ? victim.uid : null, victimName: victim ? victim.name : "không rõ",
    detail: `Loại ${victim ? victim.name : "một người chơi"} khỏi khu vực ${location} (trong cốt truyện).`,
    scene: `Hiện trường ở ${location}: ${victim ? victim.name : "một người chơi"} được tìm thấy đã bị loại khỏi khu vực chơi (trong cốt truyện). Người này không bỏ phiếu ở ván này.`,
    clues: [
      `Gần ${location} có một chiếc ghế đổ và dấu chân lạ, nhưng không đủ rõ để nhận ra là của ai.`,
      `Có người nghe thấy tiếng động nhỏ ở ${location} trước khi phát hiện ra hiện trường.`,
    ],
  };
}

// ---------- Bot fill (phòng 2-4 người) ----------
// Bot chỉ được thêm khi bắt đầu ván, để đủ đúng 5 người. Bot là người chơi
// thật trong phòng Firebase: có mặt trong danh sách người chơi, có thể là
// thủ phạm / đồng bọn / người vô tội, trò chuyện và bỏ phiếu.
// Mô phỏng bot chạy trên trình duyệt của CHỦ PHÒNG (host ghi tin nhắn và
// phiếu của bot lên nhánh public). Nếu host ngắt kết nối, bot dừng theo.
// Giới hạn đã biết, không có chuyển quyền chủ phòng ở v1 này.
const BOT_NAME_POOL = ["An", "Bình", "Chi", "Dũng", "Hà", "Hương", "Khang", "Linh", "Minh", "Ngọc", "Phong", "Quân", "Thảo", "Tuấn", "Vy", "Đức", "Mai", "Nam", "Quỳnh"];
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickBotNames(humanNames, count) {
  const taken = new Set(humanNames.map((n) => String(n).trim().toLowerCase()));
  return shuffled(BOT_NAME_POOL).filter((n) => !taken.has(n.toLowerCase())).slice(0, count);
}
let botRoles = { culpritUid: null, accompliceUid: null };
let botChatSent = false;
let botVotesSent = false;
let botReadySent = false;

function tallyVotes(votes) {
  const counts = {};
  Object.values(votes || {}).forEach((suspectUid) => {
    counts[suspectUid] = (counts[suspectUid] || 0) + 1;
  });
  let top = 0;
  Object.values(counts).forEach((n) => { if (n > top) top = n; });
  const leaders = Object.keys(counts).filter((uid) => counts[uid] === top);
  return { counts, top, leaders, tie: leaders.length > 1, accusedUid: leaders.length === 1 ? leaders[0] : null };
}

// ---------- Movement prototype ----------
// World 1600x900, viewport canvas 960x540, camera follows local player.
// No wall collision in prototype, only world bounds. Positions sync at
// ~10/sec to rooms/{code}/public/positions/{uid}.
const WORLD_W = 1600, WORLD_H = 900, VIEW_W = 960, VIEW_H = 540;
const MAP_ZONES = [
  { name: "Vườn", x: 0, y: 0, w: 600, h: 450, color: "#7ec850" },
  { name: "Sân sau", x: 600, y: 0, w: 1000, h: 450, color: "#f2d492" },
  { name: "Phòng khách", x: 0, y: 450, w: 700, h: 450, color: "#f7a8b8" },
  { name: "Bếp", x: 700, y: 450, w: 500, h: 450, color: "#a8d8ea" },
  { name: "Hành lang", x: 1200, y: 450, w: 400, h: 450, color: "#d8c7a8" },
];
const TRACE_SPOTS = [
  { x: 200, y: 200 }, { x: 820, y: 170 }, { x: 1350, y: 260 },
  { x: 300, y: 680 }, { x: 920, y: 720 }, { x: 1420, y: 660 },
];
let myPos = null, movePositions = {}, moveTraces = {}, myClues = [];
let moveLoopOn = false, lastMoveTick = 0, lastPosSync = 0, posSpawned = false, posAttached = false;
let keysDown = {}, joyVec = { x: 0, y: 0 };
let botWanderOn = false, botTargets = {};
function buildTraces(mission) {
  const loc = (mission && mission.location) || "hiện trường";
  const texts = [
    ...(mission && mission.clues ? mission.clues : []),
    `Dấu chân lạ dẫn qua ${loc}, chưa rõ của ai.`,
    `Một vật nhỏ ở ${loc} bị xê dịch khỏi chỗ cũ.`,
    `Có tiếng động nhỏ ở ${loc} trước khi phát hiện hiện trường.`,
    `Còn sót lại một sợi chỉ / mảnh vụn lạ ở ${loc}.`,
  ].slice(0, 6);
  const out = {};
  texts.forEach((text, i) => { out[`t${i + 1}`] = { x: TRACE_SPOTS[i].x, y: TRACE_SPOTS[i].y, text }; });
  return out;
}
function renderNotebook() {
  $("notebookList").innerHTML = myClues.length
    ? myClues.map((c) => `<li>🔍 ${esc(c)}</li>`).join("")
    : `<li class="small">Chưa nhặt được dấu vết nào. Hãy đi tìm các dấu sáng vàng trên bản đồ.</li>`;
}
function nearestTrace() {
  if (!myPos) return null;
  let best = null, bestD = 80;
  Object.entries(moveTraces || {}).forEach(([id, t]) => {
    const d = Math.hypot(t.x - myPos.x, t.y - myPos.y);
    if (d < bestD) { bestD = d; best = { id, ...t }; }
  });
  return best;
}
function syncPos(force) {
  if (!db || !roomCode || !myUid || !myPos) return;
  const now = Date.now();
  if (!force && now - lastPosSync < 100) return;
  lastPosSync = now;
  set(ref(db, `rooms/${roomCode}/public/positions/${myUid}`), { x: Math.round(myPos.x), y: Math.round(myPos.y) }).catch(() => {});
}
function attachPositions() {
  if (posAttached || !db || !roomCode) return;
  posAttached = true;
  onValue(ref(db, `rooms/${roomCode}/public/positions`), (snap) => {
    movePositions = snap.val() || {};
    if (!posSpawned && myUid && !movePositions[myUid]) {
      const uids = publicState.players ? Object.keys(publicState.players) : [myUid];
      const idx = Math.max(0, uids.indexOf(myUid));
      myPos = { x: 800 + ((idx % 3) - 1) * 90, y: 450 + Math.floor(idx / 3) * 90 };
      posSpawned = true;
      syncPos(true);
    } else if (movePositions[myUid] && !myPos) {
      myPos = { x: movePositions[myUid].x, y: movePositions[myUid].y };
    }
  });
  onValue(ref(db, `rooms/${roomCode}/public/traces`), (snap) => { moveTraces = snap.val() || {}; });
}
function drawBeanCanvas(ctx, x, y, color, name, isBot, ghost, isMe) {
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.45;
  ctx.fillStyle = color; ctx.strokeStyle = "#111827"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x - 22, y - 30, 44, 48, 18); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#cfe8ff"; ctx.beginPath(); ctx.ellipse(x, y - 8, 16, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#111827"; ctx.fillRect(x - 14, y + 18, 12, 8); ctx.fillRect(x + 2, y + 18, 12, 8);
  ctx.font = "bold 15px system-ui"; ctx.textAlign = "center";
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#111827"; ctx.lineWidth = 4;
  ctx.strokeText(name, x, y - 38); ctx.fillText(name, x, y - 38);
  if (isBot) { ctx.font = "bold 11px system-ui"; ctx.fillStyle = "#059669"; ctx.fillText("BOT", x, y + 38); }
  if (isMe) { ctx.strokeStyle = "#ff6b35"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y - 2, 34, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
function drawMovement() {
  const canvas = $("moveCanvas"); if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const camX = myPos ? Math.max(0, Math.min(WORLD_W - VIEW_W, myPos.x - VIEW_W / 2)) : 0;
  const camY = myPos ? Math.max(0, Math.min(WORLD_H - VIEW_H, myPos.y - VIEW_H / 2)) : 0;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  MAP_ZONES.forEach((z) => {
    ctx.fillStyle = z.color; ctx.fillRect(z.x - camX, z.y - camY, z.w, z.h);
    ctx.strokeStyle = "rgba(17,24,39,.5)"; ctx.lineWidth = 3; ctx.strokeRect(z.x - camX, z.y - camY, z.w, z.h);
    ctx.font = "bold 26px system-ui"; ctx.fillStyle = "rgba(17,24,39,.65)"; ctx.textAlign = "left";
    ctx.fillText(z.name, z.x - camX + 18, z.y - camY + 40);
  });
  const pulse = 6 + Math.sin(Date.now() / 300) * 3;
  Object.values(moveTraces || {}).forEach((t) => {
    const sx = t.x - camX, sy = t.y - camY;
    ctx.save(); ctx.fillStyle = "rgba(250,204,21,.35)"; ctx.beginPath(); ctx.arc(sx, sy, 26 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.strokeStyle = "#111827"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, sy - 18); ctx.lineTo(sx + 14, sy); ctx.lineTo(sx, sy + 18); ctx.lineTo(sx - 14, sy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#111827"; ctx.font = "bold 18px system-ui"; ctx.textAlign = "center"; ctx.fillText("!", sx, sy + 6); ctx.restore();
  });
  const players = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
  players.forEach((p) => {
    const pos = movePositions[p.uid]; if (!pos) return;
    drawBeanCanvas(ctx, pos.x - camX, pos.y - camY, colorFor(p.uid), p.name, !!p.isBot, p.alive === false, p.uid === myUid);
  });
  const near = nearestTrace();
  const btn = $("traceActionBtn");
  if (near && btn) {
    show("traceActionBtn", true);
    btn.textContent = myPrivate.role === "culprit" ? "🕵️ Giấu dấu vết này" : "🔍 Xem / Nhặt dấu vết";
    $("moveStatus").textContent = "Bạn đang ở gần một dấu vết. Bấm nút góc phải để tương tác.";
  } else if (btn) { show("traceActionBtn", false); }
}
function moveTick(ts) {
  if (!moveLoopOn) return;
  requestAnimationFrame(moveTick);
  if (!myPos) { drawMovement(); return; }
  const dt = Math.min(0.05, (ts - lastMoveTick) / 1000 || 0.016); lastMoveTick = ts;
  let vx = 0, vy = 0;
  if (keysDown["w"] || keysDown["arrowup"]) vy -= 1;
  if (keysDown["s"] || keysDown["arrowdown"]) vy += 1;
  if (keysDown["a"] || keysDown["arrowleft"]) vx -= 1;
  if (keysDown["d"] || keysDown["arrowright"]) vx += 1;
  vx += joyVec.x; vy += joyVec.y;
  const len = Math.hypot(vx, vy);
  if (len > 0) {
    myPos.x = Math.max(24, Math.min(WORLD_W - 24, myPos.x + (vx / Math.max(1, len)) * 280 * dt * (len > 1 ? 1 : len)));
    myPos.y = Math.max(24, Math.min(WORLD_H - 24, myPos.y + (vy / Math.max(1, len)) * 280 * dt * (len > 1 ? 1 : len)));
    syncPos(false);
  }
  drawMovement();
}
function startMovement() {
  attachPositions(); renderNotebook();
  if (!moveLoopOn) { moveLoopOn = true; lastMoveTick = performance.now(); requestAnimationFrame(moveTick); }
}
function startBotWander() {
  if (botWanderOn || !db || !roomCode) return;
  botWanderOn = true;
  setInterval(async () => {
    if (!isHost || publicState.phase !== "investigation" || !publicState.botFill) return;
    const players = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
    const bots = players.filter((p) => p.isBot && p.alive !== false);
    for (const b of bots) {
      const cur = movePositions[b.uid] || { x: 800, y: 450 };
      if (!botTargets[b.uid] || Math.hypot(botTargets[b.uid].x - cur.x, botTargets[b.uid].y - cur.y) < 60) {
        botTargets[b.uid] = { x: 100 + Math.random() * 1400, y: 100 + Math.random() * 700 };
      }
      const t = botTargets[b.uid];
      const d = Math.hypot(t.x - cur.x, t.y - cur.y) || 1;
      const nx = Math.max(24, Math.min(WORLD_W - 24, cur.x + (t.x - cur.x) / d * 55));
      const ny = Math.max(24, Math.min(WORLD_H - 24, cur.y + (t.y - cur.y) / d * 55));
      await set(ref(db, `rooms/${roomCode}/public/positions/${b.uid}`), { x: Math.round(nx), y: Math.round(ny) }).catch(() => {});
    }
  }, 1000);
}

// ---------- Firebase setup / placeholder guard ----------
const cfg = window.__FIREBASE_CONFIG__ || {};
const isPlaceholder = !cfg.apiKey || String(cfg.apiKey).includes("PLACEHOLDER")
  || !cfg.databaseURL || String(cfg.databaseURL).includes("PLACEHOLDER");

let db = null;
let auth = null;
let myUid = null;
let myName = "";
let roomCode = "";
let isHost = false;
let hostUid = "";
let myPrivate = {};
let publicState = {};
let myVote = null;

if (isPlaceholder) {
  show("configWarn", true);
  $("createBtn").disabled = true;
  $("joinBtn").disabled = true;
  $("lobbyStatus").textContent = "Chưa có config Firebase thật nên chưa tạo / vào phòng được. Xem README.md để cấu hình.";
} else {
  const app = initializeApp(cfg);
  auth = getAuth(app);
  db = getDatabase(app);
  onAuthStateChanged(auth, (user) => {
    if (user) myUid = user.uid;
  });
  signInAnonymously(auth).catch((err) => {
    $("lobbyStatus").textContent = `Không đăng nhập ẩn danh được: ${err.message}. Hãy kiểm tra Anonymous Auth đã bật trong Firebase chưa (xem README.md).`;
  });
}

// ---------- Room helpers ----------
function publicRef() { return ref(db, `rooms/${roomCode}/public`); }
function myPrivateRef() { return ref(db, `rooms/${roomCode}/private/${myUid}`); }
function playerName(uid) { return (publicState.players && publicState.players[uid] && publicState.players[uid].name) || uid; }

async function attachListeners() {
  onValue(publicRef(), (snap) => {
    publicState = snap.val() || {};
    hostUid = publicState.hostUid || "";
    renderPublic();
  });
  onValue(myPrivateRef(), (snap) => {
    myPrivate = snap.val() || {};
    renderPrivate();
  });
}

function renderPublic() {
  if (!roomCode) return;
  show("lobbyCard", false);
  show("roomCard", true);
  $("roomCodeLabel").textContent = roomCode;
  $("phaseLabel").textContent = PHASE_LABELS[publicState.phase] || publicState.phase || "";
  $("myNameLabel").textContent = myName;
  const players = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
  if (publicState.phase === "lobby") {
    $("playerCountLabel").textContent = `Đã có ${players.length} người chơi thật. Cần từ 2 người mới bắt đầu được; nếu dưới 5 người, khi bắt đầu sẽ thêm bot cho đủ 5 người.`;
  } else {
    $("playerCountLabel").textContent = `Đã có ${players.length} / 10 người chơi.`;
  }
  $("botFillLabel").textContent = (publicState.botFill && publicState.botNames && publicState.botNames.length)
    ? `Đã thêm ${publicState.botNames.length} bot cho đủ 5 người: ${publicState.botNames.join(", ")}`
    : "";
  $("playerList").innerHTML = players.map((p) => {
    const ghost = p.alive === false;
    return `<div class="char-item ${ghost ? "ghost" : ""}">${beanSVG(p.uid || p.name, ghost)}<div class="cname">${esc(p.name)}</div>${p.uid === myUid ? `<span class="ctag">BẠN</span>` : ""} ${p.isBot ? `<span class="ctag bot">BOT</span>` : ""}${ghost ? `<div class="small">Đã bị loại</div>` : ""}</div>`;
  }).join("");
  $("playerList").className = "char-row";

  const phase = publicState.phase;
  show("secretCard", phase === "secret");
  show("investigationCard", phase === "investigation");
  show("voteCard", phase === "vote");
  show("revealCard", phase === "reveal");

  show("startBtn", isHost && phase === "lobby");
  if (players.length < 2) {
    $("startBtn").disabled = true;
    $("startBtn").textContent = `Bắt đầu ván chơi (cần từ 2 người, hiện có ${players.length})`;
  } else if (players.length < 5) {
    $("startBtn").disabled = false;
    $("startBtn").textContent = `Bắt đầu ván chơi (sẽ thêm ${5 - players.length} bot cho đủ 5 người)`;
  } else {
    $("startBtn").disabled = false;
    $("startBtn").textContent = "Bắt đầu ván chơi";
  }

  // Movement phase (prototype, replaces old text investigation cards)
  if (phase === "investigation") {
    attachChat();
    startMovement();
    $("sceneLabel").textContent = publicState.scene || "Hãy đi tìm các dấu sáng vàng trên bản đồ.";
    show("toVoteBtn", isHost);
    if (isHost) startBotWander();
  }

  // Vote
  if (phase === "vote") {
    const alivePlayers = players.filter((p) => p.alive !== false && p.uid !== myUid);
    $("voteList").innerHTML = alivePlayers.map((p) => (
      `<button class="vote-btn ${myVote === p.uid ? "selected" : ""}" data-vote="${esc(p.uid)}">${beanSVG(p.uid || p.name)}<span>${esc(p.name)}${p.isBot ? " · BOT" : ""}</span></button>`
    )).join("") || "<p class=\"small\">Không còn ai để bỏ phiếu.</p>";
    document.querySelectorAll("[data-vote]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        myVote = btn.getAttribute("data-vote");
        await set(ref(db, `rooms/${roomCode}/public/votes/${myUid}`), myVote);
        renderPublic();
      });
    });
    const votes = publicState.votes || {};
    const aliveVoters = players.filter((p) => p.alive !== false);
    $("voteStatus").textContent = `Đã có ${Object.keys(votes).length} / ${aliveVoters.length} phiếu.`;
    show("revealBtn", isHost && Object.keys(votes).length >= aliveVoters.length && aliveVoters.length > 0);
  }

  // Reveal
  if (phase === "reveal" && publicState.reveal) {
    const r = publicState.reveal;
    $("revealCard").classList.toggle("win-good", !!r.innocentWin);
    $("revealCard").classList.toggle("win-bad", !r.innocentWin);
    $("revealChars").innerHTML = `<div class="big"><div>${beanSVG(r.culpritUid || r.culpritName)}</div><div class="cap">THỦ PHẠM<br>${esc(r.culpritName)}</div></div>` + (r.accompliceUid ? `<div class="mid"><div>${beanSVG(r.accompliceUid)}</div><div class="cap">ĐỒNG BỌN<br>${esc(r.accompliceName || "")}</div></div>` : `<div class="mid"><div style="font-size:52px">—</div><div class="cap">Không có<br>đồng bọn</div></div>`);
    $("resultLabel").textContent = r.innocentWin
      ? "🎉 Phe người chơi vô tội THẮNG — vì người bị tố cáo đúng là thủ phạm."
      : "😈 Phe thủ phạm THẮNG — vì người bị tố cáo không phải thủ phạm (là đồng bọn hoặc người vô tội), hoặc hòa phiếu.";
    $("revealDetailLabel").textContent = [
      `Người bị tố cáo: ${r.tie ? "Hòa phiếu — không có người bị tố cáo duy nhất" : r.accusedName}`,
      `Thủ phạm: ${r.culpritName}`,
      `Đồng bọn: ${r.accompliceName || "Không có đồng bọn"}`,
      `Nhiệm vụ bí mật: ${r.missionLabel} — ${r.missionDetail}`,
      `Hiện trường: ${r.scene}`,
    ].join("\n");
    const breakdown = Object.entries(r.voteCounts || {}).map(([uid, n]) => `${playerName(uid)}: ${n} phiếu`).join("\n");
    $("voteBreakdownLabel").textContent = breakdown ? `Chi tiết phiếu:\n${breakdown}` : "";
  }

  // Bot fill: mô phỏng bot chỉ chạy trên trình duyệt của chủ phòng.
  maybeBotHostActions();
}

// Khôi phục vai trò bot cho host (khi host tải lại trang giữa ván) từ node
// riêng của chính host, vốn chứa assignments + accompliceUpdate.
function reconstructBotRoles() {
  if (myPrivate.assignments && myPrivate.assignments.culpritUid) {
    botRoles.culpritUid = myPrivate.assignments.culpritUid;
  }
  if (myPrivate.accompliceUpdate && myPrivate.accompliceUpdate.accompliceUid) {
    botRoles.accompliceUid = myPrivate.accompliceUpdate.accompliceUid;
  }
}

async function maybeBotHostActions() {
  if (!isHost || !publicState.botFill || !db || !roomCode) return;
  reconstructBotRoles();
  const phase = publicState.phase;
  const players = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
  const culpritUid = botRoles.culpritUid;
  if (phase === "secret" && culpritUid && players.some((p) => p.uid === culpritUid && p.isBot) && !publicState.secretReady && !botReadySent) {
    botReadySent = true;
    setTimeout(async () => { await update(publicRef(), { secretReady: true }); }, 1500);
  }
  if (phase === "investigation" && !botChatSent) {
    botChatSent = true;
    await sendBotChat();
  }
  if (phase === "vote" && !botVotesSent) {
    botVotesSent = true;
    await sendBotVotes();
  }
}

// Tin nhắn bot: bàn về manh mối, đôi khi đánh lạc hướng, KHÔNG bao giờ
// tiết lộ thủ phạm / đồng bọn là ai, KHÔNG tự nhận là thủ phạm, KHÔNG
// tố cáo đúng thủ phạm. Đồng bọn chỉ nói chung chung để giảm nghi ngờ
// và đổ lỗi cho một người vô tội, không nêu tên thủ phạm.
async function sendBotChat() {
  const players = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
  const bots = players.filter((p) => p.isBot && p.alive !== false);
  if (!bots.length) return;
  // Tránh gửi trùng nếu host tải lại trang giữa ván.
  try {
    const chatSnap = await get(ref(db, `rooms/${roomCode}/public/chat`));
    const existing = chatSnap.val() || {};
    if (Object.values(existing).some((m) => bots.some((b) => b.name === m.name))) return;
  } catch (_) { /* vẫn gửi tiếp, lỗi đọc chat không chặn bot */ }
  const culpritUid = botRoles.culpritUid;
  const accompliceUid = botRoles.accompliceUid;
  const innocents = players.filter((p) => p.alive !== false && p.uid !== culpritUid && p.uid !== accompliceUid);
  const pickInnocentTarget = (selfUid) => {
    const targets = innocents.filter((p) => p.uid !== selfUid);
    return targets.length ? randomOf(targets) : null;
  };
  const messages = [];
  bots.forEach((bot) => {
    if (bot.uid === culpritUid) {
      const t = pickInnocentTarget(bot.uid);
      messages.push({ name: bot.name, text: t
        ? `Mình cũng bất ngờ lắm, không biết ai làm nữa. Mà mình thấy ${t.name} lúc đó hơi lảng tránh, mọi người để ý xem sao.`
        : "Mình cũng bất ngờ lắm, không biết ai làm nữa." });
    } else if (bot.uid === accompliceUid) {
      const t = pickInnocentTarget(bot.uid);
      messages.push({ name: bot.name, text: t
        ? `Đừng vội kết luận, có khi chỉ là hiểu lầm thôi. Mình thấy ${t.name} cứ nhắc tới hiện trường nhiều quá, hơi lạ.`
        : "Đừng vội kết luận, có khi chỉ là hiểu lầm thôi." });
    } else {
      const t = pickInnocentTarget(bot.uid);
      messages.push({ name: bot.name, text: t && Math.random() < 0.5
        ? `Mình xem manh mối rồi, vẫn chưa chắc. ${t.name} lúc đó ở đâu nhỉ, mọi người hỏi thử xem.`
        : "Mình xem manh mối rồi, vẫn chưa chắc chắn. Mọi người thấy điểm nào đáng ngờ nhất?" });
    }
  });
  for (const m of shuffled(messages)) {
    await push(ref(db, `rooms/${roomCode}/public/chat`), { name: m.name, text: m.text, at: Date.now() });
  }
}

// Phiếu bot: bot vô tội bỏ cho người khác ngẫu nhiên (không tự bỏ cho mình),
// bot đồng bọn bỏ cho một người vô tội (không bỏ cho thủ phạm),
// bot thủ phạm bỏ cho một người vô tội (không bỏ cho đồng bọn).
async function sendBotVotes() {
  const players = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
  const alive = players.filter((p) => p.alive !== false);
  const bots = alive.filter((p) => p.isBot);
  if (!bots.length) return;
  let existingVotes = {};
  try {
    const votesSnap = await get(ref(db, `rooms/${roomCode}/public/votes`));
    existingVotes = votesSnap.val() || {};
  } catch (_) { /* vẫn gửi tiếp */ }
  const culpritUid = botRoles.culpritUid;
  const accompliceUid = botRoles.accompliceUid;
  for (const bot of bots) {
    if (existingVotes[bot.uid]) continue;
    let targets;
    if (bot.uid === culpritUid) {
      targets = alive.filter((p) => p.uid !== bot.uid && p.uid !== accompliceUid);
    } else if (bot.uid === accompliceUid) {
      targets = alive.filter((p) => p.uid !== bot.uid && p.uid !== culpritUid);
    } else {
      targets = alive.filter((p) => p.uid !== bot.uid);
    }
    if (!targets.length) continue;
    await set(ref(db, `rooms/${roomCode}/public/votes/${bot.uid}`), randomOf(targets).uid);
  }
}

function renderPrivate() {
  if (!roomCode || publicState.phase !== "secret") {
    show("secretForCulprit", false);
    show("inviteCard", false);
    show("accompliceCard", false);
    return;
  }
  const isCulprit = myPrivate.role === "culprit";
  const isAccomplice = myPrivate.role === "accomplice";
  show("secretForOthers", !isCulprit);
  show("secretForCulprit", isCulprit);
  // Ván có bot: đồng bọn đã chọn ngẫu nhiên khi bắt đầu, nên ẩn phần mời
  // riêng để không tạo thêm đồng bọn thứ hai.
  if (publicState.botFill) {
    show("inviteLabel", false);
    show("accompliceSelect", false);
    show("inviteBtn", false);
    if (isCulprit) $("inviteStatus").textContent = "Ván có bot: đồng bọn (nếu có) đã được chọn ngẫu nhiên khi bắt đầu, bạn không cần mời.";
  } else {
    show("inviteLabel", true);
    show("accompliceSelect", true);
    show("inviteBtn", true);
  }
  show("accompliceCard", isAccomplice);
  show("toInvestigationBtn", isHost);

  if (isCulprit && myPrivate.mission) {
    $("myMissionLabel").textContent = `Nhiệm vụ của bạn: ${myPrivate.mission.typeLabel} — ${myPrivate.mission.detail}\nHiện trường sẽ hiện cho mọi người: ${myPrivate.mission.scene}`;
    const players = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
    const others = players.filter((p) => p.uid !== myUid && p.alive !== false);
    const alreadyInvited = Boolean(myPrivate.inviteSentTo);
    $("accompliceSelect").innerHTML = others.map((p) => `<option value="${esc(p.uid)}">${esc(p.name)}</option>`).join("");
    $("inviteBtn").disabled = alreadyInvited || others.length === 0;
    if (myPrivate.inviteResponse) {
      $("inviteStatus").textContent = myPrivate.inviteResponse.accepted
        ? `Người bạn mời đã ĐỒNG Ý làm đồng bọn: ${myPrivate.inviteResponse.accompliceName}. Chỉ bạn và người đó biết điều này.`
        : "Người bạn mời đã từ chối. Ván này không có đồng bọn.";
    } else if (alreadyInvited) {
      $("inviteStatus").textContent = "Đã gửi lời mời riêng, đang chờ người đó trả lời…";
    } else {
      $("inviteStatus").textContent = "";
    }
  }

  if (myPrivate.invite && !myPrivate.inviteAnswered) {
    show("inviteCard", true);
    $("inviteFromLabel").textContent = `${myPrivate.invite.fromName} đang mời riêng bạn làm đồng bọn. Nếu đồng ý, chỉ bạn và người đó biết. Nếu từ chối, ván này không có đồng bọn từ lời mời này.`;
  } else {
    show("inviteCard", false);
  }

  if (isAccomplice) {
    $("accompliceLabel").textContent = `Bạn đang phối hợp với thủ phạm. Hãy đánh lạc hướng một cách hợp lý, đừng tự nhận mình là đồng bọn trong trò chuyện chung.`;
  }

  $("secretReadyLabel").textContent = publicState.secretReady
    ? "Thủ phạm đã bấm sẵn sàng. Chủ phòng có thể chuyển sang điều tra."
    : "";
}

// ---------- Actions ----------
$("createBtn").addEventListener("click", async () => {
  if (isPlaceholder || !myUid) return;
  myName = $("playerName").value.trim();
  if (!myName) { $("lobbyStatus").textContent = "Hãy nhập tên của bạn trước."; return; }
  roomCode = randomCode();
  isHost = true;
  hostUid = myUid;
  await set(publicRef(), {
    code: roomCode, hostUid: myUid, phase: "lobby", createdAt: Date.now(),
    players: { [myUid]: { name: myName, alive: true } },
  });
  $("lobbyStatus").textContent = `Đã tạo phòng ${roomCode}. Gửi mã này cho mọi người cùng vào.`;
  await attachListeners();
});

$("joinBtn").addEventListener("click", async () => {
  if (isPlaceholder || !myUid) return;
  myName = $("playerName").value.trim();
  const code = $("roomCodeInput").value.trim().toUpperCase();
  if (!myName) { $("lobbyStatus").textContent = "Hãy nhập tên của bạn trước."; return; }
  if (!/^[A-Z0-9]{4}$/.test(code)) { $("lobbyStatus").textContent = "Mã phòng phải đúng 4 ký tự."; return; }
  const snap = await get(ref(db, `rooms/${code}/public`));
  if (!snap.exists()) { $("lobbyStatus").textContent = `Không tìm thấy phòng ${code}. Kiểm tra lại mã phòng.`; return; }
  const room = snap.val();
  if (room.phase !== "lobby") { $("lobbyStatus").textContent = "Phòng này đã bắt đầu chơi, không vào thêm được."; return; }
  const count = room.players ? Object.keys(room.players).length : 0;
  if (count >= 10) { $("lobbyStatus").textContent = "Phòng đã đủ 10 người."; return; }
  roomCode = code;
  isHost = room.hostUid === myUid;
  hostUid = room.hostUid;
  await update(ref(db, `rooms/${code}/public/players/${myUid}`), { name: myName, alive: true });
  $("lobbyStatus").textContent = `Đã vào phòng ${code}.`;
  await attachListeners();
});

$("startBtn").addEventListener("click", async () => {
  if (!isHost) return;
  const humans = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
  if (humans.length < 2) {
    $("roomStatus").textContent = "Cần từ 2 người mới bắt đầu được. Phòng chỉ có 1 người thì chưa bắt đầu được.";
    return;
  }
  // Bot fill: 2 người -> +3 bot, 3 người -> +2 bot, 4 người -> +1 bot, 5-10 người -> không bot.
  const botsNeeded = humans.length < 5 ? 5 - humans.length : 0;
  const botFill = botsNeeded > 0;
  const botNames = botFill ? pickBotNames(humans.map((p) => p.name), botsNeeded) : [];
  const botPlayers = botNames.map((name, i) => ({ uid: `bot${i + 1}`, name, isBot: true, alive: true }));
  const players = [...humans, ...botPlayers];
  const culprit = randomOf(players);
  const mission = generateMission(players, culprit.uid);
  // Ván có bot: đồng bọn chọn ngẫu nhiên 50% khi bắt đầu (thay cho mời riêng,
  // vì host không được đọc node riêng của người khác để mô phỏng mời/đồng ý).
  // Ván không bot: giữ nguyên luồng mời riêng / đồng ý như cũ.
  let accompliceUid = null;
  let accompliceName = null;
  if (botFill && Math.random() < 0.5) {
    const cand = randomOf(players.filter((p) => p.uid !== culprit.uid));
    accompliceUid = cand.uid;
    accompliceName = cand.name;
  }
  botRoles = { culpritUid: culprit.uid, accompliceUid };
  botChatSent = false;
  botVotesSent = false;
  botReadySent = false;

  // Đánh dấu nạn nhân (nếu nhiệm vụ là loại người chơi) là không còn bỏ phiếu.
  const playerUpdates = {};
  players.forEach((p) => { playerUpdates[p.uid] = { name: p.name, alive: !(mission.type === "eliminate" && mission.victimUid === p.uid), isBot: Boolean(p.isBot) }; });
  await update(ref(db, `rooms/${roomCode}/public/players`), playerUpdates);

  await update(publicRef(), {
    phase: "secret", scene: mission.scene, clues: mission.clues, secretReady: false,
    votes: null, chat: null, reveal: null, missionTypeLabel: mission.typeLabel,
    botFill, botCount: botsNeeded, botNames, positions: null,
  });
  // Movement prototype: host creates 6 traces spread across the map.
  await set(ref(db, `rooms/${roomCode}/public/traces`), buildTraces(mission)).catch(() => {});

  // Vai trò riêng tư: mỗi người chỉ đọc được node của chính mình (xem Rules trong README).
  // Bản sao assignments nằm chung trong node riêng của chủ phòng, để cuối ván
  // chủ phòng đọc lại và công bố — và để tránh ghi đè lẫn nhau, mỗi người chỉ
  // được ghi đúng 1 lần ở đây, không ghi thêm node assignments riêng sau đó.
  // Ghi node của bot là best-effort: nếu Rules chặn host ghi node của bot,
  // mô phỏng bot vẫn chạy được từ assignments + accompliceUpdate của host
  // và từ biến botRoles trong bộ nhớ của host.
  const writes = players.map((p) => {
    const data = {
      role: p.uid === culprit.uid ? "culprit" : (p.uid === accompliceUid ? "accomplice" : "innocent"),
      mission: p.uid === culprit.uid ? mission : null,
      invite: null, inviteResponse: null, inviteSentTo: null, inviteAnswered: false,
    };
    if (p.uid === myUid) {
      data.assignments = { culpritUid: culprit.uid, culpritName: culprit.name, mission };
      if (botFill && accompliceUid) data.accompliceUpdate = { accompliceUid, accompliceName };
    }
    const w = set(ref(db, `rooms/${roomCode}/private/${p.uid}`), data);
    return p.isBot ? w.catch(() => null) : w;
  });
  await Promise.allSettled(writes);
  $("roomStatus").textContent = botFill
    ? `Đã bắt đầu. Đã thêm ${botsNeeded} bot cho đủ 5 người: ${botNames.join(", ")}. Thủ phạm đang nhận nhiệm vụ bí mật.`
    : "Đã bắt đầu. Thủ phạm đang nhận nhiệm vụ bí mật.";
});

$("inviteBtn").addEventListener("click", async () => {
  const targetUid = $("accompliceSelect").value;
  if (!targetUid) return;
  await set(ref(db, `rooms/${roomCode}/private/${targetUid}/invite`), {
    fromUid: myUid, fromName: myName, at: Date.now(),
  });
  await update(myPrivateRef(), { inviteSentTo: targetUid });
  $("inviteStatus").textContent = "Đã gửi lời mời riêng, đang chờ người đó trả lời…";
});

$("acceptInviteBtn").addEventListener("click", async () => {
  const invite = myPrivate.invite;
  if (!invite) return;
  await set(ref(db, `rooms/${roomCode}/private/${invite.fromUid}/inviteResponse`), {
    accepted: true, accompliceUid: myUid, accompliceName: myName,
  });
  // Báo cho chủ phòng (qua node riêng của chủ phòng) để cuối ván công bố đúng đồng bọn.
  await set(ref(db, `rooms/${roomCode}/private/${hostUid}/accompliceUpdate`), {
    accompliceUid: myUid, accompliceName: myName,
  });
  await update(myPrivateRef(), { role: "accomplice", inviteAnswered: true });
  $("inviteDecisionLabel").textContent = "Bạn đã đồng ý. Chỉ bạn và thủ phạm biết điều này.";
});

$("declineInviteBtn").addEventListener("click", async () => {
  const invite = myPrivate.invite;
  if (!invite) return;
  await set(ref(db, `rooms/${roomCode}/private/${invite.fromUid}/inviteResponse`), {
    accepted: false, accompliceUid: null, accompliceName: null,
  });
  await update(myPrivateRef(), { inviteAnswered: true });
  $("inviteDecisionLabel").textContent = "Bạn đã từ chối. Ván này không có đồng bọn từ lời mời này.";
});

$("culpritReadyBtn").addEventListener("click", async () => {
  await update(publicRef(), { secretReady: true });
});

$("toInvestigationBtn").addEventListener("click", async () => {
  if (!isHost) return;
  // Fallback: if traces were not created at start, create them now from
  // the public clues/scene (never naming the culprit).
  try {
    const tSnap = await get(ref(db, `rooms/${roomCode}/public/traces`));
    if (!tSnap.exists()) {
      await set(ref(db, `rooms/${roomCode}/public/traces`), buildTraces({ location: "hiện trường", clues: publicState.clues || [] }));
    }
  } catch (_) {}
  await update(publicRef(), { phase: "investigation" });
});

// Movement controls: keyboard + virtual joystick, trace action, meeting.
document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  const inInput = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT");
  if (!inInput && ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
  if (!inInput) keysDown[k] = true;
});
document.addEventListener("keyup", (e) => { keysDown[e.key.toLowerCase()] = false; });
(function setupJoystick() {
  const base = $("joyBase"), knob = $("joyKnob");
  if (!base || !knob) return;
  let active = null;
  const updateJoy = (clientX, clientY) => {
    const r = base.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (clientX - cx) / 40, dy = (clientY - cy) / 40;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    joyVec = { x: dx, y: dy };
    knob.style.transform = `translate(${dx * 28}px, ${dy * 28}px)`;
  };
  base.addEventListener("pointerdown", (e) => { active = e.pointerId; base.setPointerCapture(active); updateJoy(e.clientX, e.clientY); });
  base.addEventListener("pointermove", (e) => { if (e.pointerId === active) updateJoy(e.clientX, e.clientY); });
  const endJoy = (e) => { if (e.pointerId === active) { active = null; joyVec = { x: 0, y: 0 }; knob.style.transform = ""; } };
  base.addEventListener("pointerup", endJoy);
  base.addEventListener("pointercancel", endJoy);
})();
$("traceActionBtn").addEventListener("click", async () => {
  const near = nearestTrace();
  if (!near || !db || !roomCode) return;
  if (myPrivate.role === "culprit") {
    // Culprit hides: trace disappears for everyone, no clue for anyone.
    await set(ref(db, `rooms/${roomCode}/public/traces/${near.id}`), null).catch(() => {});
    $("moveStatus").textContent = "Bạn đã giấu dấu vết. Người khác tới đây sẽ không còn thấy gì.";
  } else {
    if (!myClues.includes(near.text)) myClues.push(near.text);
    renderNotebook();
    await set(ref(db, `rooms/${roomCode}/public/traces/${near.id}`), null).catch(() => {});
    $("moveStatus").textContent = "Đã nhặt dấu vết, xem trong Sổ manh mối của bạn.";
  }
});
$("meetingBtn").addEventListener("click", async () => {
  // Prototype route: any player may call a meeting. Public node is writable
  // by any authenticated player under the suggested Rules, so this works
  // without waiting for the host. Host-only button (toVoteBtn) still exists.
  if (!db || !roomCode) return;
  await update(publicRef(), { phase: "vote", meetingBy: myName }).catch(() => {});
});

$("sendChatBtn").addEventListener("click", async () => {
  const text = $("chatInput").value.trim();
  if (!text) return;
  await push(ref(db, `rooms/${roomCode}/public/chat`), { name: myName, text, at: Date.now() });
  $("chatInput").value = "";
});

// Chat hiển thị: theo dõi riêng để không vẽ lại toàn bộ phòng mỗi tin nhắn.
let chatAttached = false;
function attachChat() {
  if (chatAttached || !db || !roomCode) return;
  chatAttached = true;
  onValue(ref(db, `rooms/${roomCode}/public/chat`), (snap) => {
    const val = snap.val() || {};
    $("chatBox").innerHTML = Object.values(val).map((m) => {
      const plist = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
      const sender = plist.find((p) => p.name === m.name);
      return `<div class="chatline"><span style="width:36px;flex-shrink:0;display:inline-block">${beanSVG(sender ? sender.uid : m.name)}</span><span class="bubble"><strong>${esc(m.name)}:</strong> ${esc(m.text)}</span></div>`;
    }).join("");
    $("chatBox").scrollTop = $("chatBox").scrollHeight;
  });
}
$("toVoteBtn").addEventListener("click", async () => {
  if (!isHost) return;
  await update(publicRef(), { phase: "vote" });
});

$("revealBtn").addEventListener("click", async () => {
  if (!isHost) return;
  const assignSnap = await get(ref(db, `rooms/${roomCode}/private/${myUid}/assignments`));
  const accomSnap = await get(ref(db, `rooms/${roomCode}/private/${myUid}/accompliceUpdate`));
  const assign = assignSnap.val() || {};
  const accom = accomSnap.val() || {};
  const votesSnap = await get(ref(db, `rooms/${roomCode}/public/votes`));
  const votes = votesSnap.val() || {};
  const t = tallyVotes(votes);
  const culpritUid = assign.culpritUid;
  const innocentWin = Boolean(!t.tie && t.accusedUid && t.accusedUid === culpritUid);
  await update(publicRef(), {
    phase: "reveal",
    reveal: {
      tie: t.tie, accusedUid: t.accusedUid, accusedName: t.accusedUid ? playerName(t.accusedUid) : null,
      culpritUid, culpritName: assign.culpritName || playerName(culpritUid),
      accompliceUid: accom.accompliceUid || null, accompliceName: accom.accompliceName || null,
      missionLabel: assign.mission ? assign.mission.typeLabel : (publicState.missionTypeLabel || ""),
      missionDetail: assign.mission ? assign.mission.detail : "",
      scene: publicState.scene || (assign.mission ? assign.mission.scene : ""),
      innocentWin, voteCounts: t.counts,
    },
  });
});

$("newGameBtn").addEventListener("click", () => {
  // Ván mới = phòng mới, để mã phòng cũ không bị lẫn vai trò cũ.
  window.location.reload();
});
