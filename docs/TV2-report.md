# CDN Lab — TV2 report contribution

Web Programming and Applications (503073) · Topic 8: Content Delivery Networks

This contribution covers Sections 2.4–2.5, application analysis and sequence diagrams in Chapter 4, and the application portion of Chapter 5. It describes the accompanying implementation. It does not claim deployment, measured CDN gains, student identities or screenshots that have not been supplied. Merge it into the Faculty template and renumber figures, tables and references with the whole report. The final checklist in the source plan requests English, although earlier paragraphs request Vietnamese; English is used here pending the lecturer's authoritative requirement.

## 2.4 HTTP Caching

### 2.4.1 Private and shared caches

Caching reuses a stored HTTP response when the applicable rules permit it. In CDN Lab, two independently managed layers matter: the browser's private cache and the CDN's shared cache. A browser can reuse a local response without making a network request, whereas a CDN HIT is a response returned by the shared edge layer. Consequently, a fast image load alone does not establish that Cloudflare served the request. Our experiment deliberately fetches public assets with browser storage bypassed and reads the actual response metadata. The implementation does not synthesize CF-Cache-Status or Age.

RFC 9111 defines the common HTTP cache model [1]. Origin response directives express storage and freshness policy, while CDN configuration determines how the provider applies its rules. In this project, HTML, API and administrative responses receive no-store; only the public static directory is intended for long shared caching. This separation follows the application's data boundaries: a JPEG is public and reusable, while a configuration response or an authenticated operation must not become a shared response for another visitor.

### 2.4.2 Storage and freshness directives

Freshness describes how long a stored response can normally be reused without contacting the origin. It is different from retention: a provider can evict an object before its freshness lifetime ends. Conversely, an expired object can remain stored and be validated before reuse. Our static response uses public, max-age=60, s-maxage=2592000. The short browser lifetime helps ordinary page reloads, while the long shared lifetime makes stale edge content observable after an origin update. The 30-day value is an experiment setting rather than a universal production recommendation.

Table 2.4-1. Response directives and application consequences.

| Directive | Meaning | Consequence for CDN Lab |
| --- | --- | --- |
| public | Explicitly permits shared caching, subject to other rules | Suitable only for public assets |
| private | Restricts storage to private caches | Appropriate for personal representations, not shared assets |
| max-age=N | Freshness lifetime in seconds | Static browser freshness is 60 seconds |
| s-maxage=N | Shared-cache freshness overriding max-age for shared caches | Shared static freshness is 2,592,000 seconds |
| no-cache | Reuse requires successful validation | Does not mean storage is prohibited |
| no-store | Storage is prohibited by this directive | Used on app pages, API responses and authentication errors |

The server supplies these directives; a separately configured Edge TTL may override the origin lifetime. TV1 must therefore document both the origin response and the active Cloudflare rules. An observed HIT is evidence about a particular request, not proof that every object is stored at every edge. Browser-side cache: no-store in a Fetch request controls browser storage behavior; it must not be confused with a response directive or presented as a guarantee about an intermediary [1], [2].

### 2.4.3 Validators and conditional requests

Validation checks whether a stored representation remains current. ETag and Last-Modified are validators; the client can send If-None-Match or If-Modified-Since. A 304 Not Modified response avoids retransmitting the representation body and updates the reusable response's metadata as appropriate. Validation is distinct from a fresh cache hit, because it requires a request to an upstream validator.

Express static middleware supplies weak ETags and last-modified timestamps in this implementation. These ETags are derived from file metadata and must not be described as cryptographic hashes of the image bytes. The banner-version API separately computes a SHA-256-derived identifier from the current banner content. That identifier drives the demonstrative versioned URL and changes even if an update preserves file size. These are separate mechanisms with different purposes.

An origin validation test retrieves an asset and its ETag, then repeats the request with If-None-Match. A matching validator should yield 304 without a response body. This tests the origin's conditional request behavior. It does not, by itself, validate Cloudflare's revalidation policy or prove that a later CDN request avoids origin traffic.

### 2.4.4 Cache keys, variants and Vary

A cache needs a key to identify a stored representation. The lab assumes ordinary Cloudflare URL handling in which the scheme, host, path and relevant query string distinguish cache entries. The same /static/img/banner.jpg path on origin.example.org and www.example.org belongs to different host contexts. A new ?v= content identifier can select a different entry when the query string is included. If TV1 configures the CDN to ignore query strings, the experiment loses that distinction and the versioning panel must not be interpreted as successful invalidation.

