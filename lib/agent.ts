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

  // PHASE 1: TRIAGE (Gemini Flash)
  await deps.emit({ type: "phase", phase: "triage", model: "gemini-2.5-flash" });
  let triageSummary = "";
  try {
    const { fullStream } = streamText({
      model: google("gemini-2.5-flash"),
      system: TRIAGE_SYSTEM,
      prompt: incidentBrief,
      tools,
      stopWhen: stepCountIs(6),
    });
    for await (const part of fullStream) {
      if (part.type === "text-delta") {
        triageSummary += part.text;
        await deps.emit({ type: "text-delta", delta: part.text });
      } else if (part.type === "tool-call") {
        await deps.emit({ type: "tool-call", name: part.toolName, args: part.input });
      } else if (part.type === "tool-result") {
        await deps.emit({ type: "tool-result", name: part.toolName, result: part.output });
      }
    }
  } catch (err) {
    await deps.emit({ type: "error", message: `Triage failed: ${(err as Error).message}` });
    return;
  }
  await deps.emit({ type: "phase-complete", phase: "triage", summary: triageSummary });

  // PHASE 2: DEEP INVESTIGATION (Gemini Pro)
  await deps.emit({ type: "phase", phase: "investigate", model: "gemini-2.5-pro" });
  const investigatorPrompt = `${incidentBrief}

## Triage Summary (from gemini-2.5-flash)
${triageSummary}

Now form your principal-engineer diagnosis.`;
  let diagnosisText = "";
  try {
    const { fullStream } = streamText({
      model: google("gemini-2.5-pro"),
      system: INVESTIGATOR_SYSTEM,
      prompt: investigatorPrompt,
      tools,
      stopWhen: stepCountIs(5),
    });
    for await (const part of fullStream) {
      if (part.type === "text-delta") {
        diagnosisText += part.text;
        await deps.emit({ type: "text-delta", delta: part.text });
      } else if (part.type === "tool-call") {
        await deps.emit({ type: "tool-call", name: part.toolName, args: part.input });
      } else if (part.type === "tool-result") {
        await deps.emit({ type: "tool-result", name: part.toolName, result: part.output });
      }
    }
  } catch (err) {
    await deps.emit({ type: "error", message: `Investigation failed: ${(err as Error).message}` });
    return;
  }
  await deps.emit({ type: "phase-complete", phase: "investigate", summary: diagnosisText });

  // PHASE 3: ADVERSARIAL REVIEW (Claude Sonnet)
  await deps.emit({ type: "phase", phase: "adversarial-review", model: "claude-sonnet-4-6" });
  const reviewerPrompt = `${incidentBrief}

## Investigator Diagnosis (from gemini-2.5-pro)
${diagnosisText}

Critique this. Find the holes.`;
  let reviewText = "";
  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: REVIEWER_SYSTEM,
      prompt: reviewerPrompt,
    });
    reviewText = text;
    await deps.emit({ type: "text-delta", delta: text });
  } catch (err) {
    reviewText = `(Adversarial review skipped — ${(err as Error).message})`;
    await deps.emit({ type: "text-delta", delta: reviewText });
  }
  await deps.emit({ type: "phase-complete", phase: "adversarial-review", summary: reviewText });

  // PHASE 4: CONSOLIDATE (Gemini Pro)
  await deps.emit({ type: "phase", phase: "consolidate", model: "gemini-2.5-pro" });
  const consolidatePrompt = `${incidentBrief}

## Investigator Diagnosis
${diagnosisText}

## Reviewer Critique
${reviewText}

Synthesize a final actionable report. Output strict JSON:
{
  "rootCause": "one sentence",
  "recommendations": ["action 1", "action 2", "action 3"],
  "confidence": "high|medium|low",
  "openQuestions": ["q1", "q2"]
}`;
  try {
    const { text } = await generateText({
      model: google("gemini-2.5-pro"),
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
