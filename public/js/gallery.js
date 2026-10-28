const gallery = document.getElementById('gallery');
for (let i=1;i<=30;i++) {
  const figure = document.createElement('figure'), img = document.createElement('img'), caption = document.createElement('figcaption');
  const id = String(i).padStart(2,'0'); img.src = `/static/img/photo-${id}.jpg`; img.alt = `Synthetic landscape texture ${id}`; img.width=1200; img.height=800; img.loading='eager'; caption.textContent=`ASSET ${id} / photo-${id}.jpg`; figure.append(img,caption); gallery.append(figure);
}
lab.json('/api/config').then(c => { for (const [label,url] of [['Open origin',c.originUrl],['Open Cloudflare',c.siteUrl]]) { const a=document.createElement('a'); a.className='button secondary'; a.href=url+'/gallery.html'; a.textContent=label+' ↗'; document.getElementById('routes').append(a); } }).catch(console.error);
