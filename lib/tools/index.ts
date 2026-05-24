import { tool } from "ai";
import { z } from "zod";
import { LOGS_BY_SERVICE, METRICS_BY_SERVICE, RUNBOOKS } from "../mock/incidents";

export const queryLogs = tool({
  description:
    "Fetch recent log lines for a service. Use to investigate what was happening leading up to and during an incident.",
  inputSchema: z.object({
    service: z.string().describe("Service name, e.g. 'checkout-api', 'auth-service', 'image-worker'"),
    levels: z
      .array(z.enum(["error", "warn", "info"]))
      .optional()
      .describe("Filter log levels. Omit to return all."),
    limit: z.number().int().min(1).max(50).default(20).describe("Max lines to return"),
  }),
  execute: async ({ service, levels, limit }) => {
    const lines = LOGS_BY_SERVICE[service] ?? [];
    const filtered = levels?.length ? lines.filter((l) => levels.includes(l.level)) : lines;
    return { service, count: filtered.length, lines: filtered.slice(-limit) };
  },
});

export const queryMetrics = tool({
  description:
    "Fetch recent metric points for a service. Use to spot trends like latency spikes, memory growth, pool saturation.",
  inputSchema: z.object({
    service: z.string(),
    metric: z
      .string()
      .optional()
      .describe("Specific metric name; omit to get all available metrics for this service"),
    // Bounds tool output so real telemetry doesn't dump unbounded arrays into
    // the LLM context.
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(60)
      .describe("Max points to return, newest first."),
  }),
  execute: async ({ service, metric, limit }) => {
    const points = METRICS_BY_SERVICE[service] ?? [];
    const filtered = metric ? points.filter((p) => p.metric === metric) : points;
    const sliced = filtered.slice(-limit);
    return { service, count: sliced.length, totalAvailable: filtered.length, points: sliced };
  },
});

export const searchRunbook = tool({
  description:
    "Search internal runbook library by symptoms. Returns runbooks with diagnosis and remediation steps that match the incident pattern.",
  inputSchema: z.object({
    symptomKeywords: z
      .array(z.string())
      .describe("Keywords describing the symptoms, e.g. ['P99 latency', 'circuit breaker']"),
    topK: z.number().int().min(1).max(5).default(3),
  }),
  execute: async ({ symptomKeywords, topK }) => {
    const lcKeywords = symptomKeywords.map((k) => k.toLowerCase());
    const scored = RUNBOOKS.map((rb) => {
      const haystack = (rb.title + " " + rb.symptoms.join(" ")).toLowerCase();
      const score = lcKeywords.reduce((s, k) => s + (haystack.includes(k) ? 1 : 0), 0);
      return { runbook: rb, score };
    })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return { matches: scored };
  },
});

export const checkDeployHistory = tool({
  description:
    "Look up recent deployments for a service to check if a deploy correlates with the incident start time.",
  inputSchema: z.object({
    service: z.string(),
  }),
  execute: async ({ service }) => {
    const deploys: Record<string, { ts: string; commit: string; author: string }[]> = {
      "checkout-api": [
        { ts: "2026-05-11T08:14:00Z", commit: "8c2e1d4", author: "alice" },
        { ts: "2026-05-12T10:42:00Z", commit: "bb91f02", author: "bob" },
      ],
      "auth-service": [
        { ts: "2026-05-10T16:30:00Z", commit: "f4e8aa7", author: "carla" },
      ],
      "image-worker": [
        { ts: "2026-05-12T09:12:00Z", commit: "a7f3b9c", author: "dave" },
      ],
    };
    return { service, deploys: deploys[service] ?? [] };
  },
});

import { brightDataTools } from "./brightdata";

// Tools the agent can call. Mixed by design:
//   - 4 INTERNAL telemetry tools (mock here, would be Datadog/Grafana in prod)
//   - 3 EXTERNAL web-data tools via Bright Data (real status pages, postmortems, GitHub)
// The combination is the core story: internal signals diagnose WHAT broke,
// external signals reveal WHY (vendor outage? known issue? upstream regression?).
export const tools = {
  queryLogs,
  queryMetrics,
  searchRunbook,
  checkDeployHistory,
  ...brightDataTools,
};

export type SentinelToolName = keyof typeof tools;
