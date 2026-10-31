const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {createApp}=require('../server');
(async()=>{
 const server=createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 // Rewrite public route URLs to this isolated local server for browser QA only.
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},httpCredentials:{username:'admin',password:'cdnlab-local-demo'}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/config',route=>route.fulfill({json:{siteUrl:base,originUrl:base,jsdelivrUrl:'',localMode:true,purgeConfigured:false}}));
  await fs.mkdir('docs/screenshots',{recursive:true});
  await page.goto(base);await page.locator('#environment').filter({hasText:'CHẾ ĐỘ LOCAL'}).waitFor();await page.screenshot({path:'docs/screenshots/local-home.png',fullPage:true});
  await page.goto(base+'/gallery.html');await page.waitForFunction(()=>document.querySelectorAll('#gallery img').length===30&&[...document.querySelectorAll('#gallery img')].every(i=>i.complete&&i.naturalWidth>0));assert.equal(await page.locator('#gallery img').count(),30);await page.screenshot({path:'docs/screenshots/local-gallery.png',fullPage:true});
  await page.goto(base+'/benchmark.html');await page.locator('#runs').fill('1');await page.locator('#runBtn').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Hoàn tất'),{},{timeout:30000});assert.equal(await page.locator('#results tbody tr').count(),8);assert.match(await page.locator('#status').textContent(),/0 lỗi/);await page.screenshot({path:'docs/screenshots/local-benchmark.png',fullPage:true});
  const downloadPromise=page.waitForEvent('download');await page.locator('#exportBtn').click();const download=await downloadPromise;await download.saveAs('docs/screenshots/local-benchmark.csv');
  await page.goto(base+'/admin.html');await page.locator('#infoOrigin').filter({hasText:'Origin phục vụ'}).waitFor();assert.equal(await page.locator('#purgeUrlBtn').isDisabled(),true);assert.equal(await page.locator('#purgeAllBtn').isDisabled(),true);await page.locator('#versioning').uncheck();await page.waitForFunction(()=>!document.querySelector('#refreshBtn').disabled);await page.screenshot({path:'docs/screenshots/local-admin.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  for(const route of ['/','/gallery.html','/benchmark.html','/admin.html','/how-it-works.html']){
   await page.goto(base+route);assert.equal(await page.locator('html').getAttribute('lang'),'vi');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' must fit mobile viewport');
  }
  await page.goto(base);await page.screenshot({path:'docs/screenshots/local-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('Browser PASS: 30 loaded JPEGs; 8 benchmark rows, 0 errors; CSV download; admin previews and disabled unconfigured purge; mobile width; no JS errors. Screenshots are LOCAL evidence only.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
