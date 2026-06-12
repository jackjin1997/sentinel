import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, streamText, stepCountIs, type LanguageModel } from "ai";
import { tools } from "./tools";
import { INCIDENTS } from "./mock/incidents";

export type AgentEvent =
  | { type: "phase"; phase: "triage" | "investigate" | "adversarial-review" | "consolidate"; model: string }
  | { type: "text-delta"; delta: string }
  | { type: "tool-call"; name: string; args: unknown }
  | { type: "tool-result"; name: string; result: unknown }
  | { type: "phase-complete"; phase: string; summary: string }
  | { type: "final"; report: { rootCause: string; recommendations: string[]; confidence: string } }
  | { type: "error"; message: string };

export interface AgentDeps {
  emit: (e: AgentEvent) => void | Promise<void>;
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// resolveModel — maps a model spec string to a Vercel AI SDK LanguageModel.
// Supported spec formats:
//   qwen-max | qwen-plus | qwen-turbo     → DashScope via @ai-sdk/openai-compatible
//   claude-sonnet-4-6 | claude-haiku-4-5  → @ai-sdk/anthropic
//   gemini-2.5-flash  | gemini-2.5-pro    → @ai-sdk/google
// Unknown spec → throws with the unrecognised spec name.
// ---------------------------------------------------------------------------

let _dashscope: ReturnType<typeof createOpenAICompatible> | null = null;
function getDashscope() {
  if (!_dashscope) {
    _dashscope = createOpenAICompatible({
      name: "dashscope",
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKey: process.env.QWEN_API_KEY ?? "",
    });
  }
  return _dashscope;
}

function resolveModel(spec: string): LanguageModel {
  if (spec === "qwen-max" || spec === "qwen-plus" || spec === "qwen-turbo") {
    return getDashscope()(spec);
  }
  if (spec === "claude-sonnet-4-6" || spec === "claude-haiku-4-5") {
    return anthropic(spec);
  }
  if (spec === "gemini-2.5-flash" || spec === "gemini-2.5-pro") {
    return google(spec);
  }
  throw new Error(
    `resolveModel: unknown model spec "${spec}" — supported: qwen-max, qwen-plus, qwen-turbo, claude-sonnet-4-6, claude-haiku-4-5, gemini-2.5-flash, gemini-2.5-pro`
  );
}

// ---------------------------------------------------------------------------
// parseChain — reads a comma-separated PHASEN_CHAIN env var, trims whitespace.
// Falls back to provided default string if the env var is absent or empty.
// ---------------------------------------------------------------------------
function parseChain(envVar: string, defaultValue: string): string[] {
  const raw = process.env[envVar];
  const src = raw?.trim() ? raw : defaultValue;
  return src.split(",").map((s) => s.trim()).filter(Boolean);
}

// Phase-level chain defaults — match the pre-refactor hardcoded models exactly
// so that deployments with no PHASEN_CHAIN env vars reproduce prior behaviour.
const DEFAULT_PHASE1_CHAIN = "qwen-max,claude-haiku-4-5,gemini-2.5-flash";
const DEFAULT_PHASE2_CHAIN = "claude-sonnet-4-6";
const DEFAULT_PHASE3_CHAIN = "gemini-2.5-flash";
const DEFAULT_PHASE4_CHAIN = "claude-haiku-4-5";

const TRIAGE_SYSTEM = `You are Sentinel-Triage, a senior SRE doing first-pass investigation of a production incident.
Your job: pull JUST enough telemetry to form an initial hypothesis. Be CONCISE — judges are watching.
Call:
- queryLogs + queryMetrics (always — pull INTERNAL telemetry)
- fetchVendorStatus (if the symptom suggests an upstream dependency might be down — e.g. payment slowdown → vendor=stripe)
- checkDeployHistory (only if deploy correlation is obviously plausible)
Output strictly 3 short lines:
SYMPTOMS: <2-sentence summary>
HYPOTHESIS: <single most likely cause, naming external vendor if relevant>
NEXT: <which deep investigation step the Investigator should focus on>`;

const INVESTIGATOR_SYSTEM = `You are Sentinel-Investigator, a principal engineer with triage results in hand.
Your job: form a confident root-cause diagnosis backed by SPECIFIC evidence. You have BOTH internal and external tools:
- searchRunbook — INTERNAL institutional knowledge
- searchPublicPostmortems — EXTERNAL search for how others solved similar issues
- fetchGithubRecentCommits — check if an upstream OSS library released something breaking in the last 24-48h
- fetchVendorStatus — if triage hasn't already, confirm/refute vendor outage hypothesis
Call 1-2 of these as needed (not all). Then output a tight diagnosis under 250 words covering:
- Root cause (1-2 sentences, name specific timestamps/values/commits, distinguish internal vs upstream)
- Evidence chain (3 bullets max, cite which tool returned which signal)
- Confidence (high/medium/low) — be honest, downgrade if uncertain
- Blast radius
- Top 3 recommended actions, each with risk/side-effect note
Be specific. "DB issue" is not a diagnosis — "long-running query (q_9182, 87s) holding 100/100 pool connections" is.`;

const REVIEWER_SYSTEM = `You are Sentinel-Reviewer, a skeptical staff engineer pair-reviewing the diagnosis.
Your job: stress-test the conclusion. What evidence is missing? What alternative explanations were dismissed too quickly?
What's the risk of the recommended remediation? Output a short critique (3-5 bullets) and a verdict: AGREE / CHALLENGE / NEED_MORE_DATA.
Be useful — not pedantic. Catch the things that matter.`;

// ---------------------------------------------------------------------------
// runPhaseChain — cascading retry across a model chain.
// Attempts each model in order; if a model returns empty text, falls through
// to the next. Emits a "phase" event for each attempt, annotating "(fallback)"
// for models beyond index 0. Returns the first non-empty result, or "" if all
// models in the chain failed.
// ---------------------------------------------------------------------------

interface PhaseChainOpts {
  phaseName: "triage" | "investigate" | "adversarial-review" | "consolidate";
  chain: string[];
  system: string;
  prompt: string;
  useTools: boolean;
  maxSteps: number;
  emit: (e: AgentEvent) => void | Promise<void>;
  signal?: AbortSignal;
}

async function runPhaseChain(opts: PhaseChainOpts): Promise<string> {
  for (let i = 0; i < opts.chain.length; i++) {
    if (opts.signal?.aborted) return "";
    const spec = opts.chain[i];
    const label = i === 0 ? spec : `${spec} (fallback)`;
    await opts.emit({ type: "phase", phase: opts.phaseName, model: label });
    let model: LanguageModel;
    try {
      model = resolveModel(spec);
    } catch (err) {
      await opts.emit({ type: "error", message: (err as Error).message });
      continue;
    }
    const result = await runStreamingPhase({
      model,
      system: opts.system,
      prompt: opts.prompt,
      useTools: opts.useTools,
      maxSteps: opts.maxSteps,
      emit: opts.emit,
      signal: opts.signal,
    });
    if (opts.signal?.aborted) return result;
    if (result.trim()) return result;
    // Empty result — try next model in chain
  }
  return "";
}

export async function runIncidentAgent(incidentId: string, deps: AgentDeps): Promise<void> {
  const incident = INCIDENTS.find((i) => i.id === incidentId);
  if (!incident) {
    await deps.emit({ type: "error", message: `Unknown incident ${incidentId}` });
    return;
  }
  if (deps.signal?.aborted) return;

  const incidentBrief = `## Incident ${incident.id}: ${incident.title}
- Service: ${incident.service}
- Severity: ${incident.severity}
- Detected: ${incident.detectedAt}
- Symptoms:
${incident.symptoms.map((s) => `  - ${s}`).join("\n")}`;

  // Resolve chains from env (with defaults that reproduce pre-refactor behaviour)
  const phase1Chain = parseChain("PHASE1_CHAIN", DEFAULT_PHASE1_CHAIN);
  const phase2Chain = parseChain("PHASE2_CHAIN", DEFAULT_PHASE2_CHAIN);
  const phase3Chain = parseChain("PHASE3_CHAIN", DEFAULT_PHASE3_CHAIN);
  const phase4Chain = parseChain("PHASE4_CHAIN", DEFAULT_PHASE4_CHAIN);

  // PHASE 1: TRIAGE
  const triageText = await runPhaseChain({
    phaseName: "triage",
    chain: phase1Chain,
    system: TRIAGE_SYSTEM,
    prompt: incidentBrief,
    useTools: true,
    maxSteps: 6,
    emit: deps.emit,
    signal: deps.signal,
  });
  if (deps.signal?.aborted) return;
  await deps.emit({ type: "phase-complete", phase: "triage", summary: triageText });

  // PHASE 2: DEEP INVESTIGATION
  if (deps.signal?.aborted) return;
  const investigatorPrompt = `${incidentBrief}

## Triage Summary (from ${phase1Chain[0]})
${triageText}

Now form your principal-engineer diagnosis. Use searchRunbook to find matching institutional knowledge before concluding.`;
  const diagnosisText = await runPhaseChain({
    phaseName: "investigate",
    chain: phase2Chain,
    system: INVESTIGATOR_SYSTEM,
    prompt: investigatorPrompt,
    useTools: true,
    maxSteps: 5,
    emit: deps.emit,
    signal: deps.signal,
  });
  if (deps.signal?.aborted) return;
  await deps.emit({ type: "phase-complete", phase: "investigate", summary: diagnosisText });

  // PHASE 3: ADVERSARIAL REVIEW
  if (deps.signal?.aborted) return;
  const reviewerPrompt = `${incidentBrief}

## Investigator Diagnosis (from ${phase2Chain[0]})
${diagnosisText}

Critique this diagnosis. You're a different vendor's model — your job is to challenge the conclusions with fresh eyes.`;
  const reviewText = await runPhaseChain({
    phaseName: "adversarial-review",
    chain: phase3Chain,
    system: REVIEWER_SYSTEM,
    prompt: reviewerPrompt,
    useTools: false,
    maxSteps: 1,
    emit: deps.emit,
    signal: deps.signal,
  });
  if (deps.signal?.aborted) return;
  await deps.emit({ type: "phase-complete", phase: "adversarial-review", summary: reviewText });

  // PHASE 4: CONSOLIDATE (uses generateText — not streaming)
  if (deps.signal?.aborted) return;
  await deps.emit({ type: "phase", phase: "consolidate", model: phase4Chain[0] });
  const consolidatePrompt = `${incidentBrief}

## Investigator Diagnosis
${diagnosisText}

## Reviewer Critique
${reviewText}

Synthesize a final actionable report. Output ONLY valid JSON, nothing else, matching this exact shape:
{
  "rootCause": "one sentence describing the root cause",
  "recommendations": ["action 1", "action 2", "action 3"],
  "confidence": "high|medium|low",
  "openQuestions": ["q1", "q2"]
}`;
  try {
    let consolidateModel: LanguageModel;
    try {
      consolidateModel = resolveModel(phase4Chain[0]);
    } catch (err) {
      await deps.emit({ type: "error", message: `Consolidation model error: ${(err as Error).message}` });
      return;
    }
    const { text } = await generateText({
      model: consolidateModel,
      prompt: consolidatePrompt,
      abortSignal: deps.signal,
      // Bounded — consolidate output is a small JSON object. Without this, a
      // prompt-injected or runaway response could buffer arbitrary text before
      // the regex/parse on the next line.
      maxOutputTokens: 2000,
    });
    if (deps.signal?.aborted) return;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      await deps.emit({
        type: "final",
        report: {
          rootCause: parsed.rootCause ?? "(no rootCause parsed)",
          recommendations: parsed.recommendations ?? [],
          confidence: parsed.confidence ?? "medium",
        },
      });
    } else {
      await deps.emit({ type: "text-delta", delta: text });
    }
  } catch (err) {
    if (deps.signal?.aborted) return;
    await deps.emit({ type: "error", message: `Consolidation failed: ${(err as Error).message}` });
  }
}

