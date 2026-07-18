import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, RefreshCw, Loader2, Database, Plug, MessageSquare, Wifi, XCircle, CheckCircle2 } from "lucide-react";
import { useAgentRun } from "../hooks/useAgentRun";
import type { TableInfo } from "../api/db";
import { dbApi } from "../api/db";
import ChatBubble from "../components/ChatBubble";

interface Props {
  dbConnected: boolean;
  dbName: string;
  dbKind?: "mysql" | "sqlite";
  dbTables: TableInfo[];
  onOpenDB: () => void;
}

const EXAMPLE_QUESTIONS = [
  "平均下来大家每一单花多少钱？",
  "卖得最好的品类是哪个？",
  "哪个城市的人最舍得花钱？",
  "退货的多不多？",
];

export default function AnalysisPage({ dbConnected, dbName, dbKind, dbTables, onOpenDB }: Props) {
  const [input, setInput] = useState("");
  const { messages, running, run, reset } = useAgentRun("db", dbTables);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [testingLLM, setTestingLLM] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<{ ok: boolean; results: { step: string; detail: string; ok: boolean }[] } | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const ta = inputRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || running) return;
    run(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTestLLM = async () => {
    setTestingLLM(true);
    setLlmTestResult(null);

    // 收集调试步骤
    const steps: { step: string; detail: string; ok: boolean }[] = [];

    const addStep = (step: string, detail: string, ok: boolean) => {
      steps.push({ step, detail, ok });
      setLlmTestResult({ ok: false, results: [...steps] });
      console.log(`[testLLM] ${ok ? "OK" : "FAIL"} ${step}: ${detail}`);
    };

    // 第一步：检查基础连通性
    addStep("0-环境检测", `当前页面 URL: ${window.location.href}`, true);
    addStep("0-环境检测", `API base 将请求: ${window.location.origin}/api/test/llm`, true);

    try {
      const pingUrl = `/api/ping`;
      addStep("1-ping", `GET ${window.location.origin}${pingUrl}`, true);
      const pingRes = await fetch(pingUrl);
      const pingText = await pingRes.text();
      addStep("1-ping", `HTTP ${pingRes.status}: ${pingText.slice(0, 200)}`, pingRes.ok);

      if (!pingRes.ok) {
        addStep("FAIL", "基础 API 连通性失败，后端可能未启动或端口不对", false);
        setTestingLLM(false);
        return;
      }
    } catch (e: unknown) {
      addStep("1-ping", `网络错误: ${e instanceof Error ? e.message : String(e)}`, false);
      addStep("FAIL", "无法连接到后端服务器，请确认 exe 已启动", false);
      setTestingLLM(false);
      return;
    }

    // 第二步：测试 /api/test/llm
    try {
      const llmUrl = `/api/test/llm`;
      addStep("2-llm", `GET ${window.location.origin}${llmUrl}`, true);
      const llmRes = await fetch(llmUrl);
      addStep("2-llm", `HTTP ${llmRes.status} ${llmRes.statusText}`, llmRes.ok);

      if (!llmRes.ok) {
        const body = await llmRes.text();
        addStep("2-llm", `响应体: ${body.slice(0, 300)}`, false);
        addStep("FAIL", "后端返回非200，/api/test/llm 路由可能未注册", false);
        setTestingLLM(false);
        return;
      }

      const result = await llmRes.json();
      addStep("2-llm", `JSON 解析成功, ok=${result.ok}`, true);

      if (result.results) {
        result.results.forEach((r: { step: string; detail: string; ok: boolean }, i: number) => {
          steps.push({ step: `3-${i + 1}-${r.step}`, detail: r.detail, ok: r.ok });
        });
      }

      setLlmTestResult({ ok: result.ok, results: steps });
    } catch (e: unknown) {
      addStep("2-llm", `异常: ${e instanceof Error ? e.message : String(e)}`, false);
      setTestingLLM(false);
      return;
    }

    setTestingLLM(false);
  };

  const isSample = dbKind === "sqlite";

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white/70 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">DataPilot</h1>
            <p className="text-[11px] text-gray-500">
              {isSample ? "示例数据库 · 电商销售数据" : `${dbName} · Skill Router`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDB}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              isSample
                ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                : "border-gray-200 bg-white text-gray-600 hover:border-brand-200 hover:text-brand-700"
            }`}
          >
            {isSample ? <Database size={12} /> : <Plug size={12} />}
            {isSample ? "示例数据库" : dbName}
          </button>

          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              running
                ? "border-brand-200 bg-brand-50 text-brand-700"
                : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            {running ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
            {running ? "分析中..." : "就绪"}
          </div>

          {messages.length > 0 && !running && (
            <button
              onClick={reset}
              className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
            >
              <RefreshCw size={12} />
              新对话
            </button>
          )}

          <button
            onClick={handleTestLLM}
            disabled={testingLLM}
            className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
            title="测试 LLM API 连通性"
          >
            {testingLLM ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
            测试LLM
          </button>
        </div>
      </header>

      {/* LLM Test Result */}
      {llmTestResult && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className={`shrink-0 border-b px-6 py-3 ${
            llmTestResult.ok ? "border-brand-200 bg-brand-50" : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex items-start gap-2">
            {llmTestResult.ok
              ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand-600" />
              : <XCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
            }
            <div className="flex-1 space-y-1">
              <span className={`text-xs font-semibold ${llmTestResult.ok ? "text-brand-800" : "text-red-700"}`}>
                LLM 连通性测试 {llmTestResult.ok ? "通过" : "失败"}
              </span>
              {llmTestResult.results.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                  <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${r.ok ? "bg-brand-500" : "bg-red-400"}`} />
                  <span className={r.ok ? "text-gray-600" : "text-red-600"}>
                    <strong>{r.step}：</strong>{r.detail}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => setLlmTestResult(null)} className="shrink-0 text-gray-400 hover:text-gray-600">
              <XCircle size={14} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Schema hint bar */}
      {dbTables.length > 0 && messages.length === 0 && (
        <div className="shrink-0 border-b border-gray-100 bg-white/50 px-6 py-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-gray-400">可用表：</span>
            {dbTables.map((t) => (
              <span
                key={t.name}
                className="cursor-pointer rounded-full border border-gray-200 bg-white px-2.5 py-1 text-gray-600 shadow-sm transition hover:border-brand-200 hover:text-brand-700"
                title={t.columns.map((c) => `${c.field}(${c.type})`).join(", ")}
                onClick={() => setInput((prev) => prev + (prev ? " " : "") + t.name)}
              >
                {t.name}
                <span className="ml-1 text-gray-400">({t.columns.length} 字段)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollRef} className="relative flex flex-1 flex-col overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-soft">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient text-white">
                  <MessageSquare size={22} />
                </div>
              </div>
              <h2 className="mb-2 text-lg font-medium text-gray-900">
                想问什么数据？
              </h2>
              <p className="mb-8 text-sm text-gray-500">
                直接用中文描述分析需求，AI 会自动生成 SQL 并返回表格与图表。
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {EXAMPLE_QUESTIONS.map((q, i) => (
                  <motion.button
                    key={q}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-600 shadow-soft transition hover:border-brand-200 hover:text-brand-700 hover:shadow-card"
                  >
                    {q}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} />
            ))}
            {running && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 text-sm text-gray-500"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-brand-50">
                  <Loader2 size={16} className="animate-spin text-brand-600" />
                </div>
                <span>正在分析...</span>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-4">
        <div className="relative mx-auto max-w-3xl">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="用自然语言描述你的分析需求，也可以直接输入 SQL 查询..."
            rows={1}
            disabled={running}
            className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 py-3.5 pl-5 pr-12 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-brand-300 focus:bg-white disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={running || !input.trim()}
            className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-soft transition hover:shadow-card active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-gray-400">
          AI 自动生成 SQL 并执行 · 仅允许 SELECT 查询 · 不会修改您的数据
        </p>
      </div>
    </div>
  );
}
