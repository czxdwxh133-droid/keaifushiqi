"""sql_generation_tool —— 调用 LLM 生成 SQL（含 RAG 知识增强）"""
import json, re
from .base import BaseTool, call_llm


class SQLGenerationTool(BaseTool):
    name = "generate_sql"
    description = "根据自然语言问题生成SQL SELECT查询语句。会自动参考数据库结构、RAG知识库和业务规则"
    parameters_schema = {
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description": "用户想查询的自然语言问题，如'总销售额是多少''各品类销量排名'",
            },
        },
        "required": ["question"],
    }

    def run(self, state, **kwargs):
        task = kwargs.get("question", kwargs.get("task", state.question))
        schema_text = state.schema_text

        dialect_hint = ""
        try:
            from ..database.connector import get_conn
            db = get_conn()
            if db.kind == "sqlite":
                dialect_hint = "\nAttention: SQLite dialect. Use strftime for dates."
        except Exception:
            pass

        # ── RAG 知识增强 ──
        rag_context = ""
        try:
            from ..rag import retrieve_as_context
            rag_context = retrieve_as_context(task, top_k=3)
        except Exception:
            pass

        system = f"""你是一个 SQL 专家。根据用户需求和数据库结构，生成精确的 SELECT 查询语句。

数据库结构：
{schema_text}{dialect_hint}
{rag_context}

规则：
1. 只能生成 SELECT 语句，禁止 INSERT/UPDATE/DELETE/DROP
2. 表名和列名必须与数据库结构完全一致
3. 聚合查询使用 GROUP BY
4. Top N 查询将 LIMIT 放在末尾
5. 统计销售额、销量、金额等指标时，必须加 WHERE status = '已完成'，排除已取消和已退款的订单
6. 如果上面参考知识中有相关的指标定义或 SQL 模板，优先参考
7. 所有列名必须用中文别名（AS 中文名），让外行用户也能看懂

只返回 JSON：
{{"sql": "SELECT ...", "explanation": "用中文简要说明这条 SQL 做了什么"}}"""

        try:
            resp = call_llm([
                {"role": "system", "content": system},
                {"role": "user", "content": f"用户需求：{task}"},
            ])

            m = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', resp, re.DOTALL)
            if m:
                data = json.loads(m.group(1))
            else:
                data = json.loads(resp)

            state.sql = (data.get("sql") or "").strip()
            return {"ok": True, "sql": state.sql, "explanation": data.get("explanation", "")}
        except Exception as e:
            return {"ok": False, "error": f"SQL generation failed: {str(e)}"}
