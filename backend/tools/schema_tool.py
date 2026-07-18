"""schema_tool —— 获取数据库表结构"""
from __future__ import annotations
from .base import BaseTool
from ..database.connector import get_conn


class SchemaTool(BaseTool):
    name = "get_database_schema"
    description = "获取当前数据库结构（表名、字段、类型、键关系），在生成SQL之前应先调用此工具了解数据结构"
    parameters_schema = {
        "type": "object",
        "properties": {},
        "required": [],
    }

    def run(self, state, **kwargs):
        db = get_conn()
        tables = db.get_tables()

        # 构建可读文本
        lines = []
        for t in tables:
            lines.append(f"\n表名: {t['name']}")
            for c in t.get("columns", []):
                key_mark = ""
                if c.get("key") == "PRI":
                    key_mark = " [主键]"
                elif c.get("key") == "MUL":
                    key_mark = " [外键]"
                lines.append(f"  - {c['field']} ({c['type']}){key_mark}")

        schema_text = "\n".join(lines)
        state.schema_text = schema_text
        state.tables = tables

        return {"ok": True, "tables": tables, "schema_text": schema_text}
