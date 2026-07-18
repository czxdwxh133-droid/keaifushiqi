"""report skill —— ReAct Agent 模式：商业报告"""
from __future__ import annotations
from pathlib import Path
from ..agent import AgentSkill
from ...tools.sql_generation_tool import SQLGenerationTool
from ...tools.sql_validator_tool import SQLValidatorTool
from ...tools.sql_execute_tool import SQLExecuteTool
from ...tools.data_analysis_tool import DataAnalysisTool
from ...tools.chart_tool import ChartTool
from ...tools.report_tool import ReportTool
from ...tools.schema_tool import SchemaTool

_SKILL_DIR = Path(__file__).parent


def create_skill() -> AgentSkill:
    system_prompt = (_SKILL_DIR / "skill.md").read_text(encoding="utf-8")
    return AgentSkill(
        name="report",
        label="商业报告 Agent",
        description="完整商业分析报告：查数据 → 算指标 → 画图表 → 写报告 → 提建议。最完整的 Agent。",
        system_prompt=system_prompt,
        tools=[
            SchemaTool(),
            SQLGenerationTool(),
            SQLValidatorTool(),
            SQLExecuteTool(),
            DataAnalysisTool(),
            ChartTool(),
            ReportTool(),
        ],
        max_iterations=15,
    )


ReportSkill = create_skill
