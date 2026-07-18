export type StepStatus = "pending" | "running" | "done";

export interface AgentStep {
  id: string;
  title: string;
  tool?: string;
  detail: string;
  status: StepStatus;
}

export type ReActType = "Thought" | "Action" | "Observation";

export interface ReActLogEntry {
  type: ReActType;
  content: string;
}

export interface TableData {
  columns: string[];
  rows: (string | number)[][];
}

export type ChartType = "line" | "bar" | "pie";

export interface ChartSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface ChartSpec {
  type: ChartType;
  title: string;
  categories?: string[];
  series?: ChartSeries[];
  pieData?: { name: string; value: number }[];
}

export interface ReportData {
  summary: string;
  bullets: string[];
  suggestions: string[];
}

export interface ToolDef {
  id: string;
  name: string;
  desc: string;
}

export interface Scenario {
  key: string;
  label: string;
  match: string[];
  intent: string;
  sql: string;
  table: TableData;
  chart: ChartSpec;
  report: ReportData;
  reactLog: ReActLogEntry[];
}

export interface RevealState {
  sql: boolean;
  table: boolean;
  chart: boolean;
  report: boolean;
}

export interface DbTableInfo {
  name: string;
  columns: { field: string; type: string; key: string }[];
}

export interface DbQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface PlanStep {
  task: string;
  step_type: "sql" | "analyze" | "chart" | "report";
  needed: boolean;
  status: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  scenario?: Scenario;
  skillName?: "query" | "analysis" | "visualization" | "report";
  plan?: PlanStep[];
  steps?: AgentStep[];
  logs?: ReActLogEntry[];
  reveal?: RevealState;
  running?: boolean;
  timestamp: number;
  dbResult?: DbQueryResult;
  dbError?: string;
}
