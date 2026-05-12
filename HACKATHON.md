# Sentinel · Hackathon Submission Pack

All copy-paste-ready text for AI Agent Olympics (5/20) + Transforming Enterprise (5/19) submissions.

---

## Elevator pitch (1 line, 140 char)

> Sentinel is an autonomous incident response agent — three specialized LLMs investigate, diagnose, and recommend fixes for production outages in ~30 seconds.

## One-paragraph description (≤300 char)

> When a service breaks at 3am, Sentinel dispatches three specialized LLMs in sequence — Gemini Flash triages the alert, Claude Sonnet investigates with full tool access (logs, metrics, runbooks, deploys), Gemini Flash adversarially reviews the diagnosis with a different vendor's bias, and Claude Sonnet consolidates a structured action report. Built on Vercel AI SDK + Next.js, streams every phase live, MTTR ≤ 30s.

## Long description (≤1000 char, for submission form)

> Production incident response is the highest-stakes work humans do under time pressure. A single confident-but-wrong LLM is a liability there. Sentinel solves this with **adversarial cross-vendor orchestration**: Gemini-Flash triages telemetry → Claude-Sonnet does deep root-cause reasoning with tools → Gemini-Flash reviews Claude's work with genuinely different vendor bias → Claude-Sonnet consolidates a structured action plan. Each phase streams live to the dashboard — judges see the agents work, not just their output. Diagnoses cite specific timestamps, metric values, code paths, and internal runbooks. The agent **honestly downgrades confidence** when evidence is uncertain. Graceful Claude Haiku fallback ensures the demo never breaks if Gemini hits quota. Stack: Next.js 16 + AI SDK 6 + Zod tools + SSE streaming. Hits Intelligent Reasoning + Agentic Workflows + Collaborative Systems + Enterprise Utility tracks simultaneously.

---

## 30-second demo video script

**[0:00-0:03]** Screen: terminal-style dashboard, dark, 5 incident cards on left.

> "Production breaks. You have 30 seconds. Sentinel investigates."

**[0:03-0:08]** Click `INC-002 auth-service connection pool exhausted` (critical). Phase 1 starts streaming.

> "Three specialized LLMs across two vendors take it from here."

**[0:08-0:15]** Phases 1+2 stream live — Gemini Flash triages, Claude Sonnet investigates. Tool calls appear: `📊 queryMetrics`, `📜 queryLogs`, `📖 searchRunbook`.

> "Triage, investigate, tool calls — every phase is live."

**[0:15-0:20]** Phase 3 adversarial-review highlight (orange chip "Anthropic" challenges previous Claude work via different vendor).

> "Crucially, the reviewer is a different vendor — actually different bias."

**[0:20-0:25]** Final report appears at top: root cause with timestamp, MTTR shown, 5 specific recommendations.

> "Result: precise root cause, confidence honestly calibrated, runnable commands."

**[0:25-0:30]** Show MTTR `27.4s` ending shot. Tagline appears: **Sentinel — autonomous SRE, multi-vendor truth.**

> "Half a minute. That's the new MTTR."

---

## X / Twitter launch thread (8 tweets)

**1/8** (hook)
> Built an AI agent that responds to production incidents like a senior SRE.

> When something breaks, it investigates, diagnoses root cause, and writes you a runnable action plan — in ~30 seconds.

> Here's the trick: it doesn't trust itself. 🧵

**2/8** (the problem)
> A single LLM in production incident response is dangerous. They produce confident-sounding wrong answers.

> Real on-call works in pairs: oncall responds, senior reviews.

> So I built Sentinel with FOUR phases across TWO vendors:

**3/8** (architecture image / diagram)
> 🔍 Gemini Flash triages: pulls just enough telemetry
> 🧠 Claude Sonnet investigates: deep root-cause with tools
> ⚔️ Gemini Flash adversarially reviews — different vendor, different bias
> 📋 Claude Sonnet consolidates: strict-JSON action plan

> Each phase = different model, different role.

**4/8** (demo gif/video)
> Live demo: click incident → watch all 4 phases stream in real-time. Tool calls, reasoning chains, final report. ~30 second MTTR.

> [embed video/gif]

**5/8** (diagnosis quality)
> The agents cite specific timestamps, metric values, code paths, runbook IDs.

> When they're unsure, they say "confidence: medium" instead of bluffing.

> Recommendations include side-effect warnings. Sample output ↓

> [screenshot of INC-004 final report]

**6/8** (why multi-vendor matters)
> The adversarial reviewer uses a DIFFERENT VENDOR's model on purpose.

> Same-family models share bias. Different vendors genuinely disagree.

> Gemini routinely catches what Claude missed. And vice versa.

**7/8** (stack)
> Stack: @nextjs 16, @vercel AI SDK 6, @googleaistudio Gemini, @anthropicai Claude, Zod-typed tools, SSE streaming.

> Auto-fallback to Claude Haiku if either vendor hits quota. Demo never breaks.

**8/8** (CTA)
> Code: github.com/jackjin1997/sentinel
> Live demo: <vultr-url>
> Built for AI Agent Olympics 2026 + Transforming Enterprise track.

> If you run production systems and have thoughts on this pattern, I want to hear them. 🦾

---

## Submission form quick-fills

### Project name
`Sentinel`

### Tagline
`Autonomous incident response agent · multi-vendor LLM orchestration`

### Track selections
- AI Agent Olympics: Intelligent Reasoning + Agentic Workflows + Collaborative Systems + Enterprise Utility
- Transforming Enterprise: Track 2 (AI Agents with Google AI Studio) primary, Track 1 (Agent Security) secondary

### Tech stack
Next.js 16 · React 19 · TypeScript · Vercel AI SDK · Google Gemini 2.5 Flash · Anthropic Claude Sonnet 4.6 · Zod · Server-Sent Events streaming

### What problem does it solve?
Production incident response is high-stakes work under time pressure where confident-but-wrong LLMs are dangerous. Sentinel runs adversarial cross-vendor orchestration so the diagnosis is reviewed by a genuinely different model bias before action is recommended.

### How is it different from existing solutions?
DataDog / PagerDuty AI features use single-vendor pipelines. Sentinel deliberately uses TWO vendors (Google + Anthropic) so the reviewer phase has structurally different bias. The phase trace is fully observable — operators see the reasoning, not just the output. Open source.

### What was built during the hackathon?
The entire system — agent orchestration, tool definitions, streaming API, dashboard UI, 5 realistic incident scenarios, 6 runbooks, multi-vendor fallback. ~1500 lines of TypeScript, end-to-end working with sub-30s MTTR.

---

## Naming alternatives (if Sentinel taken)

- **OnCall** — name it for the role it replaces
- **Triage** — names the first phase
- **Stethoscope** — diagnostic instrument metaphor
- **Sevhound** — chases SEV-1s
- **Bridgekeeper** — gatekeeps the incident bridge

## Open questions for user / decisions

- [ ] Should the demo video have voice-over or text-only overlay?
- [ ] Do we open-source code under MIT (default) or AGPL?
- [ ] Do we attempt Vultr deploy for the Vultr Enterprise Agent award ($500-2000 partner award)?
- [ ] X thread: post from @jackjin1997 personal or create a fresh project account?
