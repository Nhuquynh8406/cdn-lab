const ASSETS=['/static/img/photo-01.jpg','/static/img/photo-15.jpg','/static/css/app.css','/static/js/vendor.js'];
let config, chart, controller, samples=[];
const $=id=>document.getElementById(id);
const ready=lab.json('/api/config').then(c=>{ config=c; $('environment').textContent=c.localMode?'CHẾ ĐỘ LOCAL: hai đường tải dùng cùng máy chủ. Không dùng chênh lệch này để kết luận CDN nhanh hơn.':`Origin ${c.originUrl} · Cloudflare ${c.siteUrl}${c.jsdelivrUrl?' · đã cấu hình jsDelivr':''}`; return c; });
ready.catch(e=>{$('environment').textContent=e.message; $('runBtn').disabled=true;});
async function measure(url,signal) {
  performance.clearResourceTimings();
  const start=performance.now();
  const res=await fetch(url,{cache:'no-store',mode:'cors',credentials:'omit',signal});
  const bytes=(await res.arrayBuffer()).byteLength;
  const total=performance.now()-start;
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  await new Promise(resolve=>setTimeout(resolve,0));
  const entry=performance.getEntriesByName(url).filter(e=>e.initiatorType==='fetch').at(-1);
  const ttfb=entry && entry.requestStart>0 && entry.responseStart>=entry.requestStart ? entry.responseStart-entry.requestStart : null;
  return {ttfb,total,bytes,http:res.status,cache:res.headers.get('cf-cache-status')||'Không đọc được',age:res.headers.get('age')||'',ray:res.headers.get('cf-ray')||'',error:''};
}
function render() {
  const groups=new Map();
  for(const s of samples){const key=s.asset+'|'+s.route; if(!groups.has(key)) groups.set(key,[]); groups.get(key).push(s);}
  const tbody=$('results').tBodies[0]; tbody.replaceChildren();
  for(const rows of groups.values()) {
    const valid=rows.filter(s=>!s.error), last=valid.at(-1), tr=document.createElement('tr');
    const statuses=[...new Set(valid.map(s=>s.cache))].join(', ') || 'Thất bại';
    for(const value of [rows[0].asset.split('/').at(-1),rows[0].route,`${valid.length}/${rows.length}`,lab.number(lab.median(valid.map(s=>s.ttfb))),lab.number(lab.median(valid.map(s=>s.total))),statuses,last?.age||'-',last?.ray||'-']){const td=document.createElement('td');td.textContent=value;tr.append(td);} tbody.append(tr);
  }
  if(chart) chart.destroy();
  if(!window.Chart){$('status').textContent+=' Không tải được biểu đồ; dữ liệu vẫn có trong bảng và CSV.';return;}
  const routes=[...new Set(samples.map(s=>s.route))], colors=['#b12f70','#7951ad','#c47b36'];
  chart=new Chart($('chart'),{type:'bar',data:{labels:ASSETS.map(a=>a.split('/').at(-1)),datasets:routes.map((r,i)=>({label:r,backgroundColor:colors[i],data:ASSETS.map(a=>lab.median((groups.get(a+'|'+r)||[]).filter(s=>!s.error).map(s=>s.ttfb)))}))},options:{animation:false,responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,title:{display:true,text:'mili giây'}}}}});
}
$('benchForm').addEventListener('submit',async e=>{
  e.preventDefault(); await ready; samples=[]; controller=new AbortController();
  const runs=Number($('runs').value); if(!Number.isInteger(runs)||runs<1||runs>30)return;
  $('runBtn').disabled=true; $('cancelBtn').disabled=false; $('exportBtn').disabled=true;
  const routes=[['Origin',config.originUrl],['Cloudflare',config.siteUrl]]; if(config.jsdelivrUrl)routes.push(['jsDelivr',config.jsdelivrUrl]);
  const unique=$('mode').value==='unique'; let errors=0;
  try{
    for(const asset of ASSETS)for(let run=1;run<=runs;run++)for(const [route,base] of (run%2?routes:[...routes].reverse())){
      if(controller.signal.aborted)throw new DOMException('Stopped','AbortError');
      const url=base+asset+(unique&&route==='Cloudflare'?`?sample=${crypto.randomUUID()}`:'');
      $('status').textContent=`${asset.split('/').at(-1)} · ${route} · lượt ${run}/${runs}`;
      const common={date:new Date().toISOString(),asset,route,run,url,mode:unique?'unique-query':'repeat-url'};
      try{samples.push({...common,...await measure(url,AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]))});}
      catch(err){if(controller.signal.aborted)throw err;errors++;samples.push({...common,ttfb:null,total:null,bytes:null,http:null,cache:'',age:'',ray:'',error:err.message});}
    }
    $('status').textContent=`Hoàn tất: ${samples.length} lượt thử, ${errors} lỗi. Trung vị giữ các lượt thành công, kể cả lượt đầu.`;
  }catch(err){$('status').textContent=controller.signal.aborted?'Đã dừng. Có thể xem và xuất phần dữ liệu đã đo.':err.message;}
  finally{render();$('runBtn').disabled=false;$('cancelBtn').disabled=true;$('exportBtn').disabled=!samples.length;}
});
$('cancelBtn').onclick=()=>controller?.abort();
$('exportBtn').onclick=()=>{
 const keys=['date','asset','route','run','url','mode','http','ttfb','total','bytes','cache','age','ray','error'];
 const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 const csv=[keys.join(','),...samples.map(s=>keys.map(k=>quote(s[k])).join(','))].join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='cdn-lab-'+Date.now()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
