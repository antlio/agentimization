---
"agentimization": patch
"@agentimization/core": patch
---

optimize the "copy fix prompt" output for AI agents:

- flatten the clipboard prompt to a plain directive list (drop `###` headings, `**bold**`, `**Fix:**` labels, scores, and the failed/warning counts)
- strip why-this-matters rationale from each fix, keeping the imperative and rescuing any doc URL
- replace status emoji with `PASS`/`WARN`/`FAIL` text markers and flatten non-ascii punctuation (em/en-dash, middot, arrow, semicolon)
- add a per-check `Success:` criterion to the verbose `--md` report so a reader can tell when an issue is fixed
