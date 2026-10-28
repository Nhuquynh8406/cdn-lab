# TV2 English narration and recording cues

Rehearse against the real deployed site. Suggested delivery: 115–130 words/minute, with pauses for actions. Keep the team's total video under 20 minutes. Replace spoken URLs and names with real details; never read placeholders aloud.

## 04:00–06:30 · Caching and invalidation

“I will explain the two cache layers in our experiment. The browser has a private cache, and the CDN operates a shared cache at the edge. A fast page load is not enough to prove an edge cache hit, because the browser might have reused a local copy. That is why our lab makes a new network request and displays the response headers.

For public static assets, our origin sends Cache-Control with max-age of sixty seconds and s-maxage of thirty days. The first value controls browser freshness; the second applies to shared caches. Our HTML, API and admin responses use no-store. Also, no-cache and no-store are different: no-cache requires validation before reuse, whereas no-store prohibits storage.

A cache key identifies a stored representation. In our configuration, changing the hostname, path or query can select a different key. This matters for the versioning experiment. If the CDN ignores the query string, adding a version parameter will not create the separation we expect.

Cloudflare reports states such as HIT and MISS. HIT means a cached response was used. MISS means the requested entry was not available for normal reuse and the CDN needed an upstream response. We also display Age and the timestamp attached by our origin. These are observations about individual responses, not a promise that all edge locations have the same copy.

There are three main strategies for refreshing content. We can wait for the freshness lifetime to expire. We can actively purge a stable URL. Or we can publish a new versioned URL. Waiting is simple but allows a stale interval. Purging requires an authenticated operation and verification after propagation. Versioned filenames work well for static releases, provided that old assets are retained. Our demo uses a query hash for clarity, and we document that it is not a complete immutable asset archive.”

Show: header table, HIT/MISS diagrams and strategy comparison. Pause briefly between strategies.

## 10:30–14:30 · Application demo

“This is our gallery. It loads thirty JPEG files using relative static paths. I will open the same page through the direct origin and through the proxied hostname. The resource selection stays the same; the delivery route changes. We will compare performance using recorded measurements rather than judging by appearance alone.”

Action: open both real hosts. Show `curl.exe -I` on Windows or `curl -I` on Linux. Point to the actual headers; do not predict a HIT if the response says otherwise.

“Here is the benchmark. I select five runs per asset and start the experiment. Each request consumes the complete body. We record request TTFB from Resource Timing and a separate total duration. The TTFB shown here excludes earlier DNS and connection setup. Missing cross-origin timing is displayed as unavailable. The table also keeps the actual cache states, and the raw CSV preserves every attempt, including errors and the first request.”

Action: run or show a completed real session while explaining. Mention network and time. If waiting would exceed the recording budget, use three runs and explain that TV3's formal measurements use its stated protocol. Export the raw CSV.

“Now I will show the invalidation problem. I have authenticated as administrator. First, I reload the previews to warm the stable banner URL. These panels represent direct origin, the unchanged CDN URL, and a versioned CDN URL. I am checking the actual response before continuing.”

Action: reload until the real unchanged URL is confirmed cached. If it never hits, stop the take and resolve the rules before claiming stale behavior.

“I upload the second banner. This changes the file at origin; it does not automatically purge the edge. Here we can compare the direct source with the unchanged cached URL. The versioned panel appends a hash of the current banner content. It can request a different key because our CDN configuration preserves the query string. Turning the checkbox off makes that panel use the unchanged URL again.”

Action: upload banner-b.jpg, read observed headers, toggle versioning, restore it.

“Next, I purge only the stable banner URL. The browser calls our protected backend, and the backend calls the Cloudflare API. The token stays on the server. A successful acknowledgement is followed by another real preview request. We inspect what the edge actually returns, and reload again to observe the next cache state. Purge Everything is separate because it affects all cached objects in the zone.

In the implementation, static cache headers are set at one middleware boundary. Administrative operations require authentication and a custom request header. Uploaded images are decoded as JPEGs before replacement, and the banner is written atomically. The purge helper checks both the HTTP response and the provider success flag.

Finally, this blocked path demonstrates TV1's WAF rule. We compare the edge response with the direct origin response. Our origin also refuses to serve hidden configuration files.”

Action: show `/.env` status on actual hosts without opening or displaying any real .env contents. Open only short relevant snippets in server.js and lib/cloudflare.js, never the private environment file.

## Closing contribution · 20–25 seconds

“My main lesson is that updating an origin file and refreshing a distributed cache are separate operations. A useful demo must also distinguish browser caching from edge caching and make missing evidence visible. Our next improvement would use immutable fingerprinted files with retained versions and a more controlled measurement protocol.”

## Recording and edit instructions

Use the shared 20-slide deck. TV1 covers 00:00–04:00 and 08:30–10:30; TV3 covers 06:30–08:30 and 14:30–17:00. Each speaker supplies their own camera/audio clip or records together in Meet. Leave time for the conclusion and avoid exceeding 20 minutes. These are target intervals, not a claim that an actual video exists.

In OBS capture 1920×1080 and a legible browser zoom. Record a ten-second microphone test. Keep tokens and password manager windows off-screen. In CapCut trim silence without removing evidence needed to understand an operation; add the real speaker's name as a lower third; keep the cache header zoom readable; normalize speech volume; export MP4/H.264 at 1080p. Watch the full export and check that all three students appear and speak, then test the sharing link in an incognito window. Retain an uncut original of the cache experiment as evidence.
