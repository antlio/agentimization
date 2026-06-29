---
"agentimization": patch
"@agentimization/core": patch
---

terminal ui polish for the audit report:

- cards now adapt to terminal width and reflow on resize
- result card is more compact: one-line header (grade, score, target, time) and a single-row score bar
- score bar and summary counts now lead with the gray skipped band on the left, then pass/warn/fail
- replace direct useEffect usage with a sanctioned useMountEffect wrapper and key-based remounts (timers, resize listener, and the audit runner)
