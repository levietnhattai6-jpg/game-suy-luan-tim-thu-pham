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


// ---------- Capybara characters: APPROVED IMAGE ASSETS ONLY ----------
// Sheet media-generation-capybara-nhan-vat-*.webp (8 in one row) was sliced
// into assets/capy-0.png .. capy-7.png, cream background made transparent.
// Same player always gets the same sprite: hash(uid) % 8.
const CAPY_SPRITES = Array.from({length: 8}, (_, i) => `assets/capy-${i}.png`);
const capyImg = new Image();
const capySpriteImgs = CAPY_SPRITES.map((src) => { const im = new Image(); im.src = src; return im; });
function capySpriteIndex(key) { return Math.abs(hashStr(key)) % 8; }
function capyImgTag(key, ghost = false) {
  return `<img src="${CAPY_SPRITES[capySpriteIndex(key)]}" alt="capybara" style="width:72px;height:auto;${ghost ? 'opacity:.45;filter:grayscale(1);' : ''}">`;
}
// Brown capybara with deterministic silly face by uid hash: same player keeps
// the same fur, eyes, mouth and accessory across lobby, map, vote, reveal.
const CAPY_FURS = ["#8d6e63", "#a1887f", "#795548", "#bcaaa4", "#6d4c41", "#9c7a5a"];
function hashStr(s) { let h = 0; for (const ch of String(s ?? "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
function capyFace(key) {
  const h = hashStr(key);
  return { fur: CAPY_FURS[h % CAPY_FURS.length], eye: h % 5, mouth: (h >>> 3) % 4, acc: (h >>> 5) % 5 };
}
function colorFor(key) { return capyFace(key).fur; }
function capyEyesSVG(eye) {
  if (eye === 1) return '<path d="M32 38 L44 46 M44 38 L32 46 M56 38 L68 46 M68 38 L56 46" stroke="#111827" stroke-width="3" stroke-linecap="round"/>';
  if (eye === 2) return '<path d="M32 44 Q38 36 44 44 M56 44 Q62 36 68 44" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round"/>';
  if (eye === 3) return '<circle cx="38" cy="42" r="6" fill="#fff" stroke="#111827" stroke-width="2"/><circle cx="38" cy="42" r="3" fill="#111827"/><circle cx="62" cy="42" r="6" fill="#fff" stroke="#111827" stroke-width="2"/><circle cx="62" cy="42" r="3" fill="#111827"/>';
  if (eye === 4) return '<path d="M32 38 L44 44 M56 44 L68 38" stroke="#111827" stroke-width="3" stroke-linecap="round"/><circle cx="38" cy="46" r="3" fill="#111827"/><circle cx="62" cy="46" r="3" fill="#111827"/>';
  return '<circle cx="38" cy="42" r="4" fill="#111827"/><circle cx="62" cy="42" r="4" fill="#111827"/>';
}
function capyMouthSVG(mouth) {
  if (mouth === 0) return '<path d="M42 68 Q50 74 58 68" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round"/><ellipse cx="50" cy="75" rx="8" ry="5" fill="#f48fb1" stroke="#111827" stroke-width="2"/>';
  if (mouth === 1) return '<path d="M36 68 Q50 82 64 68 Z" fill="#fff" stroke="#111827" stroke-width="2"/><path d="M36 68 Q50 82 64 68" fill="none" stroke="#111827" stroke-width="3"/>';
  if (mouth === 2) return '<ellipse cx="50" cy="71" rx="13" ry="9" fill="#5d4037" stroke="#111827" stroke-width="2"/><ellipse cx="50" cy="74" rx="7" ry="4" fill="#f48fb1"/>';
  return '<circle cx="50" cy="70" r="5" fill="none" stroke="#111827" stroke-width="3"/>';
}
function capyAccSVG(acc) {
  if (acc === 1) return '<rect x="28" y="34" width="20" height="12" rx="4" fill="#111827"/><rect x="52" y="34" width="20" height="12" rx="4" fill="#111827"/><rect x="48" y="39" width="4" height="3" fill="#111827"/>';
  if (acc === 2) return '<path d="M28 26 Q50 6 72 26 L72 20 Q50 2 28 20 Z" fill="#2f7de1" stroke="#111827" stroke-width="2"/><rect x="22" y="24" width="56" height="6" rx="3" fill="#1d4ed8" stroke="#111827" stroke-width="2"/>';
  if (acc === 3) return '<circle cx="74" cy="18" r="5" fill="#f9a8d4" stroke="#111827" stroke-width="1.5"/><circle cx="74" cy="18" r="2" fill="#facc15"/>';
  if (acc === 4) return '<rect x="24" y="24" width="52" height="8" rx="4" fill="#ef4444" stroke="#111827" stroke-width="2"/>';
  return "";
}
function capySVG(key, ghost = false) { return capyImgTag(key, ghost); }
function capySVG_OLD(key, ghost = false) {
  const f = capyFace(key);
  const fur = ghost ? "#94a3b8" : f.fur;
  const snout = ghost ? "#e2e8f0" : "#d7ccc8";
  return `<svg viewBox="0 0 100 110" aria-hidden="true"><ellipse cx="28" cy="28" rx="9" ry="11" fill="${fur}" stroke="#111827" stroke-width="3"/><ellipse cx="72" cy="28" rx="9" ry="11" fill="${fur}" stroke="#111827" stroke-width="3"/><ellipse cx="28" cy="28" rx="4" ry="6" fill="#5d4037" opacity=".5"/><ellipse cx="72" cy="28" rx="4" ry="6" fill="#5d4037" opacity=".5"/><rect x="14" y="20" width="72" height="72" rx="30" fill="${fur}" stroke="#111827" stroke-width="3"/><ellipse cx="36" cy="30" rx="16" ry="9" fill="#fff" opacity=".18"/><rect x="28" y="52" width="44" height="22" rx="11" fill="${snout}" stroke="#111827" stroke-width="2"/><ellipse cx="50" cy="62" rx="6" ry="4" fill="#111827"/>${ghost ? "" : capyEyesSVG(f.eye)}${ghost ? "" : capyMouthSVG(f.mouth)}${ghost ? "" : capyAccSVG(f.acc)}<rect x="22" y="84" width="22" height="10" rx="5" fill="#5d4037"/><rect x="56" y="84" width="22" height="10" rx="5" fill="#5d4037"/></svg>`;
}
function sceneSVG(typeLabel) {
  if (typeLabel === "Trộm cắp") return `<svg viewBox="0 0 520 220"><rect width="520" height="220" fill="#fef3c7"/><rect x="40" y="50" width="200" height="110" fill="#a16207" stroke="#111827" stroke-width="3"/><rect x="60" y="70" width="160" height="70" fill="#fde68a" stroke="#111827" stroke-width="2"/><rect x="100" y="95" width="80" height="45" fill="none" stroke="#dc2626" stroke-width="3" stroke-dasharray="8 6"/><text x="140" y="122" text-anchor="middle" font-size="20" font-weight="800" fill="#991b1b">TRỐNG!</text><rect x="300" y="60" width="150" height="100" fill="#fff" stroke="#111827" stroke-width="3"/><line x1="310" y1="70" x2="440" y2="150" stroke="#dc2626" stroke-width="4"/><text x="375" y="185" text-anchor="middle" font-size="18" font-weight="800" fill="#111827">Ngăn kéo bị mở</text></svg>`;
  if (typeLabel === "Loại một người chơi") return `<svg viewBox="0 0 520 220"><rect width="520" height="220" fill="#e0e7ff"/><ellipse cx="120" cy="180" rx="90" ry="12" fill="#c7d2fe"/><rect x="90" y="80" width="70" height="70" rx="10" fill="#94a3b8" stroke="#111827" stroke-width="3" transform="rotate(-18 125 115)"/><text x="380" y="90" font-size="20" font-weight="800" fill="#312e81">Ghế đổ…</text><text x="380" y="118" font-size="20" font-weight="800" fill="#312e81">người đâu rồi?</text></svg>`;
  return `<svg viewBox="0 0 520 220"><rect width="520" height="220" fill="#dbeafe"/><rect x="60" y="60" width="180" height="110" rx="12" fill="#1e293b" stroke="#111827" stroke-width="3"/><rect x="80" y="80" width="140" height="70" fill="#93c5fd"/><path d="M150 80 L170 110 L190 80" fill="none" stroke="#dc2626" stroke-width="4"/><text x="150" y="185" text-anchor="middle" font-size="18" font-weight="800" fill="#111827">Màn hình nứt!</text></svg>`;
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

// ---------- Movement: SEPARATE AREAS, IMAGE BACKGROUNDS ONLY ----------
// Trial: one area = one full-screen image, never all rooms in one image.
// Player moves inside the current area; "Cửa ra" opens a picker (inside the
// game frame) listing every location/area; entering another area replaces
// the whole screen with that area's image. No code-drawn rooms/furniture:
// objects below are only invisible interaction points placed over the
// furniture already visible in the background photo.
const WORLD_W = 960, WORLD_H = 540, VIEW_W = 960, VIEW_H = 540;
const A = "assets/";
const AREAS = [
  { id: "phong-khach", loc: "Nhà", name: "Phòng khách", img: A + "media-generation-phong-khach-0-edadccc3-8bb4-4665-b171-bd96597e31e5.webp" },
  { id: "bep", loc: "Nhà", name: "Bếp", img: A + "media-generation-bep-0-8ff6570b-c445-4f98-b66f-8e0dfb8ab234.webp" },
  { id: "phong-ngu", loc: "Nhà", name: "Phòng ngủ", img: A + "media-generation-nha-phong-ngu-0-837799a9-da20-4c0c-a56d-9eb6c2835978.webp" },
  { id: "phong-tam", loc: "Nhà", name: "Phòng tắm", img: A + "media-generation-phong-tam-0-ee01c1ec-922d-4a9b-b847-8428d98e6cf7.webp" },
  { id: "hanh-lang", loc: "Nhà", name: "Hành lang", img: A + "media-generation-hanh-lang-0-023de931-a3c5-4e9d-bc22-112662b19e80.webp" },
  { id: "phong-benh", loc: "Bệnh viện", name: "Phòng bệnh", img: A + "media-generation-benh-vien-0-351ccbfd-c63c-4081-960a-6d3839dae4da.webp" },
  { id: "cap-cuu", loc: "Bệnh viện", name: "Phòng cấp cứu", img: A + "media-generation-benh-vien-cap-cuu-0-e5a8b867-5659-4d11-a711-c16d41f9192e.webp" },
  { id: "phong-mo", loc: "Bệnh viện", name: "Phòng mổ", img: A + "media-generation-benh-vien-phong-mo-0-f31eca09-25f1-4614-afa6-7b883a729556.webp" },
  { id: "le-tan", loc: "Bệnh viện", name: "Quầy lễ tân", img: A + "media-generation-benh-vien-le-tan-0-a417dba1-93bd-40c9-b905-062ef4fb0d13.webp" },
  { id: "nha-thuoc", loc: "Bệnh viện", name: "Nhà thuốc", img: A + "media-generation-benh-vien-nha-thuoc-0-cca9a390-63be-4f9e-a925-4fba28d3e09c.webp" },
  { id: "lop-hoc", loc: "Trường học", name: "Lớp học", img: A + "media-generation-truong-hoc-0-678edb0a-5f9d-4b7d-ad73-1ca75cc86b84.webp" },
  { id: "san-truong", loc: "Trường học", name: "Sân trường", img: A + "media-generation-truong-hoc-san-truong-0-7553a3fa-b081-423b-82c7-e60fa10cda24.webp" },
  { id: "cang-tin", loc: "Trường học", name: "Căng tin", img: A + "media-generation-truong-hoc-cang-tin-0-6f8ef727-e9ca-466e-8caa-8471ded73b55.webp" },
  { id: "phong-giao-vien", loc: "Trường học", name: "Phòng giáo viên", img: A + "media-generation-truong-hoc-phong-giao-vien-0-14d206b4-a8ed-47eb-bd42-aaa33a92a41a.webp" },
  { id: "ban-an", loc: "Quán ăn", name: "Khu bàn ăn", img: A + "media-generation-quan-an-0-d900145f-a206-48aa-b6f7-10e70d65473a.webp" },
  { id: "bep-quan", loc: "Quán ăn", name: "Bếp quán", img: A + "media-generation-quan-an-bep-0-f8cace14-bd96-4199-89e1-a47ea08db7fc.webp" },
  { id: "cafe-trong", loc: "Quán cà phê", name: "Khu ngồi trong", img: A + "media-generation-quan-ca-phe-0-a7a2791d-7ecf-40c9-a779-7442046de24e.webp" },
  { id: "cafe-ngoai", loc: "Quán cà phê", name: "Khu ngồi ngoài trời", img: A + "media-generation-quan-ca-phe-ngoai-troi-0-7248d039-fa71-4964-b7cf-40b32c94880a.webp" },
  { id: "leu-trai", loc: "Bãi cắm trại", name: "Khu lều", img: A + "media-generation-bai-cam-trai-0-decd1268-83ad-45fe-8e4d-afadf9d39798.webp" },
  { id: "lua-trai", loc: "Bãi cắm trại", name: "Khu lửa trại", img: A + "media-generation-bai-cam-trai-lua-trai-0-2de3dfc5-7376-4c91-82c0-63ba9f67fc23.webp" },
  { id: "bo-suoi", loc: "Bãi cắm trại", name: "Bờ suối", img: A + "media-generation-bai-cam-trai-bo-suoi-0-77b9d471-29f4-4061-862b-dafb6b416d13.webp" },
];
function areaById(id) { return AREAS.find((a) => a.id === id) || AREAS[0]; }
const areaImgs = {};
AREAS.forEach((a) => { const im = new Image(); im.src = a.img; areaImgs[a.id] = im; });
let currentAreaId = "phong-khach";
function currentArea() { return areaById(currentAreaId); }
// Interaction points (x,y are centres on the 960x540 area image; the
// furniture itself is in the photo, these points are invisible except for
// a soft glow + label when the player is near).
const OBJECTS = [
  { id: "sofa", name: "Sofa", room: "Phòng khách", areaId: "phong-khach", x: 250, y: 330, w: 140, h: 80 },
  { id: "table_khach", name: "Bàn khách", room: "Phòng khách", areaId: "phong-khach", x: 520, y: 380, w: 120, h: 60 },
  { id: "plant_khach", name: "Chậu cây", room: "Phòng khách", areaId: "phong-khach", x: 820, y: 360, w: 70, h: 70 },
  { id: "stove", name: "Bếp nấu", room: "Bếp", areaId: "bep", x: 480, y: 300, w: 130, h: 70 },
  { id: "fridge", name: "Tủ lạnh", room: "Bếp", areaId: "bep", x: 760, y: 300, w: 80, h: 90 },
  { id: "bed", name: "Giường", room: "Phòng ngủ", areaId: "phong-ngu", x: 480, y: 330, w: 180, h: 110 },
  { id: "lamp", name: "Đèn ngủ", room: "Phòng ngủ", areaId: "phong-ngu", x: 800, y: 260, w: 60, h: 60 },
  { id: "tub", name: "Bồn tắm", room: "Phòng tắm", areaId: "phong-tam", x: 650, y: 330, w: 150, h: 90 },
  { id: "sink", name: "Bồn rửa", room: "Phòng tắm", areaId: "phong-tam", x: 300, y: 330, w: 90, h: 60 },
  { id: "table_an", name: "Bàn ăn", room: "Khu bàn ăn", areaId: "ban-an", x: 480, y: 340, w: 150, h: 70 },
  { id: "desk_hoc", name: "Bàn học", room: "Lớp học", areaId: "lop-hoc", x: 480, y: 340, w: 140, h: 70 },
  { id: "books_gv", name: "Kệ sách", room: "Phòng giáo viên", areaId: "phong-giao-vien", x: 480, y: 320, w: 130, h: 70 },
  { id: "bed_benh", name: "Giường bệnh", room: "Phòng bệnh", areaId: "phong-benh", x: 480, y: 330, w: 160, h: 90 },
  { id: "fire", name: "Lửa trại", room: "Khu lửa trại", areaId: "lua-trai", x: 480, y: 340, w: 120, h: 80 },
];
const RIDDLES = [
  { objectId: "tub", riddle: "🧩 Nơi nước chảy róc rách, soi mình mỗi sáng. (Phòng tắm — ở Nhà)" },
  { id: "x", objectId: "desk_hoc", riddle: "🧩 Nơi học bài, bảng đen và bàn ghế ngay ngắn. (Lớp học — Trường học)" },
  { objectId: "stove", riddle: "🧩 Nơi nấu nướng, dao thớt còn mùi. (Bếp — ở Nhà)" },
  { objectId: "bed", riddle: "🧩 Nơi giấc mơ ngủ lại, gối còn ấm. (Phòng ngủ — ở Nhà)" },
  { objectId: "table_an", riddle: "🧩 Nơi ăn uống, bàn ghế xếp thành hàng. (Quán ăn)" },
  { objectId: "sofa", riddle: "🧩 Nơi ngồi kể chuyện, ghế êm và ấm. (Phòng khách — ở Nhà)" },
];
// Fix: remove stray key above (kept simple below)
RIDDLES.forEach((r) => { delete r.id; });
const TASKS = [
  { id: "task_table", label: "Dọn bàn", objectId: "table_khach" },
  { id: "task_plant", label: "Tưới cây", objectId: "plant_khach" },
  { id: "task_lamp", label: "Sửa đèn", objectId: "lamp" },
  { id: "task_books", label: "Xếp sách", objectId: "books_gv" },
  { id: "task_stove", label: "Kiểm tra bếp", objectId: "stove" },
];
function taskByObjectId(id) { return TASKS.find((t) => t.objectId === id); }
function taskProgress() { return publicState.taskProgress || {}; }
function tasksDoneCount() { return Object.keys(taskProgress()).length; }
function sabotageActive() {
  const s = publicState.sabotage;
  if (!s || !s.until) return null;
  if (Date.now() > s.until) return null;
  return s;
}
function objectById(id) { return OBJECTS.find((o) => o.id === id); }
// 5 simple tasks (GGD-style). Task objects already exist in OBJECTS.
let lastKillAt = 0, lastSabotageAt = 0, botTaskAt = 0;
let myPos = null, movePositions = {}, moveTraces = {}, myClues = [], myCollectedIds = [];
let moveLoopOn = false, lastMoveTick = 0, lastPosSync = 0, posSpawned = false, posAttached = false;
let keysDown = {}, joyVec = { x: 0, y: 0 }, walkPhase = 0;
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
  RIDDLES.forEach((r, i) => { out[r.objectId] = { objectId: r.objectId, text: texts[i] || texts[0] }; });
  return out;
}
function renderNotebook() {
  $("notebookList").innerHTML = RIDDLES.map((r) => {
    const got = myCollectedIds.includes(r.objectId);
    const obj = objectById(r.objectId);
    if (got) {
      const clue = myClues[myCollectedIds.indexOf(r.objectId)] || "";
      return `<li>✅ Đã tìm ở ${obj ? obj.room : ""}: ${esc(clue)}</li>`;
    }
    return `<li>${esc(r.riddle)}</li>`;
  }).join("");
}
function nearestObject() {
  if (!myPos) return null;
  let best = null, bestD = 90;
  OBJECTS.filter((o) => o.areaId === currentAreaId).forEach((o) => {
    const d = Math.hypot(o.x - myPos.x, o.y - myPos.y);
    if (d < bestD) { bestD = d; best = o; }
  });
  return best;
}
function hitsWall(x, y) { return false; /* No walls inside a single area image; bounds are clamped in tryMove. Doors are the area-picker button, blocked only by doors sabotage. */ }
function isDuckRole(role) { return role === "culprit" || role === "accomplice"; }
function duckUidsFromHost() {
  const out = [];
  if (botRoles.culpritUid) out.push(botRoles.culpritUid);
  if (botRoles.accompliceUid) out.push(botRoles.accompliceUid);
  return out;
}
function dodoUidFromHost() {
  if (myPrivate.assignments && myPrivate.assignments.dodoUid) return myPrivate.assignments.dodoUid;
  return null;
}
function tryMove(x, y) {
  myPos.x = Math.max(40, Math.min(WORLD_W - 40, x));
  myPos.y = Math.max(60, Math.min(WORLD_H - 40, y));
}
function syncPos(force) {
  if (!db || !roomCode || !myUid || !myPos) return;
  const now = Date.now();
  if (!force && now - lastPosSync < 100) return;
  lastPosSync = now;
  set(ref(db, `rooms/${roomCode}/public/positions/${myUid}`), { x: Math.round(myPos.x), y: Math.round(myPos.y), area: currentAreaId }).catch(() => {});
}
function attachPositions() {
  if (posAttached || !db || !roomCode) return;
  posAttached = true;
  onValue(ref(db, `rooms/${roomCode}/public/positions`), (snap) => {
    movePositions = snap.val() || {};
    updateVoiceVolumes();
    if (!posSpawned && myUid && !movePositions[myUid]) {
      const uids = publicState.players ? Object.keys(publicState.players) : [myUid];
      const idx = Math.max(0, uids.indexOf(myUid));
      currentAreaId = "phong-khach";
      myPos = { x: 480 + idx * 40, y: 400 };
      posSpawned = true;
      syncPos(true);
    } else if (movePositions[myUid] && !myPos) {
      myPos = { x: movePositions[myUid].x, y: movePositions[myUid].y };
      if (movePositions[myUid].area) currentAreaId = movePositions[myUid].area;
    }
  });
  onValue(ref(db, `rooms/${roomCode}/public/traces`), (snap) => { moveTraces = snap.val() || {}; });
}
function drawCapyCanvas(ctx, x, y, key, name, isBot, ghost, isMe, moving) {
  const img = capySpriteImgs[capySpriteIndex(key)];
  const bob = moving ? Math.sin(walkPhase * 1.4) * 2 : Math.sin(Date.now() / 500) * 1.2;
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.45;
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x, y + 38, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (img && img.complete && img.naturalWidth) {
    ctx.drawImage(img, x - 36, y - 45 + bob, 72, 90);
  }
  ctx.font = "bold 15px system-ui"; ctx.textAlign = "center";
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#111827"; ctx.lineWidth = 4;
  ctx.strokeText(name, x, y - 52); ctx.fillText(name, x, y - 52);
  if (isBot) { ctx.font = "bold 11px system-ui"; ctx.fillStyle = "#059669"; ctx.fillText("BOT", x, y + 58); }
  if (isMe) { ctx.strokeStyle = "#ff6b35"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 48, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
function nearestPlayer(maxDist) {
  if (!myPos) return null;
  const players = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
  let best = null, bestD = maxDist;
  players.forEach((p) => {
    if (p.uid === myUid || p.alive === false) return;
    const pos = movePositions[p.uid]; if (!pos || pos.area !== currentAreaId) return;
    const d = Math.hypot(pos.x - myPos.x, pos.y - myPos.y);
    if (d < bestD) { bestD = d; best = { player: p, dist: d }; }
  });
  return best;
}
function nearestBody(maxDist) {
  if (!myPos) return null;
  const bodies = publicState.bodies || {};
  let best = null, bestD = maxDist;
  Object.entries(bodies).forEach(([uid, b]) => {
    if (!b || b.area !== currentAreaId) return;
    const d = Math.hypot(b.x - myPos.x, b.y - myPos.y);
    if (d < bestD) { bestD = d; best = { uid, body: b, dist: d }; }
  });
  return best;
}
function updateActionButtons() {
  const meAlive = !publicState.players || !publicState.players[myUid] || publicState.players[myUid].alive !== false;
  const killBtn = $("killBtn"), reportBtn = $("reportBtn"), slBtn = $("sabotageLightsBtn"), sdBtn = $("sabotageDoorsBtn");
  if (!meAlive || publicState.phase !== "investigation") {
    if (killBtn) show("killBtn", false);
    if (reportBtn) show("reportBtn", false);
    if (slBtn) show("sabotageLightsBtn", false);
    if (sdBtn) show("sabotageDoorsBtn", false);
    return;
  }
  const isDuck = isDuckRole(myPrivate.role);
  if (killBtn) {
    const near = isDuck ? nearestPlayer(100) : null;
    const cd = Math.max(0, Math.ceil((20000 - (Date.now() - lastKillAt)) / 1000));
    show("killBtn", !!near);
    if (near) killBtn.textContent = cd > 0 ? `🔪 Loại ${near.player.name} (hồi ${cd}s)` : `🔪 Loại ${near.player.name}`;
    killBtn.disabled = cd > 0;
  }
  if (reportBtn) {
    const nearB = nearestBody(100);
    show("reportBtn", !!nearB);
  }
  if (slBtn) {
    const cd = Math.max(0, Math.ceil((30000 - (Date.now() - lastSabotageAt)) / 1000));
    show("sabotageLightsBtn", isDuck);
    slBtn.textContent = cd > 0 ? `💡 Tắt đèn (hồi ${cd}s)` : "💡 Tắt đèn (phá hoại)";
    slBtn.disabled = cd > 0;
  }
  if (sdBtn) {
    const cd = Math.max(0, Math.ceil((30000 - (Date.now() - lastSabotageAt)) / 1000));
    show("sabotageDoorsBtn", isDuck);
    sdBtn.textContent = cd > 0 ? `🔒 Khóa cửa (hồi ${cd}s)` : "🔒 Khóa cửa (phá hoại)";
    sdBtn.disabled = cd > 0;
  }
}
function drawMovement() {
  const canvas = $("moveCanvas"); if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const area = currentArea();
  const bg = areaImgs[area.id];
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (bg && bg.complete && bg.naturalWidth) {
    // cover-crop the area photo into 960x540
    const sr = bg.naturalWidth / bg.naturalHeight, tr = VIEW_W / VIEW_H;
    let sw, sh, sx, sy;
    if (sr > tr) { sh = bg.naturalHeight; sw = sh * tr; sx = (bg.naturalWidth - sw) / 2; sy = 0; }
    else { sw = bg.naturalWidth; sh = sw / tr; sx = 0; sy = (bg.naturalHeight - sh) / 2; }
    ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, VIEW_W, VIEW_H);
  } else {
    ctx.fillStyle = "#1e293b"; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "#fff"; ctx.font = "bold 22px system-ui"; ctx.textAlign = "center";
    ctx.fillText("Đang tải hình " + area.name + "...", VIEW_W / 2, VIEW_H / 2);
  }
  ctx.font = "bold 24px system-ui"; ctx.textAlign = "left";
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#111827"; ctx.lineWidth = 5;
  ctx.strokeText(area.loc + " — " + area.name, 16, 36); ctx.fillText(area.loc + " — " + area.name, 16, 36);
  // Interaction points: only a soft glow + label near the player, never a
  // code-drawn room or furniture. The furniture is already in the photo.
  const nearObj = nearestObject();
  if (nearObj) {
    const pulse = 10 + Math.sin(Date.now() / 300) * 3;
    ctx.fillStyle = "rgba(250,204,21,.35)"; ctx.beginPath(); ctx.arc(nearObj.x, nearObj.y, 42 + pulse, 0, Math.PI * 2); ctx.fill();
    ctx.font = "bold 15px system-ui"; ctx.textAlign = "center";
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#111827"; ctx.lineWidth = 4;
    ctx.strokeText(nearObj.name, nearObj.x, nearObj.y - 55); ctx.fillText(nearObj.name, nearObj.x, nearObj.y - 55);
  }
  const bodies = publicState.bodies || {};
  Object.entries(bodies).forEach(([uid, b]) => {
    if (!b || b.area !== currentAreaId) return;
    ctx.fillStyle = "rgba(220,38,38,.9)"; ctx.beginPath(); ctx.arc(b.x, b.y - 58, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 16px system-ui"; ctx.textAlign = "center"; ctx.fillText("X", b.x, b.y - 52);
    drawCapyCanvas(ctx, b.x, b.y, uid, (b.name || "Xác") + " (xác)", false, true, false, false);
  });
  const players = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
  players.forEach((p) => {
    const pos = movePositions[p.uid]; if (!pos || pos.area !== currentAreaId) return;
    const moving = p.uid === myUid && (keysDown["w"] || keysDown["a"] || keysDown["s"] || keysDown["d"] || joyVec.x !== 0 || joyVec.y !== 0);
    drawCapyCanvas(ctx, pos.x, pos.y, p.uid, p.name, !!p.isBot, p.alive === false, p.uid === myUid, moving);
  });
  const sabNow = sabotageActive();
  if (sabNow && sabNow.type === "lights" && myPrivate.role !== "culprit" && myPrivate.role !== "accomplice" && myPos) {
    ctx.fillStyle = "rgba(0,0,0,.82)";
    ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H);
    ctx.arc(myPos.x, myPos.y, 130, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
  }
  if (sabNow) {
    ctx.font = "bold 20px system-ui"; ctx.fillStyle = sabNow.type === "lights" ? "#facc15" : "#fca5a5"; ctx.textAlign = "center";
    ctx.fillText(sabNow.type === "lights" ? "⚠️ ĐÈN ĐÃ TẮT — chỉ nhìn gần được" : "🔒 CỬA ĐÃ KHÓA — không qua được cửa", VIEW_W / 2, 30);
  }
  updateActionButtons();
  const btn = $("traceActionBtn");
  if (nearObj && btn) {
    show("traceActionBtn", true);
    btn.textContent = myPrivate.role === "culprit" ? `🕵️ Giấu dấu vết ở ${nearObj.name}` : `🔍 Xem ${nearObj.name}`;
    $("moveStatus").textContent = `Bạn đang ở ${area.loc} — ${area.name}, gần ${nearObj.name}. Bấm nút góc phải để xem — có thể có dấu vết, cũng có thể không có gì. Bấm "🚪 Cửa ra" để sang khu vực khác.`;
  } else if (btn) { show("traceActionBtn", false); }
  const doorBtn = $("doorBtn");
  if (doorBtn) {
    const sab = sabotageActive();
    doorBtn.disabled = !!(sab && sab.type === "doors");
    doorBtn.textContent = doorBtn.disabled ? "🔒 Cửa đã khóa (20s)" : "🚪 Cửa ra — chọn khu vực khác";
  }
}
function moveTick(ts) {
  if (!moveLoopOn) return;
  requestAnimationFrame(moveTick);
  if (!myPos) { drawMovement(); return; }
  const meDead = publicState.players && publicState.players[myUid] && publicState.players[myUid].alive === false;
  if (meDead) { drawMovement(); return; }
  const dt = Math.min(0.05, (ts - lastMoveTick) / 1000 || 0.016); lastMoveTick = ts;
  let vx = 0, vy = 0;
  if (keysDown["w"] || keysDown["arrowup"]) vy -= 1;
  if (keysDown["s"] || keysDown["arrowdown"]) vy += 1;
  if (keysDown["a"] || keysDown["arrowleft"]) vx -= 1;
  if (keysDown["d"] || keysDown["arrowright"]) vx += 1;
  vx += joyVec.x; vy += joyVec.y;
  const len = Math.hypot(vx, vy);
  if (len > 0) {
    walkPhase += dt * 12;
    const step = 280 * dt * Math.min(1, len);
    const ux = vx / Math.max(1, len), uy = vy / Math.max(1, len);
    tryMove(myPos.x + ux * step, myPos.y + uy * step);
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
    if (Date.now() - botTaskAt > 30000) {
      botTaskAt = Date.now();
      try {
        const tpSnap = await get(ref(db, `rooms/${roomCode}/public/taskProgress`));
        const tp = tpSnap.val() || {};
        const remaining = TASKS.filter((t) => !tp[t.id]);
        const playersNow = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
        const innocentBots = playersNow.filter((p) => p.isBot && p.alive !== false && p.uid !== botRoles.culpritUid && p.uid !== botRoles.accompliceUid);
        if (remaining.length && innocentBots.length) {
          await update(publicRef(), { [`taskProgress/${remaining[0].id}`]: true });
        }
      } catch (_) {}
    }
    const players = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
    const bots = players.filter((p) => p.isBot && p.alive !== false);
    for (const b of bots) {
      const cur = movePositions[b.uid] || { x: 480, y: 400, area: "phong-khach" };
      const curArea = cur.area || "phong-khach";
      // Occasionally walk through a door to a different area (separate screen).
      if (Math.random() < 0.08) {
        const na = AREAS[Math.floor(Math.random() * AREAS.length)];
        await set(ref(db, `rooms/${roomCode}/public/positions/${b.uid}`), { x: 480, y: 400, area: na.id }).catch(() => {});
        continue;
      }
      if (!botTargets[b.uid] || botTargets[b.uid].area !== curArea) {
        botTargets[b.uid] = { area: curArea, x: 120 + Math.random() * 720, y: 140 + Math.random() * 300 };
      }
      const wp = botTargets[b.uid];
      const d = Math.hypot(wp.x - cur.x, wp.y - cur.y) || 1;
      if (d < 60) { botTargets[b.uid] = null; continue; }
      const nx = cur.x + (wp.x - cur.x) / d * 55, ny = cur.y + (wp.y - cur.y) / d * 55;
      await set(ref(db, `rooms/${roomCode}/public/positions/${b.uid}`), { x: Math.round(Math.max(40, Math.min(920, nx))), y: Math.round(Math.max(60, Math.min(500, ny))), area: curArea }).catch(() => {});
    }
  }, 1000);
}
function publicRef() { return ref(db, `rooms/${roomCode}/public`); }
function myPrivateRef() { return ref(db, `rooms/${roomCode}/private/${myUid}`); }
function playerName(uid) { return (publicState.players && publicState.players[uid] && publicState.players[uid].name) || uid; }

async function attachListeners() {
  setupVoice();
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
    return `<div class="char-item ${ghost ? "ghost" : ""}">${capySVG(p.uid || p.name, ghost)}<div class="cname">${esc(p.name)}</div>${p.uid === myUid ? `<span class="ctag">BẠN</span>` : ""} ${p.isBot ? `<span class="ctag bot">BOT</span>` : ""}${ghost ? `<div class="small">Đã bị loại</div>` : ""}</div>`;
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
    maybeVoicePeers();
    updateVoiceVolumes();
    updateSysNotices();
    startMovement();
    $("sceneLabel").textContent = publicState.scene || "Hãy giải câu đố trong Sổ manh mối rồi đi tìm đúng đồ vật.";
    if (myPrivate.role === "culprit") {
      $("roleHud").textContent = "🦆 Bạn là VỊT XẤU (thủ phạm) — giả dạng capybara, tìm dấu vết để giấu, loại người khi có cơ hội, phá hoại khi cần.";
      $("missionHud").textContent = myPrivate.mission ? `Nhiệm vụ bí mật: ${myPrivate.mission.typeLabel} — ${myPrivate.mission.detail}` : "";
    } else if (myPrivate.role === "accomplice") {
      $("roleHud").textContent = "🦆 Bạn là VỊT ĐỒNG BỌN — chỉ bạn và thủ phạm biết. Giúp đánh lạc hướng.";
      $("missionHud").textContent = "";
    } else if (myPrivate.role === "dodo") {
      $("roleHud").textContent = "🐦 Bạn là DODO — bạn thắng NGAY nếu bị bỏ phiếu loại ra trong họp. Hãy tỏ ra đáng ngờ vừa đủ.";
      $("missionHud").textContent = "";
    } else {
      $("roleHud").textContent = "🦫 Bạn là CAPYBARA TỐT — làm 5 nhiệm vụ, giải câu đố, đi tìm dấu vết trong đồ vật.";
      $("missionHud").textContent = `Nhiệm vụ: ${tasksDoneCount()} / 5 đã xong. ${publicState.scene || ""}`;
    }
    const sabSt = sabotageActive();
    if (sabSt) $("missionHud").textContent += sabSt.type === "lights" ? " ⚠️ Đèn đang tắt!" : " 🔒 Cửa đang khóa!";
    renderNotebook();
    renderMissionBar();
    updateSysNotices();
    show("toVoteBtn", isHost);
    if (isHost) startBotWander();
  }

  // Task win (host only): all 5 tasks done -> innocents win immediately.
  if (phase === "investigation" && isHost && tasksDoneCount() >= 5 && !publicState.reveal) {
    doFinalReveal({ innocentWin: true, duckWin: false, dodoWin: false, winReason: "tasks", tie: false, accusedUid: null, accusedName: null, voteCounts: {} });
  }
  // Vote (meeting): full voice volume for alive players.
  if (phase === "vote") {
    updateVoiceVolumes();
    updateSysNotices();
    const alivePlayers = players.filter((p) => p.alive !== false && p.uid !== myUid);
    $("voteList").innerHTML = alivePlayers.map((p) => (
      `<button class="vote-btn ${myVote === p.uid ? "selected" : ""}" data-vote="${esc(p.uid)}">${capySVG(p.uid || p.name)}<span>${esc(p.name)}${p.isBot ? " · BOT" : ""}</span></button>`
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
    $("revealCard").classList.toggle("win-good", !!r.innocentWin || !!r.dodoWin);
    $("revealCard").classList.toggle("win-bad", !r.innocentWin && !r.dodoWin);
    $("revealChars").innerHTML = `<div class="big"><div>${capySVG(r.culpritUid || r.culpritName)}</div><div class="cap">THỦ PHẠM<br>${esc(r.culpritName)}</div></div>` + (r.accompliceUid ? `<div class="mid"><div>${capySVG(r.accompliceUid)}</div><div class="cap">ĐỒNG BỌN<br>${esc(r.accompliceName || "")}</div></div>` : `<div class="mid"><div style="font-size:52px">—</div><div class="cap">Không có<br>đồng bọn</div></div>`);
    if (r.dodoWin) {
      $("resultLabel").textContent = `🐦 DODO THẮNG — Dodo (${r.dodoName || r.accusedName || ""}) đã bị bỏ phiếu loại ra, đúng như điều kiện thắng của Dodo.`;
    } else if (r.winReason === "tasks") {
      $("resultLabel").textContent = "🎉 Phe CAPYBARA TỐT THẮNG — đã làm xong cả 5 nhiệm vụ!";
    } else if (r.winReason === "ducksOutnumber") {
      $("resultLabel").textContent = "🦆 Phe VỊT THẮNG — số Vịt còn sống đã đông bằng / đông hơn Capybara còn sống.";
    } else if (r.winReason === "ducksEjected") {
      $("resultLabel").textContent = "🎉 Phe CAPYBARA TỐT THẮNG — tất cả Vịt đã bị loại ra.";
    } else {
      $("resultLabel").textContent = r.innocentWin
        ? "🎉 Phe người chơi vô tội THẮNG — vì người bị tố cáo đúng là thủ phạm."
        : "😈 Phe thủ phạm THẮNG — vì người bị tố cáo không phải thủ phạm (là đồng bọn hoặc người vô tội), hoặc hòa phiếu.";
    }
    $("revealDetailLabel").textContent = [
      `Người bị tố cáo: ${r.tie ? "Hòa phiếu — không có người bị tố cáo duy nhất" : r.accusedName}`,
      `Thủ phạm: ${r.culpritName}`,
      `Đồng bọn (Vịt): ${r.accompliceName || "Không có đồng bọn"}`,
      `Dodo: ${r.dodoName || "Không có Dodo ở ván này"}`,
      `Lý do kết thúc: ${r.winReason || ""}`,
      `Nhiệm vụ bí mật: ${r.missionLabel} — ${r.missionDetail}`,
      `Hiện trường: ${r.scene}`,
    ].join("\n");
    const breakdown = Object.entries(r.voteCounts || {}).map(([uid, n]) => `${playerName(uid)}: ${n} phiếu`).join("\n");
    $("voteBreakdownLabel").textContent = breakdown ? `Chi tiết phiếu:\n${breakdown}` : "";
  }

  // Bot fill: mô phỏng bot chỉ chạy trên trình duyệt của chủ phòng.
  // Reset per-meeting vote state when back in movement, so a 2nd meeting works.
  if (phase === "investigation") { botVotesSent = false; myVote = null; }
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
  // Bots do not speak: no text chat and no voice for bots in this version.
  if (phase === "vote" && !botVotesSent) {
    botVotesSent = true;
    await sendBotVotes();
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
    show("dodoCard", false);
    return;
  }
  const isCulprit = myPrivate.role === "culprit";
  const isAccomplice = myPrivate.role === "accomplice";
  const isDodo = myPrivate.role === "dodo";
  show("secretForOthers", !isCulprit && !isDodo);
  show("dodoCard", isDodo);
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
    $("accompliceLabel").textContent = `Bạn đang phối hợp với thủ phạm. Hãy đánh lạc hướng một cách hợp lý, đừng tự nhận mình là đồng bọn khi nói bằng mic.`;
  }

  $("secretReadyLabel").textContent = publicState.secretReady
    ? "Thủ phạm đã bấm sẵn sàng. Chủ phòng có thể chuyển sang điều tra."
    : "";
}


// ---------- Voice chat (mic only, no text chat) ----------
// Transport: WebRTC peer-to-peer audio. Firebase Realtime Database is used
// ONLY as signalling, under rooms/{code}/voice/{targetUid}:
//   offer/{fromUid}      = {type:"offer", sdp}
//   answer/{fromUid}     = {type:"answer", sdp}
//   candidates/{fromUid} = pushed ICE candidate objects
// Signalling requires a Rules addition (see README): rooms/$roomCode/voice
// with ".read": "auth != null" and ".write": "auth != null". Without it,
// voice signalling writes are denied, while the rest of the game still works.
// Audio is captured only after the user taps the mic button (browser gesture
// + mic permission). Bots never speak: no peer connection is made to a bot.
// Proximity: during movement, volume falls with map distance (full <300px,
// silent >900px). During meetings/vote, alive players hear each other fully.
// Dead players can still hear, but alive players cannot hear them.
let localStream = null;
let micOn = false;
const voicePeers = new Map();
const voiceBusy = new Set();
const voiceLastOffer = new Map();
const voiceLastAnswer = new Map();
const voiceCandidateQueue = new Map();
let voiceSignalAttached = false;

function isBotUid(uid) { return String(uid || "").startsWith("bot"); }
function voiceContainer() { return $("voiceAudios"); }
function updateMicUI() {
  const btn = $("micBtn");
  if (!btn) return;
  btn.classList.toggle("mic-on", micOn);
  btn.classList.toggle("mic-off", !micOn);
  btn.textContent = micOn ? "🎤 ĐANG NÓI — bấm để tắt mic" : "🎤 Tắt mic — bấm để nói";
  const st = $("voiceStatus");
  if (st) {
    st.textContent = micOn
      ? "Đang nói — người gần bạn nghe rõ, khi họp mọi người đều nghe rõ."
      : "Mic đang tắt. Bấm nút mic để nói (trình duyệt sẽ hỏi quyền mic lần đầu).";
  }
}
function proximityVolume(dist) {
  if (dist < 300) return 1;
  if (dist > 900) return 0;
  return 1 - (dist - 300) / 600;
}
function updateVoiceVolumes() {
  const container = voiceContainer();
  if (!container) return;
  const phase = publicState.phase;
  const myAlive = !publicState.players || !publicState.players[myUid] || publicState.players[myUid].alive !== false;
  container.querySelectorAll("audio").forEach((audio) => {
    const uid = audio.dataset.uid;
    if (!uid) return;
    let vol = 1;
    const speakerAlive = !publicState.players || !publicState.players[uid] || publicState.players[uid].alive !== false;
    if (!myAlive) {
      vol = 1; // Dead players (ghosts) can still hear everyone.
    } else if (!speakerAlive) {
      vol = 0; // Alive players cannot hear dead players.
    } else if (phase === "investigation") {
      const me = movePositions[myUid];
      const other = movePositions[uid];
      vol = (me && other && other.area === me.area) ? proximityVolume(Math.hypot(me.x - other.x, me.y - other.y)) : 0;
    } else {
      vol = 1; // Lobby / meeting / vote / reveal: full volume.
    }
    audio.volume = vol;
  });
}
function createVoicePeer(targetUid) {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  pc.onicecandidate = (e) => {
    if (e.candidate && db && roomCode) {
      push(ref(db, `rooms/${roomCode}/voice/${targetUid}/candidates/${myUid}`), e.candidate.toJSON()).catch(() => {});
    }
  };
  pc.ontrack = (e) => {
    const container = voiceContainer();
    if (!container) return;
    let audio = container.querySelector(`audio[data-uid="${targetUid}"]`);
    if (!audio) {
      audio = document.createElement("audio");
      audio.dataset.uid = targetUid;
      audio.autoplay = true;
      audio.playsInline = true;
      container.appendChild(audio);
    }
    audio.srcObject = e.streams[0];
    audio.play().catch(() => {});
    updateVoiceVolumes();
  };
  pc.onnegotiationneeded = async () => {
    if (!micOn || !db || !roomCode || pc.signalingState !== "stable") return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await set(ref(db, `rooms/${roomCode}/voice/${targetUid}/offer/${myUid}`), { type: "offer", sdp: offer.sdp });
    } catch (_) {}
  };
  if (localStream) localStream.getTracks().forEach((t) => { try { pc.addTrack(t, localStream); } catch (_) {} });
  return pc;
}
async function flushVoiceCandidates(peerUid) {
  const pc = voicePeers.get(peerUid);
  if (!pc || !pc.remoteDescription) return;
  const queued = voiceCandidateQueue.get(peerUid) || [];
  voiceCandidateQueue.set(peerUid, []);
  for (const cand of queued) {
    try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (_) {}
  }
}
async function handleVoiceSignal(val) {
  const sig = val || {};
  for (const [fromUid, offer] of Object.entries(sig.offer || {})) {
    if (fromUid === myUid || isBotUid(fromUid) || !offer || !offer.sdp) continue;
    if (voiceLastOffer.get(fromUid) === offer.sdp) continue;
    voiceLastOffer.set(fromUid, offer.sdp);
    let pc = voicePeers.get(fromUid);
    if (!pc) { pc = createVoicePeer(fromUid); voicePeers.set(fromUid, pc); }
    try {
      await pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
      await flushVoiceCandidates(fromUid);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await set(ref(db, `rooms/${roomCode}/voice/${fromUid}/answer/${myUid}`), { type: "answer", sdp: answer.sdp });
    } catch (_) {}
  }
  for (const [fromUid, answer] of Object.entries(sig.answer || {})) {
    if (fromUid === myUid || isBotUid(fromUid) || !answer || !answer.sdp) continue;
    if (voiceLastAnswer.get(fromUid) === answer.sdp) continue;
    const pc = voicePeers.get(fromUid);
    if (!pc) continue;
    try {
      if (pc.signalingState === "have-local-offer") {
        voiceLastAnswer.set(fromUid, answer.sdp);
        await pc.setRemoteDescription({ type: "answer", sdp: answer.sdp });
        await flushVoiceCandidates(fromUid);
      }
    } catch (_) {}
  }
  for (const [fromUid, candMap] of Object.entries(sig.candidates || {})) {
    if (fromUid === myUid || isBotUid(fromUid) || !candMap) continue;
    const pc = voicePeers.get(fromUid);
    for (const cand of Object.values(candMap)) {
      if (!cand) continue;
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (_) {}
      } else {
        const q = voiceCandidateQueue.get(fromUid) || [];
        q.push(cand);
        voiceCandidateQueue.set(fromUid, q);
      }
    }
  }
}
function setupVoice() {
  if (voiceSignalAttached || !db || !roomCode || !myUid) return;
  voiceSignalAttached = true;
  onValue(ref(db, `rooms/${roomCode}/voice/${myUid}`), (snap) => { handleVoiceSignal(snap.val() || {}); });
}
async function maybeVoicePeers() {
  if (!db || !roomCode || !myUid) return;
  const players = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
  for (const p of players) {
    if (p.uid === myUid || isBotUid(p.uid)) continue;
    // Deterministic initiator: the lower uid initiates, the higher waits.
    // This avoids two offers crossing for the same pair.
    if (myUid < p.uid && !voicePeers.has(p.uid) && !voiceBusy.has(p.uid)) {
      voiceBusy.add(p.uid);
      try {
        const pc = createVoicePeer(p.uid);
        voicePeers.set(p.uid, pc);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await set(ref(db, `rooms/${roomCode}/voice/${p.uid}/offer/${myUid}`), { type: "offer", sdp: offer.sdp });
      } catch (_) {
        voicePeers.delete(p.uid);
      } finally {
        voiceBusy.delete(p.uid);
      }
    }
  }
}
async function toggleMic() {
  const st = $("voiceStatus");
  if (micOn) {
    micOn = false;
    if (localStream) localStream.getTracks().forEach((t) => { t.enabled = false; });
    updateMicUI();
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (st) st.textContent = "Thiết bị này không hỗ trợ mic trên trình duyệt. Hãy thử trình duyệt khác.";
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (_) {
    if (st) st.textContent = "Bác chưa cho phép mic, bấm lại và chọn Cho phép";
    micOn = false;
    updateMicUI();
    return;
  }
  localStream = stream;
  micOn = true;
  localStream.getTracks().forEach((t) => { t.enabled = true; });
  // Add the mic track to every existing peer and renegotiate where stable.
  for (const [targetUid, pc] of voicePeers.entries()) {
    let added = false;
    for (const track of localStream.getTracks()) {
      if (!pc.getSenders().some((s) => s.track === track)) {
        try { pc.addTrack(track, localStream); added = true; } catch (_) {}
      }
    }
    if (added && pc.signalingState === "stable") {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await set(ref(db, `rooms/${roomCode}/voice/${targetUid}/offer/${myUid}`), { type: "offer", sdp: offer.sdp });
      } catch (_) {}
    }
  }
  updateMicUI();
}

// ---------- Mission bottom panel (large, long, collapsible) ----------
// Wide bar at the BOTTOM of the movement screen (below the canvas, so it
// never covers the joystick on the left or the action/meeting/mic buttons
// on the right). Large text: role task, progress, collected clues, riddles.
// Toggle collapses it to just the small toggle button; clues are kept in
// memory (myCollectedIds / myClues) and re-rendered on expand.
function renderMissionBar() {
  const body = $("missionBarBody");
  if (!body) return;
  let roleText = "";
  if (myPrivate.role === "culprit") {
    roleText = myPrivate.mission
      ? `🎭 Nhiệm vụ của bạn (THỦ PHẠM): ${myPrivate.mission.typeLabel} — ${myPrivate.mission.detail}`
      : "🎭 Nhiệm vụ của bạn: THỦ PHẠM — tìm dấu vết trước người khác và giấu nó đi!";
  } else if (myPrivate.role === "accomplice") {
    roleText = "🤝 Nhiệm vụ của bạn: ĐỒNG BỌN — giúp thủ phạm đánh lạc hướng, đừng để lộ.";
  } else {
    roleText = "🔍 Nhiệm vụ của bạn: NGƯỜI VÔ TỘI — giải câu đố, đi tìm dấu vết trong đồ vật.";
  }
  $("missionBarRole").textContent = roleText;
  const remaining = moveTraces ? Object.keys(moveTraces).length : 0;
  const tp = taskProgress();
  $("missionBarProgress").textContent = `Nhiệm vụ: ${tasksDoneCount()} / 5 đã xong. Tiến độ dấu vết: đã tìm ${myCollectedIds.length} / 6 — còn ${remaining} dấu vết trên bản đồ.`;
  const taskHtml = TASKS.map((t) => `<li>${tp[t.id] ? "✅" : "⬜"} Nhiệm vụ: ${t.label} — ${tp[t.id] ? "Đã xong" : "Chưa xong"}</li>`).join("");
  window.__taskHtml = taskHtml;
  $("missionBarClues").innerHTML = (window.__taskHtml || "") + RIDDLES.map((r) => {
    const idx = myCollectedIds.indexOf(r.objectId);
    if (idx >= 0) {
      const obj = objectById(r.objectId);
      return `<li>✅ Đã tìm ở ${obj ? obj.room : ""}: ${esc(myClues[idx] || "")}</li>`;
    }
    return `<li>${esc(r.riddle)}</li>`;
  }).join("");
}
function updateSysNotices() {
  const box = $("sysNoticeBox");
  if (!box) return;
  const phase = publicState.phase;
  if (phase === "vote") {
    box.textContent = "Hệ thống: Đang họp — bấm mic ở trên để nói, tất cả người còn sống đều nghe rõ. Không còn chat chữ.";
  } else if (phase === "investigation") {
    box.textContent = "Hệ thống: Đang di chuyển — bấm mic ở trên để nói. Chỉ người ở gần bạn mới nghe rõ; người đã bị loại không nói được cho người còn sống nghe. Không còn chat chữ.";
  } else if (phase === "reveal") {
    box.textContent = "Hệ thống: Đã công bố kết quả. Không còn chat chữ — nói bằng mic nếu muốn bàn lại ván vừa rồi.";
  } else {
    box.textContent = "Hệ thống: Không còn chat chữ trong game này — trò chuyện bằng mic (bấm nút mic ở trên).";
  }
  if (publicState.meetingBy) {
    box.textContent += ` Họp do ${publicState.meetingBy} gọi.`;
  }
}

// ---------- Firebase setup / placeholder guard (restored: trial build had dropped it, so Create Room did nothing) ----------
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
  if ($("createBtn")) $("createBtn").disabled = true;
  if ($("joinBtn")) $("joinBtn").disabled = true;
  if ($("lobbyStatus")) $("lobbyStatus").textContent = "Chưa có config Firebase thật nên chưa tạo / vào phòng được. Xem README.md để cấu hình.";
} else {
  const app = initializeApp(cfg);
  auth = getAuth(app);
  db = getDatabase(app);
  onAuthStateChanged(auth, (user) => { if (user) myUid = user.uid; });
  signInAnonymously(auth).catch((err) => {
    if ($("lobbyStatus")) $("lobbyStatus").textContent = `Không đăng nhập ẩn danh được: ${err.message}. Hãy kiểm tra Anonymous Auth đã bật trong Firebase chưa (xem README.md).`;
  });
}

// ---------- Actions ----------
if ($("micBtn")) $("micBtn").addEventListener("click", toggleMic);
if ($("missionToggleBtn")) $("missionToggleBtn").addEventListener("click", () => {
  const bar = $("missionBar");
  if (!bar) return;
  const collapsed = bar.classList.toggle("collapsed");
  $("missionToggleBtn").textContent = collapsed ? "▲ Hiện nhiệm vụ & manh mối" : "▼ Ẩn nhiệm vụ & manh mối";
  if (!collapsed) renderMissionBar();
});
$("createBtn").addEventListener("click", async () => {
  if (isPlaceholder) { $("lobbyStatus").textContent = "Chưa có config Firebase thật nên chưa tạo phòng được."; return; }
  if (!myUid) { $("lobbyStatus").textContent = "Đang đăng nhập ẩn danh, bác chờ vài giây rồi bấm Tạo phòng lại. Nếu vẫn không được, kiểm tra Anonymous Auth đã bật trong Firebase chưa."; return; }
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
  if (isPlaceholder) { $("lobbyStatus").textContent = "Chưa có config Firebase thật nên chưa vào phòng được."; return; }
  if (!myUid) { $("lobbyStatus").textContent = "Đang đăng nhập ẩn danh, bác chờ vài giây rồi bấm lại."; return; }
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
  // Ván 5 người có bot: luôn có 1 đồng bọn Vịt (theo spec GGD: 1 thủ phạm + 1 đồng bọn).
  // Ván không bot: giữ nguyên luồng mời riêng / đồng ý như cũ.
  let accompliceUid = null;
  let accompliceName = null;
  if (botFill) {
    const cand = randomOf(players.filter((p) => p.uid !== culprit.uid));
    accompliceUid = cand.uid;
    accompliceName = cand.name;
  }
  // Dodo: chỉ ở ván 6+ người (tổng số người chơi), chọn ngẫu nhiên ngoài thủ phạm/đồng bọn.
  let dodoUid = null, dodoName = null;
  if (players.length >= 6) {
    const cand = randomOf(players.filter((p) => p.uid !== culprit.uid && p.uid !== accompliceUid));
    if (cand) { dodoUid = cand.uid; dodoName = cand.name; }
  }
  botRoles = { culpritUid: culprit.uid, accompliceUid };
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
      role: p.uid === culprit.uid ? "culprit" : (p.uid === accompliceUid ? "accomplice" : (p.uid === dodoUid ? "dodo" : "innocent")),
      mission: p.uid === culprit.uid ? mission : null,
      invite: null, inviteResponse: null, inviteSentTo: null, inviteAnswered: false,
    };
    if (p.uid === myUid) {
      data.assignments = { culpritUid: culprit.uid, culpritName: culprit.name, mission, dodoUid, dodoName };
      if (accompliceUid) data.accompliceUpdate = { accompliceUid, accompliceName };
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
  const obj = nearestObject();
  if (!obj || !db || !roomCode) return;
  const trace = (moveTraces || {})[obj.id];
  if (!trace) {
    const task = taskByObjectId(obj.id);
    const tp = taskProgress();
    if (task && !tp[task.id]) {
      if (isDuckRole(myPrivate.role)) {
        $("moveStatus").textContent = `Bạn giả vờ làm nhiệm vụ: ${task.label}. Nhiệm vụ này KHÔNG được tính cho phe Capybara.`;
        return;
      }
      if (myPrivate.role === "dodo") {
        $("moveStatus").textContent = `Dodo cũng có thể làm nhiệm vụ cho vui, nhưng nhiệm vụ của Dodo không tính vào tiến độ thắng của Capybara.`;
        return;
      }
      await update(publicRef(), { [`taskProgress/${task.id}`]: true }).catch(() => {});
      $("moveStatus").textContent = `✅ Đã làm xong nhiệm vụ: ${task.label} (${tasksDoneCount() + 1} / 5).`;
      renderMissionBar();
      return;
    }
    // Decoy: same interaction, funny "nothing here", object stays.
    const lines = ["Không có gì ở đây. Chỉ là đồ đạc bình thường thôi.", "Bạn lục kỹ rồi — ở đây sạch bong, không có dấu vết.", "Không có gì lạ ở đây cả. Thử câu đố khác xem."];
    $("moveStatus").textContent = lines[Math.floor(Math.random() * lines.length)];
    return;
  }
  if (myPrivate.role === "culprit") {
    // Culprit hides: trace disappears for everyone, no clue for anyone.
    await set(ref(db, `rooms/${roomCode}/public/traces/${obj.id}`), null).catch(() => {});
    $("moveStatus").textContent = "Bạn đã giấu dấu vết. Người khác tới đây sẽ không còn thấy gì.";
  } else {
    if (!myCollectedIds.includes(obj.id)) { myCollectedIds.push(obj.id); myClues.push(trace.text); }
    renderNotebook();
    await set(ref(db, `rooms/${roomCode}/public/traces/${obj.id}`), null).catch(() => {});
    $("moveStatus").textContent = "Đã nhặt dấu vết, xem trong Sổ manh mối của bạn.";
  }
});

// ---------- GGD: kill / report / sabotage / meeting ejection / final win ----------
$("killBtn").addEventListener("click", async () => {
  const near = nearestPlayer(100);
  if (!near || !isDuckRole(myPrivate.role) || Date.now() - lastKillAt < 20000) return;
  lastKillAt = Date.now();
  const victim = near.player;
  const pos = movePositions[victim.uid] || myPos;
  await update(ref(db, `rooms/${roomCode}/public/players/${victim.uid}`), { alive: false }).catch(() => {});
  await set(ref(db, `rooms/${roomCode}/public/bodies/${victim.uid}`), { x: Math.round(pos.x), y: Math.round(pos.y), name: victim.name, area: currentAreaId }).catch(() => {});
  $("moveStatus").textContent = `Bạn đã loại ${victim.name} (trong cốt truyện). Xác còn nằm trên bản đồ — cẩn thận người khác báo xác!`;
});
$("reportBtn").addEventListener("click", async () => {
  const nearB = nearestBody(100);
  if (!nearB || !db || !roomCode) return;
  await update(publicRef(), { phase: "vote", meetingBy: myName, meetingReason: "body", reportedBodyUid: nearB.uid }).catch(() => {});
});
$("sabotageLightsBtn").addEventListener("click", async () => {
  if (!isDuckRole(myPrivate.role) || Date.now() - lastSabotageAt < 30000) return;
  lastSabotageAt = Date.now();
  await update(publicRef(), { sabotage: { type: "lights", until: Date.now() + 30000, by: myName } }).catch(() => {});
  $("moveStatus").textContent = "Bạn đã tắt đèn 30 giây — người vô tội chỉ nhìn gần được.";
});
$("sabotageDoorsBtn").addEventListener("click", async () => {
  if (!isDuckRole(myPrivate.role) || Date.now() - lastSabotageAt < 30000) return;
  lastSabotageAt = Date.now();
  await update(publicRef(), { sabotage: { type: "doors", until: Date.now() + 20000, by: myName } }).catch(() => {});
  $("moveStatus").textContent = "Bạn đã khóa cửa 20 giây — không ai qua được cửa.";
});
$("skipVoteBtn").addEventListener("click", async () => {
  myVote = "skip";
  await set(ref(db, `rooms/${roomCode}/public/votes/${myUid}`), "skip");
  renderPublic();
});
async function doFinalReveal(opts) {
  // opts: {innocentWin, duckWin, dodoWin, winReason, tie, accusedUid, accusedName, voteCounts}
  const assignSnap = await get(ref(db, `rooms/${roomCode}/private/${myUid}/assignments`)).catch(() => null);
  const accomSnap = await get(ref(db, `rooms/${roomCode}/private/${myUid}/accompliceUpdate`)).catch(() => null);
  const assign = (assignSnap && assignSnap.val()) || {};
  const accom = (accomSnap && accomSnap.val()) || {};
  const culpritUid = assign.culpritUid || botRoles.culpritUid;
  const accompliceUid = accom.accompliceUid || botRoles.accompliceUid || null;
  await update(publicRef(), {
    phase: "reveal",
    reveal: {
      tie: !!opts.tie, accusedUid: opts.accusedUid || null, accusedName: opts.accusedName || null,
      culpritUid, culpritName: assign.culpritName || playerName(culpritUid),
      accompliceUid, accompliceName: accom.accompliceName || (accompliceUid ? playerName(accompliceUid) : null),
      dodoUid: assign.dodoUid || null, dodoName: assign.dodoName || null,
      missionLabel: assign.mission ? assign.mission.typeLabel : (publicState.missionTypeLabel || ""),
      missionDetail: assign.mission ? assign.mission.detail : "",
      scene: publicState.scene || (assign.mission ? assign.mission.scene : ""),
      innocentWin: !!opts.innocentWin, duckWin: !!opts.duckWin, dodoWin: !!opts.dodoWin,
      winReason: opts.winReason || "", voteCounts: opts.voteCounts || {},
    },
  });
}
async function doEjectAndCheckWin() {
  // Host only: called from revealBtn (now "công bố người bị loại").
  const votesSnap = await get(ref(db, `rooms/${roomCode}/public/votes`));
  const votes = votesSnap.val() || {};
  const t = tallyVotes(votes);
  const players = publicState.players ? Object.entries(publicState.players).map(([uid, p]) => ({ uid, ...p })) : [];
  const aliveBefore = players.filter((p) => p.alive !== false);
  // Tie or skip wins -> no ejection, back to movement.
  if (t.tie || !t.accusedUid || t.accusedUid === "skip") {
    await update(publicRef(), { phase: "investigation", votes: null, bodies: null, meetingBy: null, meetingReason: null, reportedBodyUid: null });
    return;
  }
  const accusedUid = t.accusedUid;
  const accusedName = playerName(accusedUid);
  // Mark ejected as dead.
  await update(ref(db, `rooms/${roomCode}/public/players/${accusedUid}`), { alive: false }).catch(() => {});
  const assignSnap = await get(ref(db, `rooms/${roomCode}/private/${myUid}/assignments`)).catch(() => null);
  const accomSnap = await get(ref(db, `rooms/${roomCode}/private/${myUid}/accompliceUpdate`)).catch(() => null);
  const assign = (assignSnap && assignSnap.val()) || {};
  const accom = (accomSnap && accomSnap.val()) || {};
  const culpritUid = assign.culpritUid || botRoles.culpritUid;
  const accompliceUid = accom.accompliceUid || botRoles.accompliceUid || null;
  const dodoUid = assign.dodoUid || null;
  // Dodo ejected -> Dodo wins immediately (unless that player was later invited as accomplice, then they count as a duck).
  if (accusedUid === dodoUid && accusedUid !== accompliceUid) {
    await doFinalReveal({ innocentWin: false, duckWin: false, dodoWin: true, winReason: "dodoEjected", tie: false, accusedUid, accusedName, voteCounts: t.counts });
    return;
  }
  const aliveAfter = aliveBefore.filter((p) => p.uid !== accusedUid);
  const ducksAlive = aliveAfter.filter((p) => p.uid === culpritUid || p.uid === accompliceUid);
  const innocentsAlive = aliveAfter.filter((p) => p.uid !== culpritUid && p.uid !== accompliceUid);
  if (ducksAlive.length === 0) {
    await doFinalReveal({ innocentWin: true, duckWin: false, dodoWin: false, winReason: "ducksEjected", tie: false, accusedUid, accusedName, voteCounts: t.counts });
    return;
  }
  if (ducksAlive.length >= innocentsAlive.length) {
    await doFinalReveal({ innocentWin: false, duckWin: true, dodoWin: false, winReason: "ducksOutnumber", tie: false, accusedUid, accusedName, voteCounts: t.counts });
    return;
  }
  // Game continues: back to movement, votes/bodies cleared.
  await update(publicRef(), { phase: "investigation", votes: null, bodies: null, meetingBy: null, meetingReason: null, reportedBodyUid: null });
  myVote = null;
}
$("meetingBtn").addEventListener("click", async () => {
  // Prototype route: any player may call a meeting. Public node is writable
  // by any authenticated player under the suggested Rules, so this works
  // without waiting for the host. Host-only button (toVoteBtn) still exists.
  if (!db || !roomCode) return;
  await update(publicRef(), { phase: "vote", meetingBy: myName, meetingReason: "emergency" }).catch(() => {});
});

$("toVoteBtn").addEventListener("click", async () => {
  if (!isHost) return;
  await update(publicRef(), { phase: "vote" });
});

$("revealBtn").addEventListener("click", async () => {
  if (!isHost) return;
  await doEjectAndCheckWin();
});

$("newGameBtn").addEventListener("click", () => {
  // Ván mới = phòng mới, để mã phòng cũ không bị lẫn vai trò cũ.
  window.location.reload();
});

// ---------- Area picker (trial): door -> list of locations/areas, inside game frame ----------
function renderAreaPicker() {
  const el = $("areaPickerList"); if (!el) return;
  const byLoc = {};
  AREAS.forEach((a) => { (byLoc[a.loc] = byLoc[a.loc] || []).push(a); });
  el.innerHTML = Object.entries(byLoc).map(([loc, arr]) => `
    <div style="margin:8px 0"><strong>${loc}</strong><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
    ${arr.map((a) => `<button type="button" class="area-pick-btn" data-area="${a.id}" style="width:auto;margin:0;padding:10px 12px;background:${a.id === currentAreaId ? '#16a34a' : '#6366f1'}">${a.name}${a.id === currentAreaId ? ' (đang ở đây)' : ''}</button>`).join("")}
    </div></div>`).join("");
  el.querySelectorAll(".area-pick-btn").forEach((btn) => btn.addEventListener("click", () => {
    currentAreaId = btn.getAttribute("data-area");
    myPos = { x: 480, y: 400 };
    syncPos(true);
    show("areaPicker", false);
    $("moveStatus").textContent = `Bạn đã vào ${currentArea().loc} — ${currentArea().name}.`;
  }));
}
if ($("doorBtn")) $("doorBtn").addEventListener("click", () => {
  const sab = sabotageActive();
  if (sab && sab.type === "doors") return;
  renderAreaPicker();
  show("areaPicker", true);
});
if ($("areaPickerCloseBtn")) $("areaPickerCloseBtn").addEventListener("click", () => show("areaPicker", false));
