// Gom mọi CSV trong bench/results/ -> bảng tóm tắt + biểu đồ SVG + bảng markdown cho Ch.6.
// Dùng:  node bench/analyze.js [--dir=bench/results] [--out=bench/analysis]
// Không bịa số: chỉ tính từ các dòng thực sự có trong CSV. Dòng lỗi được đếm riêng.
const fs = require("node:fs");
const path = require("node:path");

const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => { const [k, v] = a.slice(2).split("="); return [k, v ?? true]; }));
const dir = path.resolve(flags.dir || path.join(__dirname, "results"));
const out = path.resolve(flags.out || path.join(__dirname, "analysis"));

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}
const num = (x) => (x === "" || x == null || isNaN(+x) ? null : +x);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return null; const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const med = (a) => pct(a, 0.5);
const f1 = (x) => (x == null ? "" : x.toFixed(1));

if (!fs.existsSync(dir)) { console.error("Không thấy thư mục " + dir); process.exit(1); }
const all = [];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".csv"))) {
  let rows; try { rows = parseCsv(fs.readFileSync(path.join(dir, f), "utf8")); } catch { continue; }
  if (!rows.length || !("label" in rows[0]) || !("ttfb_ms" in rows[0])) { console.warn("Bỏ qua (không đúng schema bench.js): " + f); continue; }
  for (const r of rows) all.push({ ...r, file: f });
}
if (!all.length) { console.error("Chưa có dòng đo nào."); process.exit(1); }

const scenarioOf = (label) => label.split("-")[0];
const assetOf = (label) => label.split("-").slice(1).join("-");
const SCEN = { origin: "A. Origin", cfmiss: "B. CDN MISS", cfhit: "C. CDN HIT", jsdelivr: "D. jsDelivr" };
const SLOTS = ["morning", "afternoon", "evening"];

const groups = new Map();
for (const r of all) {
  const key = [r.timestamp.slice(0, 10), r.slot || "(none)", r.network || "(none)", r.label].join("|");
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}
const summary = [];
for (const [key, rows] of groups) {
  const [date, slot, network, label] = key.split("|");
  const steady = rows.filter((r) => r.phase === "steady" && r.status && !r.error);
  const edges = [...new Set(rows.map((r) => r.edge).filter(Boolean))].join("/");
  const cacheCounts = {}; steady.forEach((r) => (cacheCounts[r.cache] = (cacheCounts[r.cache] || 0) + 1));
  const t = steady.map((r) => num(r.ttfb_ms)).filter((x) => x != null), tot = steady.map((r) => num(r.total_ms)).filter((x) => x != null);
  const first = rows.find((r) => r.phase === "first");
  summary.push({
    date, time_slot: slot, network, scenario: scenarioOf(label), asset: assetOf(label), runs: rows.length,
    ok: steady.length, errors: rows.filter((r) => r.error || !r.status).length,
    median_ttfb_ms: med(t), p95_ttfb_ms: pct(t, 0.95), min_ttfb_ms: t.length ? Math.min(...t) : null, max_ttfb_ms: t.length ? Math.max(...t) : null,
    median_total_ms: med(tot), first_ttfb_ms: first ? num(first.ttfb_ms) : null, edge: edges,
    cache_counts: Object.entries(cacheCounts).map(([k, v]) => `${k}:${v}`).join(" "),
    notes: slot === "(none)" ? "no slot flag (round 1?)" : "",
  });
}
summary.sort((a, b) => (a.date + a.asset + a.scenario + a.time_slot).localeCompare(b.date + b.asset + b.scenario + b.time_slot));

fs.mkdirSync(out, { recursive: true });
const cols = ["date", "time_slot", "network", "scenario", "asset", "runs", "ok", "errors", "median_ttfb_ms", "p95_ttfb_ms", "min_ttfb_ms", "max_ttfb_ms", "median_total_ms", "first_ttfb_ms", "edge", "cache_counts", "notes"];
const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
fs.writeFileSync(path.join(out, "summary.csv"), "\uFEFF" + [cols.join(","), ...summary.map((s) => cols.map((c) => (typeof s[c] === "number" ? +s[c].toFixed(2) : q(s[c]))).join(","))].join("\n") + "\n");

// Tổng hợp xuyên khung giờ: trung vị của các trung vị theo (scenario, asset) – chỉ khi có >=1 khung giờ
const byKey = new Map();
for (const s of summary) { if (!SLOTS.includes(s.time_slot)) continue; /* vòng 1 (không có --slot) không được trộn vào số chính thức */ const k = s.scenario + "|" + s.asset; if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(s); }
const official = summary.filter((s) => SLOTS.includes(s.time_slot));
const assets = [...new Set(official.map((s) => s.asset))].sort();
const scens = ["origin", "cfmiss", "cfhit", "jsdelivr"].filter((s) => official.some((x) => x.scenario === s));
const cell = (sc, as) => { const g = byKey.get(sc + "|" + as); return g ? med(g.map((x) => x.median_ttfb_ms).filter((x) => x != null)) : null; };

