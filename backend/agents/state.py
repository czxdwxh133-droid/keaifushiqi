"""AgentState —— Skill Router Agent 共享状态"""
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class AgentState:
    """Skill-based Agent 状态"""

    question: str = ""
    skill_name: str = ""                           # 当前使用的技能名称
    plan: list[dict[str, Any]] = field(default_factory=list)
    current_task_index: int = 0
    current_tool: str = ""
    sql: str = ""
    sql_valid: bool = False
    columns: list[str] = field(default_factory=list)
    rows: list[dict[str, Any]] = field(default_factory=list)
    chart_cfg: dict[str, Any] = field(default_factory=dict)
    report_cfg: dict[str, Any] = field(default_factory=dict)
    steps: list[dict[str, Any]] = field(default_factory=list)
    logs: list[dict[str, Any]] = field(default_factory=list)
    intent: str = ""
    error: Optional[str] = None
    schema_text: str = ""
    tables: list[dict[str, Any]] = field(default_factory=list)

    def add_step(self, step_id: str, title: str, detail: str,
                  status: str = "running", tool: str = ""):
        self.steps.append({
            "id": step_id, "title": title, "detail": detail,
            "status": status, "tool": tool,
        })

    def add_log(self, log_type: str, content: str):
        self.logs.append({"type": log_type, "content": content})

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.error is None,
            "question": self.question,
            "skill_name": self.skill_name,
            "plan": self.plan,
            "sql": self.sql,
            "result": {"columns": self.columns, "rows": self.rows,
                        "rowCount": len(self.rows)},
            "chart": self.chart_cfg,
            "report": self.report_cfg,
            "steps": self.steps,
            "logs": self.logs,
            "intent": self.intent,
            "error": self.error,
        }
