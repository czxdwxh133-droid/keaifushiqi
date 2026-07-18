import { Database, Search, BarChart3, LineChart, CheckCircle2 } from "lucide-react";
import type { ComponentType } from "react";
import type { ToolDef } from "../types/agent";

interface Props {
  tools: ToolDef[];
  active?: string | null;
}

const ICONS: Record<string, ComponentType<{ size?: number | string; className?: string }>> = {
  schema_tool: Database,
  sql_query_tool: Search,
  analysis_tool: BarChart3,
  chart_tool: LineChart,
};

export default function ToolCards({ tools, active }: Props) {
  return (
    <div className="glass rounded-2xl p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <CheckCircle2 size={16} className="text-func-success" />
        Available Tools
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {tools.map((t) => {
          const Icon = ICONS[t.id] ?? Database;
          const isActive = active === t.id;
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
                isActive
                  ? "border-brand-cyan/60 bg-brand-cyan/10 shadow-glow-cyan"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div
                className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                  isActive ? "bg-brand-cyan/20 text-brand-cyan" : "bg-white/10 text-slate-300"
                }`}
              >
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-semibold text-slate-100">{t.name}</code>
                  {isActive && (
                    <span className="rounded bg-brand-cyan/20 px-1.5 py-0.5 text-[10px] font-medium text-brand-cyan">
                      running
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs leading-snug text-slate-400">{t.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
