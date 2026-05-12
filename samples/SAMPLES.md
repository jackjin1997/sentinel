# Sentinel · Sample Diagnoses

Verified end-to-end runs against all 5 mock incidents. Each diagnosis is the final consolidated JSON report from the 4-phase pipeline.

_All runs done 2026-05-12 with real Gemini Flash + Claude Sonnet calls (no fallback, no mocking)._


## INC-001

- **Phases**: gemini-2.5-flash → claude-sonnet-4-6 → gemini-2.5-flash → claude-haiku-4-5
- **Streaming**: 75 text deltas · 6 tool calls

### Root cause (confidence: **medium**)

> Stripe API degradation beginning ~14:21Z caused charge.create calls to slow to 2,840–4,900ms, triggering circuit breaker OPEN at 14:22:45Z; however, the persistent P99 latency of 3,200ms on 503 responses suggests either the circuit breaker is not fast-failing as expected, or a secondary bottleneck (thread pool exhaustion, connection pool saturation) is compounding the issue.

### Recommendations
1. Immediately verify Stripe status at status.stripe.com and page payments on-call with request_id=ch_req_8x4j2; simultaneously pull thread pool and connection pool metrics to confirm whether resource exhaustion is prolonging fast-fail latency
2. Clarify circuit breaker behavior: confirm whether 503s are being returned in <100ms (true fast-fail) or if a secondary timeout/retry loop is extending latency to 3.2s, then adjust breaker configuration or request timeout accordingly
3. Do not enable async-queue fallback without explicit real-time approval from product and finance teams; instead, prepare the fallback as a standby option and brief stakeholders on the business risk (orders accepted without guaranteed payment) before activation


## INC-002

- **Phases**: gemini-2.5-flash → claude-sonnet-4-6 → gemini-2.5-flash → claude-haiku-4-5
- **Streaming**: 90 text deltas · 6 tool calls

### Root cause (confidence: **medium**)

> Query q_9182 ran for ≥87 seconds holding a database connection, triggering cascading pool saturation from 24→100 connections in 3 minutes; however, the diagnosis may underestimate concurrent contention and lacks visibility into whether application-level changes (feature flags, traffic shifts) triggered the query execution or plan regression.

### Recommendations
1. Verify q_9182 is no longer active post-restart (15:00:01Z); if still running, terminate it only after confirming with app team that rollback is safe; retrieve full query text and execution plan from pg_stat_statements to identify root cause (missing index, stale stats, or lock contention)
2. Run ANALYZE on all tables accessed by q_9182 immediately; set statement_timeout = '60s' (not 30s) at the session level for future q_9182 executions only, pending investigation, rather than role-wide to avoid killing legitimate long-running auth background tasks
3. Add PgPool saturation alert at ≥80% with alarm severity; set idle_in_transaction_session_timeout = '120s' to catch future connection leaks; cross-check application logs for concurrent traffic spikes, feature flag toggles, or parameter changes that coincided with the incident (14:55Z–14:58Z window)


## INC-003

- **Phases**: gemini-2.5-flash → claude-sonnet-4-6 → gemini-2.5-flash → claude-haiku-4-5
- **Streaming**: 76 text deltas · 7 tool calls

### Root cause (confidence: **medium**)

> Commit a7f3b9c deployed at 09:12Z introduced a memory leak in image-worker's processing code path that accumulates native/heap memory at ~200 MB/hr, causing deterministic OOM kills every 17-19 minutes.

### Recommendations
1. Immediately revert commit a7f3b9c after confirming with dave that it was not a critical security or compliance fix; monitor for 2+ hours post-revert to validate leak cessation.
2. Parallel to revert: capture application-level memory metrics (in-flight job count, cache sizes, open file handles, buffer pool stats) and correlate with RSS growth to identify the specific leaking object type before re-deploying any fix.
3. If revert is blocked: increase memory limit from 1024 MB to 2048 MB as a temporary 36-minute blast shield only while investigating, and verify node capacity headroom to avoid cascading cluster evictions.
4. Perform a targeted heap dump only if revert is delayed and high-load conditions permit a brief processing pause; use non-blocking alternatives (e.g., profiling sidecar, memory sampling) if service is latency-critical.


## INC-004

- **Phases**: gemini-2.5-flash → claude-sonnet-4-6 → gemini-2.5-flash → claude-haiku-4-5
- **Streaming**: 88 text deltas · 7 tool calls

### Root cause (confidence: **medium**)

> Redis reached its 8192 MB maxmemory limit under noeviction policy at 16:08Z, causing all SET operations to fail; search-api fell back to serving a stale cache snapshot from 09:48Z (~6h old) while new results could not be written, with the underlying memory growth driven by unidentified data volume expansion (index bloat, document size increase, or cache warm).

### Recommendations
1. Immediately clarify the actual Redis eviction policy in effect (noeviction vs. other) and reconcile against the observed 8,200 evictions/min spike—if noeviction is confirmed, validate that 'evictions' metric refers to failed SET commands, not actual key evictions
2. Execute selective Redis key expiration or FLUSHDB on the stale namespace with a pre-validated, ready-to-deploy cache pre-warm script and ES query rate-limiter to prevent thundering herd during incident recovery
3. Run redis-cli --bigkeys and MEMORY DOCTOR to identify the specific data type/key consuming 8 GB, then implement per-key TTL enforcement and a maxmemory alert at 75% threshold to prevent recurrence
4. Document the exact mechanism by which search-api caches and retrieves the '09:48Z stale snapshot'—confirm whether it is individual result caching or bulk index snapshots, and validate that cache-miss fallback logic queries live Elasticsearch rather than returning stale data


## INC-005

- **Phases**: gemini-2.5-flash → claude-sonnet-4-6 → gemini-2.5-flash → claude-haiku-4-5
- **Streaming**: 75 text deltas · 7 tool calls

### Root cause (confidence: **high**)

> Slack workspace admin rotated bot tokens on 2026-05-11, but the new token was never propagated to notification-worker's secrets store, causing all webhook POSTs to fail with 401 invalid_auth starting at 13:25Z.

### Recommendations
1. IMMEDIATE (<5 min): Confirm new token validity and scoping with Slack admin; identify the correct secret key name and webhook URL format expected by notification-worker code; apply the new token to secrets store and trigger pod restart with queue durability verification.
2. IMMEDIATE (post-restart): Backfill 1,247 queued alerts with throttled replay (50 msg/s target) prioritized by severity to avoid Slack 429 rate-limiting; monitor delivery_success_rate metric for sustained >0.99 recovery.
3. SHORT-TERM (24h): Implement automated secrets-rotation detection (hook secrets manager to emit rotation events) with gated auto-restart logic scoped by service label; add synthetic Slack POST canary probe (5-min interval) to catch credential expiry within one cycle; document and enforce token propagation process with approval workflow to prevent manual oversight.

