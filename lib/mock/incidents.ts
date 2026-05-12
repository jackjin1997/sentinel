import type { Incident, LogLine, MetricPoint, Runbook } from "../types";

export const INCIDENTS: Incident[] = [
  {
    id: "INC-001",
    title: "checkout-api P99 latency spike to 3.2s",
    service: "checkout-api",
    detectedAt: "2026-05-12T14:23:00Z",
    severity: "high",
    symptoms: [
      "P99 latency 280ms → 3200ms in 4 minutes",
      "5xx error rate climbing from 0.1% to 4%",
      "Customer complaints in #support starting 14:21Z",
    ],
    status: "detected",
  },
  {
    id: "INC-002",
    title: "auth-service connection pool exhausted",
    service: "auth-service",
    detectedAt: "2026-05-12T15:01:00Z",
    severity: "critical",
    symptoms: [
      "DB connection pool at 100/100 since 14:58Z",
      "Login API returning 503 to 30% of requests",
      "Read replica lag jumped to 8s",
    ],
    status: "detected",
  },
  {
    id: "INC-003",
    title: "image-worker memory leak — OOM kills every 18min",
    service: "image-worker",
    detectedAt: "2026-05-12T11:45:00Z",
    severity: "medium",
    symptoms: [
      "Pod RSS grows linearly 200MB/hour",
      "K8s evictions every 17-19 min",
      "Started after deploy commit a7f3b9c at 09:12Z",
    ],
    status: "detected",
  },
  {
    id: "INC-004",
    title: "search-api returning stale results after cache flush",
    service: "search-api",
    detectedAt: "2026-05-12T16:12:00Z",
    severity: "high",
    symptoms: [
      "Users see search results from 6+ hours ago",
      "Cache hit rate dropped 92% → 14% at 16:08Z",
      "Redis evictions: 0 → 8000/min",
      "No deploys in last 24h",
    ],
    status: "detected",
  },
  {
    id: "INC-005",
    title: "notification-worker — 100% Slack delivery failures",
    service: "notification-worker",
    detectedAt: "2026-05-12T13:30:00Z",
    severity: "critical",
    symptoms: [
      "All Slack webhook posts returning 401 since 13:25Z",
      "0 of 1247 alerts delivered in last hour",
      "Email/SMS channels unaffected",
      "Slack workspace admin rotated bot tokens 'yesterday'",
    ],
    status: "detected",
  },
];