Vary identifies request fields used to select a representation, such as Accept-Encoding. Shared caches must account for the variants they support; blindly placing personalized or negotiated data under one common URL risks delivering an unsuitable response to another request. Provider support and custom cache key settings must be checked rather than inferred from generic HTTP examples. CDN Lab intentionally serves public image bytes without per-user representation variation. All benchmark and preview fetches omit credentials so that the admin page's HTTP Basic credentials are not attached to cacheable assets.

Figure 2.4-1. Cache MISS and HIT sequences are provided as editable diagrams in docs/diagrams/miss.mmd and hit.mmd, with SVG and PNG exports. In the simple MISS sequence, the edge checks its local cache, requests the origin representation, stores an eligible response and returns it. In the HIT sequence, the edge returns its stored response without contacting origin. These figures show one logical edge layer; tiered infrastructure can introduce additional cache lookups.

### 2.4.5 Interpreting response headers and hit ratio

Cloudflare exposes provider-specific response states [3]. CDN Lab displays the received values verbatim, with a missing-header marker where necessary. A missing header may be caused by CORS exposure or a route without that provider; it must not be converted into an invented NO-CDN fact. Similarly, a CF-Ray identifier helps associate a response with Cloudflare handling, but neither it nor an arbitrary forwarded header authenticates the source of a request at the application.

Table 2.4-2. Interpreting observable states.

| State or field | Interpretation | Caution |
| --- | --- | --- |
| HIT | Response served from cache | Applies to the observed request |
| MISS | No matching stored response used; origin retrieval is needed | A later request is not guaranteed to hit |
| EXPIRED | Stored response was beyond freshness and origin was contacted | Different from a fresh hit |
| BYPASS | Caching policy prevented normal cache use | Inspect origin directives and rules |
| DYNAMIC | Response was not treated as cache eligible | Expected for many dynamic endpoints |
| Age | Estimated response age in seconds | It can reset; absence does not prove a miss |
| X-Origin-Served-At | Application timestamp on origin response | A retained timestamp supports, but alone does not prove, edge reuse |

For a selected request population, an operational hit ratio can be calculated as requests classified HIT divided by all requests in that population. The report must state its denominator, treatment of revalidated requests and whether errors are included. A byte hit ratio uses transferred bytes rather than request counts, so the two ratios can differ substantially for mixed-size assets. The application exports raw statuses and does not invent a dashboard hit ratio from unobserved traffic. TV3 should calculate aggregate metrics from its recorded dataset and provider analytics with a stated method.

### 2.4.6 Tiered caching and origin shielding

An edge cache can ask an upper-tier cache before contacting origin. This can reduce repeated origin fetches when several edge locations request the same object [4]. The simplified diagrams omit that intermediate tier for readability, and the current app does not enable or implement a tiered cache itself. Whether Cloudflare uses an upper tier depends on the account's active configuration. An edge-local MISS therefore should not automatically be counted as one confirmed request to the Azure application; origin access logs are required for the offload experiment.

## 2.5 Cache Invalidation

### 2.5.1 Why updates are difficult

Changing a file at origin does not notify every copy already stored in browsers and shared caches. Multiple locations can hold different versions at the same time. A policy must balance freshness requirements, delivery latency, origin load and operational complexity. CDN Lab makes this visible by maintaining one unchanged banner path, a direct-origin view and a versioned URL view. After warming the edge copy, the student replaces the origin banner and observes whether the unchanged cached URL still returns the old content.

The long shared freshness lifetime is intentional. It creates a clear before-and-after experiment, provided that the original banner was cached before replacement and that no development-mode or bypass setting intervenes. If all panels change immediately, the correct response is to inspect cache state and rules rather than claim that the experiment has demonstrated stale content.

### 2.5.2 TTL expiry

TTL-based renewal requires no administrative API call. When freshness expires, a later request normally fetches or validates the representation according to cache policy. The main tradeoff is the allowed staleness interval: a long lifetime lowers repeat origin work but delays ordinary visibility of updates, while a short lifetime increases validation or fetch frequency. Expiry is demand-driven rather than a promise that every edge refreshes itself at one wall-clock instant.

### 2.5.3 Active purge

Active invalidation requests removal or invalidation of cached entries before their normal freshness expires. The server-side Cloudflare module calls the zone purge endpoint with either exact file URLs or purge_everything. Keeping this call on the server avoids exposing the API token to the browser. The token should be restricted to the project zone and the required purge permission. The application checks both HTTP success and the provider response's success field before acknowledging an operation [5].

