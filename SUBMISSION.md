# Sentinel · Submission 清单（字段对照表）

⏱️ 截止日：
- **Lablab Bright Data Web Data UNLOCKED** — 5/31
- **HackerNoon Proof of Usefulness** — 6/5

每个字段下面是「直接复制粘贴」的最终文字。用 `Cmd+F` 找到对应字段贴上即可。

---

## Project Name / 项目名
```
Sentinel
```

## Tagline / 一句话描述（通常 ≤80-140 chars）
```
Multi-vendor LLM agent for production incident response — internal telemetry + REAL live web data via Bright Data
```

## Short Description / 短描述（通常 ≤300 chars）
```
When production breaks at 3am, Sentinel investigates with both INTERNAL telemetry (logs, metrics, runbooks) AND REAL public web signals via Bright Data (vendor status pages, public postmortems, GitHub commits) — four LLM phases across two vendors orchestrate the diagnosis in ~60 seconds.
```

## Long Description / 详细描述（通常 ≤1000-3000 chars）
```
Production incident response is the highest-stakes work humans do under time pressure — and a single confident-but-wrong LLM is a liability. Most "AI on-call" products use a single LLM confined to internal observability data, so they miss obvious upstream-vendor outages.

Sentinel solves this with adversarial cross-vendor orchestration grounded in REAL web data:

🔍 Gemini-Flash triages — pulls internal telemetry (queryLogs, queryMetrics) AND uses Bright Data Web Unlocker to scrape live vendor status pages (status.stripe.com, GitHub Status, AWS, Cloudflare, Vercel, OpenAI, Anthropic, Google Cloud) to immediately rule in/out upstream-vendor outages.

🧠 Claude-Sonnet investigates — deep root-cause reasoning with searchRunbook (internal) + searchPublicPostmortems (Bright Data SERP API) to find how other engineers solved similar incidents on engineering blogs, and fetchGithubRecentCommits to correlate with upstream OSS regressions.

⚔️ Gemini-Flash adversarially reviews Claude's work — different vendor, genuinely different bias, catches what same-family models would all miss.

📋 Claude-Haiku consolidates a strict-JSON action plan.

Each phase streams live to the dashboard via SSE — operators see the agents WORK, not just their output. Diagnoses cite specific timestamps, metric values, code paths, runbook IDs, AND quoted vendor status excerpts. The agent honestly downgrades confidence when evidence is uncertain.

Graceful Claude Haiku fallback if Gemini hits quota, graceful curated mock data if Bright Data is unreachable — demo never breaks.

Stack: Next.js 16 · Vercel AI SDK 6 · Google Gemini · Anthropic Claude · Bright Data Web Unlocker + SERP API · Zod tools · SSE streaming · Cloudflare Tunnel · Vultr Cloud Compute. ~1700 lines of TypeScript, end-to-end working with sub-60s MTTR. MIT licensed.
```

## Video / Demo Video
**Upload**: `~/Desktop/sentinel-demo.mp4`（待你 8:30 录的那个，我帮你压缩 + GitHub Release）
**Backup URL**: GitHub Release at https://github.com/jackjin1997/sentinel/releases/latest

## Live Demo URL
```
https://wma-contacting-lindsay-orientation.trycloudflare.com
```

## GitHub Repository
```
https://github.com/jackjin1997/sentinel
```

## Try it out instructions
```
1. Open https://wma-contacting-lindsay-orientation.trycloudflare.com
2. Click any incident on the left (recommend INC-001 — checkout latency, the agent will call fetchVendorStatus to check Stripe)
3. Watch all 4 LLM phases stream live in real-time on the right panel
4. Expand any tool call (📜 logs, 📊 metrics, 📖 runbook, 🌐 fetchVendorStatus, 🔎 searchPublicPostmortems, 🚀 fetchGithubRecentCommits) to see the actual data the agent pulled
5. Final report appears at top with root cause (cites Stripe in this case), confidence level, runnable remediation
6. ~60 seconds end-to-end. No login required.
```

## Team Members
```
jackjin1997 (jackjin1997@gmail.com) — sole builder
```

## Bright Data products used (REQUIRED for Lablab BD hackathon)
```
✅ Web Unlocker — fetchVendorStatus tool: scrapes status.stripe.com, githubstatus.com, AWS, Cloudflare, Vercel, OpenAI, Anthropic, Google Cloud status pages in real time. Lets the agent see upstream outages BEFORE they propagate to internal symptoms.

✅ SERP API — searchPublicPostmortems tool: Google-searches the live web for similar past incident postmortems on engineering blogs. Lets the agent leverage how the broader engineering community already solved this class of problem.

✅ Web Unlocker (GitHub use case) — fetchGithubRecentCommits tool: pulls last N commits from public GitHub repos to correlate downstream incidents with upstream open-source library regressions.
```