export const LOGS_BY_SERVICE: Record<string, LogLine[]> = {
  "checkout-api": [
    { ts: "14:20:01", service: "checkout-api", level: "info", message: "POST /v1/checkout/complete 200 142ms" },
    { ts: "14:20:14", service: "checkout-api", level: "info", message: "POST /v1/checkout/complete 200 167ms" },
    { ts: "14:21:02", service: "checkout-api", level: "warn", message: "stripe.charge.create slow_call duration=2840ms" },
    { ts: "14:21:18", service: "checkout-api", level: "warn", message: "stripe.charge.create slow_call duration=2901ms" },
    { ts: "14:21:33", service: "checkout-api", level: "error", message: "stripe.charge.create timeout after 5000ms request_id=ch_req_8x4j2" },
    { ts: "14:22:01", service: "checkout-api", level: "error", message: "Upstream 504: stripe-api timeout (3 of last 10 calls)" },
    { ts: "14:22:45", service: "checkout-api", level: "error", message: "Circuit breaker OPEN for stripe.charge" },
    { ts: "14:23:00", service: "checkout-api", level: "error", message: "POST /v1/checkout/complete 503 5012ms — circuit open" },
  ],
  "auth-service": [
    { ts: "14:55:02", service: "auth-service", level: "info", message: "POST /login 200 84ms" },
    { ts: "14:57:11", service: "auth-service", level: "warn", message: "PgPool: 98/100 connections in use" },
    { ts: "14:58:33", service: "auth-service", level: "warn", message: "PgPool: 100/100 connections in use — waiters=12" },
    { ts: "14:58:47", service: "auth-service", level: "error", message: "PgPool: acquire timeout 5000ms — no connection available" },
    { ts: "14:59:02", service: "auth-service", level: "error", message: "Long-running query detected: 87s duration query_id=q_9182" },
    { ts: "14:59:15", service: "auth-service", level: "error", message: "POST /login 503 — db unavailable" },
    { ts: "15:00:01", service: "auth-service", level: "error", message: "Pod restart triggered by liveness probe failure" },
  ],
  "image-worker": [
    { ts: "11:30:11", service: "image-worker", level: "info", message: "Processed batch of 200 thumbnails in 4.2s mem=480MB" },
    { ts: "11:40:22", service: "image-worker", level: "info", message: "Processed batch of 200 thumbnails in 4.5s mem=720MB" },
    { ts: "11:42:33", service: "image-worker", level: "warn", message: "Memory usage 920MB / 1024MB limit (90%)" },
    { ts: "11:44:08", service: "image-worker", level: "warn", message: "GC pressure: 4 collections in last minute" },
    { ts: "11:44:58", service: "image-worker", level: "error", message: "Killed by OOMKiller — RSS 1018MB > limit 1024MB" },
    { ts: "11:45:02", service: "image-worker", level: "info", message: "Pod restarted, mem=180MB" },
  ],
  "search-api": [
    { ts: "16:07:30", service: "search-api", level: "info", message: "Cache hit ratio: 0.92 (45,200/49,100 last 1min)" },
    { ts: "16:08:11", service: "search-api", level: "warn", message: "Redis OOM, eviction policy noeviction returned: OOM command not allowed when used memory > 'maxmemory'" },
    { ts: "16:08:33", service: "search-api", level: "error", message: "Redis SET failed: OOM — falling back to read-only mode" },
    { ts: "16:09:15", service: "search-api", level: "warn", message: "Cache hit ratio: 0.14 (6,800/48,500 last 1min) — degraded mode" },
    { ts: "16:10:02", service: "search-api", level: "warn", message: "Backend ES queries up 5.8x — load spike on primary cluster" },
    { ts: "16:11:44", service: "search-api", level: "error", message: "ES query timeout 30s — falling back to stale Redis snapshot from 09:48Z" },
    { ts: "16:12:00", service: "search-api", level: "error", message: "User report: 'results haven't updated since this morning'" },
  ],
  "notification-worker": [
    { ts: "13:24:11", service: "notification-worker", level: "info", message: "Posted alert to Slack #incidents — 200 OK" },
    { ts: "13:25:01", service: "notification-worker", level: "error", message: "POST hooks.slack.com/services/T01.../B02.../xoxb-... returned 401 invalid_auth" },
    { ts: "13:25:14", service: "notification-worker", level: "error", message: "POST hooks.slack.com/services/T01.../B02.../xoxb-... returned 401 invalid_auth" },
    { ts: "13:26:00", service: "notification-worker", level: "error", message: "Slack delivery failure rate: 100% (last 50/50 attempts)" },
    { ts: "13:27:33", service: "notification-worker", level: "warn", message: "Backoff: pausing Slack channel for 60s — error budget exhausted" },
    { ts: "13:29:50", service: "notification-worker", level: "info", message: "Resumed Slack channel after backoff" },
    { ts: "13:30:00", service: "notification-worker", level: "error", message: "POST hooks.slack.com — STILL 401 invalid_auth · escalating SEV-1" },
  ],
};

