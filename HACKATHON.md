# Sentinel · Hackathon Submission Pack

All copy-paste-ready text for **Bright Data Web Data UNLOCKED** (Lablab 5/25-5/31, $5k) and **HackerNoon Proof of Usefulness** (until 6/5, $150K+) submissions.

---

## Elevator pitch (1 line, 140 char)

> Sentinel is a multi-vendor LLM agent for production incident response — combines INTERNAL telemetry with REAL public web signals via Bright Data.

## One-paragraph description (≤300 char)

> When production breaks at 3am, Sentinel investigates with both INTERNAL telemetry (logs, metrics, runbooks) AND REAL public web signals via Bright Data (vendor status pages, public postmortems, GitHub commit history) — four LLM phases across two vendors orchestrate the diagnosis in ~60 seconds.

## Long description (≤1000 char, for submission form)

> Production incident response is the highest-stakes work humans do under time pressure — and a single confident-but-wrong LLM is a liability. Sentinel solves this with **adversarial cross-vendor orchestration grounded in REAL web data**:
>
> 🔍 Gemini-Flash **triages** — internal telemetry + Bright Data scrapes vendor status pages (status.stripe.com, GitHub Status, AWS, Cloudflare) to immediately rule in/out upstream-vendor outages
> 🧠 Claude-Sonnet **investigates** — deep root-cause reasoning. Calls searchRunbook (internal) + Bright Data SERP to find how others solved similar incidents (public postmortems), and fetchGithubRecentCommits to correlate with upstream OSS regressions
> ⚔️ Gemini-Flash **adversarially reviews** Claude's work — different vendor, genuinely different bias, catches what Claude missed
> 📋 Claude-Haiku **consolidates** a strict-JSON action plan
>
> Every phase streams live to the dashboard via SSE — operators see the agents WORK, not just their output. Diagnoses cite specific timestamps, metric values, code paths, runbook IDs, AND real vendor status excerpts. Graceful mock fallback if Bright Data quota / Gemini hits a limit — demo never breaks.
>
> Stack: Next.js 16 + Vercel AI SDK 6 + Zod tools + SSE streaming + Bright Data Web Unlocker API + SERP API. ~1700 lines of TypeScript.

---

## 30-second demo video script

**[0:00-0:03]** Screen: terminal-style dashboard, dark, 5 incident cards on left. Header shows "🟦 Google · gemini-2.5-flash" and "🟧 Anthropic · claude-sonnet-4-6".

> "Production breaks. You have 60 seconds. Sentinel investigates."

**[0:03-0:08]** Click `INC-001 checkout-api P99 latency spike to 3.2s` (high). Phase 1 starts streaming.

> "Triage: Gemini Flash pulls INTERNAL telemetry — logs, metrics — and immediately checks Stripe's REAL status page via Bright Data."

**[0:08-0:15]** Phase 1 tool calls appear: `📊 queryMetrics`, `📜 queryLogs`, **`🌐 fetchVendorStatus`**. Last one expands to show "Stripe: degraded performance, Payment Intents API elevated error rate."

> "Real vendor status — not guessed, scraped live. Bright Data Web Unlocker."

**[0:15-0:25]** Phase 2 — Claude Sonnet investigates. Tool calls: `📖 searchRunbook` (internal) + `🔎 searchPublicPostmortems` (Bright Data SERP). Sample result: "Stripe's circuit breaker pattern — postmortem".

> "Claude searches both our runbook AND the public web for similar postmortems. Different vendor, different bias, full transparency."

**[0:25-0:40]** Phase 3 — Gemini Flash adversarially reviews Claude's diagnosis. Phase 4 — Claude Haiku consolidates JSON.

> "Cross-vendor adversarial review catches what single-LLM agents miss."

**[0:40-0:55]** Final report appears at top: root cause cites Stripe explicitly, confidence: medium (honest), 3 recommendations with side-effect notes.

> "Root cause grounded in real vendor data. Confidence honestly calibrated. Three actionable commands."

**[0:55-1:00]** Show MTTR `56s` badge. Tagline: **Sentinel — autonomous SRE, multi-vendor truth, real-web grounding.**

> "Under a minute. Real web data + multi-LLM. That's the new MTTR."

---

## X / Twitter launch thread (8 tweets)

**1/8** (hook)
> Built an AI agent that responds to production incidents like a senior SRE.

> When something breaks, it investigates, pulls REAL vendor status pages live, diagnoses, and writes you a runnable action plan — in under a minute.

> Here's the trick: it doesn't trust itself. 🧵

**2/8** (the problem)
> A single LLM in production incident response is dangerous. They produce confident-sounding wrong answers — sometimes missing obvious upstream-vendor outages because they only see your internal logs.

