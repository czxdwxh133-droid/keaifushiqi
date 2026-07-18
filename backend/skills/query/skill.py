"""query skill —— ReAct Agent 模式：数据查询"""
from __future__ import annotations
from pathlib import Path
from ..agent import AgentSkill
from ...tools.sql_generation_tool import SQLGenerationTool
from ...tools.sql_validator_tool import SQLValidatorTool
from ...tools.sql_execute_tool import SQLExecuteTool
from ...tools.schema_tool import SchemaTool

_SKILL_DIR = Path(__file__).parent


def create_skill() -> AgentSkill:
    system_prompt = (_SKILL_DIR / "skill.md").read_text(encoding="utf-8")
    return AgentSkill(
        name="query",
        label="数据查询 Agent",
        description="简单数据查询/检索：查总数、查列表、查具体值。Agent 自主生成 SQL → 校验 → 执行。",
        system_prompt=system_prompt,
        tools=[
            SchemaTool(),
            SQLGenerationTool(),
            SQLValidatorTool(),
            SQLExecuteTool(),
        ],
        max_iterations=8,
    )


# 向后兼容：模块级可实例化
QuerySkill = create_skill
