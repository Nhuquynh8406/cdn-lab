# CDN Lab - Content Delivery Networks Demo

## Chạy nhanh - bản giao diện tiếng Việt, hồng loang

Đề tài 8, môn **Lập trình Web và Ứng dụng (503073)**. Website minh họa tài nguyên tĩnh, HTTP caching, đo trước/sau CDN và cache invalidation. Nội dung bám đề gốc `503073-Midterm.pdf`; đề không bắt buộc màu giao diện hoặc tiếng Anh. Xem [đối chiếu yêu cầu](docs/doi-chieu-de-goc.md).

1. Cài Node.js 20 trở lên, mở terminal ở thư mục dự án, chạy `npm ci`.
2. PowerShell: `Copy-Item .env.example .env`. macOS/Linux: `cp .env.example .env`.
3. Chạy `npm start`, mở **http://localhost:3000**.
4. Trang quản trị `/admin`: tài khoản local **admin / cdnlab-local-demo**. Đổi mật khẩu khi production; không đưa `.env` và API token lên GitHub.

Các trang chính: **Thư viện ảnh**, **Đo hiệu năng**, **Cách hoạt động**, **Quản trị**. Các mã HTTP, HIT/MISS, TTFB và tên header được giữ nguyên để đối chiếu kỹ thuật. Nhãn CSV dùng tên trường ổn định cho việc xử lý dữ liệu; thông báo và thao tác giao diện dùng tiếng Việt.

Ảnh trong thư viện và preview quản trị hiển thị tông hồng bằng CSS filter. File JPEG gốc, hash phiên bản và byte tải về vẫn giữ nguyên; khi mở trực tiếp URL ảnh ngoài giao diện có thể vẫn thấy màu gốc. Viền hồng đặt ở khung chứa để không bị filter đổi màu.

Sơ đồ luồng trong `docs/diagrams/` dùng nền trắng, nét đen, có PNG 300 dpi, SVG và nguồn Mermaid. Chạy `npm run diagrams` để tạo lại sáu sơ đồ từ `tools/draw-flows.js` (cần Chrome; có thể đặt CHROME_PATH). Các sơ đồ mô tả luồng web, benchmark và purge của code hiện tại; nhánh CDN là mô hình giải thích, không thay bằng chứng triển khai live.

Nếu origin và CDN cùng trỏ localhost, số đo là local; không có cache edge thật. Cần TV1 cấu hình domain, HTTPS, cache rules và token để xác nhận purge thật. `npm test` kiểm tra HTTP; `node tools/browser-check.js` dùng Chrome có sẵn trên Windows để kiểm tra giao diện, ngôn ngữ, CSV và cả năm trang ở viewport 390px.

Phần tiếng Anh bên dưới giữ hướng dẫn kỹ thuật chi tiết. Các công cụ `npm run documents`/`tools/export-pdf.js` là bộ tạo bản nháp ban đầu, **không dùng để ghi đè bản báo cáo Word nhóm đã chỉnh sửa theo mẫu**. Bản báo cáo mới được bàn giao riêng trong thư mục `04_BAO_CAO_CDN_LAB` trên máy; không cần để chạy web.

TV2 application deliverable for Web Programming and Applications (503073). This repository implements the origin application specified in KEHOACH (1).docx. It is intended for Azure + Nginx + Cloudflare, not a static hosting service.

## Quick start (Windows / macOS / Linux)

Install Node.js 20 or newer and npm. In this directory:

```sh
npm ci
```

PowerShell: `Copy-Item .env.example .env`. macOS/Linux: `cp .env.example .env`.

```sh
npm start
```

Open http://localhost:3000. Gallery: `/gallery.html`; measurement: `/benchmark.html`; admin: `/admin`; explanation: `/how-it-works.html`.

Local admin: **admin / cdnlab-local-demo**. These are intentionally public development credentials. Production startup rejects this password. Set your own ADMIN_PASS in the server's private `.env`, and give the teacher the actual production credentials separately in the private submission README.

The committed images and vendor bundle are ready to use; `npm run assets` regenerates synthetic JPEGs if needed. This command preserves an existing banner. Test banners: `docs/demo-assets/banner-a.jpg` and `banner-b.jpg`.

## Configuration

| Variable | Purpose |
| --- | --- |
| PORT | HTTP port, default 3000 |
| SITE_URL | Cloudflare site origin, e.g. https://www.example.org; no path |
| ORIGIN_URL | Direct origin, e.g. https://origin.example.org; no path |
| JSDELIVR_URL | Optional https://cdn.jsdelivr.net/gh/USER/REPO@v1 (without /static); leave empty until TV3 publishes identical assets |
| ADMIN_USER / ADMIN_PASS | Basic Auth credentials; HTTPS is mandatory in production |
| CF_ZONE_ID / CF_API_TOKEN | TV1's zone and zone-scoped Cache Purge token; server only |
| NODE_ENV | Set production on Azure |

Both route URLs default to localhost. This is explicitly marked **local mode**, not a Cloudflare simulation. No real CDN data or speedup is fabricated. Purge is disabled without credentials; direct API requests return 503.

## Test the features

