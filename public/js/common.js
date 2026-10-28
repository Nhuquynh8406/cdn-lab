window.lab = {
  async json(url, options = {}) {
    const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...options });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  },
  median(values) { const s = values.filter(Number.isFinite).sort((a,b) => a-b); if (!s.length) return null; const m = Math.floor(s.length/2); return s.length % 2 ? s[m] : (s[m-1]+s[m])/2; },
  number(value) { return Number.isFinite(value) ? value.toFixed(1) : 'N/A'; }
};
document.querySelectorAll('nav a').forEach(a => { if (new URL(a.href).pathname === location.pathname) a.setAttribute('aria-current', 'page'); });
