# Sentinel

> **Autonomous Incident Response Agent · multi-vendor LLM orchestration · live web data via Bright Data · ~60s MTTR**

[![Hackathon](https://img.shields.io/badge/Qwen%20Cloud-Global%20AI%20Hackathon-722ed1)](https://qwencloud-hackathon.devpost.com/)
[![Stack](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Models](https://img.shields.io/badge/Qwen-Max-722ed1)](https://bailian.console.alibabacloud.com/)
[![Models](https://img.shields.io/badge/Claude-Sonnet%204.6-D97757)](https://anthropic.com)
[![Models](https://img.shields.io/badge/Gemini-2.5--Flash-4285F4)](https://aistudio.google.com)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)


**🚀 Live demo**: https://wma-contacting-lindsay-orientation.trycloudflare.com

---

When your service breaks at 3am, Sentinel investigates, diagnoses, and recommends fixes — like having a senior SRE on call 24/7. It coordinates **four specialized phases across three LLM vendors**, with **live web data fetched via Bright Data** so the agent sees what's broken upstream, not just downstream:

| # | Phase | Model (env-driven) | Role |
|---|---|---|---|
| 1 | 🔍 Triage | `PHASE1_CHAIN` — default: `qwen-max` → `claude-haiku-4-5` → `gemini-2.5-flash` | Internal telemetry + **Bright Data scrape of vendor status pages** |
| 2 | 🧠 Investigate | `PHASE2_CHAIN` — default: `claude-sonnet-4-6` | Deep reasoning + **Bright Data SERP search for public postmortems** + GitHub commit history |
| 3 | ⚔️ Adversarial review | `PHASE3_CHAIN` — default: `gemini-2.5-flash` | Stress-test the investigation with a structurally different vendor |
| 4 | 📋 Consolidate | `PHASE4_CHAIN` — default: `claude-haiku-4-5` | Strict-JSON action plan synthesis |

### Tools (7 total: 4 internal mock + 3 Bright Data live)

| Tool | Source | Purpose |
|---|---|---|
| `queryLogs` | internal (mock) | Recent app log lines per service |
| `queryMetrics` | internal (mock) | Time-series metrics with output bounding |
| `searchRunbook` | internal (mock) | Org's institutional knowledge library |
| `checkDeployHistory` | internal (mock) | Recent deploys per service |
| **`fetchVendorStatus`** | **Bright Data Web Unlocker** | Live scrape of status.stripe.com / githubstatus.com / AWS / Cloudflare / Vercel / OpenAI / Anthropic / Google Cloud |
| **`searchPublicPostmortems`** | **Bright Data SERP API** | Google search for how other engineers solved similar incidents |
| **`fetchGithubRecentCommits`** | **Bright Data Web Unlocker** | Pull last N commits from a public GitHub repo to correlate with upstream OSS regressions |

The dashboard streams every phase live — tool calls, reasoning chains, vendor handoffs — so operators see the agent's work, not just its output. Diagnoses cite specific timestamps, metric values, code paths, runbook IDs, AND quoted vendor status excerpts. The agent **honestly downgrades confidence** when evidence is uncertain. Graceful fallback: Claude Haiku if Gemini hits quota, curated mock data if Bright Data is unreachable — demo never breaks.

## Hackathon submissions

**Currently submitted to:**
- [Qwen Cloud Global AI Hackathon](https://qwencloud-hackathon.devpost.com/) — deadline 2026-07-09, $7K cash + $3K cloud credit per track. Sentinel runs Qwen-max as Phase 1 triage primary via DashScope OpenAI-compatible endpoint.

**Previously targeted (deadlines passed):** AI Agent Olympics (Milan AI Week, $28k), Transforming Enterprise Through AI ($10k), Bright Data Web Data UNLOCKED ($5k), HackerNoon Proof of Usefulness ($150k pool).

**Tracks emphasized:** Multi-Vendor Orchestration · Agentic Workflows · Real-World Web Grounding · Honest Confidence Calibration · Graceful Degradation as Architecture.

## Local dev

```bash
cp .env.local.example .env.local
# Fill in (defaults expect all three for full 3-vendor demo):
#   QWEN_API_KEY=                  (https://bailian.console.alibabacloud.com/ — Alibaba account, mainland endpoint)
#   ANTHROPIC_API_KEY=             (https://console.anthropic.com — paid, $5 free trial)
#   GOOGLE_GENERATIVE_AI_API_KEY=  (https://aistudio.google.com/apikey — free tier ample)
# Optional but recommended for live web data:
#   BRIGHT_DATA_API_KEY=           (https://brightdata.com/cp/api_settings — without, tools fall back to mock)
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
                            │   PHASE 1 · PHASE1_CHAIN · triage          │
                            │     ├─ queryLogs                           │
                            │     ├─ queryMetrics                        │
                            │     └─ checkDeployHistory                  │
                            │             ↓ hand-off                     │
                            │   PHASE 2 · PHASE2_CHAIN · investigate     │
                            │     └─ searchRunbook                       │
                            │             ↓ hand-off (vendor flip)       │
                            │   PHASE 3 · PHASE3_CHAIN · review          │
                            │     (no tools — pure adversarial critique) │
                            │             ↓ hand-off                     │
                            │   PHASE 4 · PHASE4_CHAIN · consolidate     │
                            │     → strict-JSON final report             │
                            └────────────────────────────────────────────┘
```

### Why multi-vendor matters

Same-family models share blind spots. When Claude Sonnet's investigation is reviewed by Claude Haiku, both might miss the same class of error. When it's reviewed by Gemini Flash, the structurally different training catches things Claude wouldn't see. Sentinel's adversarial reviewer is **always a different vendor** for this reason.

Each phase reads a comma-separated model chain from env (`PHASE1_CHAIN`, `PHASE2_CHAIN`, `PHASE3_CHAIN`, `PHASE4_CHAIN`). The default for this deploy: Phase 1 Qwen-max → Claude Haiku → Gemini Flash; Phase 2 Claude Sonnet; Phase 3 Gemini Flash; Phase 4 Claude Haiku. Swap vendors without touching any code — deployment = configuration.

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
