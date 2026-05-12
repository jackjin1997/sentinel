import { runIncidentAgent, type AgentEvent } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { incidentId } = (await req.json()) as { incidentId?: string };
  if (!incidentId) {
    return new Response(JSON.stringify({ error: "incidentId required" }), { status: 400 });
  }

  // Client disconnect → abort the agent so we stop burning LLM tokens
  // and don't leave zombie streamText loops eating memory on the server.
  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort(), { once: true });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: AgentEvent) => {
        if (closed || ac.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          closed = true;
          ac.abort();
        }
      };
      try {
        await runIncidentAgent(incidentId, { emit: send, signal: ac.signal });
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
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
