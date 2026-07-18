"""DataPilot API —— FastAPI 路由层"""
from __future__ import annotations
import json, re, os, sys, webbrowser, threading, urllib.request, urllib.error
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# 导入 Pipeline 架构
from ..agents.state import AgentState
from ..pipelines import ALL_PIPELINES
from ..skills import SkillRouter
from ..tools.base import update_llm_config, get_llm_config, call_llm
from ..database.connector import get_conn, close_conn, _db as _global_db
from ..database.sample_db import ensure_sample_db, SAMPLE_DB_PATH

# ── 路径配置 ─────────────────────────
def _base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent.parent

def _resource_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", str(_base_dir())))
    return Path(__file__).resolve().parent.parent.parent

_BASE = _base_dir()
_RES = _resource_dir()
DIST_DIR = _RES / "dist"

# ── 日志工具（必须在初始化代码之前定义）──
def _log(msg: str):
    print(f"[DataPilot] {msg}", file=sys.stderr, flush=True)

# ── 初始化 ───────────────────────────
ensure_sample_db()  # 确保示例数据库文件存在
# 启动时自动连接示例数据库，避免忘记连接导致 "No database connected" 错误
try:
    _global_db.connect_sqlite(SAMPLE_DB_PATH)
    _log(f"已自动连接示例数据库: {SAMPLE_DB_PATH}")
except Exception as e:
    _log(f"自动连接示例数据库失败（可手动连接）: {e}")

# 初始化 RAG 知识库（在启动后台线程中完成，避免阻塞启动）
import threading as _threading
def _init_rag():
    try:
        from ..rag import index_knowledge
        index_knowledge()
    except Exception as e:
        _log(f"RAG 知识库初始化失败（可忽略）: {e}")
_threading.Thread(target=_init_rag, daemon=True).start()

