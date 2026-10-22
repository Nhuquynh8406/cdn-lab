// Usage: node bench/bench.js <label> <url> [runs=30] [miss] [--network=wifi] [--slot=morning]
// - <label>  : scenario label, e.g. origin-photo01, cfmiss-photo01, cfhit-photo01, jsdelivr-photo01
// - [miss]   : append a unique query string so the CDN must fetch from origin (scenario B)
// Writes one CSV per run to bench/results/<label>-<timestamp>.csv (never overwrites).
const fs = require("node:fs");
const path = require("node:path");
const { performance } = require("node:perf_hooks");

const flags = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("="))
);
const [label, url, runsArg, mode] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (!label || !url || !/^https?:\/\//i.test(url)) {
  console.log("Usage: node bench/bench.js <label> <url> [runs=30] [miss] [--network=..] [--slot=..]");
  process.exit(1);
}
const runs = Number(runsArg) || 30;
const missMode = mode === "miss";

const columns = [
  "label", "run", "phase", "timestamp", "network", "slot", "status", "cache", "age", "edge",
  "ttfb_ms", "total_ms", "bytes", "cache_control", "error"
];

const median = (values) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

async function measure(run) {
  const target = missMode ? `${url}${url.includes("?") ? "&" : "?"}nocache=${Date.now()}-${run}` : url;
  const row = {
    label, run, phase: run === 1 ? "first" : "steady", timestamp: new Date().toISOString(),
    network: flags.network || "", slot: flags.slot || "",
    status: "", cache: "", age: "", edge: "", ttfb_ms: "", total_ms: "", bytes: "", cache_control: "", error: ""
  };
  const t0 = performance.now();
  try {
    const res = await fetch(target, { redirect: "follow" });
    row.ttfb_ms = (performance.now() - t0).toFixed(1); // time until response headers arrive
    const body = await res.arrayBuffer();
    row.total_ms = (performance.now() - t0).toFixed(1);
    const ray = res.headers.get("cf-ray") || "";
    row.status = res.status;
    // Cloudflare: cf-cache-status; jsDelivr and others: x-cache. NO-CDN if neither is present.
    row.cache = res.headers.get("cf-cache-status") || res.headers.get("x-cache") || "NO-CDN";
    row.age = res.headers.get("age") || "";
    row.edge = ray.split("-")[1] || "";
    row.bytes = body.byteLength;
    row.cache_control = res.headers.get("cache-control") || "";
  } catch (e) {
    row.error = e.message;
  }
  return row;
}

(async () => {
  const rows = [];
  for (let i = 1; i <= runs; i++) {
    const r = await measure(i);
    rows.push(r);
    console.log(`${i}/${runs}: ${r.status || r.error} ${r.total_ms ? r.total_ms + " ms" : ""} ${r.cache}`);
    await new Promise((res) => setTimeout(res, 300));
  }

  const outDir = path.join(__dirname, "results");
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${label}-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`);
  const csv = [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join("\n");
  fs.writeFileSync(file, "﻿" + csv + "\n", "utf8");

  const steady = rows.filter((r) => r.phase === "steady" && r.status && !r.error);
  const errors = rows.filter((r) => r.error).length;
  if (steady.length) {
    console.log(`\n${label}: median TTFB ${median(steady.map((r) => +r.ttfb_ms)).toFixed(1)} ms, ` +
      `median total ${median(steady.map((r) => +r.total_ms)).toFixed(1)} ms (runs 2-${runs}, errors: ${errors})`);
    const counts = {};
    steady.forEach((r) => (counts[r.cache] = (counts[r.cache] || 0) + 1));
    console.log("Cache status counts:", JSON.stringify(counts));
  }
  const first = rows[0];
  console.log(`Run 1 (includes DNS + TCP + TLS setup): TTFB ${first.ttfb_ms || "n/a"} ms`);
  console.log(`Saved ${file}`);
})();