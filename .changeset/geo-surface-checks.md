---
"agentimization": patch
"@agentimization/core": patch
---

add six GEO surface checks and tighten meta/image parsing:

- new `https-enabled` check (url-stability, network-only) — flags non-https deployments
- new `meta-description` check (geo-signals) — requires `<meta name="description">` between 50 and 160 chars; treats whitespace-only content as missing
- new `open-graph-tags` check (geo-signals) — checks `og:title`, `og:description`, `og:image`, `og:url`; surfaces partial/none coverage in the message
- new `external-citations` check (geo-signals) — looks for at least two outbound links per page (remote mode only)
- new `substantial-text-content` check (page-size) — requires at least 100 words of body text per page
- new `image-alt-text` check (content-structure) — measures descriptive alt-text coverage and excludes decorative `alt=""` images from the denominator
- `extractMetaTags` lowercases keys so capitalized meta names (`<meta name="Description">`) are matched
- `extractImages` quote-aware attribute reader preserves apostrophes inside double-quoted alt values
- cli now derives `networkSkipped` from `ALL_CHECKS.length` instead of a hard-coded constant