app = FastAPI(title="DataPilot — 智能数据分析助手", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 预初始化 Router（分类 → Pipeline 分派）
_skill_router = SkillRouter(ALL_PIPELINES)



# ── Request Models ────────────────────
class ConnectRequest(BaseModel):
    host: str = "localhost"
    port: int = 3306
    user: str = "root"
    password: str = ""
    database: str = ""


class QueryRequest(BaseModel):
    sql: str


class LLMConfigRequest(BaseModel):
    apiKey: str = ""
    baseUrl: str = "https://api.deepseek.com/v1"
    model: str = "deepseek-chat"


class AnalyzeRequest(BaseModel):
    question: str
    tables: list[dict[str, Any]] = []


# ── API 端点 ─────────────────────────

@app.post("/api/connect")
def connect_db(body: ConnectRequest):
    try:
        tables = _global_db.connect_mysql(
            body.host, body.port, body.user, body.password, body.database
        )
        return {"ok": True, "database": body.database, "host": body.host,
                "tables": tables, "kind": "mysql"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"数据库连接失败: {str(e)}")


@app.post("/api/connect/sample")
def connect_sample():
    try:
        tables = _global_db.connect_sqlite(SAMPLE_DB_PATH)
        return {"ok": True, "database": "示例数据库", "host": "本地 SQLite",
                "tables": tables, "kind": "sqlite"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"示例库连接失败: {str(e)}")


@app.post("/api/query")
def run_query(body: QueryRequest):
    db = get_conn()
    sql = body.sql.strip()
    if not sql:
        raise HTTPException(status_code=400, detail="SQL 不能为空")
    try:
        columns, rows = db.execute(sql)
        return {"ok": True, "columns": columns, "rows": rows, "rowCount": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询执行失败: {str(e)}")


@app.get("/api/tables")
def get_tables():
    db = get_conn()
    tables = db.get_tables()
    return {"ok": True, "tables": tables}


@app.get("/api/status")
def status():
    connected = _global_db.connected
    cfg = _global_db.config
    return {
        "connected": connected,
        "kind": _global_db.kind,
        "database": cfg.get("database", "") if connected else "",
        "host": cfg.get("host", cfg.get("path", "")) if connected else "",
        "llmConfigured": True,
    }


@app.post("/api/disconnect")
def disconnect():
    close_conn()
    return {"ok": True}


@app.get("/api/config/llm")
def get_llm_config_api():
    cfg = get_llm_config()
    return {"llmConfigured": True, "baseUrl": cfg["baseUrl"], "model": cfg["model"]}


@app.post("/api/config/llm")
def set_llm_config(body: LLMConfigRequest):
    update_llm_config(body.apiKey, body.baseUrl, body.model)
    return {"ok": True}


# ── 核心：Router + Pipeline 分析 ──

@app.post("/api/analyze")
def analyze(body: AnalyzeRequest):
    """Router 意图分类 → 分派到对应 Pipeline 执行（固定工具链，非 Agent）"""
    _log(f"开始分析：{body.question}")

    state = AgentState(question=body.question.strip())
    if not state.question:
        raise HTTPException(status_code=400, detail="问题不能为空")

    try:
        # 确保数据库已连接
        db = get_conn()
        _log(f"数据库已连接: {db.kind}")

        # Phase 1: 获取 Schema
        from ..tools.schema_tool import SchemaTool
        schema_tool = SchemaTool()
        schema_result = schema_tool.run(state)
        _log(f"Schema 获取完成: {len(schema_result.get('tables', []))} 张表")

        # Phase 2: Router 分类 + Pipeline 执行（固定工具链，2次LLM调用）
        state = _skill_router.route(state)

        _log(f"分析完成！skill={state.skill_name}, err={state.error}")

        return state.to_dict()

    except ConnectionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        _log(f"分析异常: {type(e).__name__}: {str(e)}")
        state.error = str(e)
        state.add_step("done", "异常", f"{type(e).__name__}: {str(e)[:60]}", "done", "")
        return state.to_dict()


# ── 连通性测试 ───────────────────────

@app.get("/api/ping")
def ping():
    return {
        "ok": True,
        "timestamp": datetime.now().isoformat(),
        "python_version": sys.version,
        "db_kind": _global_db.kind,
        "routes_count": len(app.routes),
        "registered_routes": [r.path for r in app.routes if hasattr(r, "path")],
    }


@app.get("/api/test/llm")
def test_llm():
    results = []
    cfg = get_llm_config()
    api_key = cfg["apiKey"]
    base_url = cfg["baseUrl"].rstrip("/")
    model = cfg["model"]

    results.append({"step": "配置检查",
                     "detail": f"model={model}, base_url={base_url}, key_len={len(api_key)}",
                     "ok": bool(api_key)})

    if not api_key:
        results.append({"step": "结果", "detail": "API Key 为空", "ok": False})
        return {"ok": False, "results": results}

    body = json.dumps({"model": model,
                        "messages": [{"role": "user", "content": "Say just 'OK'."}],
                        "temperature": 0, "max_tokens": 10}).encode("utf-8")
    url = f"{base_url}/chat/completions"
    results.append({"step": "构建请求", "detail": f"URL={url}", "ok": True})

    try:
        req = urllib.request.Request(url, data=body)
        req.add_header("Content-Type", "application/json; charset=utf-8")
        req.add_header("Authorization", f"Bearer {api_key}")
        results.append({"step": "发送请求", "detail": "正在发送...", "ok": True})

        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            results.append({"step": "收到响应", "detail": f"HTTP {resp.status}", "ok": True})
            data = json.loads(raw)
            content = data["choices"][0]["message"]["content"]
            results.append({"step": "解析结果", "detail": f"LLM: {content[:200]}", "ok": True})
            return {"ok": True, "results": results}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        results.append({"step": "HTTP 错误", "detail": f"{e.code}: {error_body[:200]}", "ok": False})
        return {"ok": False, "results": results}
    except Exception as e:
        results.append({"step": "异常", "detail": f"{type(e).__name__}: {str(e)}", "ok": False})
        return {"ok": False, "results": results}


# ── 全局异常兜底 ─────────────────────

@app.exception_handler(Exception)
async def _unhandled_exception(request, exc):
    """将未捕获异常转为 200 合法结构，杜绝裸 500"""
    _log(f"未捕获异常: {type(exc).__name__}: {exc}")
    return JSONResponse(status_code=200, content={
        "ok": False,
        "error": f"{type(exc).__name__}: {str(exc)[:200]}",
        "steps": [], "logs": [], "question": "",
        "plan": [], "sql": "",
        "result": {"columns": [], "rows": [], "rowCount": 0},
        "chart": {}, "report": {},
    })


# ── 静态文件 ─────────────────────────

if DIST_DIR.exists() and (DIST_DIR / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="static")