export const METRICS_BY_SERVICE: Record<string, MetricPoint[]> = {
  "checkout-api": [
    { ts: "14:18", service: "checkout-api", metric: "http.p99_ms", value: 280, unit: "ms" },
    { ts: "14:19", service: "checkout-api", metric: "http.p99_ms", value: 310, unit: "ms" },
    { ts: "14:20", service: "checkout-api", metric: "http.p99_ms", value: 450, unit: "ms" },
    { ts: "14:21", service: "checkout-api", metric: "http.p99_ms", value: 1200, unit: "ms" },
    { ts: "14:22", service: "checkout-api", metric: "http.p99_ms", value: 2800, unit: "ms" },
    { ts: "14:23", service: "checkout-api", metric: "http.p99_ms", value: 3200, unit: "ms" },
    { ts: "14:22", service: "checkout-api", metric: "stripe.upstream_p95_ms", value: 4900, unit: "ms" },
    { ts: "14:23", service: "checkout-api", metric: "circuit_breaker.state", value: 1, unit: "0=closed,1=open" },
  ],
  "auth-service": [
    { ts: "14:55", service: "auth-service", metric: "pg.pool.in_use", value: 24, unit: "connections" },
    { ts: "14:56", service: "auth-service", metric: "pg.pool.in_use", value: 71, unit: "connections" },
    { ts: "14:57", service: "auth-service", metric: "pg.pool.in_use", value: 98, unit: "connections" },
    { ts: "14:58", service: "auth-service", metric: "pg.pool.in_use", value: 100, unit: "connections" },
    { ts: "14:59", service: "auth-service", metric: "pg.replica_lag_s", value: 8.4, unit: "seconds" },
    { ts: "14:59", service: "auth-service", metric: "pg.long_query.count", value: 1, unit: "queries>60s" },
  ],
  "image-worker": [
    { ts: "11:30", service: "image-worker", metric: "container.mem_rss_mb", value: 480, unit: "MB" },
    { ts: "11:35", service: "image-worker", metric: "container.mem_rss_mb", value: 580, unit: "MB" },
    { ts: "11:40", service: "image-worker", metric: "container.mem_rss_mb", value: 720, unit: "MB" },
    { ts: "11:42", service: "image-worker", metric: "container.mem_rss_mb", value: 920, unit: "MB" },
    { ts: "11:44", service: "image-worker", metric: "container.mem_rss_mb", value: 1018, unit: "MB" },
    { ts: "11:45", service: "image-worker", metric: "container.mem_rss_mb", value: 180, unit: "MB (after restart)" },
  ],
  "search-api": [
    { ts: "16:05", service: "search-api", metric: "cache.hit_ratio", value: 0.93, unit: "ratio" },
    { ts: "16:07", service: "search-api", metric: "cache.hit_ratio", value: 0.92, unit: "ratio" },
    { ts: "16:09", service: "search-api", metric: "cache.hit_ratio", value: 0.14, unit: "ratio" },
    { ts: "16:08", service: "search-api", metric: "redis.evictions_per_min", value: 8200, unit: "evictions" },
    { ts: "16:09", service: "search-api", metric: "redis.used_memory_mb", value: 8190, unit: "MB (cap 8192)" },
    { ts: "16:10", service: "search-api", metric: "es.queries_per_sec", value: 4400, unit: "qps (baseline 750)" },
    { ts: "16:11", service: "search-api", metric: "es.p99_ms", value: 28000, unit: "ms" },
  ],
  "notification-worker": [
    { ts: "13:24", service: "notification-worker", metric: "slack.delivery_success_rate", value: 0.998, unit: "ratio" },
    { ts: "13:25", service: "notification-worker", metric: "slack.delivery_success_rate", value: 0.0, unit: "ratio" },
    { ts: "13:25", service: "notification-worker", metric: "slack.http_status_401_count", value: 47, unit: "responses/min" },
    { ts: "13:30", service: "notification-worker", metric: "alerts_undelivered_count", value: 1247, unit: "alerts" },
    { ts: "13:30", service: "notification-worker", metric: "email.delivery_success_rate", value: 0.997, unit: "ratio" },
    { ts: "13:30", service: "notification-worker", metric: "sms.delivery_success_rate", value: 1.0, unit: "ratio" },
  ],
};

