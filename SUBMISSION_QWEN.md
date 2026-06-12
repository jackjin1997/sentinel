# Sentinel · Qwen Cloud Global AI Hackathon Submission Pack

All copy-paste-ready text for **Qwen Cloud Global AI Hackathon** on Devpost.

- Deadline: **2026-07-09**
- Prize: $7,000 cash + $3,000 cloud credit per track
- URL: https://qwencloud-hackathon.devpost.com/
- Hard requirement: must use Qwen models. Multi-agent / multi-model orchestration encouraged.

---

## Why Sentinel for Qwen Cloud

Sentinel orchestrates **3 LLM vendors** (Qwen + Anthropic + Google) across 4 incident-response phases. Qwen-max anchors Phase 1 (Triage) — the highest-frequency phase, where cost-per-call and fast tool-calling matter most. Two cascading fallbacks (Claude Haiku → Gemini Flash) mean the demo never breaks under quota, network, or API failures. Cross-vendor adversarial review is mathematically stronger with three families instead of two — different training data, different reinforcement choices, different blind spots.

The architecture deliberately uses Vercel AI SDK's **`@ai-sdk/openai-compatible` adapter** against DashScope's OpenAI-compatible endpoint. This means Sentinel doesn't need any Qwen-specific client code — Qwen plugs in via the same interface Sentinel uses for every other vendor. The portability story is itself a selling point for production teams who don't want vendor lock-in.

---

## Elevator pitch (≤140 char)

> Sentinel is a 3-vendor LLM agent for production incident response. Qwen triages, Claude investigates, Gemini critiques. ~60s to root cause.

## Short description (≤300 char)

> When production breaks at 3am, Sentinel investigates with INTERNAL telemetry + REAL public web data. **Qwen-max** triages → **Claude Sonnet** investigates → **Gemini Flash** adversarially reviews → **Claude Haiku** consolidates. Three LLM vendors, ~60s end-to-end, root cause grounded in real signals.

## Long description (≤1000 char)

> Production incident response is the highest-stakes work humans do under time pressure — and a single confident-but-wrong LLM is a liability. Sentinel solves this with **3-vendor adversarial orchestration grounded in REAL web data**:
>
> 🚀 **Qwen-max** triages — internal telemetry (logs/metrics/deploys) + Bright Data scrapes vendor status pages (status.stripe.com, GitHub, AWS, Cloudflare) to immediately rule in/out upstream-vendor outages. Phase 1 demands fast tool-use + cost efficiency; Qwen wins both.
>
> 🧠 **Claude Sonnet** investigates — deep root-cause reasoning, runbook search + public-postmortem SERP + upstream GitHub commit correlation
>
> ⚔️ **Gemini Flash** adversarially reviews Claude's work — different vendor, structurally different bias, catches what Claude missed
>
> 📋 **Claude Haiku** consolidates a strict-JSON action plan
>
> Every phase streams live via SSE. Mock fallback at every tool call, two cascading model fallbacks at every phase — demo survives quota / network / API failures.
>
> Stack: Vercel AI SDK 6 + `@ai-sdk/openai-compatible` (Qwen via DashScope) + `@ai-sdk/anthropic` + `@ai-sdk/google` + Next.js 16 + Zod tools + SSE + Bright Data Web Unlocker.

---

## Devpost submission form fields

### Project name
Sentinel

### Tagline
3-vendor LLM agent for production incident response — Qwen triages, Claude investigates, Gemini critiques.

### Inspiration
Every "AI on-call" tool I tried had the same two failure modes: a single LLM (confident but blind-spot-prone), and internal-data-only (misses upstream-vendor outages). The most expensive incidents are usually triggered by something outside your infrastructure — exactly what humans solve by glancing at status.stripe.com. Sentinel was built to make an AI agent that does the same thing, with mathematically meaningful cross-vendor review.

### What it does
Sentinel takes a production incident (P99 latency spike, error budget burn, etc.) and runs a 4-phase autonomous investigation. Phase 1 (Qwen-max) triages internal telemetry plus live vendor status pages. Phase 2 (Claude Sonnet) deep-investigates with runbook + public postmortems + upstream GitHub commits. Phase 3 (Gemini Flash) adversarially critiques Phase 2's diagnosis. Phase 4 (Claude Haiku) outputs a strict-JSON action plan with confidence calibration. The dashboard streams every step live via SSE.

