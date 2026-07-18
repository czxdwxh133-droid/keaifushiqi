"""sql_validator_tool —— SQL 安全检查"""
from __future__ import annotations
from .base import BaseTool


class SQLValidatorTool(BaseTool):
    name = "validate_sql"
    description = "校验SQL语句安全性，拦截危险操作（INSERT/UPDATE/DELETE/DROP等），确保只读查询。在execute_sql之前应调用此工具"
    parameters_schema = {
        "type": "object",
        "properties": {
            "sql": {
                "type": "string",
                "description": "需要校验的SQL语句",
            },
        },
        "required": ["sql"],
    }

    def run(self, state, **kwargs):
        sql = (kwargs.get("sql") or state.sql).strip()
        if not sql:
            return {"ok": False, "error": "SQL 为空"}

        sql_upper = sql.upper().lstrip()
        dangerous_keywords = [
            "INSERT", "UPDATE", "DELETE", "DROP", "ALTER",
            "CREATE", "TRUNCATE", "RENAME", "GRANT", "REVOKE",
        ]

        for kw in dangerous_keywords:
            if sql_upper.startswith(kw) or f" {kw} " in f" {sql_upper} ":
                return {
                    "ok": False,
                    "error": f"SQL 包含禁止操作: {kw}，仅允许 SELECT 查询",
                }

        state.sql_valid = True
        return {"ok": True, "sql": sql}
