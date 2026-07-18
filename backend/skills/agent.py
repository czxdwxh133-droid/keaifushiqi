"""AgentSkill —— ReAct Agent 循环

与旧 BaseSkill（硬编码流水线）的关键区别：
- LLM 自主决定工具调用顺序（而非代码写死 step1→step2→step3）
- 支持多轮迭代：出错时自动重试、换策略
- skill.md 作为 System Prompt 驱动 Agent 行为
- 工具调用结果作为 Observation 返回给 LLM，形成 Think→Act→Observe 闭环

架构对比：
  旧 Pipeline:  execute() { tool1.run(); tool2.run(); tool3.run(); }
  新 ReAct:    while not done: thought = LLM(messages); act = tool.run(); observe → messages
"""
from __future__ import annotations
import json
from typing import Any
from ..tools.base import call_llm_with_tools, call_llm


class AgentSkill:
    """ReAct Agent Skill —— LLM 自主推理 + 工具调用 + 观察迭代

    执行流程：
    1. 加载 skill.md 内容 → System Prompt（定义角色、工作流、规范）
    2. 注入工具 schema（OpenAI function calling 格式）+ 用户问题 + 数据库结构
    3. ReAct 循环（max_iterations 轮）：
       a. LLM 推理当前状态，决定调用哪些工具（或给出最终回答）
       b. 执行工具调用，结果序列化为 Observation
       c. Observation 追加到对话历史，LLM 可据此调整后续策略
    4. 最终由 LLM 综合所有 Observation 给出中文结论
    """

    def __init__(self, name: str, label: str, description: str,
                 system_prompt: str, tools: list, max_iterations: int = 10):
        self.name = name
        self.label = label
        self.description = description
        self.system_prompt = system_prompt
        self.tools = tools                      # list[BaseTool]
        self.max_iterations = max_iterations

    # ── 主入口 ──────────────────────────────

    def execute(self, state):
        """ReAct Agent 主循环入口"""
        state.skill_name = self.name

        tool_schemas = [t.to_function_schema() for t in self.tools]
        tool_map = {t.name: t for t in self.tools}

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": self._build_user_message(state)},
        ]

        state.add_step("agent_start", f"Agent: {self.label}",
                       f"ReAct 循环启动，{len(self.tools)} 个可用工具，最多 {self.max_iterations} 轮",
                       "running", "")

        for i in range(self.max_iterations):
            step_id = f"react_round_{i}"
            state.add_step(step_id, f"推理轮次 {i + 1}/{self.max_iterations}",
                           "LLM 正在推理下一步操作...", "running", "")

            try:
                response = call_llm_with_tools(
                    messages, tool_schemas, temperature=0.1, max_tokens=2048)
            except RuntimeError as e:
                state.error = str(e)
                self._update_step(state, step_id, f"LLM 调用失败: {str(e)[:60]}", "done")
                break

            content = response.get("content") or ""
            tool_calls = response.get("tool_calls")

            if tool_calls:
                # ── Agent 决定调用工具 ──
                messages.append({
                    "role": "assistant",
                    "content": content,
                    "tool_calls": tool_calls,
                })

                if content:
                    state.add_step(f"think_{i}", "Agent 思考", content[:150], "done", "")
                self._update_step(state, step_id,
                                  f"调用 {len(tool_calls)} 个工具", "done")

                for tc in tool_calls:
                    func_name = tc["function"]["name"]
                    try:
                        func_args = json.loads(tc["function"]["arguments"])
                    except json.JSONDecodeError:
                        func_args = {}

                    tool = tool_map.get(func_name)
                    args_preview = json.dumps(func_args, ensure_ascii=False)[:100]

                    tool_step_id = f"tool_{func_name}_{i}"
                    state.add_step(tool_step_id, f"执行工具: {func_name}",
                                   args_preview, "running", func_name)

                    # 执行工具
                    if tool:
                        try:
                            result = tool.run(state, **func_args)
                        except Exception as e:
                            result = {"ok": False, "error": str(e)}
                    else:
                        result = {"ok": False, "error": f"未知工具: {func_name}"}

                    ok = result.get("ok", False)
                    detail = "执行成功" if ok else f"失败: {result.get('error', '?')[:60]}"
                    self._update_step(state, tool_step_id, detail, "done")

                    # Observation → 返回给 LLM（对大结果做截断）
                    obs = self._summarize_result(result)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": json.dumps(obs, ensure_ascii=False),
                    })
            else:
                # ── Agent 给出最终回复（不再调用工具）──
                final_text = (content or "分析完成").strip()
                self._update_step(state, step_id,
                                  f"Agent 完成: {final_text[:100]}", "done")
                # 把最终回复也加入消息历史
                messages.append({"role": "assistant", "content": content or "分析完成"})
                break
        else:
            # ── 达到最大迭代次数，要求 LLM 强制总结 ──
            messages.append({
                "role": "user",
                "content": "已达到最大推理轮次，请基于以上所有工具调用结果，用中文给出最终分析结论。",
            })
            try:
                final_resp = call_llm(messages, temperature=0.3, max_tokens=1024)
                messages.append({"role": "assistant", "content": final_resp})
            except RuntimeError:
                pass

        state.add_step("agent_done", "完成", f"{self.label}执行完毕", "done", "")
        return state

    # ── 辅助方法 ───────────────────────────

    def _build_user_message(self, state) -> str:
        """构建发送给 Agent 的用户消息"""
        parts = [f"用户问题：{state.question}"]
        if state.schema_text:
            schema = state.schema_text[:2000]
            parts.append(f"\n数据库结构：\n{schema}")
        return "\n".join(parts)

    def _summarize_result(self, result: dict) -> dict:
        """对工具返回结果做截断，避免超长数据撑爆 LLM 上下文"""
        r = dict(result)
        # rows 数据截断到前 10 条
        rows = r.get("rows")
        if isinstance(rows, list) and len(rows) > 10:
            r["rows"] = rows[:10]
            r["rows_truncated"] = True
            r["_total_rows"] = len(rows)
        # tables 中 column 截断
        tables = r.get("tables")
        if isinstance(tables, list):
            for t in tables:
                if isinstance(t.get("columns"), list) and len(t["columns"]) > 15:
                    t["columns"] = t["columns"][:15]
        return r

    @staticmethod
    def _update_step(state, step_id: str, detail: str, status: str):
        """更新最后一个匹配 step_id 的状态步骤"""
        for step in reversed(state.steps):
            if step.get("id") == step_id:
                step["detail"] = detail
                step["status"] = status
                return