### How I built it
- **Frontend/backend**: Next.js 16 + React 19 + Tailwind v4. SSE streaming via `ReadableStream` with backpressure detection via `controller.desiredSize` + 200-event cumulative miss ceiling.
- **LLM orchestration**: Vercel AI SDK 6 (`streamText`, `generateText`, `tool()`, `stepCountIs`). 4 phases × 3 vendors.
- **Qwen integration**: `@ai-sdk/openai-compatible` pointed at DashScope's OpenAI-compatible endpoint (`https://dashscope.aliyuncs.com/compatible-mode/v1`). No vendor-specific client — same adapter pattern used for every vendor.
- **Tool layer**: 7 tools — 4 internal mocks (logs/metrics/runbook/deploys) + 3 Bright Data Web Unlocker calls (vendor status, SERP postmortem search, GitHub commits)
- **Resilience**: Cascading fallback chain at Phase 1 (Qwen → Haiku → Gemini). Mock fallback per BD tool. AbortController propagated through every `streamText` for clean client-disconnect cancellation. Body-size cap on the agent endpoint.
- **Deploy**: Vultr $6/mo SG instance + Cloudflare Tunnel for stable HTTPS without managing certs.

### Challenges I ran into
1. **No official `@ai-sdk/qwen` adapter exists** — I confirmed via `npm view` + npm search. Solved by routing Qwen-max through `@ai-sdk/openai-compatible` against DashScope's OpenAI-compat endpoint. Tool calling works identically. Bonus: the architecture stays vendor-agnostic.
2. **Cascading fallbacks without breaking tool calling** — original code had Gemini → Haiku fallback for empty results. Adding Qwen as primary needed Qwen → Haiku → Gemini chain without losing per-step tool capability. Solved by reusing `runStreamingPhase` helper with `useTools: true` at every fallback level.
3. **Cross-vendor SSE stream consistency** — Qwen's OpenAI-compat layer returns slightly different streaming chunk shapes than Anthropic / Google native SDKs. Vercel AI SDK 6 abstracted most of this away; the few edge cases (empty `text-delta`) handled by trimming + checking `triageText.trim()`.

### Accomplishments
- **3-vendor cross-family adversarial review**, not just 2 — first prototype I've seen of three families critiquing each other in production-shape code.
- **Graceful degradation at every layer** — mock fallback per BD tool + cascading model fallback per phase. Live demo survives quota exhaustion, network outage, vendor API limits.
- **Honest confidence calibration** — Phase 4 system prompt requires "medium" instead of "high" when evidence is incomplete. The output is less impressive-sounding and more useful.

### What I learned
- Cross-vendor adversarial review surfaces business-risk concerns that same-family review misses — e.g. "activating async-queue fallback requires finance sign-off" caught only by Gemini reviewing Claude.
- OpenAI-compatible endpoints are an underrated integration path. Three vendors, one adapter pattern. Future Qwen / DeepSeek / Mistral additions are config changes, not code changes.
- Mock fallback as architecture principle is criminally underused in hackathon demos. The biggest demo-killer at judging events is a flaky vendor API; mock fallback turns that into a `mock` badge instead of a crash.

