# agentimization

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
