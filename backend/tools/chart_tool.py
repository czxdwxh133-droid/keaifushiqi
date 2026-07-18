"""chart_tool —— 生成 ECharts 图表配置"""
from __future__ import annotations
from .base import BaseTool


class ChartTool(BaseTool):
    name = "create_chart"
    description = "根据查询数据生成ECharts可视化图表配置。自动根据数据特征选择图表类型（≤8条饼图，>8条柱状图，时间维度折线图）"
    parameters_schema = {
        "type": "object",
        "properties": {
            "chart_type": {
                "type": "string",
                "enum": ["bar", "pie", "line"],
                "description": "图表类型：bar（柱状图）、pie（饼图）、line（折线图）。留空则自动推断",
            },
            "title": {
                "type": "string",
                "description": "图表标题",
            },
        },
        "required": [],
    }

    def run(self, state, **kwargs):
        columns = state.columns
        rows = state.rows
        chart_cfg = state.chart_cfg

        if not rows or not columns:
            chart_cfg.update({"type": "bar", "title": "数据可视化",
                               "categories": [], "series": []})
            return {"ok": True, "chart": chart_cfg}

        # 智能定位数值列（用于 Y 轴/值），非数值列作为标签（X 轴/类别）
        value_col_idx = 0
        label_col_idx = 0
        for i, c in enumerate(columns):
            for r in rows[:3]:
                v = r.get(c)
                if v is not None and isinstance(v, (int, float)) and not isinstance(v, bool):
                    value_col_idx = i
                    break
            if value_col_idx != 0:
                break

        # 标签列选第一个非数值列
        for i, c in enumerate(columns):
            if i == value_col_idx:
                continue
            label_col_idx = i
            break

        label_col = columns[label_col_idx]
        value_col = columns[value_col_idx]

        # 列名中文化映射（SQL 别名可能已包含中文，这里兜底常见英文列名）
        _COL_NAME_MAP = {
            "name": "名称", "city": "城市", "category": "品类", "month": "月份",
            "amount": "金额", "price": "价格", "total_sales": "销售额", "total_spent": "消费总额",
            "order_count": "订单数", "user_count": "用户数", "avg_score": "平均评分",
            "avg_order_value": "客单价", "repeat_rate": "比例", "refund_rate": "比例",
            "stock": "库存", "score": "评分", "sales": "销售额",
        }
        chart_label = _COL_NAME_MAP.get(label_col, label_col)  # 优先映射，否则保留原名
        chart_value = _COL_NAME_MAP.get(value_col, value_col)

        categories = [str(r.get(label_col, "")) for r in rows]
        series_data = []
        for r in rows:
            v = r.get(value_col, 0)
            try:
                series_data.append(float(v) if v is not None else 0)
            except (ValueError, TypeError):
                series_data.append(0)

        # 保持 LLM 已经判定的 type，没有则自动推断
        chart_type = chart_cfg.get("type") or (
            "pie" if len(rows) <= 8 else "bar"
        )

        chart_cfg.update({
            "type": chart_type,
            "title": chart_cfg.get("title", f"{chart_value} 分析"),
            "categories": chart_cfg.get("categories") or categories,
            "series": chart_cfg.get("series") or [
                {"name": chart_value, "data": series_data}
            ],
        })

        # 确保 series.data 用实际数据填充
        for s in chart_cfg.get("series", []):
            if not s.get("data"):
                s["data"] = series_data

        # 饼图专用：前端 ChartPanel 读 pieData
        if chart_type == "pie":
            chart_cfg["pieData"] = [
                {"name": str(c), "value": float(v)}
                for c, v in zip(categories, series_data)
            ]

        return {"ok": True, "chart": chart_cfg}
