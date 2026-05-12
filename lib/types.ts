export type Severity = "critical" | "high" | "medium" | "low";

export type IncidentStatus = "detected" | "investigating" | "diagnosed" | "resolved";

export interface Incident {
  id: string;
  title: string;
  service: string;
  detectedAt: string;
  severity: Severity;
  symptoms: string[];
  status: IncidentStatus;
}

export interface LogLine {
  ts: string;
  service: string;
  level: "error" | "warn" | "info";
  message: string;
  trace?: string;
}

export interface MetricPoint {
  ts: string;
  service: string;
  metric: string;
  value: number;
  unit: string;
}

export interface Runbook {
  id: string;
  title: string;
  symptoms: string[];
  diagnosis: string;
  remediation: string[];
}

export type AgentRole = "triage" | "investigator" | "reviewer";

export interface AgentMessage {
  role: AgentRole;
  model: string;
  ts: number;
  content: string;
  toolCalls?: { name: string; args: unknown; result?: unknown }[];
}

export interface DiagnosisReport {
  rootCause: string;
  confidence: number;
  evidence: string[];
  recommendedActions: string[];
  blastRadius: string;
}
