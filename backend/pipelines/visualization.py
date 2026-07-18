"""visualization pipeline —— 可视化：查询 + 图表生成"""
from .base import BasePipeline


class VisualizationPipeline(BasePipeline):
    name = "visualization"
    label = "数据可视化"
    description = "图表生成：查询数据 + 生成 ECharts 可视化配置"

    def execute(self, state):
        state.skill_name = "visualization"
        self._step(state, "start", "数据可视化", "开始查询并生成图表...", "running", "")

        # Step 1-3: SQL 查询链路
        ok = self._run_query_chain(state)
        if not ok:
            self._step(state, "done", "完成", state.error or "查询失败", "error", "")
            return state

        # Step 4: 生成图表
        from ..tools.chart_tool import ChartTool
        self._step(state, "chart", "图表生成", "根据数据生成可视化图表...",
                   "running", "create_chart")
        try:
            r = ChartTool().run(state)
            ok = r.get("ok", False)
            if ok and state.chart_cfg:
                self._update(state, "chart",
                             state.chart_cfg.get("title", "图表已生成"), "done")
            else:
                self._update(state, "chart",
                             f"图表生成失败: {r.get('error', '?')[:60]}", "error")
        except Exception as e:
            self._update(state, "chart", f"异常: {str(e)[:60]}", "error")

        self._step(state, "done", "完成", "可视化完成", "done", "")
        return state
