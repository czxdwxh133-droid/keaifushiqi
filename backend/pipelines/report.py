"""report pipeline —— 商业报告：查询 + 分析 + 图表 + 报告"""
from .base import BasePipeline


class ReportPipeline(BasePipeline):
    name = "report"
    label = "商业报告"
    description = "完整商业分析报告：查数据 → 算指标 → 画图表 → 写报告 → 提建议"

    def execute(self, state):
        state.skill_name = "report"
        self._step(state, "start", "商业报告", "开始完整分析流程...", "running", "")

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
                         "分析完成" if ok else f"注意: {r.get('error', '?')[:40]}",
                         "done")
        except Exception as e:
            self._update(state, "analyze", f"注意: {str(e)[:60]}", "done")
            # 分析失败不阻断后续步骤

        # Step 5: 生成图表
        from ..tools.chart_tool import ChartTool
        self._step(state, "chart", "图表生成", "根据数据生成可视化图表...",
                   "running", "create_chart")
        try:
            ChartTool().run(state)
            title = state.chart_cfg.get("title", "图表已生成") if state.chart_cfg else "图表已生成"
            self._update(state, "chart", title, "done")
        except Exception as e:
            self._update(state, "chart", f"注意: {str(e)[:60]}", "done")

        # Step 6: 生成报告
        from ..tools.report_tool import ReportTool
        self._step(state, "report", "报告生成", "基于分析结果撰写业务报告...",
                   "running", "generate_report")
        try:
            r = ReportTool().run(state)
            ok = r.get("ok", False)
            if ok and state.report_cfg:
                summary = state.report_cfg.get("summary", "报告已生成")[:80]
                self._update(state, "report", summary, "done")
            else:
                self._update(state, "report", "报告生成完成", "done")
        except Exception as e:
            self._update(state, "report", f"注意: {str(e)[:60]}", "done")

        self._step(state, "done", "完成", "商业报告分析完成", "done", "")
        return state
