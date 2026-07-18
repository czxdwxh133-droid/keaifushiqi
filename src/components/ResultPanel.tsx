import { AnimatePresence, motion } from "framer-motion";
import { Database, Table2, BarChart3, FileText } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { RevealState, Scenario } from "../types/agent";
import SQLViewer from "./SQLViewer";
import DataTableView from "./DataTableView";
import ChartPanel from "./ChartPanel";
import ReportPanel from "./ReportPanel";

interface SectionProps {
  id: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  title: string;
  children: ReactNode;
}

function Section({ id, icon: Icon, title, children }: SectionProps) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="glass rounded-2xl p-4 shadow-card"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Icon size={16} className="text-brand-cyan" />
        {title}
      </div>
      {children}
    </motion.div>
  );
}

interface Props {
  scenario: Scenario | null;
  reveal: RevealState;
}

export default function ResultPanel({ scenario, reveal }: Props) {
  if (!scenario) {
    return (
      <div className="grid h-full place-items-center text-center">
        <div className="max-w-xs text-sm text-slate-500">
          <div className="mb-2 text-3xl">📊</div>
          在左侧输入分析需求并点击「开始分析」，结果将在此展示 SQL、数据表格、图表与分析报告。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {reveal.sql && (
          <Section id="sql" icon={Database} title="生成的 SQL">
            <SQLViewer sql={scenario.sql} />
          </Section>
        )}
        {reveal.table && (
          <Section id="table" icon={Table2} title="查询结果">
            <DataTableView table={scenario.table} />
          </Section>
        )}
        {reveal.chart && (
          <Section id="chart" icon={BarChart3} title={`数据可视化 · ${scenario.chart.title}`}>
            <ChartPanel chart={scenario.chart} />
          </Section>
        )}
        {reveal.report && (
          <Section id="report" icon={FileText} title="AI 分析报告">
            <ReportPanel report={scenario.report} />
          </Section>
        )}
      </AnimatePresence>
    </div>
  );
}