### What's next
- Real telemetry connectors (Datadog, PagerDuty webhook in, Grafana out)
- Persistent runbook learning — propose runbook updates after every resolved incident
- More Bright Data integrations (Browser API for incident-page screenshots, Structured Data API for vendor SLA history)
- Run multiple Sentinel regions for SEV-1 failover (the agent shouldn't go down during the worst incidents)

### Built with
- Qwen-max (DashScope OpenAI-compatible endpoint via `@ai-sdk/openai-compatible`)
- Claude Sonnet 4.6 + Claude Haiku 4.5 (`@ai-sdk/anthropic`)
- Gemini 2.5 Flash (`@ai-sdk/google`)
- Vercel AI SDK 6
- Next.js 16 + React 19 + TypeScript + Tailwind v4
- Bright Data Web Unlocker + SERP API
- Zod (tool schema validation)
- Server-Sent Events (custom `ReadableStream` with backpressure detection)
- Vultr Cloud Compute + Cloudflare Tunnel
- Bun (package manager + runtime)

### Try it
- Live demo: <TBD — set after deploy>
- Repo: https://github.com/jackjin1997/sentinel (MIT)
- 60s demo video: <TBD — link after upload>

---

## 60-second demo video script (Qwen-focused)

**[0:00-0:05]** Screen: dashboard, 5 incident cards on left. Header shows **3 vendor pills**: 🟪 Qwen · qwen-max · 🟧 Anthropic · 🟦 Google.

> "Production breaks. You have 60 seconds. Sentinel — three LLM vendors — investigates."

**[0:05-0:10]** Click `INC-001 checkout-api P99 latency spike to 3.2s`. Phase 1 starts streaming. Model badge: **Qwen-max**.

> "Qwen-max triages. Fast, cheap, multilingual. Calls tools immediately."

**[0:10-0:20]** Tool calls appear under Phase 1: `📊 queryMetrics`, `📜 queryLogs`, `📦 checkDeployHistory`, `🌐 fetchVendorStatus`. The last one expands to "Stripe: degraded performance, Payment Intents elevated 5xx."

> "Real Stripe status, scraped live via Bright Data. Qwen rules in the upstream vendor in under ten seconds."

**[0:20-0:30]** Phase 2 starts — model badge: **Claude Sonnet**. Tool calls: `📖 searchRunbook` + `🔎 searchPublicPostmortems` + `🐙 fetchGithubRecentCommits`.

> "Vendor hand-off. Claude Sonnet investigates. Runbook + public postmortems + upstream commit correlation."

**[0:30-0:40]** Phase 3 — Gemini Flash adversarially reviews Claude's diagnosis. Visible "critique" annotations appear.

> "Gemini reviews Claude. Different family — different blind spots. Cross-vendor truth."

**[0:40-0:50]** Phase 4 — Claude Haiku consolidates. JSON action plan crystallizes at top.

> "Haiku consolidates. Strict JSON. Three commands. Confidence honestly calibrated — medium, not high."

**[0:50-0:60]** MTTR badge: `56s`. Tagline: **Sentinel — 3-vendor adversarial truth, real-web grounding, ~60s to root cause.**

> "Sub-minute MTTR. Three vendors. Real web data. That's the new on-call."

---

## X / Twitter launch thread (8 tweets, Qwen-focused)

**1/8** (hook)
> Built an AI agent that responds to production incidents like a senior SRE.
>
> Three LLM vendors. Real vendor status pages, scraped live. Under a minute to root cause.
>
> Here's the trick: it doesn't trust itself. Different vendors critique each other. 🧵

**2/8** (the problem)
> A single LLM in production incident response is dangerous. Confident-sounding wrong answers, blind to upstream vendor outages because it only sees your internal logs.
>
> Real on-call uses internal + external + adversarial review. So I built Sentinel:

**3/8** (architecture)
> 🚀 Qwen-max triages: internal telemetry + scrapes vendor status pages live via @bright_data
> 🧠 Claude Sonnet investigates: runbook + public postmortems + upstream commits
> ⚔️ Gemini Flash adversarially reviews — different vendor, different bias
> 📋 Claude Haiku → strict-JSON action plan

**4/8** (Why Qwen)
> Phase 1 is the most-called phase. It needs cheap, fast tool-calling.
>
> Qwen-max via DashScope OpenAI-compat. No vendor-specific code — same `@ai-sdk/openai-compatible` adapter works. Sentinel stays vendor-agnostic.

**5/8** (Bright Data role)
> Real vendor status pages (Stripe, GitHub, AWS, Cloudflare) become live agent tools.
>
> No more "vendor said all green" while their dashboard says fire. Plus SERP search for similar public postmortems.

**6/8** (demo)
> Live demo: click incident → watch all 4 phases stream in real-time. Tool calls, reasoning chains, final report. ~60s MTTR.
>
> [embed video]

**7/8** (resilience)
> Mock fallback per Bright Data tool. Cascading model fallback per phase (Qwen → Haiku → Gemini).
>
> Demo survives quota exhaustion + network outages + API limits. The pattern is criminally underused in hackathon code.

**8/8** (CTA)
> All code is MIT: https://github.com/jackjin1997/sentinel
>
> Built for the @QwenLM Cloud Global AI Hackathon. Three vendors, one adapter pattern, real-web grounding. Would love feedback from anyone running production systems.

---

## Critical pre-submission checklist

- [ ] QWEN_API_KEY set in prod `.env.local` (Vultr) — verify Phase 1 logs show "qwen-max" not "fallback"
- [ ] Live demo URL works (status 200, agent runs end-to-end)
- [ ] 60s demo video recorded + uploaded to GitHub Release
- [ ] README updated with Qwen Cloud hackathon badge
- [ ] Devpost project created with all fields above
- [ ] X thread posted, with @QwenLM / @alibaba_cloud tagged
- [ ] HackerNoon article cross-posted (optional, separate channel)
