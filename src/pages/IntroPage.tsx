import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GitBranch,
  Wrench,
  MessageSquare,
  Database,
  BarChart3,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { ComponentType } from "react";

const HIGHLIGHTS: { icon: ComponentType<{ size?: number | string; className?: string }>; title: string; desc: string }[] = [
  { icon: GitBranch, title: "Skill Router 架构", desc: "LLM 自动意图分类，按需路由到 4 大技能（查询/分析/可视化/报告），简单查询走短路径、复杂分析走全流程。" },
  { icon: Wrench, title: "7 工具固定流水线", desc: "Schema → SQL生成 → 安全校验 → 执行 → 指标分析 → 图表 → 报告，按 Skill 类型串行组装。" },
  { icon: MessageSquare, title: "自然语言数据分析", desc: "用日常语言提出需求，无需编写 SQL 即可获得结构化分析结论。" },
  { icon: Database, title: "RAG + Text-to-SQL", desc: "TF-IDF 语义检索注入业务知识，LLM 根据 schema 上下文生成精确的 SQL 查询。" },
  { icon: BarChart3, title: "自动图表生成", desc: "智能选择折线 / 柱状 / 饼图，一键产出企业级可视化图表。" },
  { icon: Sparkles, title: "企业 BI 助手场景", desc: "面向运营与管理人员的销售数据分析 Copilot，贴合真实业务。" },
];

const STACK = [
  "React 18", "TypeScript", "Vite", "Tailwind CSS", "ECharts", "Framer Motion",
  "React Router", "FastAPI", "Skill Router", "RAG (TF-IDF)", "DeepSeek",
];

const SCENES = [
  "分析2025年每个月销售额趋势，并生成折线图",
  "找出销售额下降最多的地区，并分析原因",
  "统计销量最高的10个商品",
  "分析用户购买行为",
];

export default function IntroPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8 text-center shadow-card"
      >
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient shadow-glow">
          <Sparkles size={30} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold">
          AI <span className="text-gradient">数据分析助手</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
          一个面向求职展示的 AI BI Copilot Demo：用自然语言驱动 Agent 自主完成数据查询、分析与可视化，
          完整呈现企业级 AI 产品体验。
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 active:scale-95"
        >
          立即体验 <ArrowRight size={16} />
        </Link>
      </motion.div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-white">项目亮点</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((h, i) => {
            const Icon = h.icon;
            return (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass rounded-2xl p-5 shadow-card"
              >
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-indigo/15 text-brand-cyan">
                  <Icon size={20} />
                </div>
                <div className="text-sm font-semibold text-white">{h.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{h.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-white">技术栈</h2>
        <div className="flex flex-wrap gap-2">
          {STACK.map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-white">演示场景</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SCENES.map((s) => (
            <div
              key={s}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-violet/15 text-brand-violet">
                <Database size={14} />
              </span>
              {s}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
