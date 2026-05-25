# Sentinel · Social Launch Drafts

Copy-paste-ready drafts for Reddit and Show HN. Post AFTER demo video records + hackathons submitted (so judges have time to discover via these channels too).

---

## Show HN draft

**Title**: `Show HN: Sentinel – AI incident response with two LLM vendors and live web grounding`

**Body**:

I built Sentinel because every "AI on-call" tool I've tried has the same two failure modes:

1. A single LLM. Same-family models share blind spots — when the diagnosis is wrong, there's nothing in the architecture to catch it.
2. Confined to internal observability. The most expensive incidents are usually triggered by something upstream (vendor outage, OSS regression, third-party API change) — exactly the things internal logs can't tell you.

Sentinel addresses both:

- 4 phases × 2 LLM vendors: Gemini Flash triages → Claude Sonnet investigates → Gemini Flash adversarially reviews Claude's diagnosis → Claude Haiku consolidates a strict-JSON action plan. The cross-vendor reviewer step routinely catches things Claude missed (and vice versa) because the two families have structurally different biases.
- 7 agent tools: 4 internal mock (logs, metrics, runbook, deploys) + 3 powered by Bright Data Web Unlocker (live scrapes of status.stripe.com etc, public postmortem SERP search, GitHub commit history).

The dashboard streams every phase live via SSE — you watch the agents work rather than just see the output. Diagnoses cite specific timestamps, metric values, runbook IDs, and quoted vendor status excerpts.

Edge cases I cared about:
- Body-size cap on the agent endpoint (cheap DoS guard)
- AbortController propagated through every `streamText` so abandoning the page stops burning LLM tokens
- Cumulative-not-consecutive backpressure detection (a trivial drain shouldn't reset the slow-consumer counter)
- Graceful mock fallback for every Bright Data tool, so the demo survives quota exhaustion, key misconfig, or network outage cleanly

Live demo: https://wma-contacting-lindsay-orientation.trycloudflare.com
Repo: https://github.com/jackjin1997/sentinel (MIT)
Stack: Next.js 16, Vercel AI SDK 6, Google Gemini, Anthropic Claude, Bright Data, Zod, SSE

Genuinely curious what people who run production systems think — what would make this useful in your on-call rotation, and what's the obvious thing I'm missing?

---

## Reddit drafts

### r/sre

**Title**: `Built a multi-vendor LLM agent for incident response — would love SRE feedback`

**Body**:

Hi r/sre. I spent the last ~2 weeks building a thing called Sentinel for an AI hackathon. It's an autonomous incident response agent, but with two design choices I haven't seen elsewhere:

1. **Cross-vendor adversarial review**. The investigation phase is Claude Sonnet, then a Gemini Flash pass critiques Claude's diagnosis. Different vendor = different bias. Gemini routinely catches things Claude over-stated (and the reverse holds too).

2. **Live web grounding via Bright Data**. When the agent suspects an upstream cause, it actually scrapes the vendor's status page in real time (status.stripe.com, GitHub Status, AWS, Cloudflare etc) rather than relying on the LLM's training data. Plus SERP search for similar public postmortems.

I'm specifically interested in feedback on:

- Is the "honest confidence calibration" pattern (the agent says "medium" instead of "high" when evidence is incomplete) actually useful in on-call, or does it just make the output noisier?
- What's a real failure mode in your team's incident response that an LLM-with-tools would actually help with? (vs ones where it would be confidently wrong)
- The current `searchRunbook` tool is mock data — what's the cleanest interface to wire into an actual runbook library at your shop?

Live demo (no signup): https://wma-contacting-lindsay-orientation.trycloudflare.com
Repo: https://github.com/jackjin1997/sentinel
Architecture writeup: link in repo README

Not selling anything; the code is MIT. Just want SRE pushback before I think about iterating further.

---

### r/devops

**Title**: `[OC] Sentinel: AI incident response that uses 2 LLM vendors + scrapes real vendor status pages`

**Body**:

Built this for a hackathon. Wanted to share before getting too attached to the design.

Architecture in 3 sentences:
1. Four phases of LLM work: Gemini Flash triages telemetry, Claude Sonnet investigates with tool access, Gemini Flash adversarially reviews Claude's diagnosis, Claude Haiku consolidates a JSON action plan.
2. Seven tools: 4 mock internal (logs/metrics/runbook/deploys) + 3 powered by Bright Data — fetch vendor status pages live, search public postmortems, pull GitHub commits.
3. Streaming dashboard so you watch the agents work, not just the output.

The thing I'm most happy with is the cross-vendor reviewer step. When Claude diagnoses a "DB connection pool exhaustion", Gemini doesn't just rubber-stamp — it'll often catch that the diagnosis didn't cover an alternative (e.g. "the linear ramp suggests gradual leak, not deploy-correlated cutover"). Different families = different blind spots.

Mock fallback is built into every BD tool, so the demo survives any combo of quota exhaustion, key misconfig, or network outage. UI labels which signals are live (`LIVE` chip) vs fell-back-to-mock (`mock` chip) so you can tell at a glance.

Live: https://wma-contacting-lindsay-orientation.trycloudflare.com
Code: https://github.com/jackjin1997/sentinel (MIT)

I'm interested in pushback on the assumption that LLM + tools + adversarial review is actually better than just a well-written runbook + monitor.

---

### r/LocalLLaMA

**Title**: `Built a multi-LLM agent: Gemini Flash and Claude Sonnet take turns critiquing each other`

**Body**:

Sharing an architectural choice I haven't seen much in the wild: have model A do the work, then model B (from a different vendor) adversarially review it.

Concrete setup in Sentinel (incident response agent):
- Phase 1: `gemini-2.5-flash` does triage (cheap, fast tool calling)
- Phase 2: `claude-sonnet-4-6` does deep investigation
- Phase 3: `gemini-2.5-flash` reviews Claude's diagnosis adversarially
- Phase 4: `claude-haiku-4-5` synthesizes strict-JSON final report

Why this matters specifically for tool-using agents: if you let one model both decide which tools to call AND interpret the results, it can lock onto a wrong hypothesis and stop searching. Cross-vendor review forces a "different-cultural-background" critique that surfaces alternatives the original model dismissed.

The Vercel AI SDK 6 makes this very ergonomic — same `streamText({ model, tools, stopWhen })` signature whether you're driving Gemini or Claude. Just swap the model provider per phase.

Full code: https://github.com/jackjin1997/sentinel
Live: https://wma-contacting-lindsay-orientation.trycloudflare.com

Interested whether anyone here has run actual evals on cross-vendor vs cross-size single-vendor adversarial review — my intuition is the former is genuinely better but I don't have benchmark data.

---

## Posting schedule (after demo + hackathon submission)

- **Day 0 (post-submission, evening)**: Show HN — needs careful timing for upvote curve. Aim for 9am ET on a weekday for maximum US morning audience.
- **Day 0 +2h**: X thread (already drafted in HACKATHON.md)
- **Day 1**: r/sre, r/devops, r/LocalLLaMA — stagger by 3-4 hours so they don't look coordinated. Different angles per sub.
- **Day 2-3**: respond to any comments quickly (this matters for both PoU "adoption" signal and X engagement compounding)

Avoid:
- Posting Friday afternoon / Sunday (low engagement)
- Posting all 4 channels same hour (looks bot-like)
- Defensive replies to criticism (concede honestly when it's right, makes the post more credible)
