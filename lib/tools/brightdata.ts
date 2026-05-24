import { tool } from "ai";
import { z } from "zod";

// Bright Data Web Unlocker endpoint. Single POST gets unblocked HTML/JSON.
// Auth via Bearer token, zone identifies which BD product (Web Unlocker, SERP).
// docs: https://docs.brightdata.com/scraping-automation/web-unlocker/send-your-first-request
const BD_ENDPOINT = "https://api.brightdata.com/request";

const VENDOR_STATUS_URLS: Record<string, { url: string; vendor: string }> = {
  stripe: { url: "https://status.stripe.com/api/v2/summary.json", vendor: "Stripe" },
  github: { url: "https://www.githubstatus.com/api/v2/summary.json", vendor: "GitHub" },
  aws: { url: "https://status.aws.amazon.com/data.json", vendor: "AWS" },
  cloudflare: { url: "https://www.cloudflarestatus.com/api/v2/summary.json", vendor: "Cloudflare" },
  vercel: { url: "https://www.vercel-status.com/api/v2/summary.json", vendor: "Vercel" },
  openai: { url: "https://status.openai.com/api/v2/summary.json", vendor: "OpenAI" },
  anthropic: { url: "https://status.anthropic.com/api/v2/summary.json", vendor: "Anthropic" },
  google: { url: "https://status.cloud.google.com/incidents.json", vendor: "Google Cloud" },
};

interface BDRequestOpts {
  url: string;
  zone?: string;
  format?: "raw" | "json";
}

/**
 * Calls Bright Data Web Unlocker. Returns the raw body on success.
 * Throws on missing key, non-200, or timeout — caller decides fallback.
 *
 * Why: Sentinel's tool layer must be deterministic per call (LLM expects a
 * consistent shape), but the wider network is not. We bubble errors up so
 * tool wrappers can swap to a curated fallback rather than silently degrade.
 */
