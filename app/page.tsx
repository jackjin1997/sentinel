"use client";

import { useEffect, useRef, useState } from "react";
import type { Incident } from "@/lib/types";

type Phase = "triage" | "investigate" | "adversarial-review" | "consolidate";

interface PhaseBlock {
  phase: Phase;
  model: string;
  text: string;
  toolCalls: { name: string; args: unknown; result?: unknown }[];
  done: boolean;
}

interface FinalReport {
  rootCause: string;
  recommendations: string[];
  confidence: string;
}

const PHASE_META: Record<Phase, { label: string; color: string; emoji: string }> = {
  triage: { label: "TRIAGE", color: "text-cyan-300", emoji: "🔍" },
  investigate: { label: "INVESTIGATE", color: "text-emerald-300", emoji: "🧠" },
  "adversarial-review": { label: "ADVERSARIAL REVIEW", color: "text-orange-300", emoji: "⚔️" },
  consolidate: { label: "CONSOLIDATE", color: "text-fuchsia-300", emoji: "📋" },
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-red-300 border-red-500/40",
  high: "text-orange-300 border-orange-500/40",
  medium: "text-yellow-300 border-yellow-500/40",
  low: "text-zinc-300 border-zinc-500/40",
};

export default function Home() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [phases, setPhases] = useState<PhaseBlock[]>([]);
  const [running, setRunning] = useState(false);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const traceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/incidents")
      .then((r) => r.json())
      .then((d) => setIncidents(d.incidents));
  }, []);

  useEffect(() => {
    if (traceRef.current) traceRef.current.scrollTop = traceRef.current.scrollHeight;
  }, [phases, finalReport]);

  async function startInvestigation(id: string) {
    setSelected(id);
    setPhases([]);
    setFinalReport(null);
    setErrorMsg(null);
    setRunning(true);

    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentId: id }),
    });
    if (!res.ok || !res.body) {
      setErrorMsg("Failed to start agent");
      setRunning(false);
      return;
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let currentPhase: Phase | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6);
        if (!raw.trim()) continue;
        try {
          const ev = JSON.parse(raw);
          handleEvent(ev);
        } catch {
          // ignore parse errors
        }
      }
      function handleEvent(ev: { type: string; [k: string]: unknown }) {
        if (ev.type === "phase") {
          currentPhase = ev.phase as Phase;
          setPhases((p) => [
            ...p,
            { phase: currentPhase!, model: ev.model as string, text: "", toolCalls: [], done: false },
          ]);
        } else if (ev.type === "text-delta" && currentPhase) {
          setPhases((p) => {
            const next = [...p];
            const idx = next.findLastIndex((x) => x.phase === currentPhase);
            if (idx >= 0) next[idx] = { ...next[idx], text: next[idx].text + (ev.delta as string) };
            return next;
          });
        } else if (ev.type === "tool-call" && currentPhase) {
          setPhases((p) => {
            const next = [...p];
            const idx = next.findLastIndex((x) => x.phase === currentPhase);
            if (idx >= 0)
              next[idx] = {
                ...next[idx],
                toolCalls: [...next[idx].toolCalls, { name: ev.name as string, args: ev.args }],
              };
            return next;
          });
        } else if (ev.type === "tool-result" && currentPhase) {
          setPhases((p) => {
            const next = [...p];
            const idx = next.findLastIndex((x) => x.phase === currentPhase);
            if (idx >= 0) {
              const tcs = [...next[idx].toolCalls];
              const tcIdx = tcs.findLastIndex((t) => t.name === ev.name && t.result === undefined);
              if (tcIdx >= 0) tcs[tcIdx] = { ...tcs[tcIdx], result: ev.result };
              next[idx] = { ...next[idx], toolCalls: tcs };
            }
            return next;
          });
        } else if (ev.type === "phase-complete" && currentPhase) {
          setPhases((p) => {
            const next = [...p];
            const idx = next.findLastIndex((x) => x.phase === currentPhase);
            if (idx >= 0) next[idx] = { ...next[idx], done: true };
            return next;
          });
        } else if (ev.type === "final") {
          setFinalReport(ev.report as FinalReport);
        } else if (ev.type === "error") {
          setErrorMsg(ev.message as string);
        }
      }
    }
    setRunning(false);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200 font-mono">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-bold tracking-tight">SENTINEL</span>
          <span className="text-xs text-zinc-500">autonomous incident response · multi-LLM</span>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 rounded border border-cyan-500/30 text-cyan-300">gemini-2.5-flash</span>
          <span className="px-2 py-1 rounded border border-emerald-500/30 text-emerald-300">gemini-2.5-pro</span>
          <span className="px-2 py-1 rounded border border-orange-500/30 text-orange-300">claude-sonnet-4-6</span>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 p-6">
        <aside className="col-span-4">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Open Incidents</h2>
          <ul className="space-y-3">
            {incidents.map((inc) => (
              <li key={inc.id}>
                <button
                  onClick={() => !running && startInvestigation(inc.id)}
                  disabled={running}
                  className={`w-full text-left p-4 rounded-lg border transition ${
                    selected === inc.id
                      ? "border-emerald-500/60 bg-emerald-500/5"
                      : "border-zinc-800 hover:border-zinc-600"
                  } ${running ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-zinc-500">{inc.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${SEVERITY_COLOR[inc.severity]}`}>
                      {inc.severity}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-zinc-100 mb-2 leading-tight">{inc.title}</div>
                  <div className="text-xs text-zinc-500">
                    {inc.service} · {inc.symptoms.length} symptoms
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {!selected && (
            <p className="mt-6 text-xs text-zinc-600 leading-relaxed">
              Click an incident to dispatch Sentinel. Three LLMs investigate in sequence:{" "}
              <span className="text-cyan-300">Gemini Flash</span> triages,{" "}
              <span className="text-emerald-300">Gemini Pro</span> diagnoses,{" "}
              <span className="text-orange-300">Claude</span> adversarially reviews.
            </p>
          )}
        </aside>

        <section className="col-span-8">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-zinc-600 text-sm border border-dashed border-zinc-800 rounded-lg min-h-[400px]">
              Select an incident to begin
            </div>
          ) : (
            <div className="space-y-4" ref={traceRef}>
              {finalReport && (
                <div className="p-5 rounded-lg border border-emerald-500/40 bg-emerald-500/5">
                  <div className="text-xs uppercase tracking-widest text-emerald-300 mb-2">
                    Final Report · confidence: {finalReport.confidence}
                  </div>
                  <div className="text-sm text-zinc-100 mb-3 font-semibold">{finalReport.rootCause}</div>
                  <ol className="space-y-1.5 text-sm text-zinc-300">
                    {finalReport.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-emerald-500">{i + 1}.</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {phases.map((ph, i) => {
                const meta = PHASE_META[ph.phase];
                return (
                  <div key={i} className="border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-2.5 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{meta.emoji}</span>
                        <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                        <span className="text-xs text-zinc-500">· {ph.model}</span>
                      </div>
                      <span className={`text-xs ${ph.done ? "text-emerald-500" : "text-yellow-500 animate-pulse"}`}>
                        {ph.done ? "✓ done" : "● live"}
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      {ph.toolCalls.length > 0 && (
                        <div className="space-y-1.5">
                          {ph.toolCalls.map((tc, j) => (
                            <details key={j} className="border-l-2 border-zinc-700 pl-3 text-xs">
                              <summary className="cursor-pointer text-zinc-400">
                                <span className="text-yellow-300">{tc.name}</span>
                                <span className="text-zinc-600 ml-2">
                                  ({Object.keys(tc.args as object).join(", ")})
                                </span>
                                {tc.result !== undefined && <span className="text-emerald-500 ml-2">✓</span>}
                              </summary>
                              <pre className="mt-2 p-2 rounded bg-zinc-900 text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {JSON.stringify({ args: tc.args, result: tc.result }, null, 2)}
                              </pre>
                            </details>
                          ))}
                        </div>
                      )}
                      {ph.text && (
                        <div className={`text-sm whitespace-pre-wrap leading-relaxed ${meta.color.replace("text-", "text-").replace("-300", "-100")}`}>
                          {ph.text}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {errorMsg && (
                <div className="p-4 rounded-lg border border-red-500/40 bg-red-500/5 text-sm text-red-300">
                  ⚠ {errorMsg}
                </div>
              )}

              {running && phases.length === 0 && (
                <div className="text-sm text-zinc-500 animate-pulse">Dispatching agents…</div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
