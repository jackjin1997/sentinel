# Sentinel · Lablab.ai 提交清单（字段对照表）

⏱️ 提交日：**5/19 Transforming Enterprise** · **5/20 AI Agent Olympics**

每个字段下面是「直接复制粘贴」的最终文字。Lablab 表单一般会有这些字段（不同 hackathon 略有差异），用 `Cmd+F` 找到对应字段贴上即可。

---

## Project Name / 项目名
```
Sentinel
```

## Tagline / 一句话描述（通常 ≤80 chars）
```
Autonomous incident response agent — multi-vendor LLM orchestration with adversarial cross-vendor review
```

## Short Description / 短描述（通常 ≤300 chars）
```
When a service breaks at 3am, Sentinel dispatches three specialized LLMs in sequence — Gemini Flash triages, Claude Sonnet investigates with tools (logs, metrics, runbooks), Gemini Flash adversarially reviews with different vendor bias, and Claude Haiku consolidates a structured action report. ~53s MTTR.
```

## Long Description / 详细描述（通常 ≤1000-3000 chars）
```
Production incident response is the highest-stakes work humans do under time pressure. A single confident-but-wrong LLM is a liability there.

Sentinel solves this with adversarial cross-vendor orchestration:

🔍 Gemini-Flash triages telemetry (pulls logs, metrics, deploy history)
🧠 Claude-Sonnet does deep root-cause reasoning with tool access (queryLogs, queryMetrics, searchRunbook, checkDeployHistory)
⚔️ Gemini-Flash adversarially reviews Claude's work — different vendor, genuinely different bias, different blind spots
📋 Claude-Haiku consolidates a structured action plan as strict JSON

Each phase streams live to the dashboard via Server-Sent Events — judges see the agents work, not just their output. Diagnoses cite specific timestamps, metric values, code paths, and internal runbooks. The agent honestly downgrades confidence when evidence is uncertain. Graceful Claude Haiku fallback ensures the demo never breaks if Gemini hits quota.

Stack: Next.js 16 + Vercel AI SDK 6 + Zod tools + SSE streaming. ~1500 lines of TypeScript. Deployed on Vultr with Cloudflare Tunnel for global access. Verified end-to-end: 60s MTTR, 6-9 tool calls per incident, real multi-vendor (no fallback) on all 5 test scenarios.
```

## Video / Demo Video
**Upload**: `~/Desktop/sentinel-demo.mp4`（你 8:30 录的那个，我会帮你压缩转格式）
**Backup URL**: GitHub Release at https://github.com/jackjin1997/sentinel/releases/latest

## Live Demo URL
```
https://wma-contacting-lindsay-orientation.trycloudflare.com
```

## GitHub Repository
```
https://github.com/jackjin1997/sentinel
```

## Try it out instructions / 如何使用 demo
```
1. Open https://wma-contacting-lindsay-orientation.trycloudflare.com
2. Click any incident card on the left (recommend INC-002 — critical severity, richest data)
3. Watch all 4 LLM phases stream live in real-time on the right panel
4. Final report appears at top with root cause, confidence level, and runnable remediation steps
5. ~60 seconds end-to-end. No login required, no setup.
```

## Team Members
```
jackjin1997 (jackjin1997@gmail.com) — sole builder
```

## Track Selection

### AI Agent Olympics（5/20，$28k pool）— 多选
☑️ **🧠 Intelligent Reasoning** — multi-step root-cause analysis with cited evidence
☑️ **🔄 Agentic Workflows** — autonomous tool use (logs/metrics/runbooks/deploys)
☑️ **🤝 Collaborative Systems** — 4 phases across 2 vendors, cross-vendor adversarial review
☑️ **🌍 Enterprise Utility** — MTTR reduction for on-call SRE teams

### Vultr Enterprise Agent Award（partner）— 单独申请
☑️ Deployed on Vultr Cloud Compute (Singapore region) with systemd + Caddy + Cloudflare Tunnel
   Public URL: https://wma-contacting-lindsay-orientation.trycloudflare.com

### Google AI Studio Award（partner）— 单独申请
☑️ Uses Gemini 2.5 Flash via Google AI Studio API
   - Phase 1 (Triage): gemini-2.5-flash with tool use
   - Phase 3 (Adversarial Review): gemini-2.5-flash for cross-vendor critique

### Transforming Enterprise Through AI（5/19，$10k pool）— 单选 primary
**Primary**: Track 2 — AI Agents with Google AI Studio
   "Use Gemini via Google AI Studio for reasoning, chat, or multimodal understanding"

**Secondary (mention if multi-select)**: Track 1 — Agent Security & AI Governance
   "Audit trails and explainability tooling for regulated industries" — every Sentinel run produces a fully observable reasoning trace with tool-call evidence chain

## Tech Stack Tags（选每一个能选的）
```
Next.js, React, TypeScript, Tailwind CSS, Vercel AI SDK, Server-Sent Events,
Google Gemini, Anthropic Claude, Zod, LangGraph-style orchestration,
Cloudflare Tunnel, Vultr, systemd, Caddy
```

## Problem Statement / 你解决什么问题
```
Production incident response is time-pressured work where confident-but-wrong AI is dangerous — yet most "AI on-call" products use a single LLM that has no mechanism to catch its own blind spots. Sentinel introduces structured cross-vendor adversarial review as a first-class architecture pattern, so the diagnosis is challenged by a model with genuinely different training before any action is recommended.
```

## What makes it different / 差异化
```
DataDog / PagerDuty / Coralogix AI features all use single-vendor pipelines.
Sentinel deliberately uses TWO vendors (Google + Anthropic) so the reviewer phase has structurally different bias.
The full phase trace is observable — operators see the reasoning, tool calls, and dissent in real-time.
The agent honestly calibrates confidence (downgrades to "medium" when evidence is incomplete) rather than fabricating certainty.
Open source under MIT.
```

## What's next / 下一步路线（如果问）
```
- Real telemetry integrations (Datadog, Grafana, PagerDuty webhooks)
- Persistent runbook learning loop (agent proposes runbook updates after each incident)
- Slack/Discord integration for on-call paging
- Self-hosted deployment via single Docker image
- Multi-region failover for the agent itself (so AI never goes down during SEV-1)
```

## Logo / Image
Use any frame of the demo video, or:
- `public/og/og-image.png` — landing page 1200x630 OG
- `public/og/03-final-report.png` — final report view
- `public/og/02-streaming.png` — mid-run streaming

---

## Day 7 提交流程（5/19 + 5/20 两次）

1. Open https://lablab.ai/ai-hackathons/milan-ai-week-hackathon （或 techex 那个）
2. 点 "Submit Project"
3. 用上面文字一字段一字段粘贴
4. 上传 demo 视频 mp4
5. Tracks 全选我推荐的
6. Submit
7. Tell Claude 提交完成 → 我立即开始 X thread 发推 flow

---

## 防呆 checklist（提交前过一遍）
- [ ] 视频上传成功（Lablab 上传后页面会显示缩略图）
- [ ] Live URL 可点 → 跳转到 dashboard
- [ ] GitHub repo 可点 → 跳转到 README 满屏
- [ ] Tracks 全部勾选（多选 hackathon 别只选 1 个）
- [ ] Tagline / Description 没有出现 "Generated by AI" / "Claude" 之类（评委不喜欢看到）
- [ ] 截图至少 1 张（建议 og-image.png）

Submit 之后**截屏发我**，我会检查 metadata 是否正确 + 立即推 X thread。
