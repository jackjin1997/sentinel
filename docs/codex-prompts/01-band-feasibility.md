# Codex Prompt 01 · Band of Agents feasibility recon (30 min timeboxed)

**Purpose**: determine in 30 minutes whether Sentinel can be ported to the Band framework. If unclear → NO-GO. The whole branch dies if this prompt says NO-GO.

Copy everything below the `---` line into a fresh Codex session.

---

## CONTEXT
- Project: Sentinel — multi-LLM incident response agent
- Repo path: /Users/jinzexu/workspace_codes/personal/sentinel
- Branch: create `feat/band-of-agents` from `main` (git checkout -b feat/band-of-agents)
- Prior state: Sentinel currently uses Vercel AI SDK 6 with 4-phase orchestration in `lib/agent.ts`. 2 vendors (Gemini Flash + Claude Sonnet/Haiku). Production deployed at https://wma-contacting-lindsay-orientation.trycloudflare.com
- Files to read first (in order):
  - /Users/jinzexu/workspace_codes/personal/sentinel/README.md
  - /Users/jinzexu/workspace_codes/personal/sentinel/lib/agent.ts
  - /Users/jinzexu/workspace_codes/personal/sentinel/lib/tools/index.ts
- Reference: https://lablab.ai/ai-hackathons/band-of-agents-hackathon
- Hackathon hard requirement: "Build a multi-agent system where at least 3 agents collaborate THROUGH BAND across planning, execution, review, decision-making, or task handoff." Deadline 2026-06-19.

**This is RECON ONLY. Not integration. Not even speculative installs.**

## TASK
1. `git checkout -b feat/band-of-agents` from main.
2. Identify what "Band" framework actually is:
   - Search npm: `npm search band agents`, `npm view @bandlabs/agents`, `npm view @codeband/sdk` etc.
   - Read the lablab.ai hackathon page for the framework's docs URL or repo URL.
   - Find the OFFICIAL Band documentation. Not a third-party blog.
   - Confirm: TypeScript/JavaScript SDK? On npm? License?
3. Read Band's "getting started" + "agent definition" + "agent-to-agent message" sections (~5 min reading).
4. Write `docs/BAND_FEASIBILITY.md` with these EXACT section headers:
   - `## What Band is` (2-3 sentences)
   - `## SDK availability` (package name on npm, version, license, language support, install command)
   - `## How an agent is defined` (paste 1 minimal code example from official docs)
   - `## How agents communicate` (1 paragraph)
   - `## Can Sentinel's 4 phases map to 3+ Band agents?` (yes/no + 3-5 line concrete mapping plan)
   - `## Verdict` (one of: `GO`, `NO-GO`, `NEEDS-MORE-INFO` — last only if docs cannot be reached in 30 min)
   - `## If GO: top 3 next steps with hour estimates`
   - `## If NO-GO: reason in 1 paragraph`
5. Stage + commit + push.

## ACCEPTANCE
- `docs/BAND_FEASIBILITY.md` exists with all 7 sections present (verbatim headers)
- Verdict line is one of: GO / NO-GO / NEEDS-MORE-INFO
- Branch `feat/band-of-agents` pushed to origin
- Time budget: **30 minutes wall clock**. If exceeded, write `Verdict: NO-GO` and bail.

## FAILURE MODE
- DO NOT install any `@band/*` or `@codeband/*` package speculatively. Recon only — zero npm installs in this prompt.
- DO NOT modify `lib/agent.ts`, `lib/tools/*`, `app/*`, or any production file.
- DO NOT touch `main` branch.
- DO NOT start writing Sentinel-Band integration code.
- If Band SDK doesn't exist publicly on npm → `Verdict: NO-GO` immediately.
- If Band's docs are not in English (or no English mirror) → `Verdict: NO-GO`.
- If lablab.ai page redirects to a closed beta / private Slack / waitlist → `Verdict: NO-GO`.
- If you can't form a confident verdict in 30 min → `Verdict: NO-GO` (NOT NEEDS-MORE-INFO; we don't have budget for follow-up).

## HANDOFF
- Commit message verbatim: `chore(band): feasibility recon for Band of Agents hackathon`
- Push: `git push -u origin feat/band-of-agents`
- Reply to supervisor with EXACTLY:
  - `Branch: feat/band-of-agents`
  - `Commit: <full SHA>`
  - `Verdict: GO | NO-GO | NEEDS-MORE-INFO`
  - `1-line reason: <why>`
- If you hit an error at any step, paste the error verbatim. Don't fix and don't hide.