interface StreamingPhaseOpts {
  model: Parameters<typeof streamText>[0]["model"];
  system: string;
  prompt: string;
  useTools: boolean;
  maxSteps: number;
  emit: (e: AgentEvent) => void | Promise<void>;
  signal?: AbortSignal;
}

// Hard cap per phase. Prevents a runaway LLM from ballooning request memory
// or poisoning downstream phase prompts (each phase's output feeds the next).
const MAX_PHASE_OUTPUT_CHARS = 200_000;
// Soft cap on the provider side so the API stops generating instead of us
// just dropping bytes locally. 8k tokens (~32KB) per generation step is well
// above the phase's intended output (triage = 3 lines, investigator
// <250 words, etc.) but caps any single step's runaway. Note: with tools +
// stepCountIs(N), total phase output is bounded by N * MAX_PHASE_OUTPUT_TOKENS,
// and ultimately by MAX_PHASE_OUTPUT_CHARS in the local accumulator.
const MAX_PHASE_OUTPUT_TOKENS = 8000;

async function runStreamingPhase(opts: StreamingPhaseOpts): Promise<string> {
  let collected = "";
  let truncated = false;
  // Per-phase controller, transparently linked to the parent via AbortSignal.any.
  // Client disconnect cascades down AND we can stop the provider stream
  // independently when we hit MAX_PHASE_OUTPUT_CHARS. Using AbortSignal.any
  // instead of addEventListener avoids accumulating listeners on the parent
  // signal across the 4 phases of a single request.
  const phaseAbort = new AbortController();
  const abortSignal = opts.signal
    ? AbortSignal.any([opts.signal, phaseAbort.signal])
    : phaseAbort.signal;
  const truncateAndReturn = async () => {
    truncated = true;
    phaseAbort.abort();
    await opts.emit({
      type: "error",
      message: `phase output exceeded ${MAX_PHASE_OUTPUT_CHARS} chars — truncating`,
    });
    return collected;
  };
  try {
    const { fullStream } = streamText({
      model: opts.model,
      system: opts.system,
      prompt: opts.prompt,
      abortSignal,
      maxOutputTokens: MAX_PHASE_OUTPUT_TOKENS,
      ...(opts.useTools ? { tools, stopWhen: stepCountIs(opts.maxSteps) } : {}),
    });
    for await (const part of fullStream) {
      if (abortSignal.aborted) return collected;
      if (process.env.SENTINEL_DEBUG === "1") {
        console.log("[stream-part]", part.type, "id" in part ? part.id : "");
      }
      switch (part.type) {
        case "text-delta": {
          if (truncated) break;
          const remaining = MAX_PHASE_OUTPUT_CHARS - collected.length;
          if (remaining <= 0) return await truncateAndReturn();
          const chunk = part.text.length > remaining ? part.text.slice(0, remaining) : part.text;
          collected += chunk;
          await opts.emit({ type: "text-delta", delta: chunk });
          if (chunk.length < part.text.length) return await truncateAndReturn();
          break;
        }
        case "tool-call":
          await opts.emit({ type: "tool-call", name: part.toolName, args: part.input });
          break;
        case "tool-result":
          await opts.emit({ type: "tool-result", name: part.toolName, result: part.output });
          break;
        case "error": {
          const err = (part as unknown as { error: unknown }).error;
          const msg = err instanceof Error ? err.message : String(err);
          await opts.emit({ type: "error", message: msg });
          return collected;
        }
        default:
          break;
      }
    }
  } catch (err) {
    if (abortSignal.aborted) return collected;
    await opts.emit({ type: "error", message: (err as Error).message });
  }
  return collected;
}
