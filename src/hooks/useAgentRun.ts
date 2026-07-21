import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ReActLogEntry, RevealState, Scenario, ChartSpec, ReportData } from "../types/agent";
import { dbApi, type TableInfo, type AnalyzeResult, type SkillName } from "../api/db";

let idCounter = 0;
function uid() {
  return `msg-${++idCounter}-${Date.now()}`;
}

function getRevealBySkill(skill: SkillName | undefined): RevealState {
  switch (skill) {
    case "query":
      // 数据查询：只显示 SQL + 表格
      return { sql: true, table: true, chart: false, report: false };
    case "analysis":
      // 数据分析：显示 SQL + 表格，报告展示指标
      return { sql: true, table: true, chart: false, report: true };
    case "visualization":
      // 可视化：显示图表为主，SQL + 表格辅助
      return { sql: true, table: true, chart: true, report: false };
    case "report":
      // 商业报告：全部展示
      return { sql: true, table: true, chart: true, report: true };
    default:
      return { sql: true, table: true, chart: true, report: true };
  }
}

function looksLikeSQL(input: string): boolean {
  const trimmed = input.trim().toUpperCase();
  return /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SHOW|DESC|EXPLAIN)\b/.test(trimmed);
}

function analyzeToScenario(result: AnalyzeResult): Scenario {
  const chart: ChartSpec = result.chart && result.chart.type
    ? (result.chart as ChartSpec)
    : { type: "bar", title: "数据分布", categories: [], series: [] };

  const report: ReportData = result.report || { summary: "分析完成", bullets: [], suggestions: [] };

  return {
    key: "llm",
    label: result.intent || "AI 分析",
    match: [],
    intent: result.intent || "",
    sql: result.sql || "",
    table: {
      columns: result.result.columns,
      rows: result.result.rows.map((r: Record<string, unknown>) =>
        result.result.columns.map((c: string) => (r[c] ?? "") as string | number),
      ),
    },
    chart,
    report,
    reactLog: (result.logs || []).map((l: { type: string; content: string }) => ({
      type: l.type as ReActLogEntry["type"],
      content: l.content,
    })),
  };
}

export function useAgentRun(_mode: "mock" | "db", dbTables: TableInfo[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [globalRunning, setGlobalRunning] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const runDb = useCallback(async (input: string) => {
    clearTimers();
    const text = input.trim();
    const isSQL = looksLikeSQL(text);

    const userMsg: ChatMessage = {
      id: uid(), role: "user", content: text, timestamp: Date.now(),
    };
    const agentId = uid();

    if (isSQL) {
      const agentMsg: ChatMessage = {
        id: agentId, role: "agent", content: "正在执行查询...",
        running: true, timestamp: Date.now(),
        reveal: { sql: true, table: false, chart: false, report: false },
      };
      setMessages((prev) => [...prev, userMsg, agentMsg]);
      setGlobalRunning(true);

      try {
        const result = await dbApi.query(text);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentId
              ? {
                  ...m,
                  content: `查询完成，返回 ${result.rowCount} 条记录`,
                  running: false,
                  dbResult: result,
                  reveal: { sql: true, table: true, chart: false, report: false },
                }
              : m,
          ),
        );
      } catch (e: unknown) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentId
              ? { ...m, content: "查询执行失败", running: false, dbError: e instanceof Error ? e.message : "未知错误" }
              : m,
          ),
        );
      } finally {
        setGlobalRunning(false);
      }
    } else {
      // Skill-based Agent

      const agentMsg: ChatMessage = {
        id: agentId, role: "agent", content: "",
        plan: undefined,
        steps: undefined,
        logs: undefined,
        reveal: { sql: false, table: false, chart: false, report: false },
        running: true,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg, agentMsg]);
      setGlobalRunning(true);

      const updateAgent = (fn: (prev: ChatMessage) => ChatMessage) => {
        setMessages((prev) => prev.map((m) => (m.id === agentId ? fn(m) : m)));
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90_000); // 90s 总超时
        const result: AnalyzeResult = await dbApi.analyze(text, dbTables, controller.signal);
        clearTimeout(timeoutId);

        const scenario = analyzeToScenario(result);

        // 根据 skill_name 决定展示内容
        const skillName = result.skill_name as SkillName | undefined;
        const reveal = getRevealBySkill(skillName);

        updateAgent((m) => ({
          ...m,
          content: result.sql ? `查询完成，返回 ${result.result.rowCount} 条记录` : "分析完成",
          scenario,
          skillName,
          reveal,
          running: false,
        }));
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : "未知错误";
        updateAgent((m) => ({
          ...m,
          running: false,
          dbError: `[分析失败] ${errMsg}`,
        }));
      } finally {
        setGlobalRunning(false);
      }
    }
  }, [dbTables]);

  const run = useCallback(
    (input: string) => {
      runDb(input);
    },
    [runDb],
  );

  const reset = useCallback(() => {
    clearTimers();
    setMessages([]);
    setGlobalRunning(false);
  }, []);

  return { messages, running: globalRunning, run, reset };
}
