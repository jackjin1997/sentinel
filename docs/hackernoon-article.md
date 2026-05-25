# Why My AI Incident-Response Agent Uses TWO Different LLM Vendors (And Pulls Real Web Data)

*Draft for cross-posting to hackernoon.com as Proof-of-Usefulness submission bonus.*

---

It's 3:47 AM. PagerDuty fires. P99 latency on `checkout-api` just went from 280ms to 3.2 seconds in four minutes. Stripe charge timeouts. Customer support inbox lighting up.

You jump in the war room. You start the usual on-call dance: tail logs, check Grafana, hit `kubectl get pods`, scroll Twitter for "Stripe down" mentions, ping a friend at Stripe.

Two minutes of pure context switching before you've even formed a hypothesis.

Every "AI on-call" tool I've tried promises to compress those two minutes to zero. Every one disappoints in the same way: they're a single LLM staring at internal observability data, producing confident-sounding diagnoses without ever stepping outside your own infrastructure. When the root cause is "Stripe is having a bad day" — exactly the kind of thing humans solve with a 5-second peek at status.stripe.com — the AI confidently blames your database.

I built **Sentinel** to fix two structural problems in this space:

1. **Single-LLM diagnoses are dangerous.** They have well-documented blind spots. Same-family models share those blind spots.
2. **Internal-only data misses upstream causes.** The most expensive incidents are the ones where the trigger is outside your control.

The architecture is unfashionably simple: four phases, two LLM vendors, three "real web data" tools via Bright Data. End-to-end in ~60 seconds. This article walks through what I built, why each choice mattered, and what I learned shipping it.

