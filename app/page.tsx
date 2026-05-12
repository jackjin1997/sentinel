"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Incident } from "@/lib/types";

type Phase = "triage" | "investigate" | "adversarial-review" | "consolidate";

interface PhaseBlock {
  phase: Phase;
  model: string;
  text: string;
  toolCalls: { name: string; args: unknown; result?: unknown }[];
  done: boolean;
  isFallback: boolean;
  startedAt: number;
  finishedAt?: number;
}

interface FinalReport {
  rootCause: string;
  recommendations: string[];
  confidence: string;
}

const PHASE_META: Record<Phase, { label: string; color: string; emoji: string; ring: string }> = {
  triage: { label: "TRIAGE", color: "text-cyan-300", emoji: "🔍", ring: "ring-cyan-500/30" },
  investigate: { label: "INVESTIGATE", color: "text-emerald-300", emoji: "🧠", ring: "ring-emerald-500/30" },
  "adversarial-review": { label: "ADVERSARIAL REVIEW", color: "text-orange-300", emoji: "⚔️", ring: "ring-orange-500/30" },
  consolidate: { label: "CONSOLIDATE", color: "text-fuchsia-300", emoji: "📋", ring: "ring-fuchsia-500/30" },
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-red-300 border-red-500/40 bg-red-500/5",
  high: "text-orange-300 border-orange-500/40 bg-orange-500/5",
  medium: "text-yellow-300 border-yellow-500/40 bg-yellow-500/5",
  low: "text-zinc-300 border-zinc-500/40 bg-zinc-500/5",
};

const TOOL_ICON: Record<string, string> = {
  queryLogs: "📜",
  queryMetrics: "📊",
  searchRunbook: "📖",
  checkDeployHistory: "🚀",
};

function vendorChip(model: string) {
  if (model.startsWith("gemini")) {
    return { label: "Google", color: "text-cyan-300 border-cyan-500/40 bg-cyan-500/5" };
  }
  if (model.startsWith("claude")) {
    return { label: "Anthropic", color: "text-orange-300 border-orange-500/40 bg-orange-500/5" };
  }
  return { label: "Other", color: "text-zinc-300 border-zinc-500/40" };
}

