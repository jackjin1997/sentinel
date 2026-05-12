# Sentinel

**Autonomous Incident Response Agent — multi-LLM, production-aware, demo-ready.**

When your service breaks, Sentinel investigates, diagnoses, and recommends fixes — like having a senior SRE on call 24/7. It coordinates **three specialized models** to attack the problem from different angles:

- `gemini-2.5-flash` triages: pulls just enough telemetry to form an initial hypothesis
- `gemini-2.5-pro` investigates: forms a confident root-cause diagnosis with evidence
- `claude-sonnet-4-6` adversarially reviews: stress-tests the diagnosis, catches what was missed
- `gemini-2.5-pro` consolidates: synthesizes the final actionable report

The dashboard streams every phase live — tool calls, reasoning chains, the model dialogue — so operators see the agent's work, not just its output.

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
┌─────────────────┐         ┌──────────────────────────────────────┐
│  Dashboard UI   │ ◀ SSE ◀ │  POST /api/agent { incidentId }      │
│  (Next.js 16)   │         │                                      │
└─────────────────┘         │   runIncidentAgent (lib/agent.ts)    │
                            │                                      │
                            │   PHASE 1 · gemini-flash · triage    │
                            │     ├─ queryLogs                     │
                            │     ├─ queryMetrics                  │
                            │     └─ checkDeployHistory            │
                            │                                      │
                            │   PHASE 2 · gemini-pro · investigate │
                            │     └─ searchRunbook                 │
                            │                                      │
                            │   PHASE 3 · claude-sonnet · review   │
                            │     (no tools — pure critique)       │
                            │                                      │
                            │   PHASE 4 · gemini-pro · consolidate │
                            │     → strict-JSON final report       │
                            └──────────────────────────────────────┘
```

### Why multi-LLM matters

A single LLM can produce confident-sounding wrong answers. Production incident response can't accept that. Sentinel's adversarial reviewer (Claude) explicitly looks for what the investigator (Gemini Pro) missed or dismissed. This pattern catches misdiagnoses that any single model would miss — analogous to how a real on-call team works (oncall responds, senior pair-reviews).

### Files

- `lib/types.ts` — shared types
- `lib/mock/incidents.ts` — 3 realistic incident scenarios with logs/metrics/runbooks
- `lib/tools/index.ts` — 4 agent tools defined with Zod schemas
- `lib/agent.ts` — multi-LLM orchestration with phase events
- `app/api/agent/route.ts` — SSE streaming endpoint
- `app/api/incidents/route.ts` — incident list
- `app/page.tsx` — dashboard with live reasoning trace

## Stack

Next.js 16.2 · React 19 · TypeScript 5 · Tailwind v4 · Vercel AI SDK · Zod.

## License

MIT — built during the AI Agent Olympics 2026.