1. Gallery eagerly loads 30 JPEGs from relative `/static/` URLs plus app.css and a real lodash payload (~530 KB unminified). The source plan requested 200-300 KB JS; lodash's complete licensed source is retained rather than padded or truncated. Each synthetic test image is 300-600 KB. They are original generated textures, replacing the plan's suggested Unsplash/Pexels photographs; no photo attribution is claimed. See `static/asset-manifest.json` and `tools/prepare-assets.js`.
2. Benchmark chooses 1-30 runs for four assets. It alternates route order, includes the first request, exports all attempts as CSV, and marks missing Resource Timing as N/A. This request-level TTFB excludes connection setup; it is not directly identical to curl time_starttransfer. Total includes body consumption. Do not compare it with TV3's Node fetch-to-headers latency without explaining the different definitions.
3. Unique-query mode changes Cloudflare cache keys only when query strings participate in the configured key. Observe actual CF-Cache-Status; do not label every sample MISS by assumption. Repeat mode includes warmup; inspect per-sample CSV to separate MISS from HIT. jsDelivr measurement only appears when configured, and is not assumed to expose Cloudflare headers.
4. Admin → reload twice to warm the unversioned banner. Upload banner-b.jpg. On real Cloudflare, origin should change while a fresh edge copy may remain old. Panel 3 uses a content hash query. Purge banner URL, inspect the next response, reload again. Test versioning checkbox on/off. Purge Everything requires an explicit UI confirmation.
5. How it works explains cache headers and limitations. `/.env` is never served by Express; TV1's WAF rule can return 403 at edge while direct origin returns 404.

Browser `cache: no-store` bypasses its storage, without setting a request Cache-Control header or cache-busting the unchanged preview. Network intermediaries and configured rules still control the actual edge result. Avoid sending Basic Auth credentials on public asset requests: all measurement and preview fetches use `credentials: omit`.

## API

| Endpoint | Behavior |
| --- | --- |
| GET /api/config | Public route URLs and configuration booleans, no secrets |
| GET /api/info | Observed request metadata; forwarded headers are not identity evidence |
| GET /api/banner-version | SHA-256-derived current banner version |
| POST /api/admin/replace-banner | Basic Auth + X-CDN-Lab: 1; multipart field image; decoded JPEG only, ≤5 MB and ≤24M pixels; atomic replacement |
| POST /api/admin/purge | Basic Auth + X-CDN-Lab: 1; JSON mode=files with paths, or mode=everything |

Administrative POST requests reject foreign Origin / cross-site browser requests and require a custom header. Dynamic responses, including 401 and errors, use no-store. Static responses expose CORS headers and Timing-Allow-Origin. Tokens never go to the browser. Single-file purge accepts only local `/static/` paths, including optional exact query strings; it does not purge every version of a URL automatically.

## Verification

```sh
npm test
```

Tests use an ephemeral local server and temporary images. They cover auth, private response caching, static CORS and conditional 304, valid/invalid upload, content version changes, purge path validation, API error handling and Cloudflare payloads with a mocked transport. They **do not verify Cloudflare propagation**. TV3 must independently follow this README on a clean machine; that human acceptance is still outstanding.

## Deployment handoff to TV1

Set DNS `origin` to DNS-only, `www` proxied only after certificates are issued. The same VM serves both hosts. Set production URLs and private credentials in `.env`. A deployment example is in `deploy/`, outside TV2's core scope and requires the real domain.

```sh
git clone YOUR_REPOSITORY_URL cdn-lab
cd cdn-lab
npm ci
cp .env.example .env
nano .env
sudo npm install -g pm2
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup
sudo cp deploy/nginx-cdnlab.conf /etc/nginx/sites-available/cdnlab
# Replace example.org in the copied config before enabling it.
sudo ln -s /etc/nginx/sites-available/cdnlab /etc/nginx/sites-enabled/cdnlab
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d origin.example.org -d www.example.org
```

Follow the command printed by `pm2 startup`. Certbot, Nginx and Git must already be installed by TV1. Enable Cloudflare proxy for www and Full (strict). Cache only www `/static/`, respect browser TTL, and bypass `/api/` and `/admin`. Preserve query strings in the default cache key. Transform header: X-CDN-Demo=edge-rule-v1. WAF: block `/.env` and `wp-login`. Verify both hosts return CORS and Timing-Allow-Origin on static files. Do not configure Cache Everything over the entire application. The exact rules must be reviewed against the active Cloudflare plan/dashboard by TV1.

On Windows use `curl.exe`, not the PowerShell curl alias:

```sh
curl -I https://www.example.org/static/img/banner.jpg
curl -I https://origin.example.org/static/img/banner.jpg
curl -I https://www.example.org/api/config
```

Repeat the first request: record actual cache status, Age, CF-Ray and X-Origin-Served-At. Capture evidence listed in `docs/acceptance.md` before claiming a live deployment. No GitHub repository, domain or external infrastructure has been created by this local deliverable.

## Project structure and team boundary

`server.js`, `lib/cloudflare.js`, `public/`, `static/`: TV2 app. `docs/TV2-report.md` plus generated Word report: TV2's 2.4-2.5 and Chapter 4/5 contribution. `docs/diagrams/`: editable Mermaid, SVG and PNG. `docs/slides-outline.md` and PowerPoint: shared 20-slide deck, with TV1/TV3 results identified for completion. `docs/video-script-TV2.md`: TV2 English narration and recording/editing instructions. `docs/ban-giao-TV2.md`: Vietnamese handoff.

`bench/` belongs to TV3: their formal bench.js, curl script, raw measurements and Chapter 6 are not invented here. Team names, student IDs, real URLs and contribution percentages must be supplied by the group; there are no fabricated identities or commit links. Do not submit node_modules, `.env` or tokens.

The original document generators create the initial draft; the final Vietnamese report is maintained separately using the supplied Faculty layout and the user's edits. Local UI verification: `node tools/browser-check.js` (uses installed Chrome on Windows). Record a real video with all three students; a script/deck cannot replace their appearance and voices. The original assignment does not mandate English for the app, report or video; follow any additional instruction from the lecturer.
