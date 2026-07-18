import { NavLink } from "react-router-dom";
import { Activity, Network, Sparkles, LineChart } from "lucide-react";
import type { ComponentType } from "react";

interface NavItem {
  to: string;
  label: string;
  desc: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
}

const items: NavItem[] = [
  { to: "/", label: "分析主界面", desc: "AI BI Copilot", icon: Activity },
  { to: "/architecture", label: "系统架构", desc: "Skill Router + 工具流水线", icon: Network },
  { to: "/intro", label: "项目介绍", desc: "亮点与技术栈", icon: Sparkles },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-white/10 bg-ink-800/60 p-5 backdrop-blur-xl md:flex">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient shadow-glow">
          <LineChart size={22} className="text-white" />
        </div>
        <div>
          <div className="text-base font-bold leading-tight text-white">AI BI Copilot</div>
          <div className="text-xs text-slate-400">智能数据分析助手</div>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/"}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-3 transition-all ${
                  isActive
                    ? "bg-brand-indigo/20 shadow-glow ring-1 ring-brand-indigo/40"
                    : "hover:bg-white/5"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    className={isActive ? "text-brand-cyan" : "text-slate-400 group-hover:text-slate-200"}
                  />
                  <div>
                    <div className={`text-sm font-semibold ${isActive ? "text-white" : "text-slate-200"}`}>
                      {it.label}
                    </div>
                    <div className="text-xs text-slate-500">{it.desc}</div>
                  </div>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
        <div className="mb-1 font-semibold text-slate-200">演示模式</div>
        当前为模拟数据演示，不连接真实数据库，完整呈现 Agent 执行链路。
      </div>
    </aside>
  );
}
