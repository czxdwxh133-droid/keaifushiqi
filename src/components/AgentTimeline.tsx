import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import type { AgentStep } from "../types/agent";

export default function AgentTimeline({ steps }: { steps: AgentStep[] }) {
  if (!steps.length) return null;
  return (
    <div className="relative pl-1">
      {steps.map((s, i) => {
        const done = s.status === "done";
        const running = s.status === "running";
        return (
          <div key={s.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <span className="absolute left-[11px] top-7 h-[calc(100%-14px)] w-px bg-gray-100" />
            )}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                  : running
                  ? "border-brand-200 bg-brand-50 text-brand-600"
                  : "border-gray-200 bg-gray-50 text-gray-400"
              }`}
            >
              {done ? (
                <CheckCircle2 size={14} />
              ) : running ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Circle size={8} className="fill-current" />
              )}
            </motion.div>
            <div className="flex-1 pt-0.5">
              <div
                className={`text-sm font-semibold ${
                  done ? "text-gray-900" : running ? "text-gray-800" : "text-gray-400"
                }`}
              >
                {s.title}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">{s.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
