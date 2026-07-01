# agentimization

## 0.2.1

### Patch Changes

- 0f68caf: optimize the "copy fix prompt" output for AI agents:

  - flatten the clipboard prompt to a plain directive list (drop `###` headings, `**bold**`, `**Fix:**` labels, scores, and the failed/warning counts)
  - strip why-this-matters rationale from each fix, keeping the imperative and rescuing any doc URL
  - replace status emoji with `PASS`/`WARN`/`FAIL` text markers and flatten non-ascii punctuation (em/en-dash, middot, arrow, semicolon)
  - add a per-check `Success:` criterion to the verbose `--md` report so a reader can tell when an issue is fixed

## 0.2.0

### Minor Changes

- aa64999: expand audit coverage and fix page sampling:

  - add four llms-full.txt checks (exists, valid structure, size range, links resolve)
  - add a dedicated mcp-tool-count check, split out of the mcp server card check
  - scope page sampling to the audited path so auditing a sub-path (e.g. /docs) no longer samples unrelated site pages
  - expand sitemap indexes to their nested sitemaps so real page URLs are sampled
  - make page sampling deterministic so re-runs produce the same score
  - fetch sampled pages with an html-only accept header so content-negotiating sites return rendered html instead of the agent markdown variant, fixing false negatives on structured data, open graph, meta description, and link checks
  - parallelize the per-page markdown follow-up fetch

## 0.1.3

### Patch Changes

- 0978323: terminal ui polish for the audit report:

  - cards now adapt to terminal width and reflow on resize
  - result card is more compact: one-line header (grade, score, target, time) and a single-row score bar
  - score bar and summary counts now lead with the gray skipped band on the left, then pass/warn/fail
  - replace direct useEffect usage with a sanctioned useMountEffect wrapper and key-based remounts (timers, resize listener, and the audit runner)

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