> Real on-call uses both internal signals AND external web data. Senior on top.

> So I built Sentinel:

**3/8** (architecture)
> 🔍 Gemini Flash triages: internal telemetry + scrapes vendor status pages live via @bright_data
> 🧠 Claude Sonnet investigates: searches runbook + public postmortems via BD SERP
> ⚔️ Gemini Flash adversarially reviews — different vendor, different bias
> 📋 Claude Haiku → strict-JSON action plan

**4/8** (Bright Data role)
> @bright_data Web Unlocker is the secret weapon. Real vendor status pages (Stripe, GitHub, AWS, Cloudflare) become live agent tools. No more "vendor said all green" while their dashboard says fire.

> Plus SERP search to find how others solved your exact incident class.

**5/8** (demo gif/video)
> Live demo: click incident → watch all 4 phases stream in real-time. Tool calls, reasoning chains, final report. ~60s MTTR.

> [embed video]

**6/8** (diagnosis quality)
> Agents cite specific timestamps, metric values, code paths, runbook IDs, AND quoted vendor status excerpts.

> When unsure, they say "confidence: medium" instead of bluffing.

> [screenshot of final report]

**7/8** (stack)
> Stack: @nextjs 16, @vercel AI SDK 6, @googleaistudio Gemini, @anthropicai Claude, @bright_data Web Unlocker + SERP, Zod tools, SSE streaming.

> Auto-fallback to Claude Haiku + mock data if any vendor hits quota. Demo never breaks.

**8/8** (CTA)
> Code: https://github.com/jackjin1997/sentinel
> Live demo: https://wma-contacting-lindsay-orientation.trycloudflare.com
> Built for @bright_data x @lablabai Web Data UNLOCKED hackathon + @hackernoon Proof of Usefulness.

> If you run production systems, I want your thoughts. 🦾

---

## Submission form quick-fills

### Project name
`Sentinel`

### Tagline
`Multi-vendor LLM agent for production incident response — internal telemetry meets live web data via Bright Data`

### Track / category — Bright Data Lablab "Web Data UNLOCKED"
☑️ Most creative use of Bright Data Web Unlocker (vendor status pages as agent tools)
☑️ Best AI-agent-with-MCP-style architecture (4 LLM phases × 2 vendors × 7 tools)

### Track / category — HackerNoon Proof of Usefulness
Primary submission angle: **AI + ML category** (sponsor tech usage = bigger prize)
Story: Real utility — Sentinel turns lengthy on-call investigations into ~60s diagnoses with cited evidence. Built to solve a recurring expensive problem (production incident MTTR), not just a vibe-coded demo.

### Tech stack
Next.js 16 · React 19 · TypeScript · Vercel AI SDK · Google Gemini 2.5 Flash · Anthropic Claude Sonnet 4.6 / Haiku 4.5 · **Bright Data Web Unlocker + SERP API** · Zod · Server-Sent Events streaming · Cloudflare Tunnel · Vultr

### What problem does it solve?
Production incident response is time-pressured high-stakes work where a single confidently-wrong LLM is dangerous, AND where the root cause is often outside your own infrastructure (upstream vendor outage). Sentinel solves both: adversarial cross-vendor LLM review prevents single-model blindspots, and Bright Data integration gives the agent live access to public web signals (vendor status pages, postmortem archives, GitHub) so it can see what's broken UPSTREAM, not just downstream.

### How is it different from existing solutions?
DataDog / PagerDuty AI features are single-vendor LLM pipelines confined to internal observability data. Sentinel deliberately uses TWO LLM vendors (Google + Anthropic) for adversarial review + REAL public web data via Bright Data (vendor status, postmortems, GitHub). Operators see the full reasoning trace including which signal came from which source. Open source under MIT.

### What was built during the hackathon?
The entire system — 7 agent tools (4 internal mock + 3 Bright Data live), multi-vendor LLM orchestration with graceful fallback, streaming dashboard UI, 5 realistic incident scenarios with 6 runbooks, all glued by Vercel AI SDK 6. ~1700 lines of TypeScript. End-to-end working with sub-60s MTTR. Deployed on Vultr behind Cloudflare Tunnel.

---

## Naming alternatives (if Sentinel taken)

- **OnCall** — name it for the role it replaces
- **Triage** — names the first phase
- **Sevhound** — chases SEV-1s
- **Web-Aware** — emphasizes the BD live-web differentiator

## Open questions for user / decisions

- [ ] Demo video: voice-over or text-only overlay?
- [ ] OSS license MIT (default) or AGPL?
- [ ] X thread: post from @jackjin1997 personal or fresh project account?
- [ ] HackerNoon submission — submit a separate article on hackernoon.com explaining the architecture? (helps the "proof of usefulness" framing)
