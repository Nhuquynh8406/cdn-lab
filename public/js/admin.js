let config, busy=false;
const objectUrls=new Map(), $=id=>document.getElementById(id);
function log(message){$('log').textContent=`[${new Date().toLocaleTimeString()}] ${message}\n`+$('log').textContent;}
function lock(value){busy=value;document.querySelectorAll('button,input').forEach(el=>el.disabled=value);if(!value&&config&&!config.purgeConfigured){$('purgeUrlBtn').disabled=true;$('purgeAllBtn').disabled=true;}}
async function preview(imgId,infoId,url){
 try{
  const res=await fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw new Error(`HTTP ${res.status}`);
  const blob=await res.blob(),objectUrl=URL.createObjectURL(blob);
  const old=objectUrls.get(imgId);$(imgId).src=objectUrl;objectUrls.set(imgId,objectUrl);if(old)URL.revokeObjectURL(old);
  $(infoId).textContent=`${res.headers.get('cf-cache-status')||'Cache status not exposed'} · Age ${res.headers.get('age')||'—'} · Ray ${res.headers.get('cf-ray')||'—'} · Origin served ${res.headers.get('x-origin-served-at')||'—'} · ${url}`;
 }catch(e){$(infoId).textContent='Preview failed: '+e.message;log(e.message);}
}
async function refresh(){
 const {v}=await lab.json('/api/banner-version');
 await Promise.all([preview('imgOrigin','infoOrigin',config.originUrl+'/static/img/banner.jpg'),preview('imgCdn','infoCdn',config.siteUrl+'/static/img/banner.jpg'),preview('imgVersioned','infoVersioned',config.siteUrl+'/static/img/banner.jpg'+($('versioning').checked?'?v='+v:''))]);
 log('Previews loaded. Version '+v+'.');
}
async function action(fn){if(busy)return;lock(true);try{await fn();}catch(e){log('ERROR: '+e.message);}finally{lock(false);}}
async function purge(mode){
 if(mode==='everything'&&!window.confirm('Purge every cached asset in this Cloudflare zone?'))return;
 await action(async()=>{await lab.json('/api/admin/purge',{method:'POST',headers:{'Content-Type':'application/json','X-CDN-Lab':'1'},body:JSON.stringify({mode,paths:['/static/img/banner.jpg']})});log('Purge accepted by Cloudflare. Inspect previews; repeat reload if propagation is pending.');await new Promise(r=>setTimeout(r,2000));await refresh();});
}
$('uploadForm').onsubmit=e=>{e.preventDefault();const form=new FormData(e.target);action(async()=>{const data=await lab.json('/api/admin/replace-banner',{method:'POST',headers:{'X-CDN-Lab':'1'},body:form});log(data.message);await refresh();});};
$('refreshBtn').onclick=()=>action(refresh);$('versioning').onchange=()=>action(refresh);$('purgeUrlBtn').onclick=()=>purge('files');$('purgeAllBtn').onclick=()=>purge('everything');
window.addEventListener('pagehide',()=>objectUrls.forEach(URL.revokeObjectURL));
action(async()=>{config=await lab.json('/api/config');$('environment').textContent=(config.localMode?'LOCAL MODE — no edge cache is present. All panels show origin content. ':'LIVE ROUTES — inspect headers to verify cache behavior. ')+(config.purgeConfigured?'Purge credentials configured.':'Purge disabled: TV1 must configure Cloudflare credentials.');await refresh();});
