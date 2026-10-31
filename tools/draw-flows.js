const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { chromium } = require('playwright');
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
class Flow {
  constructor(title, height, width = 1480) { this.width=width; this.height=height; this.items=[`<text x="40" y="48" font-size="36" font-weight="bold">${esc(title)}</text>`]; }
  text(x,y,lines,size=29,anchor='middle') { this.items.push(`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${lines.map((l,i)=>`<tspan x="${x}" dy="${i?size*1.24:0}">${esc(l)}</tspan>`).join('')}</text>`); }
  box(x,y,w,h,lines,kind='process') {
    const attrs='fill="#fff" stroke="#111" stroke-width="2.5"';
    const shape=kind==='decision'?`<polygon points="${x+w/2},${y} ${x+w},${y+h/2} ${x+w/2},${y+h} ${x},${y+h/2}" ${attrs}/>`:kind==='end'?`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h/2}" ${attrs}/>`:`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${attrs}/>`;
    this.items.push(shape); this.text(x+w/2,y+h/2-(lines.length-1)*18+10,lines,kind==='decision'?27:29); return this;
  }
  arrow(points,label='',x,y) { this.items.push(`<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#111" stroke-width="2.5" marker-end="url(#arrow)"/>`);if(label)this.text(x,y,[label],25);return this; }
  note(x,y,lines) { this.text(x,y,lines,25,'start');return this; }
  svg() { return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}"><defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0L10 4L0 8Z" fill="#111"/></marker></defs><rect width="100%" height="100%" fill="#fff"/><g font-family="Times New Roman,serif" fill="#111">${this.items.join('')}</g></svg>`; }
}
function diagrams() {
 const result=[];
 let f=new Flow('Luồng truy cập website CDN Lab',1320);
 f.box(500,100,480,110,['Trình duyệt truy cập CDN Lab'],'end').box(500,290,480,110,['Trang chủ - GET /']);f.arrow([[740,210],[740,290]]);
 const cols=[30,395,760,1125];const labels=[['Thư viện ảnh','/gallery.html'],['Đo hiệu năng','/benchmark.html'],['Hướng dẫn','/how-it-works.html'],['Quản trị','/admin']];
 cols.forEach((x,i)=>{f.box(x,530,325,120,labels[i]);f.arrow([[740,400],[740,465],[x+162,465],[x+162,530]]);});
 f.box(30,790,325,120,['GET 30 ảnh','/static/img/*']).box(395,790,325,120,['Fetch các tuyến','Biểu đồ và CSV']);f.arrow([[192,650],[192,790]]).arrow([[557,650],[557,790]]);
 f.box(1110,760,350,170,['Basic Auth','hợp lệ?'],'decision').arrow([[1287,650],[1287,760]]);
 f.box(760,1050,325,120,['HTTP 401','Yêu cầu đăng nhập']).box(1125,1050,325,150,['Mở admin.html','API quản trị được','bảo vệ riêng']);f.arrow([[1110,845],[920,845],[920,1050]],'Không',985,830).arrow([[1285,930],[1285,1050]],'Có',1320,1000);
 f.note(40,1250,['Trang công khai tải tài nguyên riêng; các yêu cầu POST quản trị còn kiểm tra Origin và X-CDN-Lab.']);result.push(['use-case',f]);

 f=new Flow('Kiến trúc web và các đường tải tài nguyên',1320);
 f.box(40,495,310,130,['Trình duyệt','HTML / JS']).box(530,150,400,130,['Cloudflare edge','www.<domain>']).box(1050,440,390,130,['Nginx reverse proxy','HTTPS / chuyển tiếp']).box(1050,680,390,130,['Express origin','server.js']).box(1050,930,390,130,['Filesystem','static/ và banner.jpg']).box(530,950,400,130,['jsDelivr tùy chọn','Release public cố định']);
 f.arrow([[350,520],[420,520],[420,215],[530,215]],'Tuyến CDN',420,195).arrow([[930,215],[1245,215],[1245,440]],'Lấy upstream khi cần',1180,195).arrow([[350,560],[1050,560]],'Tuyến origin trực tiếp',700,540).arrow([[1245,570],[1245,680]]).arrow([[1245,810],[1245,930]],'Đọc / thay tệp',1360,875).arrow([[350,600],[420,600],[420,1015],[530,1015]],'Tuyến release',430,1140);
 f.note(40,1220,['Hai hostname chính cùng dùng ứng dụng origin. jsDelivr phải có cùng byte tài nguyên để so sánh.', 'DNS, TLS và quy tắc CDN là cấu hình triển khai; sơ đồ không khẳng định đã có hệ thống live.']);result.push(['architecture-web',f]);

 f=new Flow('Cache MISS - mô hình đơn giản một tầng',1480);
 f.box(450,100,580,110,['Browser GET tài nguyên tĩnh'],'end').box(450,300,580,110,['Edge không có bản sao','phù hợp để dùng']).box(450,510,580,120,['Yêu cầu upstream đến origin']).box(450,730,580,140,['Express trả nội dung + headers','Cache-Control, CORS, Timing','và X-Origin-Served-At']);
 f.arrow([[740,210],[740,300]]).arrow([[740,410],[740,510]]).arrow([[740,630],[740,730]]);
 f.box(470,970,540,180,['CDN được phép','lưu phản hồi?'],'decision').box(30,1200,460,100,['Không lưu bản sao']).box(960,1200,460,100,['Lưu theo cache policy']);
 f.arrow([[740,870],[740,970]]).arrow([[470,1060],[260,1060],[260,1200]],'Không',340,1040).arrow([[1010,1060],[1190,1060],[1190,1200]],'Có',1100,1040);
 f.box(450,1350,580,90,['Trả phản hồi cho browser'],'end').arrow([[260,1300],[260,1395],[450,1395]]).arrow([[1190,1300],[1190,1395],[1030,1395]]);
 f.note(35,1460,['Trạng thái cache do CDN trả. Nếu có cache tầng trên, edge MISS chưa chứng minh origin nhận request.']);result.push(['miss',f]);

 f=new Flow('Cache HIT - phản hồi từ edge còn tươi',1130);
 f.box(440,100,600,110,['Browser gửi GET cùng URL'],'end').box(440,310,600,180,['Có bản cache phù hợp','và còn tươi?'],'decision').box(440,620,600,140,['Edge trả byte đã lưu','CF-Cache-Status: HIT','Age và timestamp của bản cache']).box(440,900,600,110,['Browser đọc body / hiển thị'],'end').box(1090,650,350,130,['Không phải fresh HIT','Đi upstream theo policy']);
 f.arrow([[740,210],[740,310]]).arrow([[740,490],[740,620]],'Có',785,555).arrow([[740,760],[740,900]]).arrow([[1040,400],[1265,400],[1265,650]],'Không',1210,380);
 f.note(40,1080,['Trong nhánh HIT này không có yêu cầu đến Express origin. Kiểm tra metadata thực, không tạo header giả.']);result.push(['hit',f]);

 f=new Flow('Luồng benchmark theo public/js/benchmark.js',1810);
 f.box(430,90,620,110,['Nhấn Chạy đo; đọc cấu hình','Kiểm tra số lượt 1-30'],'end').box(430,290,620,120,['Lặp asset / lượt / tuyến','Đảo thứ tự tuyến ở lượt chẵn']).box(480,500,520,150,['Đã yêu cầu dừng?'],'decision');
 f.arrow([[740,200],[740,290]]).arrow([[740,410],[740,500]]);
 f.box(430,760,620,150,['Ghép URL; query riêng chỉ cho CF','fetch: no-store, CORS, omit','Đọc body; timeout tối đa 20 giây']).arrow([[740,650],[740,760]],'Chưa',790,710);
 f.box(490,1010,500,150,['Lỗi fetch / HTTP?'],'decision').arrow([[740,910],[740,1010]]);
 f.box(430,1260,620,140,['Lưu timing, bytes và headers','TTFB thiếu quyền đọc: null / N/A','Giữ cả lượt đầu tiên']).arrow([[740,1160],[740,1260]],'Không',800,1220);
 f.box(1080,990,350,180,['Request đã hủy?'],'decision').arrow([[990,1085],[1080,1085]],'Có',1040,1060);
 f.box(1080,1260,350,140,['Lưu mẫu lỗi','Tiếp tục lượt kế']).arrow([[1255,1170],[1255,1260]],'Không',1310,1220);
 f.box(490,1480,500,150,['Còn mẫu cần đo?'],'decision').arrow([[740,1400],[740,1480]]).arrow([[1255,1400],[1255,1555],[990,1555]]);
 f.arrow([[490,1555],[310,1555],[310,575],[480,575]],'Có',350,1530);
 f.box(430,1680,620,110,['Gom mẫu thành công: trung vị','Hiện bảng / chart; cho xuất CSV'],'end').arrow([[740,1630],[740,1680]],'Hết',790,1670);
 f.arrow([[1000,575],[1450,575],[1450,1735],[1050,1735]],'Đã dừng: giữ phần đã đo',1210,550);
 f.arrow([[1430,1080],[1465,1080],[1465,1795],[1090,1795],[1090,1770],[1050,1770]],'Có',1440,1050);
 result.push(['benchmark-flow',f]);

 f=new Flow('Upload và purge - hai thao tác tách biệt',1680);
 const xs=[160,560,960,1320];['Browser admin','Express API','Origin disk','Cloudflare API'].forEach((name,i)=>{f.box(xs[i]-140,100,280,90,[name]);f.items.push(`<line x1="${xs[i]}" y1="190" x2="${xs[i]}" y2="1530" stroke="#111" stroke-width="2" stroke-dasharray="8 8"/>`);});
 const msg=(from,to,y,lines)=>{f.arrow([[xs[from],y],[xs[to],y]]);f.text((xs[from]+xs[to])/2,y-lines.length*18-10,lines,26);};
 msg(0,1,300,['POST ảnh JPEG','Basic Auth + X-CDN-Lab']);
 f.box(355,355,410,110,['Kiểm auth, Origin/header','Multer 5 MiB; Sharp JPEG']);
 msg(1,2,550,['Ghi tệp tạm, rename','thay banner tại origin']);msg(1,0,710,['JSON: success + hash mới','Chưa gọi purge']);
 msg(0,1,900,['POST purge','mode: files hoặc everything']);f.box(355,950,410,120,['Kiểm mode, static paths','và cấu hình zone/token']);
 msg(1,3,1160,['POST Cloudflare purge_cache','Token chỉ ở server; timeout 15 giây']);msg(3,1,1310,['HTTP + JSON: kiểm success']);msg(1,0,1450,['Acknowledgement hoặc lỗi','không báo thành công giả']);
 f.note(40,1570,['Upload: refresh preview ngay. Purge được chấp nhận: chờ 2 giây rồi refresh ba preview.', 'Lỗi: 401/403 auth và nguồn; 400/413 upload/path; 503 thiếu cấu hình; 502 phản hồi provider không hợp lệ.', 'API acknowledgement không chứng minh đã cập nhật mọi PoP; phải quan sát phản hồi tiếp theo.', 'UI hỏi xác nhận trước purge toàn bộ. Lỗi ngoài dự kiến có thể trả HTTP 500.']);result.push(['purge',f]);
 return result;
}
async function generateDiagrams(){
 const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/diagrams');await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const mermaid={
  'use-case':'flowchart TD\n A([Trình duyệt]) --> H[GET /]\n H --> G[Gallery: /static/img/*]\n H --> B[Benchmark: fetch các tuyến]\n H --> I[Hướng dẫn HTTP]\n H --> AU{Basic Auth hợp lệ?}\n AU -->|Không| E[HTTP 401]\n AU -->|Có| AD[admin.html và API quản trị]',
  'architecture-web':'flowchart LR\n B[Browser] --> E[Cloudflare edge]\n B -->|Origin trực tiếp| N[Nginx]\n E -->|Upstream khi cần| N\n N --> X[Express]\n X --> F[Filesystem static]\n B --> J[jsDelivr release tùy chọn]',
  miss:'flowchart TD\n A([GET asset]) --> M[Edge không có bản dùng được]\n M --> O[Fetch origin]\n O --> S[Express trả byte và headers]\n S --> C{CDN cho phép lưu?}\n C -->|Có| K[Lưu bản cache]\n C -->|Không| N[Không lưu]\n K --> R([Trả browser])\n N --> R',
  hit:'flowchart TD\n A([GET cùng URL]) --> C{Bản cache phù hợp và tươi?}\n C -->|Có| H[Trả byte cache, HIT và Age]\n H --> R([Browser đọc body])\n C -->|Không| O[Upstream theo policy]',
  'benchmark-flow':'flowchart TD\n R([Chạy đo]) --> C[Đọc config và kiểm số lượt]\n C --> L[Lặp asset, lượt, tuyến; đảo thứ tự]\n L --> S{Đã dừng?}\n S -->|Có| P[Gom kết quả đã có]\n S -->|Không| F[Fetch, đọc body, kiểm HTTP]\n F --> E{Lỗi?}\n E -->|Không| V[Lưu timing, bytes và headers]\n E -->|Có| A{Request đã hủy?}\n A -->|Có| P\n A -->|Không| X[Lưu mẫu lỗi]\n V --> N{Còn mẫu?}\n X --> N\n N -->|Có| L\n N -->|Không| P\n P --> T[Median mẫu thành công, chart và CSV]',
  purge:'sequenceDiagram\n participant B as Browser admin\n participant X as Express API\n participant D as Origin disk\n participant C as Cloudflare API\n B->>X: POST JPEG và thông tin xác thực\n Note over X: Kiểm auth, Origin/header, JPEG và giới hạn\n X->>D: Ghi temp, rename banner\n X-->>B: JSON thành công và hash, chưa purge\n B->>X: POST purge, mode và paths\n Note over X: Kiểm mode, phạm vi và cấu hình\n X->>C: Zone purge, timeout 15 giây\n C-->>X: HTTP và JSON\n X-->>B: Kiểm success, trả acknowledgement hoặc lỗi\n Note over B: Nếu purge được nhận: chờ 2 giây rồi đọc preview thật'
 };
 const theme='%%{init: {"theme":"base","themeVariables":{"primaryColor":"#ffffff","secondaryColor":"#ffffff","tertiaryColor":"#ffffff","primaryTextColor":"#111111","primaryBorderColor":"#111111","lineColor":"#111111","noteBkgColor":"#ffffff","noteTextColor":"#111111","noteBorderColor":"#111111","actorBkg":"#ffffff","actorTextColor":"#111111","actorBorder":"#111111","fontFamily":"Times New Roman"}}}%%\n';
 try{const page=await browser.newPage();for(const[name,flow]of diagrams()){const svg=flow.svg();await fs.writeFile(path.join(out,name+'.svg'),svg);await fs.writeFile(path.join(out,name+'.mmd'),theme+mermaid[name]+'\n');await page.setViewportSize({width:flow.width,height:flow.height});await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0;background:white}</style>'+svg);await page.evaluate(()=>document.fonts.ready);const png=await page.screenshot({clip:{x:0,y:0,width:flow.width,height:flow.height}});await sharp(png).withMetadata({density:300}).png().toFile(path.join(out,name+'.png'));}}
 finally{await browser.close();}
 console.log('Created six white flow diagrams from application request/response paths.');
}
module.exports={generateDiagrams};
if(require.main===module)generateDiagrams().catch(e=>{console.error(e);process.exitCode=1;});
