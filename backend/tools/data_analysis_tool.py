"""data_analysis_tool —— 数据分析计算"""
from __future__ import annotations
from .base import BaseTool


class DataAnalysisTool(BaseTool):
    name = "analyze_data"
    description = "对execute_sql返回的数据进行统计分析：计算总和、均值、最大最小值、各类别占比。自动识别数值列并计算指标"
    parameters_schema = {
        "type": "object",
        "properties": {
            "focus": {
                "type": "string",
                "description": "分析重点描述，如'计算各品类销售额占比''分析月度趋势'",
            },
        },
        "required": [],
    }

    def run(self, state, **kwargs):
        rows = state.rows
        columns = state.columns

        if not rows or not columns:
            return {"ok": True, "summary": "无数据可供分析", "metrics": {}}

        # 找到数值列
        value_col = None
        for c in columns:
            for r in rows[:5]:
                v = r.get(c)
                if v is not None and isinstance(v, (int, float)):
                    value_col = c
                    break
            if value_col:
                break

        metrics = {}
        if value_col:
            values = [float(r.get(value_col, 0) or 0) for r in rows]
            if values:
                metrics["total"] = round(sum(values), 2)
                metrics["average"] = round(sum(values) / len(values), 2)
                metrics["max"] = round(max(values), 2)
                metrics["min"] = round(min(values), 2)

        # 如果有类别列，计算占比
        label_col = columns[0] if columns else ""
        if label_col and value_col and len(rows) > 1:
            total = sum(float(r.get(value_col, 0) or 0) for r in rows)
            if total > 0:
                metrics["percentages"] = {
                    str(r.get(label_col, "")): round(
                        float(r.get(value_col, 0) or 0) / total * 100, 1
                    )
                    for r in rows
                }

        return {"ok": True, "metrics": metrics}
