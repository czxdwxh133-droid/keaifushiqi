"""analysis pipeline —— 数据分析：统计分析、趋势对比、分布占比"""
from .base import BasePipeline


class AnalysisPipeline(BasePipeline):
    name = "analysis"
    label = "数据分析"
    description = "统计分析/趋势对比/分布占比：查询 + 指标计算"

    def execute(self, state):
        state.skill_name = "analysis"
        self._step(state, "start", "数据分析", "开始查询并分析数据...", "running", "")

        # Step 1-3: SQL 查询链路
        ok = self._run_query_chain(state)
        if not ok:
            self._step(state, "done", "完成", state.error or "查询失败", "error", "")
            return state

        # Step 4: 统计分析
        from ..tools.data_analysis_tool import DataAnalysisTool
        self._step(state, "analyze", "指标计算", "计算统计指标...",
                   "running", "analyze_data")
        try:
            r = DataAnalysisTool().run(state)
            ok = r.get("ok", False)
            self._update(state, "analyze",
                         "分析完成" if ok else f"分析失败: {r.get('error', '?')[:60]}",
                         "done" if ok else "error")
        except Exception as e:
            self._update(state, "analyze", f"异常: {str(e)[:60]}", "error")

        self._step(state, "done", "完成", "数据分析完成", "done", "")
        return state
