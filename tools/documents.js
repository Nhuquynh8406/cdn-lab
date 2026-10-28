const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require('sharp');
const {Document,Packer,Paragraph,TextRun,HeadingLevel,Table,TableRow,TableCell,WidthType,ImageRun,Footer,PageNumber,AlignmentType}=require('docx');
const pptxgen=require('pptxgenjs');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

async function sequence(name,title,actors,events){
 const w=1200,h=160+events.length*82, xs=actors.map((_,i)=>100+i*(1000/(actors.length-1)));
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0 L10 4 L0 8 Z" fill="#187e78"/></marker></defs><rect width="1200" height="${h}" fill="#fffef8"/><text x="40" y="35" font-family="Arial" font-size="24" font-weight="bold" fill="#183d3b">${escape(title)}</text>`;
 actors.forEach((actor,i)=>{svg+=`<rect x="${xs[i]-87}" y="60" width="174" height="48" rx="6" fill="#183d3b"/><text x="${xs[i]}" y="89" text-anchor="middle" font-family="Arial" font-size="16" fill="white">${escape(actor)}</text><line x1="${xs[i]}" y1="108" x2="${xs[i]}" y2="${h-20}" stroke="#a1b8ab" stroke-dasharray="7 6"/>`;});
 events.forEach(([from,to,label],i)=>{const y=158+i*82;if(from===to){svg+=`<rect x="${xs[from]-85}" y="${y-25}" width="170" height="45" rx="5" fill="#e6edcf"/><text x="${xs[from]}" y="${y+2}" text-anchor="middle" font-family="Arial" font-size="13" fill="#183d3b">${escape(label)}</text>`;}else{svg+=`<line x1="${xs[from]}" y1="${y}" x2="${xs[to]}" y2="${y}" stroke="#187e78" stroke-width="2" marker-end="url(#arrow)"/><text x="${(xs[from]+xs[to])/2}" y="${y-12}" text-anchor="middle" font-family="Arial" font-size="15" fill="#183d3b">${escape(label)}</text>`;}});
 svg+='</svg>';await fs.writeFile(`docs/diagrams/${name}.svg`,svg);await sharp(Buffer.from(svg)).png().toFile(`docs/diagrams/${name}.png`);
}
async function diagrams(){
 await sequence('miss','Cache MISS — simple eligible one-tier response',['Browser','Cloudflare Edge','Express Origin'],[[0,1,'GET /static/img/banner.jpg'],[1,1,'No reusable entry'],[1,2,'Fetch from origin'],[2,1,'200 JPEG + cache policy'],[1,1,'Store if eligible'],[1,0,'Response + observed status']]);
 await sequence('hit','Cache HIT — reuse a fresh edge response',['Browser','Cloudflare Edge','Express Origin'],[[0,1,'GET unchanged asset URL'],[1,1,'Fresh matching entry'],[1,0,'Cached JPEG + HIT + Age'],[2,2,'No origin request']]);
 await sequence('purge','Origin replacement and explicit cache invalidation',['Admin Browser','Express App','Origin Disk','Purge API'],[[0,1,'Authenticated JPEG upload'],[1,2,'Decode, write temp, rename'],[1,0,'Updated hash; no purge yet'],[0,1,'POST exact URL purge'],[1,3,'Zone-scoped purge request'],[3,1,'Success or failure'],[1,0,'Checked acknowledgement'],[0,0,'Reload; inspect edge']]);
 const nodes=[['Visitor',80,180],['Administrator',80,400],['Gallery + guide',480,120],['Benchmark + CSV',480,250],['Auth + image upload',480,380],['Auth + purge',480,510],['Cloudflare API',950,510]];
 let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="680"><rect width="1200" height="680" fill="#fffef8"/><text x="40" y="50" font-family="Arial" font-size="28" fill="#183d3b">CDN Lab — actors and use cases</text><rect x="390" y="80" width="400" height="540" rx="15" fill="#e6edcf"/>';
 for(const [a,b] of [[0,2],[0,3],[1,4],[1,5],[5,6]]){const [,x,y]=nodes[a],[,u,v]=nodes[b];svg+=`<line x1="${x+90}" y1="${y+30}" x2="${u}" y2="${v+30}" stroke="#187e78" stroke-width="3"/>`;}
 for(const [label,x,y] of nodes)svg+=`<rect x="${x}" y="${y}" width="190" height="60" rx="20" fill="#183d3b"/><text x="${x+95}" y="${y+36}" text-anchor="middle" font-family="Arial" font-size="17" fill="white">${escape(label)}</text>`;
 svg+='</svg>';await fs.writeFile('docs/diagrams/use-case.svg',svg);await sharp(Buffer.from(svg)).png().toFile('docs/diagrams/use-case.png');
}
function paragraph(text,options={}){return new Paragraph({children:[new TextRun({text,...(options.run||{})})],spacing:{after:150,line:300},...options});}
async function report(){
 const source=await fs.readFile('docs/TV2-report.md','utf8'),lines=source.split(/\r?\n/),children=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line)continue;
  if(line.startsWith('|')){
   const rows=[];while(i<lines.length&&lines[i].trim().startsWith('|')){const cells=lines[i].trim().slice(1,-1).split('|').map(s=>s.trim());if(!cells.every(s=>/^[-: ]+$/.test(s)))rows.push(new TableRow({tableHeader:rows.length===0,children:cells.map(s=>new TableCell({children:[paragraph(s,{run:{size:19}})],shading:rows.length===0?{fill:'E5EDD6'}:undefined}))}));i++;}i--;
   children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows}));children.push(paragraph(''));continue;
  }
  const heading=/^(#{1,3}) (.+)$/.exec(line);
  children.push(heading?paragraph(heading[2],{heading:[HeadingLevel.TITLE,HeadingLevel.HEADING_1,HeadingLevel.HEADING_2][heading[1].length-1]}):paragraph(line));
 }
 children.push(paragraph('Design diagrams',{heading:HeadingLevel.HEADING_1}));
 for(const [name,caption] of [['use-case','Figure A. Public and administrative use cases.'],['miss','Figure B. Cache MISS under a simple one-tier eligible response.'],['hit','Figure C. A fresh edge HIT avoids an origin request.'],['purge','Figure D. Origin upload and server-side purge acknowledgement.']]){
  const data=await fs.readFile(`docs/diagrams/${name}.png`),meta=await sharp(data).metadata();
  children.push(new Paragraph({children:[new ImageRun({data,type:'png',transformation:{width:600,height:Math.round(600*meta.height/meta.width)}})]}));children.push(paragraph(caption,{run:{italics:true,size:20}}));
 }
 children.push(paragraph('Local application screenshots',{heading:HeadingLevel.HEADING_1}));
 children.push(paragraph('These captures show an isolated local test server, not a real Cloudflare deployment. Timing values are local observations and must not be used as the production performance comparison.'));
 for(const name of ['home','benchmark','admin']){try{const data=await fs.readFile(`docs/screenshots/local-${name}.png`),meta=await sharp(data).metadata(),height=Math.min(650,600*meta.height/meta.width),width=height*meta.width/meta.height;children.push(new Paragraph({children:[new ImageRun({data,type:'png',transformation:{width:Math.round(width),height:Math.round(height)}})]}));children.push(paragraph(`Local screenshot: ${name}. No edge-cache verification is implied.`,{run:{italics:true,size:20}}));}catch(e){if(e.code!=='ENOENT')throw e;}}
 const doc=new Document({creator:'CDN Lab – TV2 contribution',title:'CDN Lab – TV2 Report Contribution',styles:{default:{document:{run:{font:'Times New Roman',size:24},paragraph:{spacing:{after:150,line:300}}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1417,right:1134}}},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun('TV2 contribution · '),new TextRun({children:[PageNumber.CURRENT]})]})]})},children}]});
 await fs.writeFile('deliverables/TV2_Report.docx',await Packer.toBuffer(doc));
}
const slides=[
 ['CDN Lab','Content Delivery Networks',['One payload. Three delivery paths.','Origin · Cloudflare · jsDelivr','Web Programming and Applications (503073)'],'TV1 opens. Add actual team names and IDs before submission.'],
 ['Why a CDN?','Distance, repetition and freshness',['Long routes add network delay.','Repeated public assets can be reused near users.','Updates must reach clients predictably.'],'TV1: explain scope; avoid promising a measured speedup before showing results.'],
 ['The request journey','Origin → edge → browser',['Origin holds the source representation.','A PoP hosts edge delivery infrastructure.','An eligible cached response can avoid an origin fetch.'],'TV1: tie this overview to the real deployment diagram.'],
 ['Routing and TLS','Getting requests to the edge',['DNS resolution and Anycast help route requests.','Edge TLS and origin TLS are separate connections.','Full (strict) checks the origin certificate.'],'TV1: supply deployment-specific explanation and certificate evidence.'],
 ['Our experiment','Same static bytes, different routes',['Direct origin hostname on the VM.','Proxied hostname through Cloudflare.','Optional pinned public release through jsDelivr.'],'TV1: insert real hostnames; TV3 verifies identical assets.'],
 ['Two cache layers','Browser storage ≠ CDN storage',['Private cache belongs to the browser.','Shared edge cache can serve many clients.','Static policy: max-age=60; s-maxage=2592000.'],'TV2 04:00: explain public, no-cache versus no-store. Reference RFC 9111 and MDN.'],
 ['Keys and states','Read the actual response',['Host, path and query distinguish the lab keys.','HIT / MISS / EXPIRED / BYPASS / DYNAMIC.','Age and origin timestamps add context.'],'TV2: queries must remain in the configured key. Missing headers are not proof of no CDN.'],
 ['MISS versus HIT','A reusable response changes the path',['MISS: request travels upstream.','HIT: fresh stored response is returned.','Observe status; use origin logs to prove offload.'],'TV2: diagrams are design illustrations, not live evidence.','hit'],
 ['Three update strategies','TTL · purge · versioning',['TTL: simple, with an allowed stale interval.','Purge: invalidate a stable URL on demand.','Versioning: publish a different key; retain old assets.'],'TV2: explain query hash limitation and production fingerprinted filenames.'],
 ['Benefits and limits','Performance needs evidence',['Potentially lower latency and origin bandwidth.','Availability, scaling and security capabilities.','Stale content, dependencies and configuration risks.'],'TV3 06:30: substantiate claims with references and actual measurements.'],
 ['Two CDN models','Cloudflare and jsDelivr',['Cloudflare proxies the project hostname.','jsDelivr serves a pinned public repository release.','Control and invalidation workflows differ.'],'TV3: add researched comparison; do not claim identical control features.'],
 ['Deployment policy','Cache public assets; bypass private operations',['www /static/: eligible for caching.','/api/ and /admin: bypass; HTML stays no-store.','TV1: DNS, TLS, transform and WAF evidence.'],'TV1 08:30: show actual dashboard screenshots and token permission scope.'],
 ['The application','Load → measure → invalidate',['Gallery: 30 JPEGs over relative static paths.','Benchmark: four sample assets and raw CSV.','Admin: controlled origin replacement and purge.'],'TV2 10:30: switch to real website; show gallery over both hosts.'],
 ['Measure honestly','Real samples, visible uncertainty',['TTFB: responseStart minus requestStart.','Total: fetch until full body consumption.','N/A for blocked timing; keep errors and run 1.'],'TV2: run 3–5 samples during recording, export CSV. Distinguish request TTFB from curl time_starttransfer.'],
 ['Live invalidation','Warm → replace → compare → purge',['Confirm the unchanged URL is actually HIT.','Upload banner B; inspect all three panels.','Purge stable URL; reload and read actual state.'],'TV2: do not continue a failed stale experiment as if it succeeded.','purge'],
 ['Inside the implementation','Boundaries that make the demo reliable',['Basic Auth and cross-site write checks.','Decoded JPEG validation and atomic replacement.','Server-only token; checked purge acknowledgement.'],'TV2: show short relevant snippets; never show .env or API token.'],
 ['Performance results','TV3 — insert measured chart',['Required: origin / CDN MISS / CDN HIT / jsDelivr.','State network, location, time window and sample count.','Insert CSV-backed medians, not illustrative values.'],'TV3 14:30: this slide intentionally contains no fabricated chart. Replace with actual evidence.'],
 ['Evaluate the whole page','TV3 — add real evaluation evidence',['Lighthouse LCP and full gallery transfer.','Light controlled load and origin request logs.','Origin offload = 1 − origin requests / total requests.'],'TV3: state denominator and uncertainty; add actual outputs and Cloudflare Analytics.'],
 ['Limits and next steps','Keep claims within the evidence',['Local tests do not verify edge propagation.','Query versions are not immutable archived files.','Next: fingerprinted assets and controlled repetitions.'],'All: explain an actual difficulty each member encountered and resolved.'],
 ['What we learned','Measure the route. Verify freshness.',['TV1: infrastructure and delivery policy.','TV2: application, cache boundaries and invalidation.','TV3: reproducible measurement and comparison.'],'All 17:00: add verified demo/repository/video links and real names.']
];
async function deck(){
 const pptx=new pptxgen();pptx.layout='LAYOUT_WIDE';pptx.author='CDN Lab – TV2';pptx.subject='Shared presentation; real results to be supplied by TV3';pptx.title='CDN Lab – Content Delivery Networks';pptx.lang='en-US';pptx.theme={headFontFace:'Aptos Display',bodyFontFace:'Aptos',lang:'en-US'};
 for(let i=0;i<slides.length;i++){
  const [title,sub,bullets,notes,image]=slides[i],s=pptx.addSlide();s.background={color:'F5F4EC'};
  s.addText('CDN / LAB',{x:.65,y:.35,w:5,h:.3,fontSize:13,bold:true,color:'187E78',charSpacing:3});
  s.addText(String(i+1).padStart(2,'0')+' / 20',{x:11.5,y:.35,w:1.1,h:.3,fontSize:11,color:'637772',align:'right'});
  s.addText(title,{x:.65,y:1,w:12,h:.7,fontSize:36,bold:true,color:'183D3B',margin:0});
  s.addText(sub,{x:.65,y:1.9,w:12,h:.55,fontSize:21,color:'187E78',margin:0});
  const hasImage=Boolean(image);
  bullets.forEach((text,j)=>{s.addText('0'+(j+1),{x:.7,y:2.9+j*1.03,w:.5,h:.4,fontSize:13,color:'187E78'});s.addText(text,{x:1.35,y:2.85+j*1.03,w:hasImage?4.4:10.5,h:.8,fontSize:hasImage?19:24,color:'183D3B',margin:0,breakLine:false});});
  if(image){const file=path.resolve(`docs/diagrams/${image}.png`),meta=await sharp(file).metadata(),scale=Math.min(6.45/meta.width,3.7/meta.height),w=meta.width*scale,h=meta.height*scale;s.addImage({path:file,x:6.15+(6.45-w)/2,y:2.65+(3.7-h)/2,w,h});}
  s.addText('503073 · CONTENT DELIVERY NETWORKS',{x:.65,y:7,w:8,h:.2,fontSize:9,color:'637772',charSpacing:1});s.addNotes(notes);
 }
 await pptx.writeFile({fileName:'deliverables/CDN_Lab_Slides.pptx'});
}
(async()=>{await fs.mkdir('deliverables',{recursive:true});await fs.mkdir('docs/diagrams',{recursive:true});await diagrams();await report();await deck();console.log('Created Word report, 20-slide PowerPoint and four SVG/PNG diagrams.');})().catch(e=>{console.error(e);process.exitCode=1;});
