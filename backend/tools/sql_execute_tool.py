"""sql_execute_tool —— 执行 SQL 查询"""
from __future__ import annotations
from .base import BaseTool
from ..database.connector import get_conn


class SQLExecuteTool(BaseTool):
    name = "execute_sql"
    description = "执行SQL查询并返回结构化结果（列名、行数据、行数）。执行前应先调用validate_sql进行安全校验"
    parameters_schema = {
        "type": "object",
        "properties": {
            "sql": {
                "type": "string",
                "description": "需要执行的SELECT查询语句",
            },
        },
        "required": ["sql"],
    }

    def run(self, state, **kwargs):
        db = get_conn()
        sql = kwargs.get("sql") or state.sql

        if not sql:
            return {"ok": False, "error": "没有可执行的 SQL"}

        if sql != state.sql:
            state.sql = sql  # Agent 显式传入的 SQL 也更新到 state

        try:
            columns, rows = db.execute(sql)
            state.columns = columns
            state.rows = rows
            return {
                "ok": True,
                "columns": columns,
                "rows": rows,
                "rowCount": len(rows),
            }
        except Exception as e:
            return {"ok": False, "error": f"SQL 执行失败: {str(e)}"}
