const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require('sharp');
async function texture(seed, banner=false){
 const width=banner?1200:1200,height=banner?600:800, raw=Buffer.alloc(width*height*3);
 let state=seed*98731+17;const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const wave=Math.sin(x/145+seed)*65+height*.42, ground=y>wave;
  const noise=(rand()-.5)*110, i=(y*width+x)*3;
  const color=ground?[65+seed*3,105+seed,85+seed*2]:[160+seed*2,184+seed,173+seed];
  for(let c=0;c<3;c++)raw[i+c]=Math.max(0,Math.min(255,color[c]+noise+Math.sin(x/210+y/155+seed)*20));
 }
 for(const quality of [88,91,94,97,99]){
  const result=await sharp(raw,{raw:{width,height,channels:3}}).jpeg({quality,chromaSubsampling:'4:2:0'}).toBuffer();
  if(result.length>=300*1024&&result.length<=600*1024 || banner)return result;
 }
 throw new Error('Could not meet asset size bounds');
}
(async()=>{
 await fs.mkdir('static/img',{recursive:true});await fs.mkdir('static/js',{recursive:true});await fs.mkdir('docs/demo-assets',{recursive:true});
 const manifest=[];
 for(let i=1;i<=30;i++){const name=`photo-${String(i).padStart(2,'0')}.jpg`,buf=await texture(i);await fs.writeFile(path.join('static/img',name),buf);manifest.push({name,bytes:buf.length,source:'Locally generated synthetic texture; tools/prepare-assets.js'});}
 for(const [name,seed] of [['banner-a.jpg',3],['banner-b.jpg',27]])await fs.writeFile(path.join('docs/demo-assets',name),await texture(seed,true));
 try{await fs.access('static/img/banner.jpg');}catch{await fs.copyFile('docs/demo-assets/banner-a.jpg','static/img/banner.jpg');}
 await fs.copyFile(require.resolve('lodash/lodash.js'),'static/js/vendor.js');
 await fs.copyFile(require.resolve('lodash/LICENSE'),'static/js/vendor.LICENSE.txt');
 await fs.writeFile('static/asset-manifest.json',JSON.stringify(manifest,null,2));
 console.log(`Prepared ${manifest.length} JPEGs (${Math.min(...manifest.map(x=>x.bytes))}–${Math.max(...manifest.map(x=>x.bytes))} bytes), two demo banners and lodash payload.`);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
