import { runIncidentAgent, type AgentEvent } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 1 KB is enough for the {"incidentId": "..."} envelope and gives plenty of
// headroom. Header check filters honest oversize clients up front; the
// post-text() length check is a second line of defense (note: req.text()
// still fully buffers the body, so a malicious client lying about
// content-length can still push us up to the platform's body limit).
const MAX_BODY_BYTES = 1024;

// Slow-consumer ceiling. Cumulative — once we've emitted 200 events while the
// consumer's desiredSize is non-positive, the client is gone or hopelessly
// slow (mobile NAT, sleeping proxy) and we stop the run. Not "consecutive": a
// resetting threshold is trivially defeated by an occasional drain.
const MAX_BACKPRESSURE_MISSES = 200;

export async function POST(req: Request) {
  // Body size guard. Header check first (cheap), then a hard char check on
  // the buffered text in case the header is missing or lying.
  const declaredLen = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLen) && declaredLen > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "body too large" }), { status: 413 });
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "body too large" }), { status: 413 });
  }

  let incidentId: string | undefined;
  try {
    ({ incidentId } = JSON.parse(raw) as { incidentId?: string });
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400 });
  }
  if (!incidentId) {
    return new Response(JSON.stringify({ error: "incidentId required" }), { status: 400 });
  }

  // Client disconnect → abort the agent so we stop burning LLM tokens
  // and don't leave zombie streamText loops eating memory on the server.
  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort(), { once: true });

  const encoder = new TextEncoder();
  const stream = new ReadableStream(
    {
      async start(controller) {
        let closed = false;
        let backpressureMisses = 0;
        const send = (event: AgentEvent) => {
          if (closed || ac.signal.aborted) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            closed = true;
            ac.abort();
            return;
          }
          // Slow-consumer detection. desiredSize <= 0 means the internal
          // queue is at or above its highWaterMark — count cumulatively (no
          // reset on a single healthy emit, see MAX_BACKPRESSURE_MISSES note).
          if (controller.desiredSize !== null && controller.desiredSize <= 0) {
            backpressureMisses++;
            if (backpressureMisses >= MAX_BACKPRESSURE_MISSES) {
              closed = true;
              ac.abort();
            }
          }
        };
        try {
          await runIncidentAgent(incidentId!, { emit: send, signal: ac.signal });
        } catch (err) {
          if (!ac.signal.aborted && !closed) {
            send({ type: "error", message: (err as Error).message });
          }
        }
        if (!closed && !ac.signal.aborted) {
          try {
            controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
          } catch {
            // consumer already gone
          }
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      },
      cancel() {
        ac.abort();
      },
    },
    // Byte-aware queue strategy so desiredSize reflects actual bytes buffered.
    // 64 KB is generous for SSE frames (each event is ~200B) but bounded.
    new ByteLengthQueuingStrategy({ highWaterMark: 64 * 1024 }),
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
