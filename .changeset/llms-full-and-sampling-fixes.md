---
"agentimization": minor
"@agentimization/core": minor
---

expand audit coverage and fix page sampling:

- add four llms-full.txt checks (exists, valid structure, size range, links resolve)
- add a dedicated mcp-tool-count check, split out of the mcp server card check
- scope page sampling to the audited path so auditing a sub-path (e.g. /docs) no longer samples unrelated site pages
- expand sitemap indexes to their nested sitemaps so real page URLs are sampled
- make page sampling deterministic so re-runs produce the same score
- fetch sampled pages with an html-only accept header so content-negotiating sites return rendered html instead of the agent markdown variant, fixing false negatives on structured data, open graph, meta description, and link checks
- parallelize the per-page markdown follow-up fetch
