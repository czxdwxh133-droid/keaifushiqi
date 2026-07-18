"""analysis skill —— ReAct Agent 模式：数据分析"""
from __future__ import annotations
from pathlib import Path
from ..agent import AgentSkill
from ...tools.sql_generation_tool import SQLGenerationTool
from ...tools.sql_validator_tool import SQLValidatorTool
from ...tools.sql_execute_tool import SQLExecuteTool
from ...tools.data_analysis_tool import DataAnalysisTool
from ...tools.schema_tool import SchemaTool

_SKILL_DIR = Path(__file__).parent


def create_skill() -> AgentSkill:
    system_prompt = (_SKILL_DIR / "skill.md").read_text(encoding="utf-8")
    return AgentSkill(
        name="analysis",
        label="数据分析 Agent",
        description="统计分析/趋势分析/对比分析：查数据 → 算指标 → 出结论。Agent 自主完成全流程。",
        system_prompt=system_prompt,
        tools=[
            SchemaTool(),
            SQLGenerationTool(),
            SQLValidatorTool(),
            SQLExecuteTool(),
            DataAnalysisTool(),
        ],
        max_iterations=10,
    )


AnalysisSkill = create_skill
