# TV2 acceptance record

Local automated verification is recorded in `verification.txt`. This checklist is for the remaining human/live verification, not a claim of completion.

| Check | Expected evidence | Owner / state |
| --- | --- | --- |
| Fresh install following README | ≤15 min without asking TV2; OS, Node version and elapsed time | TV3 / pending |
| Both production hosts use HTTPS | Actual URLs and browser/curl evidence | TV1 / pending |
| Static CDN route warms | Same URL requests, observed MISS then HIT if eligible | TV1 + TV2 / pending |
| Old cache after upload | Origin new banner; unchanged CDN old banner and observed state | TV2 on live domain / pending |
| Version query works | New query hash and changed image; query included in key | TV2 + TV1 / pending |
| Purge acts on real edge | Accepted API call and subsequent real response | TV2 + TV1 / pending |
| Benchmark | Four assets, readable graph and raw CSV; network/time recorded | TV2 + TV3 / pending |
| jsDelivr equality | Pinned release with identical asset checksums | TV3 / pending |
| WAF | /.env edge block; origin 404; no secret disclosed | TV1 / pending |
| Faculty report formatting | Supplied template, captions and merged reference numbers | TV1 / pending |
| Recording | Every member participates; clear audible narration, ≤20 minutes; original assignment does not mandate English | All / pending |

## Screenshot captions to collect

1. Application landing page and navigation.
2. Gallery with relative same-host asset URLs visible in Network.
3. Benchmark settings and running progress.
4. Completed benchmark table and chart, with actual route URLs.
5. Cache-Control, CORS and Timing-Allow-Origin on a static response.
6. Admin pre-update banner panels, unchanged CDN URL warmed to HIT.
7. After origin upload: direct-origin new content, unchanged cached copy still old where observed.
8. Versioned panel using the new content hash query.
9. Purge acknowledgement log followed by the actual response metadata.
10. Reload after purge with actual cache transition; do not rewrite a non-HIT response as HIT.

Keep the original screenshots and CSV. Label any unexpected result and investigate rules, browser storage, query key, credentials and propagation before recording again.
