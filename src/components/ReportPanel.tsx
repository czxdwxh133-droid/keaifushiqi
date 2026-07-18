import { TrendingUp, Lightbulb } from "lucide-react";
import type { ReportData } from "../types/agent";

export default function ReportPanel({ report }: { report: ReportData }) {
  return (
    <div className="space-y-4 text-sm">
      <p className="leading-relaxed text-gray-700">{report.summary}</p>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-700">
          <TrendingUp size={14} /> 关键发现
        </div>
        <ul className="space-y-1.5">
          {report.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-gray-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet" />
              <span className="leading-snug">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-600">
          <Lightbulb size={14} /> 行动建议
        </div>
        <ul className="space-y-1.5">
          {report.suggestions.map((s, i) => (
            <li key={i} className="flex gap-2 text-gray-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span className="leading-snug">{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
