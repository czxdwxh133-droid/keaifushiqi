"""Router —— LLM 意图分类 → 固定流水线分派

分类后调用 Pipeline.execute()，按代码写死的工具链执行。
相比 ReAct Agent：分类 1 次 LLM + SQL 生成 1 次 LLM = 仅 2 次 LLM 调用。
"""
from __future__ import annotations
import json, re
from typing import Any
from ..tools.base import call_llm

CLASSIFY_PROMPT = """你是一个数据分析意图分类专家。请根据用户的问题，判断其属于以下哪种类型，只返回 JSON。

四种类型：
1. "query" - 数据查询：简单查数据、查总数、查列表、查某个具体值
   例如："总销售额是多少""有多少用户""列出所有订单""评分最高的商品"
2. "analysis" - 数据分析：统计分析、趋势分析、对比分析、分布分析、计算占比/增长率
   例如："各品类销售趋势""销量增长率""用户年龄段分布""各类别占比"
3. "visualization" - 可视化：明确要求生成图表、对比图、趋势图、饼图
   例如："画出月度销售额趋势图""用饼图展示品类占比""对比图"
4. "report" - 商业报告：综合分析、经营分析、需要全面报告和业务建议
   例如："本季度经营分析""销售业绩综合报告""完整的用户行为分析报告"

分类规则（按优先级）：
- 如果明确提到"图表/画图/饼图/柱状图/趋势图/可视化/画出" → visualization
- 如果提到"报告/综合/全面/经营分析/业绩" → report
- 如果只是简单查数、查列表、查某个值 → query
- 如果涉及趋势/对比/分布/占比/增长率等统计分析，但不是完整报告 → analysis

只返回 JSON：{"type": "query|analysis|visualization|report", "reason": "简短原因"}"""


class Router:
    """LLM 意图分类 + 流水线分派"""

    def __init__(self, pipelines: dict[str, Any]):
        self._pipelines = pipelines  # {name: BasePipeline}

    def route(self, state: Any) -> Any:
        question = state.question
        schema_hint = state.schema_text[:800] if state.schema_text else "无"

        state.add_step("classify", "意图识别", "正在理解你的需求...", "running", "")

        intent = self._classify(question, schema_hint)
        pipeline = self._pipelines.get(intent)
        if not pipeline:
            state.add_step("classify", "意图识别",
                           f"未匹配到类型 '{intent}'，使用默认报告", "done", "")
            pipeline = self._pipelines.get("report")

        state.add_step("classify", "意图识别",
                       f"识别为「{pipeline.label}」", "done", "")
        state.intent = pipeline.label

        return pipeline.execute(state)

    def _classify(self, question: str, schema_hint: str) -> str:
        try:
            from ..rag import retrieve_as_context
            rag_context = retrieve_as_context(question, top_k=2)
        except Exception:
            rag_context = ""

        try:
            resp = call_llm([
                {"role": "system", "content": CLASSIFY_PROMPT},
                {"role": "user",
                 "content": f"数据库结构摘要：\n{schema_hint}\n{rag_context}\n用户问题：{question}"},
            ], temperature=0.1, max_tokens=256)

            m = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', resp, re.DOTALL)
            data = json.loads(m.group(1) if m else resp)
            intent = data.get("type", data.get("skill", "report"))
            if intent in ("query", "analysis", "visualization", "report"):
                return intent
            return "report"
        except Exception:
            return self._fallback_classify(question)

    @staticmethod
    def _fallback_classify(question: str) -> str:
        q = question.lower()
        chart_words = ["图表", "画图", "饼图", "柱状图", "趋势图", "可视化",
                       "画出", "绘制", "chart", "plot", "graph", "visualize"]
        report_words = ["报告", "综合", "全面", "经营分析", "业绩", "洞察",
                        "report", "comprehensive"]
        if any(w in q for w in chart_words):
            return "visualization"
        if any(w in q for w in report_words):
            return "report"
        simple_patterns = ["多少", "总数", "有哪些", "列出", "是谁", "什么是",
                           "查询", "查找", "top", "最高", "最低", "最大", "最小"]
        if any(w in q for w in simple_patterns):
            return "query"
        return "analysis"