let md = "<!-- Sinh tự động bởi bench/analyze.js từ " + all.length + " dòng đo. KHÔNG sửa số bằng tay; sửa CSV gốc rồi chạy lại. -->\n\n";
md += "**Table. Median TTFB (ms) by scenario and asset (median of per-slot medians)**\n\n| Asset | " + scens.map((s) => SCEN[s] || s).join(" | ") + " |\n|---|" + scens.map(() => "---:").join("|") + "|\n";
for (const a of assets) md += `| ${a} | ` + scens.map((s) => f1(cell(s, a)) || "n/a").join(" | ") + " |\n";
const r1 = summary.length - official.length;
if (r1) md += `\n> ${r1} nhóm đo không có --slot (vòng 1 / đo thử) chỉ hiện ở bảng chi tiết, KHÔNG nằm trong bảng trung vị và biểu đồ chính thức.\n`;
md += "\n**Table. Per-slot detail (median TTFB / p95 / errors; cache status counts)**\n\n| Slot | Scenario | Asset | Median TTFB | p95 | Median total | Errors | Edge | Cache status |\n|---|---|---|---:|---:|---:|---:|---|---|\n";
for (const s of summary) md += `| ${s.time_slot} | ${SCEN[s.scenario] || s.scenario} | ${s.asset} | ${f1(s.median_ttfb_ms)} | ${f1(s.p95_ttfb_ms)} | ${f1(s.median_total_ms)} | ${s.errors} | ${s.edge || "-"} | ${s.cache_counts} |\n`;
md += "\n**Speed-up of CDN HIT versus origin (TTFB)**\n\n| Asset | Origin (ms) | CDN HIT (ms) | Reduction |\n|---|---:|---:|---:|\n";
for (const a of assets) { const o = cell("origin", a), h = cell("cfhit", a); md += `| ${a} | ${f1(o) || "n/a"} | ${f1(h) || "n/a"} | ${o && h ? ((1 - h / o) * 100).toFixed(1) + " %" : "n/a"} |\n`; }
const missing = []; for (const a of assets) for (const s of ["origin", "cfmiss", "cfhit", "jsdelivr"]) for (const sl of SLOTS) if (!summary.some((x) => x.asset === a && x.scenario === s && x.time_slot === sl)) missing.push(`${s}-${a}@${sl}`);
md += `\n**Coverage check**: ${missing.length ? "THIẾU " + missing.length + " bộ: " + missing.join(", ") : "đủ 4 kịch bản x 3 khung giờ x " + assets.length + " file"}.\n`;
fs.writeFileSync(path.join(out, "tables.md"), md);

// Biểu đồ cột nhóm (SVG thuần, không cần thư viện)
function barSvg(title, series, getVal, fname) {
  const W = 760, H = 380, L = 70, B = 60, T = 50, R = 20, pw = W - L - R, ph = H - T - B;
  const palette = { origin: "#d9534f", cfmiss: "#f0ad4e", cfhit: "#2e8b57", jsdelivr: "#4a78c2" };
  const vals = assets.flatMap((a) => series.map((s) => getVal(s, a))).filter((v) => v != null);
  const max = Math.max(1, ...vals) * 1.15, gw = pw / assets.length, bw = Math.min(40, (gw * 0.8) / series.length);
  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Arial,sans-serif" font-size="12"><rect width="${W}" height="${H}" fill="#fff"/><text x="${W / 2}" y="24" text-anchor="middle" font-size="15" font-weight="bold">${title}</text>`;
  for (let i = 0; i <= 5; i++) { const y = T + ph - (ph * i) / 5, v = (max * i) / 5; g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#ddd"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${v.toFixed(0)}</text>`; }
  g += `<text transform="translate(16 ${T + ph / 2}) rotate(-90)" text-anchor="middle">ms</text>`;
  assets.forEach((a, i) => {
    const x0 = L + i * gw + (gw - bw * series.length) / 2;
    series.forEach((s, j) => { const v = getVal(s, a); if (v == null) return; const h = (v / max) * ph, x = x0 + j * bw;
      g += `<rect x="${x}" y="${T + ph - h}" width="${bw - 3}" height="${h}" fill="${palette[s]}"/><text x="${x + (bw - 3) / 2}" y="${T + ph - h - 4}" text-anchor="middle" font-size="10">${v.toFixed(0)}</text>`; });
    g += `<text x="${L + i * gw + gw / 2}" y="${H - B + 18}" text-anchor="middle">${a}</text>`;
  });
  series.forEach((s, j) => { g += `<rect x="${L + j * 150}" y="${H - 24}" width="12" height="12" fill="${palette[s]}"/><text x="${L + j * 150 + 18}" y="${H - 14}">${SCEN[s] || s}</text>`; });
  fs.writeFileSync(path.join(out, fname), g + "</svg>");
}
barSvg("Median TTFB by scenario (all slots)", scens, (s, a) => cell(s, a), "chart-ttfb.svg");
for (const sl of SLOTS) if (summary.some((x) => x.time_slot === sl)) barSvg(`Median TTFB – ${sl}`, scens, (s, a) => { const x = summary.find((y) => y.scenario === s && y.asset === a && y.time_slot === sl); return x ? x.median_ttfb_ms : null; }, `chart-ttfb-${sl}.svg`);

console.log(`Đọc ${all.length} dòng từ ${new Set(all.map((r) => r.file)).size} file -> ${summary.length} nhóm.`);
console.log(missing.length ? `THIẾU ${missing.length} bộ (xem tables.md).` : "Đủ bộ 4x3.");
console.log("Ra: " + path.relative(process.cwd(), out) + "/ (summary.csv, tables.md, chart-*.svg)");
