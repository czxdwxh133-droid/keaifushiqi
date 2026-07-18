"""Skill 基类 —— 导出 AgentSkill（ReAct Agent 模式）

旧 BaseSkill（硬编码流水线）已被 AgentSkill 替代。
AgentSkill 通过 ReAct 循环让 LLM 自主决定工具调用顺序。
"""
from .agent import AgentSkill

# 向后兼容别名
BaseSkill = AgentSkill
