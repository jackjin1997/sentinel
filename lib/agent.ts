import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, streamText, stepCountIs } from "ai";
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
}

const TRIAGE_SYSTEM = `You are Sentinel-Triage, a senior SRE doing first-pass investigation of a production incident.
Your job: pull JUST enough telemetry to form an initial hypothesis. Be concise. Call tools only when needed.
Always call queryLogs and queryMetrics at minimum. If a deploy correlation seems plausible, also call checkDeployHistory.
At the end output a 3-line summary: SYMPTOMS / INITIAL HYPOTHESIS / RECOMMENDED NEXT STEPS.`;

const INVESTIGATOR_SYSTEM = `You are Sentinel-Investigator, a principal engineer. You have triage results.
Your job: form a confident root-cause hypothesis backed by evidence. Use searchRunbook to leverage institutional knowledge.
Output a JSON-shaped diagnosis with: rootCause, confidence(0-1), evidence[], recommendedActions[], blastRadius.
Be specific. "DB issue" is not a diagnosis — "long-running query holding 100/100 pool connections after deploy f4e8aa7" is.`;

const REVIEWER_SYSTEM = `You are Sentinel-Reviewer, a skeptical staff engineer pair-reviewing the diagnosis.
Your job: stress-test the conclusion. What evidence is missing? What alternative explanations were dismissed too quickly?
What's the risk of the recommended remediation? Output a short critique (3-5 bullets) and a verdict: AGREE / CHALLENGE / NEED_MORE_DATA.
Be useful — not pedantic. Catch the things that matter.`;

export async function runIncidentAgent(incidentId: string, deps: AgentDeps): Promise<void> {
  const incident = INCIDENTS.find((i) => i.id === incidentId);
  if (!incident) {
    await deps.emit({ type: "error", message: `Unknown incident ${incidentId}` });
    return;
  }

  const incidentBrief = `## Incident ${incident.id}: ${incident.title}
- Service: ${incident.service}
- Severity: ${incident.severity}
- Detected: ${incident.detectedAt}
- Symptoms:
${incident.symptoms.map((s) => `  - ${s}`).join("\n")}`;

  // PHASE 1: TRIAGE (Gemini Flash with Claude Haiku fallback)
  await deps.emit({ type: "phase", phase: "triage", model: "gemini-2.5-flash" });
  let triageText = await runStreamingPhase({
    model: google("gemini-2.5-flash"),
    system: TRIAGE_SYSTEM,
    prompt: incidentBrief,
    useTools: true,
    maxSteps: 6,
    emit: deps.emit,
  });
  if (!triageText.trim()) {
    // Gemini failed — fallback to Claude Haiku so demo never breaks
    await deps.emit({ type: "phase", phase: "triage", model: "claude-haiku-4-5 (fallback)" });
    triageText = await runStreamingPhase({
      model: anthropic("claude-haiku-4-5"),
      system: TRIAGE_SYSTEM,
      prompt: incidentBrief,
      useTools: true,
      maxSteps: 6,
      emit: deps.emit,
    });
  }
  await deps.emit({ type: "phase-complete", phase: "triage", summary: triageText });

  // PHASE 2: DEEP INVESTIGATION (Claude Sonnet — heaviest reasoning, different vendor)
  await deps.emit({ type: "phase", phase: "investigate", model: "claude-sonnet-4-6" });
  const investigatorPrompt = `${incidentBrief}

## Triage Summary (from gemini-2.5-flash)
${triageText}

Now form your principal-engineer diagnosis. Use searchRunbook to find matching institutional knowledge before concluding.`;
  const diagnosisText = await runStreamingPhase({
    model: anthropic("claude-sonnet-4-6"),
    system: INVESTIGATOR_SYSTEM,
    prompt: investigatorPrompt,
    useTools: true,
    maxSteps: 5,
    emit: deps.emit,
  });
  await deps.emit({ type: "phase-complete", phase: "investigate", summary: diagnosisText });

  // PHASE 3: ADVERSARIAL REVIEW (Gemini Flash with Claude Haiku fallback)
  await deps.emit({ type: "phase", phase: "adversarial-review", model: "gemini-2.5-flash" });
  const reviewerPrompt = `${incidentBrief}

## Investigator Diagnosis (from claude-sonnet-4-6)
${diagnosisText}

Critique this diagnosis. You're a different vendor's model — your job is to challenge Claude's conclusions with fresh eyes.`;
  let reviewText = await runStreamingPhase({
    model: google("gemini-2.5-flash"),
    system: REVIEWER_SYSTEM,
    prompt: reviewerPrompt,
    useTools: false,
    maxSteps: 1,
    emit: deps.emit,
  });
  if (!reviewText.trim()) {
    await deps.emit({ type: "phase", phase: "adversarial-review", model: "claude-haiku-4-5 (fallback)" });
    reviewText = await runStreamingPhase({
      model: anthropic("claude-haiku-4-5"),
      system: REVIEWER_SYSTEM,
      prompt: reviewerPrompt,
      useTools: false,
      maxSteps: 1,
      emit: deps.emit,
    });
  }
  await deps.emit({ type: "phase-complete", phase: "adversarial-review", summary: reviewText });

  // PHASE 4: CONSOLIDATE (Claude Sonnet — structured JSON synthesis)
  await deps.emit({ type: "phase", phase: "consolidate", model: "claude-sonnet-4-6" });
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
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      prompt: consolidatePrompt,
    });
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
}

async function runStreamingPhase(opts: StreamingPhaseOpts): Promise<string> {
  let collected = "";
  try {
    const { fullStream } = streamText({
      model: opts.model,
      system: opts.system,
      prompt: opts.prompt,
      ...(opts.useTools ? { tools, stopWhen: stepCountIs(opts.maxSteps) } : {}),
    });
    for await (const part of fullStream) {
      // Debug: log every event type to server console
      if (process.env.SENTINEL_DEBUG === "1") {
        console.log("[stream-part]", part.type, "id" in part ? part.id : "");
      }
      switch (part.type) {
        case "text-delta":
          collected += part.text;
          await opts.emit({ type: "text-delta", delta: part.text });
          break;
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
          // ignore other event types (text-start, text-end, finish, etc.)
          break;
      }
    }
  } catch (err) {
    await opts.emit({ type: "error", message: (err as Error).message });
  }
  return collected;
}
