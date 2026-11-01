// Vòng đo chính thức (Tuần 2) – chạy 4 kịch bản x 3 loại file cho MỘT khung giờ.
// Dùng:  node bench/round2.js --slot=morning --network=wifi-vnpt [--runs=30] [--dry]
// Cần biến môi trường (hoặc file .env ở thư mục gốc):
//   ORIGIN_URL=https://origin.<domain>   SITE_URL=https://www.<domain>
//   JSDELIVR_URL=https://cdn.jsdelivr.net/gh/<user>/<repo>@v1   (không có /static)
// Mỗi tổ hợp gọi bench/bench.js (giữ nguyên định dạng CSV), nên analyze.js đọc được cả
// file vòng 1 lẫn vòng 2.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const envFile = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
const flags = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => { const [k, v] = a.slice(2).split("="); return [k, v ?? true]; })
);
const slot = flags.slot, network = flags.network;
const runs = Number(flags.runs) || 30;
if (!["morning", "afternoon", "evening"].includes(slot) || !network) {
  console.log("Usage: node bench/round2.js --slot=morning|afternoon|evening --network=<wifi-vnpt|4g-viettel|...> [--runs=30] [--dry]");
  process.exit(1);
}
const strip = (u) => (u || "").replace(/\/+$/, "");
const origin = strip(process.env.ORIGIN_URL), site = strip(process.env.SITE_URL), jsd = strip(process.env.JSDELIVR_URL);
if (!origin || !site || !jsd) { console.error("Thiếu ORIGIN_URL / SITE_URL / JSDELIVR_URL"); process.exit(1); }
if (/localhost|127\.0\.0\.1/.test(origin + site)) console.warn("CẢNH BÁO: đang đo localhost – số liệu này KHÔNG dùng cho report.");

const assets = [
  { key: "photo01", p: "/static/img/photo-01.jpg" },
  { key: "appcss", p: "/static/css/app.css" },
  { key: "vendorjs", p: "/static/js/vendor.js" },
];
const scenarios = [
  { key: "origin", base: origin, miss: false },
  { key: "cfmiss", base: site, miss: true },
  { key: "cfhit", base: site, miss: false },
  { key: "jsdelivr", base: jsd, miss: false },
];

// Làm nóng cache Cloudflare 1 lần trước khi đo kịch bản HIT (bench.js đã bỏ run 1 khỏi trung vị,
// nhưng làm nóng thêm giúp run 1 cũng là HIT nếu cache đang hết hạn).
async function warm() {
  for (const a of assets) { try { await (await fetch(site + a.p)).arrayBuffer(); } catch {} }
}

(async () => {
  console.log(`Vòng 2 | slot=${slot} network=${network} runs=${runs} | ${new Date().toISOString()}`);
  let failed = 0;
  for (const s of scenarios) {
    if (s.key === "cfhit") await warm();
    for (const a of assets) {
      const args = [path.join(__dirname, "bench.js"), `${s.key}-${a.key}`, s.base + a.p, String(runs)];
      if (s.miss) args.push("miss");
      args.push(`--network=${network}`, `--slot=${slot}`);
      console.log("\n>> node " + args.slice(0).join(" ").replace(__dirname + path.sep, "bench/"));
      if (flags.dry) continue;
      const r = spawnSync(process.execPath, args, { stdio: "inherit" });
      if (r.status !== 0) failed++;
    }
  }
  console.log(failed ? `\nXong, có ${failed} lệnh lỗi – kiểm tra lại trước khi dùng số liệu.` : "\nXong khung giờ này. Chạy tiếp: node bench/analyze.js");
})();
