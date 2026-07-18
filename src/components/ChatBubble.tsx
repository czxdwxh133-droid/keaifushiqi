import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  User,
  Loader2,
  Database,
  BarChart3,
  FileText,
  Terminal,
  AlertTriangle,
} from "lucide-react";
import type { ChatMessage, RevealState, ChartSpec, TableData, ReportData } from "../types/agent";

function hasChartData(chart: ChartSpec): boolean {
  if (chart.series?.some((s) => s.data && s.data.length > 0)) return true;
  if (chart.categories && chart.categories.length > 0) return true;
  if (chart.pieData && chart.pieData.length > 0) return true;
  return false;
}

function hasReportContent(report: ReportData): boolean {
  const emptySums = ["暂无足够数据生成分析报告", "分析完成", "分析完成，暂无关键发现"];
  const sum = report.summary || "";
  if (sum && !emptySums.includes(sum)) return true;
  if (report.bullets && report.bullets.length > 0) return true;
  if (report.suggestions && report.suggestions.length > 0) return true;
  return false;
}
import SQLViewer from "./SQLViewer";
import DataTableView from "./DataTableView";
import ChartPanel from "./ChartPanel";
import ReportPanel from "./ReportPanel";

function RevealSection({
  show,
  title,
  icon: Icon,
  children,
}: {
  show: boolean;
  title: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-gray-100 bg-white p-4 shadow-soft"
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Icon size={14} className="text-brand-600" />
            {title}
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function looksLikeSQL(s: string): boolean {
  const t = s.trim().toUpperCase();
  return /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SHOW|DESC|EXPLAIN|WITH)\b/.test(t);
}

function autoChart(result: Required<ChatMessage>["dbResult"]): ChartSpec | null {
  const { columns, rows } = result;
  if (!columns.length || !rows.length) return null;

  let labelCol = -1;
  let valueCol = -1;
  for (let i = 0; i < columns.length; i++) {
    const v = rows[0]?.[columns[i]];
    if (v == null) continue;
    if (typeof v === "number" && valueCol === -1) valueCol = i;
    else if (typeof v === "string" && labelCol === -1) labelCol = i;
  }
  if (labelCol === -1) labelCol = 0;
  if (valueCol === -1) valueCol = 0;

  const categories = rows.map((r) => String(r[columns[labelCol]] ?? ""));
  const data = rows.map((r) => Number(r[columns[valueCol]] ?? 0));

  return {
    type: rows.length <= 6 ? "bar" : "line",
    title: `${columns[valueCol]} 统计`,
    categories,
    series: [{ name: columns[valueCol], data }],
  };
}

function toTableData(result: Required<ChatMessage>["dbResult"]): TableData {
  return {
    columns: result.columns,
    rows: result.rows.map((r) => result.columns.map((c) => r[c] ?? "")),
  };
}

export default function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const scenario = msg.scenario;
  const reveal = msg.reveal ?? ({} as RevealState);
  const skillName = msg.skillName;
  const [showChart, setShowChart] = useState(false);

  const autoChartSpec = useMemo(
    () => (msg.dbResult ? autoChart(msg.dbResult) : null),
    [msg.dbResult],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${
          isUser
            ? "border-gray-200 bg-gray-100 text-gray-600"
            : "border-brand-200 bg-brand-50 text-brand-600"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Content */}
      <div className={`min-w-0 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        {/* User message */}
        {isUser && (
          <div
            className={`rounded-2xl rounded-tr-md px-4 py-3 text-sm shadow-soft ${
              looksLikeSQL(msg.content)
                ? "border border-gray-200 bg-gray-50 font-mono text-[13px] text-brand-700"
                : "bg-brand-gradient text-white"
            }`}
          >
            {msg.content}
          </div>
        )}

        {/* Agent message */}
        {!isUser && (
          <div className="space-y-3">
            {msg.dbError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
                <span className="text-xs text-red-700">{msg.dbError}</span>
              </div>
            )}

            {/* 技能标签 */}
            {skillName && scenario && !msg.running && (
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-600 border border-brand-100">
                  {skillName === "query" && "数据查询"}
                  {skillName === "analysis" && "数据分析"}
                  {skillName === "visualization" && "可视化"}
                  {skillName === "report" && "商业报告"}
                </span>
              </div>
            )}

            {/* loading 状态 */}
            {msg.running && !msg.dbResult && (
              <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                <Loader2 size={16} className="animate-spin" />
                <span>正在理解你的需求...</span>
              </div>
            )}

            {/* 直接 SQL 查询结果 */}
            {msg.dbResult && (
              <>
                <RevealSection show={true} title={`查询结果 · ${msg.dbResult.rowCount} 条`} icon={Terminal}>
                  <DataTableView table={toTableData(msg.dbResult)} />
                </RevealSection>

                {autoChartSpec && (
                  <div>
                    {!showChart ? (
                      <button
                        onClick={() => setShowChart(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] text-brand-700 transition hover:bg-brand-100"
                      >
                        <BarChart3 size={13} />
                        生成可视化图表
                      </button>
                    ) : (
                      <RevealSection show={true} title={`数据可视化 · ${autoChartSpec.title}`} icon={BarChart3}>
                        <ChartPanel chart={autoChartSpec} />
                      </RevealSection>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Skill 分析结果 */}
            {scenario && !msg.running && (
              <>
                {reveal.sql && (
                  <RevealSection show={true} title="生成的 SQL" icon={Database}>
                    <SQLViewer sql={scenario.sql} />
                  </RevealSection>
                )}

                {reveal.table && (
                  <RevealSection show={true} title="查询结果" icon={Terminal}>
                    <DataTableView table={scenario.table} />
                  </RevealSection>
                )}

                {reveal.chart && hasChartData(scenario.chart) && (
                  <RevealSection show={true} title={`数据可视化 · ${scenario.chart.title}`} icon={BarChart3}>
                    <ChartPanel chart={scenario.chart} />
                  </RevealSection>
                )}

                {reveal.report && hasReportContent(scenario.report) && (
                  <RevealSection show={true} title="AI 分析报告" icon={FileText}>
                    <ReportPanel report={scenario.report} />
                  </RevealSection>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