export default function Home() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [phases, setPhases] = useState<PhaseBlock[]>([]);
  const [running, setRunning] = useState(false);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runFinishedAt, setRunFinishedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const traceRef = useRef<HTMLDivElement>(null);
  // Cancel in-flight investigation on unmount, navigation, or HMR. Without
  // these the SSE reader keeps consuming after the component disappears and
  // the server keeps spending LLM tokens until network-level disconnect.
  const abortRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useEffect(() => {
    fetch("/api/incidents")
      .then((r) => r.json())
      .then((d) => setIncidents(d.incidents));
  }, []);

  const cancelInFlight = useCallback(() => {
    abortRef.current?.abort();
    readerRef.current?.cancel().catch(() => {});
  }, []);

  useEffect(() => cancelInFlight, [cancelInFlight]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNowTick(Date.now()), 100);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (traceRef.current) traceRef.current.scrollTop = traceRef.current.scrollHeight;
  }, [phases, finalReport]);

  async function startInvestigation(id: string) {
    cancelInFlight();

    setSelected(id);
    setPhases([]);
    setFinalReport(null);
    setErrorMsg(null);
    setRunStartedAt(Date.now());
    setRunFinishedAt(null);
    setRunning(true);

    const ac = new AbortController();
    abortRef.current = ac;

    let res: Response;
    try {
      res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: id }),
        signal: ac.signal,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") setErrorMsg("Failed to start agent");
      setRunning(false);
      return;
    }
    if (!res.ok || !res.body) {
      setErrorMsg("Failed to start agent");
      setRunning(false);
      return;
    }

    const reader = res.body.getReader();
    readerRef.current = reader;
    const dec = new TextDecoder();
    let buf = "";
    let currentPhase: Phase | null = null;

    while (true) {
      let value: Uint8Array | undefined;
      let done = false;
      try {
        ({ value, done } = await reader.read());
      } catch (err) {
        if (ac.signal.aborted || (err as Error).name === "AbortError") break;
        setErrorMsg((err as Error).message);
        break;
      }
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
          // ignore
        }
      }
      function handleEvent(ev: { type: string; [k: string]: unknown }) {
        if (ev.type === "phase") {
          currentPhase = ev.phase as Phase;
          const model = ev.model as string;
          const isFallback = model.includes("fallback");
          setPhases((p) => [
            ...p,
            { phase: currentPhase!, model, text: "", toolCalls: [], done: false, isFallback, startedAt: Date.now() },
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
            if (idx >= 0) next[idx] = { ...next[idx], done: true, finishedAt: Date.now() };
            return next;
          });
        } else if (ev.type === "final") {
          setFinalReport(ev.report as FinalReport);
        } else if (ev.type === "error") {
          setErrorMsg(ev.message as string);
        }
      }
    }
    if (abortRef.current === ac) abortRef.current = null;
    if (readerRef.current === reader) readerRef.current = null;
    setRunning(false);
    if (!ac.signal.aborted) setRunFinishedAt(Date.now());
  }

  const elapsedMs = runStartedAt
    ? (runFinishedAt ?? nowTick) - runStartedAt
    : 0;
  const elapsedSec = (elapsedMs / 1000).toFixed(1);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200 font-mono">
      <header className="border-b border-zinc-800 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-baseline gap-4">
            <span className="text-2xl font-bold tracking-tight">SENTINEL</span>
            <span className="text-xs text-zinc-500 hidden md:inline">
              autonomous incident response · multi-vendor LLM orchestration
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded border border-cyan-500/30 bg-cyan-500/5 text-cyan-300">
              🟦 Google · gemini-2.5-flash
            </span>
            <span className="px-2.5 py-1 rounded border border-orange-500/30 bg-orange-500/5 text-orange-300">
              🟧 Anthropic · claude-sonnet-4-6
            </span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-3 text-xs text-zinc-500 leading-relaxed">
          When your service breaks, Sentinel investigates, diagnoses, and recommends fixes — three specialized LLMs
          working in sequence with adversarial cross-vendor review. <span className="text-zinc-400">Built for AI Agent Olympics 2026.</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 p-6">
        {/* INCIDENT LIST */}
        <aside className="col-span-12 lg:col-span-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500">Open Incidents</h2>
            <span className="text-xs text-zinc-600">{incidents.length} active</span>
          </div>
          <ul className="space-y-3">
            {incidents.map((inc) => (
              <li key={inc.id}>
                <button
                  onClick={() => !running && startInvestigation(inc.id)}
                  disabled={running}
                  className={`w-full text-left p-4 rounded-lg border transition ${
                    selected === inc.id
                      ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                      : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50"
                  } ${running ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-xs text-zinc-500">{inc.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${SEVERITY_COLOR[inc.severity]}`}>
                      {inc.severity}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-zinc-100 mb-2 leading-tight">{inc.title}</div>
                  <div className="text-xs text-zinc-500 flex items-center gap-2 flex-wrap">
                    <code className="text-zinc-400">{inc.service}</code>
                    <span>·</span>
                    <span>{inc.symptoms.length} symptoms</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {!selected && (
            <div className="mt-6 p-4 rounded-lg bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 leading-relaxed">
              <div className="font-semibold text-zinc-300 mb-2">How it works</div>
              Click any incident to dispatch Sentinel. Four phases run in sequence:
              <ol className="mt-2 space-y-1 list-decimal list-inside text-zinc-500">
                <li><span className="text-cyan-300">Gemini Flash</span> triages</li>
                <li><span className="text-emerald-300">Claude Sonnet</span> investigates</li>
                <li><span className="text-orange-300">Gemini Flash</span> adversarially reviews</li>
                <li><span className="text-fuchsia-300">Claude Sonnet</span> consolidates JSON report</li>
              </ol>
              <div className="mt-3 text-zinc-600">Each phase streams live — tool calls, reasoning, final report.</div>
            </div>
          )}
        </aside>

        {/* AGENT TRACE */}
        <section className="col-span-12 lg:col-span-8">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-zinc-600 text-sm border border-dashed border-zinc-800 rounded-lg min-h-[500px]">
              ← Select an incident to dispatch Sentinel
            </div>
          ) : (
            <div className="space-y-4" ref={traceRef}>
              {/* RUN HEADER */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
                <div className="text-xs text-zinc-400">
                  <span className="text-zinc-500">RUN</span> · {selected}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-zinc-500">elapsed</span>
                  <span className={`font-bold ${running ? "text-yellow-300" : "text-emerald-400"} font-mono`}>
                    {elapsedSec}s
                  </span>
                  {!running && finalReport && (
                    <button
                      onClick={() => startInvestigation(selected)}
                      className="ml-3 px-3 py-1 rounded border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs"
                    >
                      ↺ re-run
                    </button>
                  )}
                </div>
              </div>

              {/* FINAL REPORT - shown at top once available */}
              {finalReport && (
                <div className="p-5 rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20">
                  <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                    <div className="text-xs uppercase tracking-widest text-emerald-300 font-bold">
                      ✓ Final Report
                    </div>
                    <div className="text-xs text-zinc-400">
                      confidence: <span className={`font-bold ${
                        finalReport.confidence === "high" ? "text-emerald-300" :
                        finalReport.confidence === "low" ? "text-orange-300" : "text-yellow-300"
                      }`}>{finalReport.confidence}</span>
                      <span className="mx-2 text-zinc-700">|</span>
                      MTTR: <span className="text-emerald-300 font-bold">{elapsedSec}s</span>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-100 mb-4 font-semibold leading-relaxed">
                    {finalReport.rootCause}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Recommended actions</div>
                  <ol className="space-y-2 text-sm text-zinc-200">
                    {finalReport.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-3 leading-relaxed">
                        <span className="text-emerald-500 font-bold flex-shrink-0">{i + 1}.</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* PHASE TRACE */}
              {phases.map((ph, i) => {
                const meta = PHASE_META[ph.phase];
                const vendor = vendorChip(ph.model);
                const phElapsed = ((ph.finishedAt ?? (running ? nowTick : Date.now())) - ph.startedAt) / 1000;
                return (
                  <div
                    key={i}
                    className={`border rounded-lg overflow-hidden ${
                      ph.done ? "border-zinc-800" : `border-zinc-700 ring-1 ${meta.ring} animate-pulse`
                    }`}
                  >
                    <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-base">{meta.emoji}</span>
                        <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${vendor.color}`}>{vendor.label}</span>
                        <span className="text-xs text-zinc-500">{ph.model}</span>
                        {ph.isFallback && (
                          <span className="text-xs px-2 py-0.5 rounded border border-yellow-500/40 bg-yellow-500/5 text-yellow-300">
                            ↘ fallback
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-zinc-500 font-mono">{phElapsed.toFixed(1)}s</span>
                        <span
                          className={`${
                            ph.done ? "text-emerald-500" : "text-yellow-400"
                          } font-bold`}
                        >
                          {ph.done ? "✓ done" : "● live"}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* TOOL CALLS */}
                      {ph.toolCalls.length > 0 && (
                        <div className="space-y-1.5">
                          {ph.toolCalls.map((tc, j) => (
                            <details key={j} className="border-l-2 border-zinc-700 pl-3 text-xs">
                              <summary className="cursor-pointer text-zinc-300 hover:text-zinc-100">
                                <span className="mr-1">{TOOL_ICON[tc.name] ?? "🔧"}</span>
                                <span className="text-yellow-300 font-semibold">{tc.name}</span>
                                <span className="text-zinc-500 ml-2">
                                  ({Object.entries(tc.args as Record<string, unknown>)
                                    .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
                                    .join(", ")})
                                </span>
                                {tc.result !== undefined && <span className="text-emerald-500 ml-2">✓</span>}
                              </summary>
                              <pre className="mt-2 p-2 rounded bg-zinc-900 text-zinc-400 overflow-x-auto whitespace-pre-wrap max-h-56 overflow-y-auto text-[11px] leading-tight">
                                {JSON.stringify(tc.result ?? "(awaiting result...)", null, 2)}
                              </pre>
                            </details>
                          ))}
                        </div>
                      )}
                      {/* TEXT */}
                      {ph.text && (
                        <div
                          className={`text-sm whitespace-pre-wrap leading-relaxed ${meta.color
                            .replace("-300", "-100")}`}
                        >
                          {ph.text}
                        </div>
                      )}
                      {!ph.text && !ph.done && ph.toolCalls.length === 0 && (
                        <div className="text-xs text-zinc-500 italic">thinking…</div>
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
                <div className="p-8 text-center text-sm text-zinc-500 animate-pulse border border-dashed border-zinc-800 rounded-lg">
                  Dispatching agents…
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <footer className="border-t border-zinc-800 px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-zinc-600 flex-wrap gap-2">
          <div>
            Sentinel · open-source · built during{" "}
            <a className="text-zinc-400 hover:text-zinc-200" href="https://lablab.ai/ai-hackathons/milan-ai-week-hackathon" target="_blank" rel="noopener noreferrer">
              AI Agent Olympics 2026
            </a>
          </div>
          <div>
            <a className="text-zinc-400 hover:text-zinc-200" href="https://github.com/jackjin1997" target="_blank" rel="noopener noreferrer">github</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