async function bdFetch(opts: BDRequestOpts, timeoutMs = 10_000): Promise<string> {
  const key = process.env.BRIGHT_DATA_API_KEY;
  if (!key) throw new Error("BRIGHT_DATA_API_KEY not set");
  const zone = opts.zone ?? process.env.BRIGHT_DATA_ZONE ?? "web_unlocker1";

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(BD_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        zone,
        url: opts.url,
        format: opts.format ?? "raw",
      }),
      signal: ac.signal,
    });
    if (!res.ok) {
      throw new Error(`BD ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fallback summaries for common vendors — used when BRIGHT_DATA_API_KEY is
 * not set (local dev / mock demo mode) or BD itself errors. Keep these
 * realistic so the demo still tells the multi-LLM story cleanly.
 */
const MOCK_VENDOR_STATUS: Record<string, { overall: string; recent: string }> = {
  stripe: {
    overall: "Stripe: degraded performance — Payment Intents API elevated error rate since 14:18Z",
    recent: "Investigating elevated 500/504 responses on charge.create. Started 14:18Z, ongoing.",
  },
  github: { overall: "GitHub: all systems operational", recent: "No incidents in last 24h" },
  aws: { overall: "AWS: all services operational", recent: "No active events in us-east-1 / us-west-2" },
  cloudflare: { overall: "Cloudflare: all systems operational", recent: "No incidents" },
  vercel: { overall: "Vercel: all systems operational", recent: "No incidents" },
  openai: { overall: "OpenAI: partial outage — ChatGPT slow", recent: "Elevated latency on gpt-4o since 13:42Z" },
  anthropic: { overall: "Anthropic: all systems operational", recent: "No incidents" },
  google: { overall: "Google Cloud: all systems operational", recent: "No major incidents" },
};

export const fetchVendorStatus = tool({
  description:
    "Fetch a third-party vendor's PUBLIC status page (Stripe, GitHub, AWS, Cloudflare, etc.) via Bright Data Web Unlocker. Use when you suspect the incident may be caused by an upstream provider outage — checking their status page in real time is faster than waiting for them to email you.",
  inputSchema: z.object({
    vendor: z
      .enum(["stripe", "github", "aws", "cloudflare", "vercel", "openai", "anthropic", "google"])
      .describe("Which vendor's status page to fetch"),
  }),
  execute: async ({ vendor }) => {
    const target = VENDOR_STATUS_URLS[vendor];
    try {
      const raw = await bdFetch({ url: target.url, format: "raw" }, 8000);
      // Try to extract incident summary from common status-page JSON shapes
      try {
        const data = JSON.parse(raw);
        const status = data.status?.description ?? data.status?.indicator ?? "operational";
        const incidents = (data.incidents ?? []).slice(0, 3).map((i: { name: string; status: string; updated_at: string }) => ({
          name: i.name,
          status: i.status,
          updated_at: i.updated_at,
        }));
        return { vendor: target.vendor, source: "brightdata", status, incidents };
      } catch {
        // Some vendors return HTML; return a truncated raw snippet
        return { vendor: target.vendor, source: "brightdata", snippet: raw.slice(0, 800) };
      }
    } catch (err) {
      // BD unavailable — return curated mock so the demo never breaks
      const mock = MOCK_VENDOR_STATUS[vendor];
      return {
        vendor: target.vendor,
        source: "mock-fallback",
        status: mock.overall,
        recent: mock.recent,
        note: `BD fetch failed: ${(err as Error).message}`,
      };
    }
  },
});

export const searchPublicPostmortems = tool({
  description:
    "Search the public web for similar past incident postmortems via Bright Data SERP API. Use when the diagnosis pattern matches a well-known class of failure — finding how other companies solved the same problem accelerates remediation.",
  inputSchema: z.object({
    query: z
      .string()
      .min(3)
      .describe("Search query, e.g. 'postgres connection pool exhaustion postmortem' or 'redis maxmemory noeviction outage'"),
    limit: z.number().int().min(1).max(5).default(3),
  }),
  execute: async ({ query, limit }) => {
    try {
      // SERP via BD — pass google.com search URL through Web Unlocker
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + " site:engineering.* OR site:*.tech OR site:github.com")}`;
      const raw = await bdFetch({ url: searchUrl, format: "raw", zone: process.env.BRIGHT_DATA_SERP_ZONE ?? "serp_api1" }, 10_000);
      // Very lightweight extraction — just titles + links from common patterns
      const matches = [...raw.matchAll(/<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<a[^>]*href="([^"]+)"/g)]
        .slice(0, limit)
        .map((m) => ({ title: m[1], url: m[2] }));
      return { source: "brightdata-serp", query, count: matches.length, results: matches };
    } catch (err) {
      // Curated fallback — synthesized "would-find" postmortems
      const mock = [
        { title: "How Slack scaled Postgres — connection pool tuning", url: "https://slack.engineering/scaling-postgres" },
        { title: "Stripe's circuit breaker pattern (CRDB) postmortem", url: "https://stripe.com/blog/circuit-breaker" },
        { title: "GitHub: Redis eviction storm root cause analysis", url: "https://github.blog/postmortem/2024/redis" },
      ].slice(0, limit);
      return {
        source: "mock-fallback",
        query,
        count: mock.length,
        results: mock,
        note: `BD SERP failed: ${(err as Error).message}`,
      };
    }
  },
});

export const fetchGithubRecentCommits = tool({
  description:
    "Fetch recent commits to a public GitHub repository via Bright Data, scoped to the last 24-48h. Use to correlate an incident with upstream open-source library / framework releases that may have broken something downstream.",
  inputSchema: z.object({
    repo: z.string().regex(/^[\w-]+\/[\w-.]+$/, "Format: owner/name").describe("Public GitHub repo, e.g. 'vercel/next.js'"),
    limit: z.number().int().min(1).max(10).default(5),
  }),
  execute: async ({ repo, limit }) => {
    try {
      const url = `https://api.github.com/repos/${repo}/commits?per_page=${limit}`;
      const raw = await bdFetch({ url, format: "raw" }, 8000);
      const data = JSON.parse(raw) as Array<{ sha: string; commit: { message: string; author: { date: string; name: string } } }>;
      return {
        source: "brightdata-github",
        repo,
        commits: data.slice(0, limit).map((c) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0],
          author: c.commit.author.name,
          date: c.commit.author.date,
        })),
      };
    } catch (err) {
      return {
        source: "mock-fallback",
        repo,
        commits: [
          { sha: "a7f3b9c", message: "chore: bump image-processing lib to 2.1.0", author: "dave", date: "2026-05-12T09:12:00Z" },
          { sha: "bb91f02", message: "fix: stripe charge.create timeout handling", author: "bob", date: "2026-05-12T10:42:00Z" },
        ],
        note: `BD fetch failed: ${(err as Error).message}`,
      };
    }
  },
});

export const brightDataTools = {
  fetchVendorStatus,
  searchPublicPostmortems,
  fetchGithubRecentCommits,
};