export const RUNBOOKS: Runbook[] = [
  {
    id: "RB-101",
    title: "Upstream payment provider slowdown / circuit breaker tripping",
    symptoms: ["P99 latency spike", "5xx rate climbing", "stripe.charge slow_call warnings", "Circuit breaker OPEN"],
    diagnosis:
      "Stripe upstream latency increase causes our P99 spike. Our circuit breaker tripped open as designed, but caller services don't have graceful degradation.",
    remediation: [
      "Check status.stripe.com for incident",
      "Confirm circuit breaker config (threshold=50% errors over 30s window)",
      "Enable async-queue fallback for charge.create — accept order, retry in background",
      "Page payments team if Stripe status confirms outage > 15min",
    ],
  },
  {
    id: "RB-102",
    title: "Postgres connection pool exhaustion",
    symptoms: ["pool.in_use at limit", "acquire timeout", "503 responses", "replica lag increase"],
    diagnosis:
      "Pool saturation usually caused by a long-running query holding connections or a connection leak from a recent deploy. Replica lag suggests bulk read pressure.",
    remediation: [
      "Identify long queries: SELECT pid, query_start, query FROM pg_stat_activity WHERE state='active' AND now()-query_start > '60s'",
      "Kill offending query: SELECT pg_terminate_backend(pid)",
      "Roll back last 24h deploys if conn leak suspected",
      "Temporarily bump pool size from 100 → 150 as bridge",
      "Open postmortem ticket — patterns of leak need code review",
    ],
  },
  {
    id: "RB-103",
    title: "Worker pod memory leak / OOM kill cycle",
    symptoms: ["RSS grows linearly", "Recurring OOM kills", "GC pressure increase", "Recent deploy correlates"],
    diagnosis:
      "Linear memory growth pattern + correlation with recent deploy strongly implies memory leak in newly shipped code. Heap snapshot needed to confirm leak source.",
    remediation: [
      "Capture heap snapshot: kubectl exec <pod> -- kill -USR2 1 && cp /tmp/heapdump.*",
      "Revert deploy a7f3b9c if no quick fix path",
      "Bump memory limit 1024MB → 2048MB as short-term mitigation",
      "Schedule deep dive — review recently shipped image processing code paths",
    ],
  },
  {
    id: "RB-104",
    title: "Deploy correlation analysis",
    symptoms: ["Issue started near deploy time", "Linear-pattern degradation"],
    diagnosis: "Many incidents correlate with deploys. Check deploy timeline before blaming infrastructure.",
    remediation: [
      "Cross-reference incident start time with deploy log (kubectl rollout history)",
      "Compare commit SHA at incident start vs healthy baseline",
      "Consider git revert as fast mitigation",
    ],
  },
  {
    id: "RB-105",
    title: "Redis cache eviction storm / stale fallback",
    symptoms: ["cache.hit_ratio collapse", "redis.evictions_per_min spike", "stale fallback warnings", "backend QPS spike"],
    diagnosis:
      "Redis hit its maxmemory cap and started evicting under noeviction policy (silently rejecting writes). Cache stops being refreshed, hit rate collapses, backend gets hammered, and fallback paths serve stale snapshots.",
    remediation: [
      "Check Redis INFO memory: used_memory vs maxmemory — usually >95% during eviction storm",
      "Change eviction policy from noeviction to allkeys-lru as immediate mitigation: CONFIG SET maxmemory-policy allkeys-lru",
      "Scale Redis memory up (e.g. 8GB → 16GB) — buys breathing room",
      "Audit: who recently added large keys? Run MEMORY USAGE on top keys via redis-cli --bigkeys",
      "Long-term: add cache.used_memory_pct alert at 80% with paging at 90%",
    ],
  },
  {
    id: "RB-106",
    title: "Third-party API auth token rotation / 401 cascade",
    symptoms: ["100% delivery failure to one channel", "401 invalid_auth responses", "Other channels unaffected", "Recent token rotation mentioned"],
    diagnosis:
      "Outbound integration auth credentials are stale. Slack/SMS/email tokens rotated without updating our secrets store — our worker is still presenting the old token. Single-channel failure pattern + 401 status code strongly indicates auth, not network/quota.",
    remediation: [
      "Confirm with channel-owner team that token was rotated (Slack admin audit log)",
      "Fetch new token from secrets manager (or have admin generate new one and store)",
      "Update K8s secret: kubectl create secret generic slack-creds --from-literal=token=NEW --dry-run=client -o yaml | kubectl apply -f -",
      "Restart worker pods to pick up new secret: kubectl rollout restart deploy/notification-worker",
      "Verify delivery within 60s of restart; backfill missed alerts from queue if applicable",
      "Post-incident: enable credential-rotation webhook from secrets manager to auto-reload worker",
    ],
  },
];
