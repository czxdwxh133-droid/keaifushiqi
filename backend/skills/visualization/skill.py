"""visualization skill —— ReAct Agent 模式：数据可视化"""
from __future__ import annotations
from pathlib import Path
from ..agent import AgentSkill
from ...tools.sql_generation_tool import SQLGenerationTool
from ...tools.sql_validator_tool import SQLValidatorTool
from ...tools.sql_execute_tool import SQLExecuteTool
from ...tools.chart_tool import ChartTool
from ...tools.schema_tool import SchemaTool

_SKILL_DIR = Path(__file__).parent


def create_skill() -> AgentSkill:
    system_prompt = (_SKILL_DIR / "skill.md").read_text(encoding="utf-8")
    return AgentSkill(
        name="visualization",
        label="可视化 Agent",
        description="图表可视化：查数据 → 生成图表（饼图/柱状图/折线图）。Agent 自动选择最佳图表类型。",
        system_prompt=system_prompt,
        tools=[
            SchemaTool(),
            SQLGenerationTool(),
            SQLValidatorTool(),
            SQLExecuteTool(),
            ChartTool(),
        ],
        max_iterations=10,
    )


VisualizationSkill = create_skill
