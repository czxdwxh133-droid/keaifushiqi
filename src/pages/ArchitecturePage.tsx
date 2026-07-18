import { motion } from "framer-motion";
import { GitBranch, Wrench, Database, Cpu, LineChart, User, ArrowDown } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

function VLine() {
  return (
    <div className="flex h-8 items-center justify-center">
      <div className="h-full w-px bg-gradient-to-b from-brand-indigo/70 to-brand-cyan/70" />
    </div>
  );
}

function Box({
  children,
  gradient,
  icon: Icon,
}: {
  children: ReactNode;
  gradient?: boolean;
  icon?: ComponentType<{ size?: number | string; className?: string }>;
}) {
  return (
    <motion.div
      variants={item}
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border px-5 py-4 text-center shadow-card ${
        gradient
          ? "border-transparent bg-brand-gradient text-white shadow-glow"
          : "border-white/10 bg-white/5 text-slate-200"
      }`}
    >
      {Icon && <Icon size={20} className={gradient ? "text-white" : "text-brand-cyan"} />}
      <span className="text-sm font-semibold">{children}</span>
    </motion.div>
  );
}

const TOOLS_FLOW = [
  { name: "schema_tool", cap: "Database", icon: Database },
  { name: "SQL Tool", cap: "Analysis", icon: Cpu },
  { name: "Chart Tool", cap: "Visualization", icon: LineChart },
];

export default function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          系统 <span className="text-gradient">架构</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Skill Router 意图分类 + 固定工具链流水线架构，按需组装 7 个 Tool 完成端到端分析。
        </p>
      </header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="rounded-3xl border border-white/10 bg-ink-800/50 p-6 shadow-card"
      >
        <div className="mx-auto w-fit">
          <Box icon={User}>User</Box>
        </div>
        <VLine />
        <div className="mx-auto w-fit">
          <Box gradient icon={GitBranch}>
            Data Analyst Agent
          </Box>
        </div>
        <VLine />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TOOLS_FLOW.map((t) => (
            <div key={t.name} className="flex flex-col items-center">
              <VLine />
              <Box icon={t.icon}>{t.name}</Box>
              <VLine />
              <Box>{t.cap}</Box>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 shadow-card"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-cyan">
            <GitBranch size={16} /> 意图分类 · SkillRouter
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            LLM 将用户自然语言问题分类为 query/analysis/visualization/report 四种技能类型，
            简单查询走 3 步入门路径，复杂分析走 6 步全流程，兼顾响应速度与输出深度。
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5 shadow-card"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-violet">
            <Wrench size={16} /> 工具流水线 · 固定链式执行
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            各 Skill 按需串行组装 schema_tool → sql_generation → sql_validator → sql_execute → data_analysis → chart_tool → report_tool，
            每步结果写入共享 AgentState，下游工具直接读取。
          </p>
        </motion.div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
        <ArrowDown size={14} className="animate-bounce text-brand-cyan" />
        自然语言需求沿此链路自动流转，无需人工编写 SQL 或配置图表
      </div>
    </div>
  );
}
