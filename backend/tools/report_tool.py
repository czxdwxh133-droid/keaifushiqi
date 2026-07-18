"""report_tool —— 生成分析报告"""
from __future__ import annotations
import re
from .base import BaseTool, call_llm


class ReportTool(BaseTool):
    name = "generate_report"
    description = "基于查询和分析结果，生成结构化业务报告。包含：核心结论summary、关键发现bullets、行动建议suggestions。报告语言口语化，面向非技术用户"
    parameters_schema = {
        "type": "object",
        "properties": {
            "focus_areas": {
                "type": "string",
                "description": "报告需要关注的重点，如'本月销售趋势和品类对比''用户消费行为分析'",
            },
        },
        "required": [],
    }

    def run(self, state, **kwargs):
        rows = state.rows
        columns = state.columns
        question = state.question

        if not rows or not columns:
            state.report_cfg = {
                "summary": "暂无足够数据生成分析报告",
                "bullets": [],
                "suggestions": [],
            }
            return {"ok": True, "report": state.report_cfg}

        # 构建数据摘要给 LLM
        data_preview = f"列: {columns}\n前10行:\n"
        for r in rows[:10]:
            data_preview += f"  {dict(r)}\n"
        if len(rows) > 10:
            data_preview += f"  ... 共 {len(rows)} 行\n"

        system = f"""你是一个数据分析师。请直接回答用户的问题，用大白话说清楚，让完全不懂数据的人也看得懂。

用户问题：{question}
查询结果（共 {len(rows)} 行）：
{data_preview}

重要——你必须正面回答用户的问题：
- 如果用户问"哪个最好/最差"，必须在 summary 里明确说出最好的和对应数值、最差的和对应数值、差距是多少
- 如果用户问对比，必须说出具体差了多少
- 不要只是描述数据，要给出结论

请以 JSON 格式回复（只要 JSON）：
{{
  "summary": "直接回答用户问题的结论，必须带具体数字",
  "bullets": ["发现点1", "发现点2", "发现点3"],
  "suggestions": ["建议1", "建议2"]
}}

要求：summary 要像跟朋友聊天一样自然，用"生意最好的是X月""最差的是Y月""差了Z块钱"这种口语化表达。"""

        try:
            resp = call_llm([
                {"role": "system", "content": system},
                {"role": "user", "content": "请生成分析报告"},
            ], temperature=0.3, max_tokens=1024)

            m = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', resp, re.DOTALL)
            if m:
                report = __import__("json").loads(m.group(1))
            else:
                report = __import__("json").loads(resp)

            state.report_cfg = {
                "summary": report.get("summary", "分析完成"),
                "bullets": report.get("bullets", []),
                "suggestions": report.get("suggestions", []),
            }
        except Exception:
            state.report_cfg = {
                "summary": f"共 {len(rows)} 条记录，分析完成",
                "bullets": [f"查询返回 {len(rows)} 条数据", f"涉及 {len(columns)} 个字段"],
                "suggestions": ["建议进一步细化分析维度"],
            }

        return {"ok": True, "report": state.report_cfg}
