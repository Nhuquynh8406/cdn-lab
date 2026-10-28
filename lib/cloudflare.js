const API = 'https://api.cloudflare.com/client/v4';
function createPurger({ zoneId, token, fetchImpl = fetch }) {
  async function call(body) {
    if (!zoneId || !token) throw Object.assign(new Error('Cloudflare is not configured. Ask TV1 to set CF_ZONE_ID and CF_API_TOKEN.'), { status: 503 });
    const response = await fetchImpl(`${API}/zones/${zoneId}/purge_cache`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000)
    });
    let data;
    try { data = await response.json(); } catch { throw Object.assign(new Error('Cloudflare returned an invalid response.'), { status: 502 }); }
    if (!response.ok || data.success !== true) throw Object.assign(new Error(`Cloudflare refused the purge (HTTP ${response.status}). Check token permissions, zone and rate limits.`), { status: 502 });
    return { success: true, id: data.result?.id || null };
  }
  return { purgeFiles: files => call({ files }), purgeEverything: () => call({ purge_everything: true }) };
}
module.exports = { createPurger };