Single-URL purge is the preferred demonstration because its scope is understandable. The backend constructs URLs under SITE_URL from validated /static/ paths; a client cannot instruct the server to purge an arbitrary external host. Query variants must be targeted according to the configured key and provider API behavior. Purging the plain banner URL is not represented as automatically purging every ?v= variant. Purge Everything is deliberately separate, with a visible confirmation because it invalidates unrelated cached resources in the zone and can create additional origin traffic.

The API response confirms acceptance of a request, not instantaneous observation at every location. A live demonstration must make a subsequent network request and record the actual state and returned image. Different users or edge locations can observe transitions at different times. Purge-by-tag and purge-by-prefix are useful broader mechanisms, but this application does not implement them or assume their availability on every account plan.

### 2.5.4 Versioning and fingerprinted files

Versioning changes a resource URL instead of forcing reuse of the old cache key. The admin's third panel appends the current content hash as ?v=. This produces a new key only when the CDN preserves the query string. The checkbox disables that suffix to show that the third panel then addresses the same URL as panel two. Toggling it is a viewing choice; it does not purge existing entries.

This lab overwrites banner.jpg and does not archive old byte versions. Therefore, an old ?v= URL can later return newer bytes if its earlier entry is evicted and the origin serves the current banner. This is an important limit of query-versioning over a mutable file. Production builds should use distinct, content-fingerprinted filenames and retain old build assets for existing clients. A pinned jsDelivr repository release is a related comparison: TV3 should publish a new release reference for new content rather than silently move an existing release tag [6].

### 2.5.5 Serving stale while revalidating

The stale-while-revalidate extension permits controlled reuse of a stale response while a refresh occurs in the background [7]. This can hide renewal latency, at the cost of temporarily serving older content. It is a freshness tradeoff, not a replacement for urgent removal requirements. CDN Lab explains this mechanism but does not add the directive to its static responses or claim that the admin implements background revalidation. A report should distinguish implemented behavior from theory.

Table 2.5-1. Strategy comparison for the lab.

| Strategy | Benefit | Tradeoff | Lab evidence |
| --- | --- | --- | --- |
| TTL | Simple policy, no separate update call | Visibility may wait for freshness expiry | Header lifetime and delayed follow-up request |
| Exact URL purge | Updates a stable public URL on demand | Requires credentials and propagation checks | Purge log plus subsequent actual image/header |
| Versioned URL | New clients request a different key | References must update; old files should be retained | Panel 3 query hash; compare checkbox states |

## 4. System Analysis and Design — TV2 contribution

### 4.1 Purpose, actors and scope

The application is an instructional laboratory for students and a lecturer evaluating CDN behavior. A visitor can open the gallery, run a browser benchmark and read the explanation page. An authenticated administrator can replace the banner and request cache invalidation. Cloudflare is an external delivery and purge service, while jsDelivr is an optional read-only asset route supplied by TV3. TV1 owns the production domain, VM, reverse proxy, certificates and edge rules.

The use-case diagram in docs/diagrams/use-case.mmd separates public read operations from protected write operations. Authentication precedes access to both /admin aliases and the entire /api/admin path. Public API configuration contains route URLs and boolean capabilities, not credentials. Anonymous visitors must not obtain API tokens or modify cached content through an unprotected endpoint.

Table 4.1-1. Functional requirements and verification.

| ID | Requirement | Verification |
| --- | --- | --- |
| FR01 | Display 30 identical-host static JPEGs | Count gallery elements and retrieve all asset URLs |
| FR02 | Compare four assets through configured routes | Run benchmark and export raw CSV |
| FR03 | Display available cache headers and missing timing honestly | Inspect table, CSV and browser Network |
| FR04 | Restrict origin replacement and purge | Anonymous requests receive 401; cross-site writes fail |
| FR05 | Accept bounded, decoded JPEG replacement | Valid image succeeds; malformed file is rejected |
| FR06 | Show unchanged and versioned banner URLs | Upload two different banners and compare hash URLs |
| FR07 | Call actual Cloudflare purge or report an error | Check missing credentials and production acceptance separately |

The principal nonfunctional requirements are repeatability, understandable evidence, secret protection and installability. Local operation must work without a Cloudflare account, but must be marked as local operation. Browser controls must remain usable at smaller screen widths. Network failure, permission denial and timing restrictions must be visible. The benchmark uses bounded run counts and timeouts rather than an unbounded load generator. It is not intended to replace TV3's formal throughput and geographic experiments.

### 4.2 Component boundaries

The browser renders plain HTML, CSS and JavaScript. Express serves the app, public static resources and JSON endpoints. Sharp validates and re-encodes uploaded JPEGs. The Cloudflare helper makes authenticated outbound HTTPS calls. Static file cache headers are assigned at one middleware boundary so that app pages and admin responses do not inherit the public asset policy. Nginx passes requests to one Node process; the process uses the VM filesystem as its banner store.

