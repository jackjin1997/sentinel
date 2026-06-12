# Codex Supervisor Protocol

Every prompt sent to a Codex sub-agent uses these 5 sections. Codex has zero context from the supervising Claude session — every prompt is self-contained.

```
## CONTEXT
- Project: <name + 1-line description>
- Repo path: <absolute path>
- Branch: <which branch to work on; create if missing>
- Prior state: <what's already done, what to assume>
- Files to read first: <list with absolute paths>
- Reference docs: <URLs if any>

## TASK
- Numbered steps, each independently verifiable
- Concrete file paths
- Explicit "create this", "modify this", "leave this alone"

## ACCEPTANCE
- Concrete passable checks (curl returns 200, tsc no errors, file X has section Y)
- Time budget (wall clock): "30 min", "60 min"

## FAILURE MODE
- "DO NOT" list: actions that look helpful but break invariants
- Kill conditions: "if X happens, abort and report — do not work around"
- No silent fallbacks: surface errors, don't hide them

## HANDOFF
- Exact git commit message
- git push command
- What to reply back with: branch, commit hash, 1-2 line summary
- "If stuck: paste error verbatim, don't fix"
```

## Why this shape

- **CONTEXT** is what Codex can't infer. Without it, every Codex agent re-derives state from scratch (slow + wrong).
- **ACCEPTANCE** is the kill-switch. If Codex finishes a task and the checks pass, supervisor can review remote. If they don't pass, Codex knows not to declare victory.
- **FAILURE MODE** is the anti-helpfulness clause. Codex defaults to "fix everything I notice"; this section pins it to scope.
- **HANDOFF** is for parallel work. Hash + branch + 1-line summary = supervisor reviews in 30 sec without re-reading code.

## Anti-patterns this prevents

- "Codex helpfully refactored the whole module while doing the task" → §FAILURE MODE locks scope
- "Codex silently swallowed an npm error and committed broken code" → §ACCEPTANCE + "paste error verbatim" in §HANDOFF
- "Codex worked on main instead of branch" → §CONTEXT branch line
- "Codex did the task but didn't push, supervisor can't review" → §HANDOFF push command
