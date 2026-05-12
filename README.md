# Sentinel

> **Autonomous Incident Response Agent · multi-vendor LLM orchestration · ~53s MTTR**

[![Hackathon](https://img.shields.io/badge/AI%20Agent%20Olympics-2026-fuchsia)](https://lablab.ai/ai-hackathons/milan-ai-week-hackathon)
[![Stack](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Models](https://img.shields.io/badge/Gemini-2.5--Flash-4285F4)](https://aistudio.google.com)
[![Models](https://img.shields.io/badge/Claude-Sonnet%204.6-D97757)](https://anthropic.com)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)


**🚀 Live demo**: https://tries-virtually-stockings-binary.trycloudflare.com

---

When your service breaks at 3am, Sentinel investigates, diagnoses, and recommends fixes — like having a senior SRE on call 24/7. It coordinates **four specialized phases across two vendors** so the diagnosis is reviewed by genuinely different model bias before action is taken:

| # | Phase | Model | Role |
|---|---|---|---|
| 1 | 🔍 Triage | `gemini-2.5-flash` (Google) | Pull just-enough telemetry, form initial hypothesis |
| 2 | 🧠 Investigate | `claude-sonnet-4-6` (Anthropic) | Deep root-cause with full tool access |
| 3 | ⚔️ Adversarial review | `gemini-2.5-flash` (Google) | Stress-test Claude's diagnosis with different vendor bias |
| 4 | 📋 Consolidate | `claude-haiku-4-5` (Anthropic) | Strict-JSON action plan synthesis |

The dashboard streams every phase live — tool calls, reasoning chains, vendor handoffs — so operators see the agent's work, not just its output. Diagnoses cite specific timestamps, metric values, code paths, and runbook IDs. The agent **honestly downgrades confidence** when evidence is uncertain. Graceful Claude Haiku fallback if Gemini hits quota — demo never breaks.

## Hackathon submissions

Built for:
- [AI Agent Olympics Hackathon](https://lablab.ai/ai-hackathons/milan-ai-week-hackathon) (Milan AI Week, $28k pool)
- [Transforming Enterprise Through AI](https://lablab.ai/ai-hackathons/techex-intelligent-enterprise-solutions-hackathon) ($10k pool)

Tracks targeted: Intelligent Reasoning · Agentic Workflows · Collaborative Systems · Enterprise Utility · Vultr Enterprise Agent · Google AI Studio.

## Local dev

```bash
cp .env.local.example .env.local
# Fill in:
#   GOOGLE_GENERATIVE_AI_API_KEY=  (https://aistudio.google.com/apikey — free tier ample)
#   ANTHROPIC_API_KEY=             (https://console.anthropic.com — paid, $5 free trial)
bun install
bun dev
# Open http://localhost:3000
```

Click any incident card → watch the agents work.

## Architecture

```
┌─────────────────┐         ┌────────────────────────────────────────────┐
│  Dashboard UI   │ ◀ SSE ◀ │  POST /api/agent { incidentId }            │
│  (Next.js 16)   │         │                                            │
└─────────────────┘         │   runIncidentAgent (lib/agent.ts)          │
                            │                                            │
                            │   PHASE 1 · gemini-2.5-flash · triage      │
                            │     ├─ queryLogs                           │
                            │     ├─ queryMetrics                        │
                            │     └─ checkDeployHistory                  │
                            │             ↓ hand-off                     │
                            │   PHASE 2 · claude-sonnet-4-6 · investigate│
                            │     └─ searchRunbook                       │
                            │             ↓ hand-off (vendor flip)       │
                            │   PHASE 3 · gemini-2.5-flash · review      │
                            │     (no tools — pure adversarial critique) │
                            │             ↓ hand-off                     │
                            │   PHASE 4 · claude-haiku-4-5 · consolidate │
                            │     → strict-JSON final report             │
                            └────────────────────────────────────────────┘
```

### Why multi-vendor matters

Same-family models share blind spots. When Claude Sonnet's investigation is reviewed by Claude Haiku, both might miss the same class of error. When it's reviewed by Gemini Flash, the structurally different training catches things Claude wouldn't see. Sentinel's adversarial reviewer is **always a different vendor** for this reason.

### Files

- `lib/types.ts` — shared types
- `lib/mock/incidents.ts` — **5 realistic incident scenarios** with logs/metrics/runbooks (checkout latency, auth pool exhaustion, image-worker memory leak, Redis cache eviction storm, Slack auth cascade)
- `lib/tools/index.ts` — 4 agent tools with Zod schemas: `queryLogs`, `queryMetrics`, `searchRunbook`, `checkDeployHistory`
- `lib/agent.ts` — multi-vendor orchestration with phase events + Claude Haiku fallback
- `app/api/agent/route.ts` — SSE streaming endpoint
- `app/api/incidents/route.ts` — incident list
- `app/page.tsx` — dashboard with live reasoning trace, vendor badges, MTTR timer

## Stats (verified end-to-end)

| Metric | Value |
|---|---|
| Median MTTR (incident click → final report) | **~53s** |
| Tool calls per run | 6-9 |
| Text streamed per run | ~100 deltas |
| Cost per run (Anthropic) | ~$0.03 |
| Cost per run (Google, free tier) | $0 |
| Lines of code | ~1500 TS |

## Stack

Next.js 16.2 · React 19 · TypeScript 5 · Tailwind v4 · Vercel AI SDK 6 · `@ai-sdk/google` · `@ai-sdk/anthropic` · Zod · Server-Sent Events.

## License

MIT — built during the AI Agent Olympics 2026.

## See also

- [`HACKATHON.md`](./HACKATHON.md) — submission pack (pitch, demo script, X thread, form fills)
- [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) — 60-second demo video production script
- [`DEPLOY.md`](./DEPLOY.md) — Vultr deployment guide
