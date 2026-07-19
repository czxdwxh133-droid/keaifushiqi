import { useEffect, useState, Component, type ErrorInfo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Database, Sparkles, Loader2, Settings2, AlertTriangle, RotateCcw } from "lucide-react";
import AnalysisPage from "./pages/AnalysisPage";
import DBConnector from "./components/DBConnector";
import { dbApi, type TableInfo } from "./api/db";

// ── 错误边界：防止任何组件崩溃导致白屏 ──
class ErrorBoundary extends Component<
  { children: ReactNode; label?: string },
  { hasError: boolean; errorMsg: string }
> {
  state = { hasError: false, errorMsg: "" };
  static getDerivedStateFromError(e: Error) {
    return { hasError: true, errorMsg: e.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? "/" + this.props.label : ""}] 崩溃:`, error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#fafafa] px-6">
          <AlertTriangle size={40} className="text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-800">页面出现异常</h2>
          <p className="max-w-md text-center text-sm text-gray-500">{this.state.errorMsg}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:shadow-card active:scale-95"
          >
            <RotateCcw size={14} /> 重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [showDB, setShowDB] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [dbName, setDbName] = useState("");
  const [dbKind, setDbKind] = useState<"mysql" | "sqlite" | undefined>();
  const [dbTables, setDbTables] = useState<TableInfo[]>([]);
  const [loadingSample, setLoadingSample] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [statusChecking, setStatusChecking] = useState(true); // 初始状态检查中
  const [sampleError, setSampleError] = useState("");
  const [transitioning, setTransitioning] = useState(false); // 正在切换到分析页

  // 启动时检查后端状态（仅探活，始终显示欢迎页让用户选择）
  useEffect(() => {
    setStatusChecking(true);
    dbApi
      .getStatus()
      .then((s) => {
        // 如果之前连过数据库，先断开，让用户重新选择
        if (s.connected) {
          dbApi.disconnect().catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        setStatusLoaded(true);
        setStatusChecking(false);
      });
  }, []);

  const handleConnected = (name: string, tables: TableInfo[], kind?: string) => {
    setDbName(name);
    setDbKind((kind as any) ?? "mysql");
    setDbTables(tables);
    setShowDB(false);
    setSampleError("");
    // 先设进入状态标志，用短暂延迟确保 loading 有显示机会
    setTransitioning(true);
    setTimeout(() => {
      setDbConnected(true);
      setTransitioning(false);
    }, 300);
  };

  const handleUseSample = async () => {
    setSampleError("");
    setLoadingSample(true);
    try {
      const res = await dbApi.connectSample();
      handleConnected(res.database, res.tables, res.kind);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "连接失败";
      if (msg.includes("超时") || msg.includes("timeout") || msg.includes("AbortError")) {
        setSampleError("后端服务未启动，请先在终端执行 python main.py 启动后端");
      } else if (msg.includes("代理错误") || msg.includes("非 JSON")) {
        setSampleError("后端服务异常，请重启后端后刷新页面");
      } else {
        setSampleError(msg);
      }
    } finally {
      setLoadingSample(false);
    }
  };

  // ── 初始加载中 ──
  if (statusChecking && !dbConnected) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#fafafa]">
        <Loader2 size={32} className="animate-spin text-brand-500" />
        <p className="text-sm text-gray-500">正在检查后端状态...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#fafafa] text-gray-800">
        {/* ── 过渡动画：连库中 ── */}
        {transitioning && (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <Loader2 size={32} className="mx-auto mb-3 animate-spin text-brand-500" />
              <p className="text-sm text-gray-500">正在进入分析界面...</p>
            </div>
          </div>
        )}

        {/* ── 欢迎页 ── */}
        {!dbConnected && !transitioning && (
          <WelcomeScreen
            onUseSample={handleUseSample}
            onConnectMySQL={() => setShowDB(true)}
            loadingSample={loadingSample}
            statusLoaded={statusLoaded}
            sampleError={sampleError}
          />
        )}

        {/* ── 分析页 ── */}
        {dbConnected && !transitioning && (
          <ErrorBoundary label="analysis">
            <main className="flex flex-1 overflow-hidden">
              <AnalysisPage
                dbConnected={dbConnected}
                dbName={dbName}
                dbKind={dbKind}
                dbTables={dbTables}
                onOpenDB={() => setShowDB(true)}
              />
            </main>
          </ErrorBoundary>
        )}

        <DBConnector
          open={showDB}
          onClose={() => setShowDB(false)}
          onConnected={handleConnected}
          onDisconnected={() => {
            setDbConnected(false);
            setDbName("");
            setDbKind(undefined);
            setDbTables([]);
          }}
          connected={dbConnected}
          dbName={dbName}
          dbKind={dbKind}
        />
      </div>
    </ErrorBoundary>
  );
}

function WelcomeScreen({
  onUseSample,
  onConnectMySQL,
  loadingSample,
  statusLoaded,
  sampleError,
}: {
  onUseSample: () => void;
  onConnectMySQL: () => void;
  loadingSample: boolean;
  statusLoaded: boolean;
  sampleError: string;
}) {
  // 初始加载动画
  if (!statusLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-1 flex-col items-center justify-center px-6"
    >
      <div className="mx-auto w-full max-w-md">
        {/* 品牌区域 */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-soft">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient text-white">
              <Sparkles size={22} />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">DataPilot</h1>
          <p className="text-sm text-gray-500">基于 Skill Router 架构的智能数据分析助手</p>
        </div>

        {/* 错误提示 */}
        {sampleError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">{sampleError}</p>
          </motion.div>
        )}

        {/* 选择卡片 */}
        <div className="space-y-4">
          <button
            onClick={onUseSample}
            disabled={loadingSample}
            className="group flex w-full items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card disabled:opacity-60"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
              {loadingSample ? <Loader2 size={22} className="animate-spin" /> : <Database size={22} />}
            </div>
            <div className="flex-1">
              <div className="text-base font-medium text-gray-900">使用示例数据库</div>
              <div className="mt-0.5 text-sm text-gray-500">内置电商销售数据，无需任何配置，立即体验</div>
            </div>
          </button>

          <button
            onClick={onConnectMySQL}
            disabled={loadingSample}
            className="group flex w-full items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card disabled:opacity-60"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600 transition group-hover:bg-brand-50 group-hover:text-brand-600">
              <Settings2 size={22} />
            </div>
            <div className="flex-1">
              <div className="text-base font-medium text-gray-900">连接我的数据库</div>
              <div className="mt-0.5 text-sm text-gray-500">接入 MySQL / MariaDB，分析自己的真实数据</div>
            </div>
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Skill Router · 分析能力由大语言模型驱动
        </p>
      </div>
    </motion.div>
  );
}
