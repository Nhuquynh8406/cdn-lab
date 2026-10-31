const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
(async()=>{
 const lines=(await fs.readFile('docs/TV2-report.md','utf8')).split(/\r?\n/);let body='';
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line)continue;
  if(line.startsWith('|')){let first=true;body+='<table>';while(i<lines.length&&lines[i].trim().startsWith('|')){const cells=lines[i].trim().slice(1,-1).split('|').map(x=>x.trim());if(!cells.every(x=>/^[-: ]+$/.test(x))){body+='<tr>'+cells.map(x=>`<${first?'th':'td'}>${esc(x)}</${first?'th':'td'}>`).join('')+'</tr>';first=false;}i++;}i--;body+='</table>';continue;}
  const match=/^(#{1,3}) (.+)$/.exec(line);body+=match?`<h${match[1].length}>${esc(match[2])}</h${match[1].length}>`:`<p>${esc(line)}</p>`;
 }
 body+='<h2>Design diagrams and local implementation evidence</h2><p>These screenshots show local operation only. They do not establish CDN cache behavior or production speedup.</p>';
 for(const file of ['diagrams/use-case.png','diagrams/miss.png','diagrams/hit.png','diagrams/purge.png','screenshots/local-home.png','screenshots/local-benchmark.png','screenshots/local-admin.png']){const data=await fs.readFile('docs/'+file);body+=`<figure><img src="data:image/png;base64,${data.toString('base64')}"><figcaption>${esc(file)} - design diagram or explicitly local evidence.</figcaption></figure>`;}
 const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>TV2 Report Contribution</title><style>body{font:12pt/1.5 'Times New Roman',serif;color:#172f2e}h1{font-size:24pt}h2{font-size:17pt;margin-top:24pt;break-after:avoid}h3{font-size:13pt;break-after:avoid}p{orphans:3;widows:3}table{width:100%;border-collapse:collapse;font-size:10pt;margin:14pt 0}th,td{border:1px solid #c6d2c8;padding:7pt;vertical-align:top}th{background:#e6edcf}tr{break-inside:avoid}figure{margin:20pt 0;break-inside:avoid}img{max-width:100%;max-height:220mm;object-fit:contain}figcaption{font-size:10pt;font-style:italic}a,p{overflow-wrap:anywhere}</style>${body}</html>`;
 await fs.writeFile('deliverables/TV2_Report.html',html);
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{const page=await browser.newPage();await page.setContent(html,{waitUntil:'load'});await page.pdf({path:'deliverables/TV2_Report.pdf',format:'A4',printBackground:true,margin:{top:'22mm',bottom:'22mm',left:'25mm',right:'22mm'},displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-size:9px;text-align:center;width:100%">TV2 contribution · <span class="pageNumber"></span> / <span class="totalPages"></span></div>'});console.log('PDF created from the same report content via print layout; pagination differs from Word.');}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