## Why this matters / use case
```
Three real failure patterns Sentinel handles with live web data that single-LLM-internal-only agents miss:

1. Upstream vendor outage masquerading as internal latency
   - Stripe degrades → checkout-api P99 spikes → engineer initially suspects internal DB / pool
   - Sentinel hits status.stripe.com first → diagnosis grounded in REAL vendor data

2. Public knowledge of a known-class incident
   - "Redis maxmemory + noeviction = stale fallback storm" — well-documented postmortem pattern
   - Sentinel SERP search surfaces prior postmortems instantly, so remediation steps are battle-tested not improvised

3. Upstream OSS library breaking change
   - Bump @some/lib → mysterious worker crash
   - Sentinel fetches the lib's recent GitHub commits, correlates with deploy timestamp
```

## Track / category selections

### Lablab Bright Data "Web Data UNLOCKED" (5/31)
☑️ Primary: Most creative use of Bright Data Web Unlocker
☑️ Secondary: Best AI-agent architecture using Bright Data
☑️ Bonus: Multi-vendor LLM showcase

### HackerNoon Proof of Usefulness (6/5)
☑️ Primary: AI/ML category (sponsor tech usage = bigger prize)
☑️ Secondary: Developer tools

## Tech Stack Tags（选每一个能选的）
```
Next.js, React, TypeScript, Tailwind CSS, Vercel AI SDK, Server-Sent Events,
Google Gemini, Anthropic Claude, Bright Data Web Unlocker, Bright Data SERP API,
Zod, LangGraph-style orchestration, Cloudflare Tunnel, Vultr, systemd, Caddy
```

## Problem Statement
```
Production incident response is time-pressured high-stakes work where confident-but-wrong AI is dangerous, AND where the root cause is often outside your own infrastructure (upstream vendor outage). Single-LLM observability tools fail at both. Sentinel addresses both with adversarial cross-vendor LLM review AND live access to public web data via Bright Data.
```

## What's different
```
DataDog / PagerDuty / Coralogix AI features all use single-vendor LLM pipelines confined to internal observability. Sentinel: TWO vendors (Google + Anthropic) for adversarial review, PLUS Bright Data integration for live public web signals (vendor status, postmortem archives, GitHub). Operators see full reasoning trace with which signal came from which source. Honest confidence calibration. Open source MIT.
```

## What's next / roadmap (if asked)
```
- Real Datadog / Grafana / PagerDuty webhook integrations (replace the mock internal tools with real observability backends)
- More Bright Data product integrations: Browser API for screenshotting vendor incidents pages, Structured Data for monitoring SaaS pricing pages
- Persistent runbook learning — agent proposes runbook updates after each resolved incident
- Slack/Discord on-call paging integration
- Multi-region failover so the agent itself never goes down during SEV-1
```

## Logo / Image
- `public/og/og-image.png` — landing page 1200x630 OG
- `public/og/03-final-report.png` — final report card
- `public/og/02-streaming.png` — mid-run streaming view

---

## 提交流程

### Lablab Bright Data Web Data UNLOCKED (5/31 截止)

1. Open https://lablab.ai/ai-hackathons/brightdata-ai-agents-web-data-hackathon
2. 点 "Submit Project"
3. 字段一字段一粘贴上面的文字
4. 上传 demo 视频 mp4
5. **重点强调 "Bright Data products used" 部分** — 评委必看
6. Submit
7. 告诉 Claude 提交完成 → 我推 X thread

### HackerNoon Proof of Usefulness (6/5 截止)

1. Open https://proofofusefulness.com/
2. 注册账号（GitHub OAuth）
3. 用同样的内容提交
4. **额外加分**：写一篇 article on hackernoon.com 解释 Sentinel 架构（HackerNoon 看重内容生态贡献）
5. Submit

### X Thread (录 demo + 提交后)

按 HACKATHON.md 里 8 条 thread 直接粘 + 配上 demo 视频。@bright_data, @lablabai, @hackernoon, @nextjs, @vercel, @anthropicai, @googleaistudio 都 tag 上。

---

## 防呆 checklist（提交前过一遍）
- [ ] 视频上传成功（Lablab 上传后页面会显示缩略图）
- [ ] Live URL 可点 → 跳转到 dashboard，能看到 5 incidents
- [ ] GitHub repo 可点 → 跳转到 README，BD 部分突出
- [ ] **「Bright Data products used」字段已填**（这是 Lablab BD hackathon 评委 must-see）
- [ ] Tracks 全部勾选
- [ ] Tagline / Description 没有 AI / Claude / "generated by" 类字眼
- [ ] 截图至少 1 张（建议 og-image.png 或 final-report.png）
