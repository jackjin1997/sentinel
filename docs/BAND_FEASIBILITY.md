# Band of Agents — Feasibility Recon

> Branch: `feat/band-of-agents` | Date: 2026-06-12 | Author: recon agent

---

## What Band is

Band (band.ai) is an operational infrastructure layer that gives AI agents persistent identity, multi-agent coordination, structured memory, and a unified audit trail without changing how they run. It provides shared chat rooms where agents communicate via @mention routing — agents are only activated when explicitly mentioned, enabling sequential, parallel, or dynamic multi-agent workflows across heterogeneous frameworks.

---

## SDK availability

| Attribute | Value |
|---|---|
| **Package name (PyPI)** | `band-sdk` |
| **Version** | 1.0.0 (released 2026-06-11) |
| **License** | MIT (OSI Approved) |
| **Language support** | **Python only** (Python 3.11+). No official TypeScript/JavaScript/npm package exists. |
| **Install command** | `pip install "band-sdk[anthropic]"` (swap `anthropic` for `langgraph`, `crewai`, `pydantic-ai`, `claude_sdk`, `codex`, `acp`, etc.) |
| **npm package** | **None found** — no `@band/*` or `band-sdk` on npmjs.com |
| **Internal module** | `thenvoi` (the SDK's internal Python module name) |
| **Alternative for TS** | MCP server at `https://docs.band.ai/_mcp/server` — but MCP is request/response only, no WebSocket push; cannot deliver real-time message notifications to a TypeScript agent |

---

## How an agent is defined

From official docs (`docs.band.ai/integrations/sdks/tutorials/anthropic`):

```python
import asyncio
import os
from dotenv import load_dotenv
from thenvoi import Agent
from thenvoi.adapters import AnthropicAdapter
from thenvoi.config import load_agent_config

async def main():
    load_dotenv()
    agent_id, api_key = load_agent_config("my_agent")

    adapter = AnthropicAdapter(
        model="claude-sonnet-4-5-20250929",
    )

    agent = Agent.create(
        adapter=adapter,
        agent_id=agent_id,
        api_key=api_key,
        ws_url=os.getenv("THENVOI_WS_URL"),
        rest_url=os.getenv("THENVOI_REST_URL"),
    )

    await agent.run()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## How agents communicate

Agents communicate through Band's shared chat rooms via @mention routing: a message containing `@Agent Name` is delivered only to that agent; agents not mentioned receive nothing. Humans see all messages regardless. The platform supports three coordination patterns — sequential (agent A passes output to agent B), parallel (one message @mentions multiple agents simultaneously), and dynamic (a coordinator agent decides at runtime which specialists to recruit using the `add_participant_service` built-in tool). Beyond text, the system tracks `tool_call`, `tool_result`, `thought`, `error`, and `task` message types, creating a full audit trail accessible via REST and WebSocket APIs. Communication is backed by a WebSocket connection maintained by the Band SDK (not available in the MCP path).

---

## Can Sentinel's 4 phases map to 3+ Band agents?

**Yes, in theory — but only if the entire stack is ported to Python.**

Sentinel's 4 phases map cleanly to 3+ Band agents:

| Sentinel Phase | Band Agent | Model |
|---|---|---|
| Phase 1 · Triage | `@Triage` — pulls telemetry, scrapes vendor status | Gemini Flash |
| Phase 2 · Investigate | `@Investigator` — deep root-cause with runbook + SERP + GitHub | Claude Sonnet |
| Phase 3 · Adversarial Review | `@Reviewer` — stress-tests Investigator's diagnosis | Gemini Flash |
| Phase 4 · Consolidate | `@Consolidator` — synthesises final JSON report | Claude Haiku |

The current sequential handoff in `lib/agent.ts` mirrors Band's sequential @mention pattern exactly. The adversarial vendor-flip (Claude to Gemini) becomes natural multi-agent collaboration rather than a single-file orchestration hack.

**The blocker:** Sentinel is TypeScript/Next.js. The Band SDK is **Python-only**. There is no npm package. The MCP path cannot drive real-time agent participation.

---

## Verdict

**NO-GO**

---

## If GO: top 3 next steps with hour estimates

_Not applicable — Verdict is NO-GO._

---

## If NO-GO: reason in 1 paragraph

The Band SDK (`band-sdk` v1.0.0, MIT, PyPI) is **Python-only** (Python 3.11+) with no TypeScript or npm equivalent. Sentinel is a Next.js 16 / TypeScript project that runs entirely in Node.js. The only Band integration path available to a TypeScript runtime is the Band MCP server, but MCP is a request/response protocol — it cannot push real-time @mention events to an agent, which is the core interaction mechanism Band requires. Porting Sentinel to Python would mean rewriting `lib/agent.ts`, `lib/tools/`, and the entire Next.js streaming SSE endpoint, which is well outside the hackathon scope and would sacrifice the live dashboard streaming that is Sentinel's demo centrepiece. There is no GO path that does not involve a full language-stack rewrite within 7 days.
