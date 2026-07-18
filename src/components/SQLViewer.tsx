import { Fragment } from "react";

const KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "GROUP", "ORDER", "BY", "SUM", "COUNT", "AS", "AND",
  "OR", "DESC", "ASC", "LIMIT", "YEAR", "MONTH", "DAY", "DATE_FORMAT", "ROUND",
  "JOIN", "ON", "OVER", "CASE", "WHEN", "THEN", "ELSE", "END", "HAVING", "AVG",
  "MAX", "MIN", "STRFTIME",
]);

interface Token {
  text: string;
  cls?: string;
}

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  const re = /('[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|([^\sA-Za-z0-9_']+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    if (m[1]) tokens.push({ text: m[1], cls: "text-amber-600" });
    else if (m[2]) tokens.push({ text: m[2], cls: "text-blue-600" });
    else if (m[3])
      tokens.push({
        text: m[3],
        cls: KEYWORDS.has(m[3].toUpperCase()) ? "text-brand-600" : "text-gray-700",
      });
    else tokens.push({ text: m[0] });
  }
  return tokens;
}

export default function SQLViewer({ sql }: { sql: string }) {
  const tokens = tokenize(sql);
  return (
    <pre className="overflow-x-auto rounded-xl border border-gray-100 bg-gray-50 p-4 font-mono text-[13px] leading-relaxed">
      <code>
        {tokens.map((t, i) =>
          t.cls ? (
            <span key={i} className={t.cls}>
              {t.text}
            </span>
          ) : (
            <Fragment key={i}>{t.text}</Fragment>
          )
        )}
      </code>
    </pre>
  );
}
