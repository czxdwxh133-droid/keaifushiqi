import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, X, Plug, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { dbApi, type ConnectParams, type TableInfo } from "../api/db";

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected: (db: string, tables: TableInfo[], kind?: string) => void;
  onDisconnected: () => void;
  connected: boolean;
  dbName: string;
  dbKind?: "mysql" | "sqlite";
}

export default function DBConnector({ open, onClose, onConnected, onDisconnected, connected, dbName, dbKind }: Props) {
  const isSample = dbKind === "sqlite";

  const [form, setForm] = useState<ConnectParams>({
    host: "localhost", port: 3306, user: "root", password: "", database: "",
  });
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState("");
  const [sampleLoading, setSampleLoading] = useState(false);

  const handleConnect = async () => {
    setDbError("");
    setDbLoading(true);
    try {
      const result = await dbApi.connect(form);
      onConnected(result.database, result.tables, result.kind);
    } catch (e: unknown) {
      setDbError(e instanceof Error ? e.message : "连接失败");
    } finally {
      setDbLoading(false);
    }
  };

  const handleConnectSample = async () => {
    setDbError("");
    setSampleLoading(true);
    try {
      const result = await dbApi.connectSample();
      onConnected(result.database, result.tables, result.kind);
    } catch (e: unknown) {
      setDbError(e instanceof Error ? e.message : "连接示例库失败");
    } finally {
      setSampleLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try { await dbApi.disconnect(); onDisconnected(); } catch {}
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-card"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">数据连接</h3>
                  <p className="text-xs text-gray-500">选择示例库或接入自己的数据库</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            {connected && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
                <CheckCircle2 size={18} className="text-brand-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{isSample ? "示例数据库" : dbName}</div>
                  <div className="text-xs text-gray-500">{isSample ? "内置 SQLite 示例数据" : "MySQL 已连接"}</div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="rounded-lg px-2 py-1 text-xs text-gray-500 transition hover:bg-white hover:text-red-600"
                >
                  断开
                </button>
              </div>
            )}

            {!connected && (
              <>
                {dbError && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
                    <span className="text-xs text-red-600">{dbError}</span>
                  </div>
                )}

                <button
                  onClick={handleConnectSample}
                  disabled={sampleLoading}
                  className="mb-4 flex w-full items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-left transition hover:bg-brand-100 disabled:opacity-60"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                    {sampleLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-brand-800">使用示例数据库</div>
                    <div className="text-xs text-brand-600">内置销售/订单/客户数据，零配置体验</div>
                  </div>
                </button>

                <div className="relative mb-4 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                  <span className="relative bg-white px-2 text-xs text-gray-400">或连接 MySQL</span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="mb-1 block text-[11px] font-medium text-gray-500">主机地址</label>
                      <input
                        value={form.host}
                        onChange={(e) => setForm({ ...form, host: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-brand-300 focus:bg-white"
                        placeholder="localhost"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-500">端口</label>
                      <input
                        type="number"
                        value={form.port}
                        onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-brand-300 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">用户名</label>
                    <input
                      value={form.user}
                      onChange={(e) => setForm({ ...form, user: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-brand-300 focus:bg-white"
                      placeholder="root"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">密码</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-brand-300 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">数据库名</label>
                    <input
                      value={form.database}
                      onChange={(e) => setForm({ ...form, database: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-brand-300 focus:bg-white"
                      placeholder="请输入数据库名"
                    />
                  </div>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={dbLoading || !form.database}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-2.5 text-sm font-semibold text-white shadow-soft transition hover:shadow-card active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {dbLoading ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
                  {dbLoading ? "连接中..." : "连接 MySQL"}
                </button>
              </>
            )}


          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