The design assumes a single shared origin filesystem. Atomic temporary-file rename prevents a reader from seeing a half-written banner, but this is not a distributed storage design. Multiple independent application replicas would require coordinated shared storage and update ordering. For the small teaching lab, one PM2 instance avoids inconsistent local copies.

### 4.3 Request sequences

The MISS diagram shows a visitor requesting /static/img/banner.jpg from the proxied hostname. With no reusable edge entry, Cloudflare requests origin. Express returns the JPEG and public cache metadata; the edge may retain the response and returns it with its observed cache status. This diagram assumes an eligible response and no intermediate tier hit. The HIT diagram shows a fresh edge entry returned without an origin request; the unchanged origin timestamp and cache status can be compared with a previous response.

The purge diagram begins with an authenticated browser upload. The server decodes and replaces the origin image, but leaves edge entries untouched. A later protected POST asks the application to purge the stable banner URL. The application constructs the zone-specific Cloudflare request, checks success, and returns an acknowledgement. The browser reloads previews and records the observed result. Failure at upload, authentication or the provider call is an alternate path; no successful purge message is shown after a failed provider response.

Figure 4.3-1 through Figure 4.3-4. Use case, MISS, HIT and purge diagrams are supplied as source plus PNG/SVG. Their titles and numbering should be replaced with Word Insert Caption fields when TV1 merges the report. These are design diagrams, not screenshots of a live deployment.

## 5. Application Implementation — TV2 contribution

### 5.1 Project organization and navigation

server.js creates the application and exports a factory for isolated tests. lib/cloudflare.js handles the external purge protocol. public/ contains index, gallery, benchmark, admin and how-it-works pages, with page-specific scripts in public/js/. static/ holds the shared payload directory. The same relative asset paths are used on the origin and proxied hosts, so changing the page hostname changes the delivery route without changing the asset selection.

The landing page introduces three tasks: load the gallery, measure requests and invalidate cached content. The visual layout uses restrained green and cream colors, readable tables and clear experiment numbering. Form labels identify run counts and upload limits. Status regions expose progress and errors without replacing them with fixed example results. The script and Chart.js library are served locally, so viewing the benchmark does not depend on an unrelated third-party script delivery path.

### 5.2 Static payload and cache configuration

The gallery contains 30 generated JPEG textures in the requested 300–600 KB range, a shared CSS file and a licensed lodash JavaScript payload. The source plan suggested royalty-free photographs; generated textures are a documented substitution that gives repeatable files without unverified photo licensing. They should be described as synthetic test images. If the lecturer requires photographs specifically, replace the files with properly attributed photographs and republish exactly the same bytes through every route before measuring.

Every successful static response includes public browser/shared freshness directives, cross-origin read permission, exposed metadata fields and Timing-Allow-Origin. The application timestamp is attached at origin service time. ETags and Last-Modified allow conditional retrieval. An automated test verifies both the ordinary static response and a matching If-None-Match request. HTML and JSON responses stay no-store; caching the admin shell or API indiscriminately at the CDN would violate the intended boundary.

### 5.3 Browser benchmark

The benchmark samples photo-01.jpg, photo-15.jpg, app.css and vendor.js. It performs sequential fetches and alternates the order of origin and CDN routes between runs to reduce a fixed ordering bias. Every successful response body is consumed before total duration is recorded. The application exports timestamps, URL, run index, mode, HTTP status, byte count, request TTFB, total duration, provider headers and errors. Aggregated rows report successful versus attempted samples and median values; the first request is retained and identified in the CSV.

Request TTFB is calculated as responseStart minus requestStart from Resource Timing [8]. This deliberately excludes earlier name lookup and connection setup. The total measurement begins before fetch and ends after body consumption, so it includes additional browser and transfer work. These metrics must not be silently equated with curl's time_starttransfer or TV3's fetch-to-headers timing. The request timestamp fields are restricted across origins unless Timing-Allow-Origin permits access. When the values are unavailable, the application reports N/A and preserves the total measurement separately.

Cloudflare unique-query mode appends a per-request identifier only to that route. Its purpose is to request different keys under a query-sensitive policy. The application does not assume that this guarantees an origin fetch, because rules can ignore queries or other cache layers can intervene. A repeated-URL run can contain both initial MISS and subsequent HIT responses; the displayed set of observed statuses warns about that mixture. Formal warm-cache analysis should filter the raw samples by observed state and explain its sample population.

