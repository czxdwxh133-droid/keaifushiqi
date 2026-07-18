"""
DataPilot —— 基于 Skill Router 架构的智能数据分析助手

架构：SkillRouter（LLM 意图分类） → Skill（固定工具链流水线）

启动：
  开发：python main.py
  生产：uvicorn main:app --host 0.0.0.0 --port 8080

打包：
  npm run build
  pyinstaller --onefile --name DataPilot --add-data "dist;dist" ... main.py
"""
from __future__ import annotations
import os, sys, webbrowser, threading

# 将 backend 目录加入 path，确保打包后可正确导入
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.api.main import app

if __name__ == "__main__":
    import uvicorn

    PORT = int(os.getenv("PORT", "8080"))
    HOST = "0.0.0.0"

    def _open_browser():
        import time
        time.sleep(1.2)
        webbrowser.open(f"http://localhost:{PORT}")

    is_frozen = getattr(sys, "frozen", False)
    threading.Thread(target=_open_browser, daemon=True).start()

    uvicorn.run("backend.api.main:app", host=HOST, port=PORT, reload=not is_frozen, log_level="info")
