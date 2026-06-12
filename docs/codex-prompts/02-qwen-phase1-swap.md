# Codex Prompt 02 · Qwen Cloud — Phase 1 triage swap (~60 min)

**Purpose**: integrate Qwen as a 3rd vendor for the Qwen Cloud Global AI Hackathon (deadline 2026-07-09). This is a small additive change — Phase 1 triage swaps to Qwen-max with cascading fallbacks. Other phases untouched.

Copy everything below the `---` line into a fresh Codex session.

---

## CONTEXT
- Project: Sentinel — multi-LLM incident response agent
- Repo path: /Users/jinzexu/workspace_codes/personal/sentinel
- Branch: create `feat/qwen-cloud` from `main` (git checkout -b feat/qwen-cloud)
- Prior state:
  - Sentinel uses Vercel AI SDK 6 with 4-phase orchestration in `lib/agent.ts`
  - Phase 1 (Triage): `gemini-2.5-flash` via `@ai-sdk/google`, with Claude Haiku as empty-result fallback
  - Phase 2 (Investigate): `claude-sonnet-4-6` via `@ai-sdk/anthropic`
  - Phase 3 (Review): `gemini-2.5-flash`
  - Phase 4 (Consolidate): `claude-haiku-4-5`
- Files to read first (in order):
  - /Users/jinzexu/workspace_codes/personal/sentinel/README.md
  - /Users/jinzexu/workspace_codes/personal/sentinel/lib/agent.ts
  - /Users/jinzexu/workspace_codes/personal/sentinel/.env.local.example
  - /Users/jinzexu/workspace_codes/personal/sentinel/lib/tools/index.ts (to verify tool calling will keep working)
- Hackathon: Qwen Cloud Global AI Hackathon, deadline 2026-07-09. Hard requirement: must use Qwen models. Multi-vendor encouraged (we already qualify because Sentinel will be Gemini + Claude + Qwen).
- This branch must NOT touch `main`. Do not modify Phase 2/3/4. Do not change tool schemas.

## TASK
1. `git checkout -b feat/qwen-cloud` from main.
2. Decide Qwen adapter strategy (~10 min recon):
   - Check npm for an official Qwen Vercel AI SDK adapter: `npm view @ai-sdk/qwen`, search for `qwen ai sdk`
   - If no official adapter: check Alibaba DashScope OpenAI-compatible endpoint (https://dashscope.aliyuncs.com/compatible-mode/v1) — works with `@ai-sdk/openai-compatible`
   - Pick the cleanest path. ONE-line decision rationale will go into `lib/agent.ts` as a comment.
3. Install necessary package (`bun add <pkg>`).
4. Add to `.env.local.example`:
   - `QWEN_API_KEY=` (with link to https://bailian.console.alibabacloud.com/ in the comment)
   - `QWEN_MODEL=qwen-max` (with comment: "qwen-max for tool use; qwen-plus for cheaper/faster")
5. Modify `lib/agent.ts` Phase 1 (Triage) ONLY:
   - Primary model: Qwen-max (using chosen adapter)
   - Existing Claude Haiku fallback: KEEP (when Qwen returns empty)
   - Add SECOND fallback: gemini-2.5-flash (when Qwen AND Haiku both empty)
   - Tool calling must continue to work (Phase 1 uses queryLogs, queryMetrics, checkDeployHistory, fetchVendorStatus)
6. DO NOT modify Phase 2, 3, or 4. DO NOT change tool definitions in `lib/tools/*`.
7. Update `README.md` architecture diagram: Phase 1 now reads "Qwen-max (primary) → Claude Haiku (fallback) → Gemini Flash (fallback)".
8. Run `bunx tsc --noEmit` and confirm no type errors.
9. Run `bun run build` and confirm builds clean.
10. Stage + commit + push.

## ACCEPTANCE
- `bun install` completes without errors
- `bunx tsc --noEmit` passes
- `bun run build` succeeds
- `lib/agent.ts` has a 1-line comment naming chosen adapter strategy
- `.env.local.example` lists `QWEN_API_KEY` and `QWEN_MODEL`
- `README.md` architecture section shows Qwen-as-Phase-1
- Phase 2/3/4 model selection lines in `lib/agent.ts` are unchanged from main
- Branch `feat/qwen-cloud` pushed to origin
- Time budget: **60 min** wall clock (longer than 30 to account for npm install + tsc + build cycle)

## FAILURE MODE
- DO NOT touch Phase 2/3/4 model selection
- DO NOT modify tools in `lib/tools/*`
- DO NOT modify SSE layer in `app/api/agent/route.ts`
- DO NOT modify Bright Data integration in `lib/tools/brightdata.ts`
- DO NOT downgrade Vercel AI SDK 6 to 5 to make an adapter work
- DO NOT roll your own provider/adapter class. If no real adapter works, revert and report — do not invent one.
- If adapter chosen breaks tool calling (e.g. OpenAI-compatible mode doesn't support function calling for Qwen) → revert and report; DO NOT silently disable tool calling
- If `bunx tsc --noEmit` introduces type errors that need to spread across the codebase → revert and report

## HANDOFF
- Commit message verbatim: `feat(qwen): add Qwen-max as Phase 1 triage primary, with cascading fallbacks`
- Push: `git push -u origin feat/qwen-cloud`
- Reply to supervisor with EXACTLY:
  - `Branch: feat/qwen-cloud`
  - `Commit: <full SHA>`
  - `Adapter: <@ai-sdk/qwen | @ai-sdk/openai-compatible (DashScope) | other>`
  - `Surprises: <any | none>`
- If stuck: paste error verbatim, do not fix and do not hide.
