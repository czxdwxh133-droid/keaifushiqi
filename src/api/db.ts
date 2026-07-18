const BASE = "";  // 开发模式通过 Vite proxy 转发到后端，生产模式 exe 同源

export interface ConnectParams {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface ColumnInfo {
  field: string;
  type: string;
  key: string;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface PlanStep {
  task: string;
  step_type: "sql" | "analyze" | "chart" | "report";
  needed: boolean;
  status: string;
}

export type SkillName = "query" | "analysis" | "visualization" | "report";

export interface AnalyzeResult {
  ok: boolean;
  sql: string;
  intent: string;
  skill_name?: SkillName;
  result: QueryResult;
  chart: {
    type: "line" | "bar" | "pie";
    title: string;
    categories?: string[];
    series?: { name: string; data: number[] }[];
    pieData?: { name: string; value: number }[];
  };
  report: {
    summary: string;
    bullets: string[];
    suggestions: string[];
  };
  plan?: PlanStep[];
  steps: {
    id: string;
    title: string;
    tool?: string;
    detail: string;
    status: "pending" | "running" | "done";
  }[];
  logs: { type: string; content: string }[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  console.log(`[request] >>> ${options?.method || "GET"} ${fullUrl}`);

  // 默认 15 秒超时（给数据库连接留足够时间）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const signal = options?.signal ? options.signal : controller.signal;

  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
      signal,
    });
    clearTimeout(timeoutId);

    console.log(`[request] <<< HTTP ${res.status} ${res.statusText}  content-type=${res.headers.get("content-type")}`);

    // 读取响应文本（无论成功失败）
    const text = await res.text();

    if (!res.ok) {
      console.log(`[request] <<< error body (first 500 chars):`, text.slice(0, 500));
      let message = `HTTP ${res.status} ${res.statusText}`;
      try {
        const body = JSON.parse(text);
        if (body.detail) message = body.detail;
        if (body.error) message = body.error;
      } catch {
        // 非 JSON 响应，取前 200 字符
        if (text.trim()) message = text.slice(0, 200);
      }
      throw new Error(`[${fullUrl}] ${message}`);
    }

    // 200 但可能也是非 JSON（比如代理返回的 HTML 页面）
    if (!text.trim()) {
      throw new Error(`[${fullUrl}] 返回空响应`);
    }
    try {
      return JSON.parse(text);
    } catch {
      // Vite 代理可能返回 HTML 错误页面
      console.log(`[request] 非 JSON 响应 (first 300):`, text.slice(0, 300));
      throw new Error(`[${fullUrl}] 服务器返回了非 JSON 格式的响应（可能是代理错误），请刷新页面重试`);
    }
  } catch (e: unknown) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(`[${fullUrl}] 请求超时，请确认后端服务已启动`);
    }
    throw e;
  }
}

export const dbApi = {
  /** 连接用户自己的 MySQL */
  connect(params: ConnectParams): Promise<{ database: string; tables: TableInfo[]; kind?: string }> {
    return request(`${BASE}/api/connect`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  /** 连接内置示例数据库（SQLite） */
  connectSample(): Promise<{ database: string; tables: TableInfo[]; kind?: string }> {
    return request(`${BASE}/api/connect/sample`, { method: "POST" });
  },

  query(sql: string): Promise<QueryResult> {
    return request(`${BASE}/api/query`, {
      method: "POST",
      body: JSON.stringify({ sql }),
    });
  },

  async getTables(): Promise<TableInfo[]> {
    const res = await request<{ ok: boolean; tables: TableInfo[] }>(`${BASE}/api/tables`);
    return res.tables;
  },

  getStatus(): Promise<{ connected: boolean; kind?: string; database?: string }> {
    return request(`${BASE}/api/status`);
  },

  disconnect(): Promise<void> {
    return request(`${BASE}/api/disconnect`, { method: "POST" });
  },

  /** 自然语言分析：发送问题 + 表结构 → 返回 SQL + 数据 + 图表 + 报告 */
  analyze(question: string, tables: TableInfo[], signal?: AbortSignal): Promise<AnalyzeResult> {
    return request(`${BASE}/api/analyze`, {
      method: "POST",
      body: JSON.stringify({ question, tables }),
      signal,
    });
  },

  /** LLM 连通性测试 */
  testLLM(): Promise<{ ok: boolean; results: { step: string; detail: string; ok: boolean }[] }> {
    return request(`${BASE}/api/test/llm`);
  },
};