## The Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ PHASE 1 · Triage      · gemini-2.5-flash (Google)            │
│   queryLogs · queryMetrics · checkDeployHistory              │
│   + fetchVendorStatus (Bright Data: status.stripe.com etc.)  │
│                                                              │
│   ↓ hand-off, vendor flip                                    │
│                                                              │
│ PHASE 2 · Investigate · claude-sonnet-4-6 (Anthropic)        │
│   searchRunbook                                              │
│   + searchPublicPostmortems (BD SERP API)                    │
│   + fetchGithubRecentCommits (BD Web Unlocker)               │
│                                                              │
│   ↓ hand-off, vendor flip back                               │
│                                                              │
│ PHASE 3 · Adversarial Review · gemini-2.5-flash (Google)     │
│   (no tools — pure critique with different vendor bias)      │
│                                                              │
│   ↓ hand-off                                                 │
│                                                              │
│ PHASE 4 · Consolidate · claude-haiku-4-5 (Anthropic)         │
│   → strict-JSON final report                                 │
└──────────────────────────────────────────────────────────────┘
```

Four phases. Two vendors. Seven tools (four internal mock + three Bright Data live). Server-sent events stream every step to the dashboard so you watch the agents work.

## Why Two Vendors

The pitch sounds gimmicky until you've used it. The motivation is straightforward:

> Models within the same family share biases. The adversarial reviewer must come from a different family to add real signal.

Claude Sonnet investigates. If I asked Claude Haiku to review Claude Sonnet's diagnosis, both would tend to over-trust the same kind of evidence, under-weight the same alternative hypotheses, agree on the same plausible-but-wrong remediations. Asking Gemini Flash to review Claude's work — a model trained on a structurally different dataset with different reinforcement choices — gives me a reviewer that genuinely disagrees sometimes.

In practice, Gemini's adversarial pass routinely catches things like:

- "The 4-minute ramp suggests gradual resource exhaustion, not the hard cutover Claude assumed"
- "Customer complaints at 14:21Z predate the metric alert at 14:23Z — there's a ≥2 minute alerting blind spot, separate from the root cause"
- "Activating the async-queue fallback (Claude's recommendation #2) requires explicit finance/product sign-off because it accepts orders without guaranteed payment — Claude treated it as a free move"

That last one in particular — *recognizing business risk inherent in a technical remediation* — is rarely something a model catches reviewing its own output. Cross-vendor review surfaces it consistently.

## Why Real Web Data

Bright Data integration came late in the design but became the differentiator. The story shifted from "agent that diagnoses your services" to "agent that diagnoses your services with awareness of the world outside them." Three tools, all calling Bright Data's Web Unlocker / SERP APIs:

### `fetchVendorStatus(vendor)` — live status page scrape

When the agent suspects an upstream dependency, it pulls that vendor's status page directly. Stripe, GitHub, AWS, Cloudflare, Vercel, OpenAI, Anthropic, Google Cloud — all supported.

A typical run:

```json
{
  "vendor": "Stripe",
  "source": "brightdata",
  "status": "degraded performance",
  "incidents": [
    {
      "name": "Elevated 5xx on Payment Intents",
      "status": "investigating",
      "updated_at": "2026-05-12T14:24:00Z"
    }
  ]
}
```

When the answer is in there, downstream diagnosis is immediate. When it isn't, the agent has *cleanly ruled out* an upstream cause — which is itself useful evidence.

### `searchPublicPostmortems(query)` — SERP search for prior art

For incidents that match well-known patterns ("Redis maxmemory noeviction storm", "Postgres long-query pool exhaustion"), there are usually three or four high-quality public postmortems written by engineers at Slack, GitHub, Stripe, Cloudflare etc. The agent SERP-searches for them and pulls the top results. The remediation suggestions become battle-tested rather than improvised.

### `fetchGithubRecentCommits(repo)` — upstream OSS regression check

When the incident correlates with a recent dependency bump, the agent fetches the last N commits to the upstream public repo to look for breaking changes or recent reverts. Cheap, fast, and often the missing piece.

## Why Server-Sent Events Were Critical

The dashboard streams every phase live: tool calls appear as they're made, tool results expand to show the actual JSON returned, model thinking text deltas down the screen in real time. SSE was the natural choice — bidirectional WebSocket would be overkill, polling would be janky.

There are three subtle SSE traps I hit during this project:

1. **Body-size attack vector**: `req.text()` buffers the entire incoming request. Without an explicit cap, an adversarial POST can OOM the runtime before you've even authenticated. Fix: read `content-length` header before consuming, second-line-of-defense byte-cap on the buffered text.

2. **Zombie streams**: when a user navigates away mid-investigation, naive SSE keeps streaming until the connection times out — burning LLM tokens for 60+ seconds with no one watching. Fix: `AbortController` propagated through every `streamText()` call, plus a `cancel()` callback on the `ReadableStream`.

3. **Slow-consumer denial of service**: if a consumer's network can't keep up, the SSE queue grows unbounded server-side. The Web Streams API exposes `controller.desiredSize` — when that goes ≤ 0, the queue is at its high-water mark. Sentinel counts cumulative misses (not consecutive — a trivial drain shouldn't reset the counter) and aborts the agent after 200 consecutive backpressure misses.

Those three patches add maybe 40 lines of code total and turn an "it works on my localhost" demo into a server that won't fall over the first time someone tries to break it.

## The Mock Fallback That Saves Demos

The single most pragmatic decision I made: every Bright Data tool has a curated mock fallback. If `BRIGHT_DATA_API_KEY` isn't set, or the BD API errors, or the call times out, the tool returns realistic-looking data tagged `source: "mock-fallback"`. The dashboard renders this with a small `mock` badge so observers can tell which signals are real.

This pattern is criminally underused in hackathon demos. The most common failure I see at judging events is "the demo works on my laptop but the wifi here is flaky, give me a minute" — at which point the judges are already mentally elsewhere. Sentinel's demo can survive a dead Bright Data tier, a Gemini quota exhaustion, and a Claude billing card decline simultaneously: each phase degrades to a clearly-labeled fallback rather than crashing.

The architecture treats reliability as a product property, not a stretch goal.

## What I'd Do Next

If I were turning this into a real product (which is honestly tempting):

1. **Real telemetry connectors**: Replace the four mock internal tools with Datadog, Grafana, PagerDuty webhook integrations. The interface stays identical; only `lib/tools/index.ts` changes.
2. **Persistent runbook learning**: after each resolved incident, propose updates to the internal runbook library based on what the agent found. Closed-loop institutional memory.
3. **More Bright Data integrations**: Browser API for screenshotting the vendor's actual incident page (not just JSON); Structured Data API for monitoring SaaS pricing pages, security advisory feeds.
4. **Slack/Discord on-call paging**: agent posts the final report directly into the incident channel with a thread, ready for human review.
5. **Multi-region failover for the agent itself**: SEV-1 is exactly when the agent shouldn't go down. Run multiple Sentinel instances behind a healthcheck-aware load balancer.

But I'd want to ship the current version into one real on-call rotation first and see what the actual on-call team learns. The whole product theory is "AI that doesn't bluff" — that gets tested empirically, not by hackathon judges.

## Try It

- **Live demo**: https://wma-contacting-lindsay-orientation.trycloudflare.com (5 mock incidents to click)
- **Code**: https://github.com/jackjin1997/sentinel (MIT)
- **Architecture detail**: README.md in the repo

If you run production systems and have thoughts on this pattern — what it gets right, where it's wrong, what you'd want different — I'd genuinely like to hear from you. The product theory is unfinished and the next iteration shapes around real feedback.

*Built solo over ~13 days for Bright Data's Web Data UNLOCKED hackathon and HackerNoon's Proof of Usefulness. Multi-LLM orchestration powered by Vercel AI SDK; live web grounding powered by Bright Data Web Unlocker + SERP API; deployment on Vultr behind Cloudflare Tunnel.*