The optional jsDelivr base URL is configured only after TV3 publishes a pinned repository release containing identical assets. The app does not treat jsDelivr as a second arbitrary origin or assume that it supplies Cloudflare-specific fields. CORS or detailed timing limitations appear as failures or missing metrics. This allows the report to distinguish route availability from a successful, comparable measurement.

### 5.4 Administrative upload and previews

HTTP Basic authentication protects the admin document and API routes. The browser sends same-origin credentials for protected app requests, while preview fetches explicitly omit credentials. A custom X-CDN-Lab header and Origin/Fetch Metadata checks prevent ordinary cross-site browser forms from issuing authenticated mutations. HTTPS is required for production because Basic credentials are encoded, not encrypted by the authentication scheme itself.

Multer accepts one bounded multipart image in memory. Sharp inspects the actual image data, requires JPEG format, enforces a pixel bound, and decodes/re-encodes it before writing a temporary file. An atomic rename replaces the public banner. This avoids trusting a forged MIME type and avoids exposing a partially written file. The version endpoint derives its identifier from the resulting bytes rather than an easily repeated millisecond timestamp.

Three independent preview requests read the direct-origin, unchanged CDN and versioned CDN URLs. The script turns response blobs into image object URLs so that the image and displayed metadata belong to the same response. Old object URLs are revoked to avoid retaining successive image blobs. The log records operations, but the result interpretation remains evidence-based: without an edge cache in local mode, every panel normally changes together.

### 5.5 Purge API behavior and failures

The helper posts JSON to the selected zone's purge_cache endpoint with a server-held bearer token. A timeout bounds waiting. An HTTP failure, invalid JSON or provider success=false produces a visible error; credentials are not echoed into the response. Missing zone credentials return an explicit unavailable response and disable the UI purge buttons. This makes a successful local upload distinguishable from an externally verified purge.

The server accepts a limited list of static paths for file purge and constructs complete URLs under the configured proxied hostname. Invalid modes, outside paths and external URLs are rejected. Query strings can be supplied to target a specific version. Broad zone purge requires a separate action in the interface. Following provider acknowledgement, preview reload checks the actual image and headers rather than assuming global completion after a fixed delay.

### 5.6 Validation and evidence plan

The automated suite exercises authentication, cross-site write rejection, static headers, conditional retrieval, real image processing, content hash changes, malformed uploads, purge path validation and external protocol errors through a mocked transport. It deliberately avoids touching a real Cloudflare account. Passing those tests establishes local application behavior, not production CDN propagation or performance gains.

The live acceptance requires TV1's deployment. Capture the gallery, benchmark table and chart, pre-upload HIT, post-upload stale unchanged URL, changed versioned URL, accepted purge and subsequent response state. Include readable hostname and relevant headers in each screenshot. TV3 should preserve exported CSV and verify installation independently. Screenshots and results must be added from the actual run rather than replaced by mock figures or invented measurements.

Table 5.6-1. Completion boundaries.

| Artifact | Supplied in this package | External acceptance needed |
| --- | --- | --- |
| Express app and static payload | Yes | Deploy with TV1's real hostnames |
| Admin and purge integration | Yes | Token permissions and edge propagation |
| Benchmark and raw CSV exporter | Yes | Real networks and formal TV3 dataset |
| Theory and design diagrams | Yes | Merge into Faculty template |
| Slide deck and TV2 narration | Yes | Real team details, results and student recording |

## References

[1] R. Fielding, M. Nottingham, and J. Reschke, “HTTP Caching,” RFC 9111, June 2022. https://www.rfc-editor.org/rfc/rfc9111

[2] MDN Web Docs, “HTTP caching” and “Cache-Control.” https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching ; https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control

[3] Cloudflare, “Cloudflare cache responses.” https://developers.cloudflare.com/cache/concepts/cache-responses/

[4] Cloudflare, “Tiered Cache.” https://developers.cloudflare.com/cache/how-to/tiered-cache/

[5] Cloudflare, “Purge by single-file.” https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-single-file/

[6] jsDelivr, “Documentation.” https://www.jsdelivr.com/documentation

[7] M. Nottingham, “HTTP Cache-Control Extensions for Stale Content,” RFC 5861, May 2010. https://www.rfc-editor.org/rfc/rfc5861

[8] MDN Web Docs, “PerformanceResourceTiming” and “requestStart.” https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming ; https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/requestStart

Online references checked 29 October 2026. Reference numbers are local to this contribution; TV3 should merge them with the team's bibliography. No claim is made that the Faculty's unavailable formatting template has been applied.
