import { AnimatePresence, motion } from "framer-motion";
import type { ReActLogEntry, ReActType } from "../types/agent";

const STYLE: Record<ReActType, string> = {
  Thought: "text-brand-violet",
  Action: "text-brand-600",
  Observation: "text-emerald-600",
};

export default function AgentLog({ logs }: { logs: ReActLogEntry[] }) {
  return (
    <div className="max-h-[240px] min-h-[60px] overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3 font-mono text-xs leading-relaxed">
      {logs.length === 0 && (
        <div className="text-gray-400">// 执行日志将在此流式输出（Thought → Action → Observation）</div>
      )}
      <AnimatePresence initial={false}>
        {logs.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-1.5"
          >
            <span className={`font-bold ${STYLE[l.type]}`}>{l.type}:</span>{" "}
            <span className="text-gray-700">{l.content}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
