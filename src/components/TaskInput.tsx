import { Sparkles, Send } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  running: boolean;
  examples: string[];
  onPick: (e: string) => void;
}

export default function TaskInput({ value, onChange, onRun, running, examples, onPick }: Props) {
  return (
    <div className="glass rounded-2xl p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Sparkles size={16} className="text-brand-cyan" />
        Agent 任务区域
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="用大白话告诉我你想了解什么，比如：回头客多吗？哪个月生意最好？"
        rows={3}
        className="w-full resize-none rounded-xl border border-white/10 bg-ink-900/60 p-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-brand-indigo/60 focus:ring-2 focus:ring-brand-indigo/30"
      />

      <button
        onClick={onRun}
        disabled={running || !value.trim()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-2.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Send size={16} />
        {running ? "分析中..." : "开始分析"}
      </button>

      <div className="mt-4">
        <div className="mb-2 text-xs text-slate-500">示例需求</div>
        <div className="flex flex-col gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => onPick(ex)}
              disabled={running}
              className="truncate rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-brand-indigo/50 hover:bg-brand-indigo/10 hover:text-white disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
