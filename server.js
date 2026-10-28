require('dotenv').config();
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs/promises');
const { timingSafeEqual, createHash, randomUUID } = require('node:crypto');
const { createPurger } = require('./lib/cloudflare');

function createApp(options = {}) {
  const env = options.env || process.env;
  const app = express();
  const staticDir = options.staticDir || path.join(__dirname, 'static');
  const bannerPath = path.join(staticDir, 'img/banner.jpg');
  const siteUrl = base(env.SITE_URL || `http://localhost:${env.PORT || 3000}`);
  const originUrl = base(env.ORIGIN_URL || siteUrl);
  const jsdelivrUrl = env.JSDELIVR_URL ? base(env.JSDELIVR_URL) : '';
  const user = env.ADMIN_USER || 'admin', pass = env.ADMIN_PASS || 'cdnlab-local-demo';
  if (env.NODE_ENV === 'production' && (!env.ADMIN_PASS || pass === 'cdnlab-local-demo' || pass === 'change-me')) throw new Error('Set a unique ADMIN_PASS before production startup.');
  const purger = options.purger || createPurger({ zoneId: env.CF_ZONE_ID, token: env.CF_API_TOKEN });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } });
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); res.set('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '16kb' }));
  const equal = (a, b) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
  function auth(req, res, next) {
    const match = /^Basic ([A-Za-z0-9+/=]+)$/i.exec(req.headers.authorization || '');
    const raw = match ? Buffer.from(match[1], 'base64').toString() : '';
    const at = raw.indexOf(':');
    if (at >= 0 && equal(raw.slice(0, at), user) && equal(raw.slice(at + 1), pass)) return next();
    res.set('WWW-Authenticate', 'Basic realm="CDN Lab Admin", charset="UTF-8"');
    return res.status(401).send('Authentication required');
  }
  app.use(['/admin', '/admin.html', '/api/admin'], auth);
  app.use('/api/admin', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.get('origin');
      const allowed = new Set([siteUrl, originUrl]);
      if (env.NODE_ENV !== 'production') allowed.add(`http://localhost:${env.PORT || 3000}`);
      if ((origin && !allowed.has(origin)) || req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ success: false, message: 'Cross-site admin requests are forbidden.' });
      if (req.get('x-cdn-lab') !== '1') return res.status(403).json({ success: false, message: 'Missing X-CDN-Lab request header.' });
    }
    next();
  });
  app.get('/admin', (req, res) => res.redirect('/admin.html'));
  app.use('/static', express.static(staticDir, { etag: true, lastModified: true, fallthrough: false,
    setHeaders(res) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=2592000');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'CF-Cache-Status, Age, CF-Ray, X-Origin-Served-At, X-CDN-Demo, ETag, Cache-Control');
      res.setHeader('Timing-Allow-Origin', '*');
      res.setHeader('X-Origin-Served-At', new Date().toISOString());
    }
  }));
  app.get('/vendor/chart.js', (req, res) => res.sendFile(require.resolve('chart.js/auto').replace(/auto[\\/]auto.cjs$/, 'dist/chart.umd.js')));
  app.get('/api/config', (req, res) => res.json({ siteUrl, originUrl, jsdelivrUrl, localMode: siteUrl === originUrl, purgeConfigured: Boolean(env.CF_ZONE_ID && env.CF_API_TOKEN) }));
  app.get('/api/info', (req, res) => res.json({ servedAt: new Date().toISOString(), cfRay: req.get('cf-ray') || null, clientCountry: req.get('cf-ipcountry') || null, note: 'Forwarded headers are observational, not proof of authentication.' }));
  app.get('/api/banner-version', async (req, res, next) => {
    try { res.json({ v: createHash('sha256').update(await fs.readFile(bannerPath)).digest('hex').slice(0, 16) }); } catch (e) { next(e); }
  });
  app.post('/api/admin/replace-banner', upload.single('image'), async (req, res, next) => {
    let temp;
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'Select one JPEG image (maximum 5 MB).' });
      const image = sharp(req.file.buffer, { limitInputPixels: 24000000 });
      let meta;
      try { meta = await image.metadata(); } catch { return res.status(400).json({ success: false, message: 'The uploaded file is not a valid image.' }); }
      if (meta.format !== 'jpeg') return res.status(400).json({ success: false, message: 'Only decoded JPEG images are accepted.' });
      const bytes = await image.rotate().jpeg({ quality: 90 }).toBuffer();
      temp = `${bannerPath}.${randomUUID()}.tmp`;
      await fs.writeFile(temp, bytes);
      await fs.rename(temp, bannerPath);
      res.json({ success: true, v: createHash('sha256').update(bytes).digest('hex').slice(0, 16), message: 'Banner replaced at origin. Edge cache has not been purged.' });
    } catch (e) { next(e); } finally { if (temp) await fs.unlink(temp).catch(() => {}); }
  });
  app.post('/api/admin/purge', async (req, res, next) => {
    try {
      const { mode, paths } = req.body || {};
      if (mode === 'everything') return res.json(await purger.purgeEverything());
      if (mode !== 'files' || !Array.isArray(paths) || paths.length < 1 || paths.length > 30) return res.status(400).json({ success: false, message: 'Use files with 1–30 static paths, or everything.' });
      const urls = paths.map(p => {
        if (typeof p !== 'string' || !p.startsWith('/static/') || /[\\#\r\n]/.test(p)) throw Object.assign(new Error('Only /static/ paths are allowed.'), { status: 400 });
        const u = new URL(p, siteUrl);
        if (u.origin !== siteUrl || !u.pathname.startsWith('/static/')) throw Object.assign(new Error('Invalid purge path.'), { status: 400 });
        return u.href;
      });
      res.json(await purger.purgeFiles(urls));
    } catch (e) { next(e); }
  });
  app.use(express.static(path.join(__dirname, 'public'), { etag: false, maxAge: 0 }));
  app.use((req, res) => res.status(404).send('Not found'));
  app.use((err, req, res, next) => {
    const status = err instanceof multer.MulterError ? (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400) : (err.status || 500);
    res.set('Cache-Control', 'no-store');
    res.status(status).json({ success: false, message: status >= 500 && status !== 502 && status !== 503 ? 'Request failed. Check server configuration and assets.' : err.message });
  });
  return app;
}
function base(value) {
  const u = new URL(value);
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw new Error('URLs must be HTTP(S), without credentials, query or fragment.');
  return u.href.replace(/\/$/, '');
}
if (require.main === module) createApp().listen(process.env.PORT || 3000, () => console.log(`CDN Lab: http://localhost:${process.env.PORT || 3000}`));
module.exports = { createApp };
