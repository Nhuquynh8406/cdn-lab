const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const sharp=require('sharp');
const {createApp}=require('../server');
const {createPurger}=require('../lib/cloudflare');

test('origin application: cache boundaries, auth, uploads and purge safety',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cdn-lab-test-'));
 await fs.mkdir(path.join(dir,'img'));
 const jpeg=await sharp({create:{width:64,height:32,channels:3,background:'#228877'}}).jpeg().toBuffer();
 await fs.writeFile(path.join(dir,'img/banner.jpg'),jpeg);
 const calls=[];
 const env={SITE_URL:'http://localhost:3000',ORIGIN_URL:'http://localhost:3000',ADMIN_USER:'admin',ADMIN_PASS:'test:password'};
 const app=createApp({env,staticDir:dir,purger:{async purgeFiles(urls){calls.push(urls);return{success:true};},async purgeEverything(){calls.push('all');return{success:true};}}});
 const server=app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`;
 const headers={Authorization:'Basic '+Buffer.from('admin:test:password').toString('base64'),'X-CDN-Lab':'1'};
 await t.test('admin aliases and API all protected; 401 never stored',async()=>{
  for(const p of ['/admin','/admin.html','/api/admin/purge']){const r=await fetch(base+p);assert.equal(r.status,401);assert.equal(r.headers.get('cache-control'),'no-store');}
  const ok=await fetch(base+'/admin.html',{headers});assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'no-store');
 });
 await t.test('public config does not leak secrets and pages exist',async()=>{
  const r=await fetch(base+'/api/config');const body=await r.text();assert(!body.includes('test:password'));assert(!body.includes('CF_API_TOKEN'));assert.equal(r.headers.get('cache-control'),'no-store');
  for(const p of ['/','/gallery.html','/benchmark.html','/how-it-works.html','/vendor/chart.js'])assert.equal((await fetch(base+p)).status,200,p);
  assert.equal((await fetch(base+'/.env')).status,404);
 });
 await t.test('static CORS, cache lifetime, timing and conditional 304',async()=>{
  const r=await fetch(base+'/static/img/banner.jpg');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'public, max-age=60, s-maxage=2592000');assert.equal(r.headers.get('timing-allow-origin'),'*');assert.equal(r.headers.get('access-control-allow-origin'),'*');assert(r.headers.get('x-origin-served-at'));assert(r.headers.get('access-control-expose-headers').includes('CF-Cache-Status'));
  // Node fetch adds a request no-cache directive for conditional requests; raw HTTP
  // tests the origin validator without silently asking Express to bypass freshness.
  const status=await new Promise((resolve,reject)=>require('node:http').get(base+'/static/img/banner.jpg',{headers:{'If-None-Match':r.headers.get('etag')}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject));assert.equal(status,304);
 });
 await t.test('cross-site writes and missing custom header rejected',async()=>{
  assert.equal((await fetch(base+'/api/admin/purge',{method:'POST',headers:{...headers,Origin:'https://evil.example','Content-Type':'application/json'},body:'{"mode":"everything"}'})).status,403);
  assert.equal((await fetch(base+'/api/admin/purge',{method:'POST',headers:{Authorization:headers.Authorization,'Content-Type':'application/json'},body:'{"mode":"everything"}'})).status,403);
 });
 await t.test('JPEG decode, atomic replacement and content version',async()=>{
  const before=await(await fetch(base+'/api/banner-version')).json();
  const bad=new FormData();bad.set('image',new Blob(['not really a jpeg'],{type:'image/jpeg'}),'fake.jpg');
  assert.equal((await fetch(base+'/api/admin/replace-banner',{method:'POST',headers,body:bad})).status,400);
  const png=new FormData();png.set('image',new Blob([await sharp(jpeg).png().toBuffer()],{type:'image/jpeg'}),'fake.jpg');
  assert.equal((await fetch(base+'/api/admin/replace-banner',{method:'POST',headers,body:png})).status,400);
  const form=new FormData();form.set('image',new Blob([await sharp({create:{width:64,height:32,channels:3,background:'#bb4488'}}).jpeg().toBuffer()],{type:'image/jpeg'}),'new.jpg');
  assert.equal((await fetch(base+'/api/admin/replace-banner',{method:'POST',headers,body:form})).status,200);
  const after=await(await fetch(base+'/api/banner-version')).json();assert.notEqual(after.v,before.v);assert.equal((await sharp(await fs.readFile(path.join(dir,'img/banner.jpg'))).metadata()).format,'jpeg');assert.equal((await fs.readdir(path.join(dir,'img'))).length,1);
 });
 await t.test('purge scope, modes and exact query keys',async()=>{
  const post=body=>fetch(base+'/api/admin/purge',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
  for(const body of [{mode:'invalid'},{mode:'files',paths:[]},{mode:'files',paths:['https://evil.example/a']},{mode:'files',paths:['/static/../../secret']},{mode:'files',paths:['/static/\\evil']}])assert.equal((await post(body)).status,400);
  assert.equal((await post({mode:'files',paths:['/static/img/banner.jpg?v=abc']})).status,200);assert.deepEqual(calls.at(-1),['http://localhost:3000/static/img/banner.jpg?v=abc']);
  assert.equal((await post({mode:'everything'})).status,200);assert.equal(calls.at(-1),'all');
 });
});

test('Cloudflare transport validates acknowledgement and payload',async()=>{
 const calls=[];const purger=createPurger({zoneId:'zone',token:'secret',fetchImpl:async(url,options)=>{calls.push({url,options});return{ok:true,status:200,json:async()=>({success:true,result:{id:'id'}})};}});
 assert.equal((await purger.purgeFiles(['https://www.example.org/static/a.jpg'])).success,true);assert.deepEqual(JSON.parse(calls[0].options.body),{files:['https://www.example.org/static/a.jpg']});assert.equal(calls[0].options.headers.Authorization,'Bearer secret');
 await purger.purgeEverything();assert.deepEqual(JSON.parse(calls[1].options.body),{purge_everything:true});
 await assert.rejects(createPurger({}).purgeEverything(),e=>e.status===503);
 for(const [ok,status,body] of [[false,403,{success:false}],[true,200,{success:false}]])await assert.rejects(createPurger({zoneId:'z',token:'t',fetchImpl:async()=>({ok,status,json:async()=>body})}).purgeEverything(),e=>e.status===502);
 await assert.rejects(createPurger({zoneId:'z',token:'t',fetchImpl:async()=>({ok:true,status:200,json:async()=>{throw new Error();}})}).purgeEverything(),e=>e.status===502);
});
