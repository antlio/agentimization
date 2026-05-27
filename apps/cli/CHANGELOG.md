# agentimization

## 0.1.2

### Patch Changes

- 63031f1: add six GEO surface checks and tighten meta/image parsing:

  - new `https-enabled` check (url-stability, network-only) — flags non-https deployments
  - new `meta-description` check (geo-signals) — requires `<meta name="description">` between 50 and 160 chars; treats whitespace-only content as missing
  - new `open-graph-tags` check (geo-signals) — checks `og:title`, `og:description`, `og:image`, `og:url`; surfaces partial/none coverage in the message
  - new `external-citations` check (geo-signals) — looks for at least two outbound links per page (remote mode only)
  - new `substantial-text-content` check (page-size) — requires at least 100 words of body text per page
  - new `image-alt-text` check (content-structure) — measures descriptive alt-text coverage and excludes decorative `alt=""` images from the denominator
  - `extractMetaTags` lowercases keys so capitalized meta names (`<meta name="Description">`) are matched
  - `extractImages` quote-aware attribute reader preserves apostrophes inside double-quoted alt values
  - cli now derives `networkSkipped` from `ALL_CHECKS.length` instead of a hard-coded constant

## 0.1.1

### Patch Changes

- 1f88b7c: cli ux improvements and local-mode fixes:

  - auto-detect built output (dist, build, out, \_site, public) when pointed at a project root
  - walk up to find AGENTS.md from a build dir so the workspace root file is still picked up
  - sample html only when html exists, falling back to markdown for markdown-only repos
  - fix internal-link counting in local mode (file:// origin is "null" so use href instead)
  - canonical-url-consistency returns info in local mode where the check cannot run
  - content-start-position uses 30 and 50 percent thresholds instead of 10
  - hide the copy-fix menu option when the audit has zero failures and warnings
  - hero card colors cycle through phases on the published landing
