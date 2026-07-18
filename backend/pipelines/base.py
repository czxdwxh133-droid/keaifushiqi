"""BasePipeline —— 固定流水线基类

每个 Pipeline 定义一条确定性的工具执行链。
步骤由代码写死（非 LLM 决策），保证稳定、快速、可调试。
"""
from __future__ import annotations
from typing import Any


class BasePipeline:
    name: str = ""
    label: str = ""
    description: str = ""

    def execute(self, state: Any) -> Any:
        """执行流水线，返回更新后的 state"""
        raise NotImplementedError

    # ── 共用的步骤记录 ──

    def _step(self, state, step_id: str, title: str, detail: str,
              status: str = "running", tool: str = ""):
        state.add_step(step_id, title, detail, status, tool)

    @staticmethod
    def _update(state, step_id: str, detail: str, status: str = "done"):
        for s in reversed(state.steps):
            if s.get("id") == step_id:
                s["detail"] = detail
                s["status"] = status
                return

    # ── 共用执行逻辑：SQL 查询链路 ──

    def _run_query_chain(self, state) -> bool:
        """执行 SQL 查询链路：生成 → 校验 → 执行。返回 True 表示成功"""
        from ..tools.sql_generation_tool import SQLGenerationTool
        from ..tools.sql_validator_tool import SQLValidatorTool
        from ..tools.sql_execute_tool import SQLExecuteTool

        gen = SQLGenerationTool()
        val = SQLValidatorTool()
        exe = SQLExecuteTool()

        # Step 1: 生成 SQL
        self._step(state, "gen_sql", "生成 SQL", "根据问题自动生成查询语句...",
                   "running", "generate_sql")
        try:
            r = gen.run(state, task=state.question)
            if not r.get("ok"):
                state.error = r.get("error", "SQL 生成失败")
                self._update(state, "gen_sql", f"失败: {state.error[:60]}", "done")
                return False
        except Exception as e:
            state.error = str(e)
            self._update(state, "gen_sql", f"异常: {str(e)[:60]}", "done")
            return False
        self._update(state, "gen_sql", f"SQL: {state.sql[:100]}", "done")

        # Step 2: 校验 SQL（失败则重试一次）
        self._step(state, "validate", "安全校验", "检查 SQL 安全性...",
                   "running", "validate_sql")
        vr = val.run(state)
        if not vr.get("ok"):
            # 重试：把错误信息带给 LLM 重新生成
            self._step(state, "retry_sql", "重试 SQL",
                       f"校验失败，重新生成...", "running", "generate_sql")
            try:
                retry = gen.run(state,
                    task=f"{state.question}（上次SQL校验失败：{vr.get('error')}）")
                if not retry.get("ok"):
                    state.error = retry.get("error", "SQL 重新生成失败")
                    self._update(state, "retry_sql", f"失败", "done")
                    return False
                vr = val.run(state)
                if not vr.get("ok"):
                    state.error = vr.get("error", "重试后校验仍失败")
                    self._update(state, "retry_sql", f"校验仍失败", "done")
                    return False
                self._update(state, "retry_sql", "重新生成并校验通过", "done")
            except Exception as e:
                state.error = str(e)
                self._update(state, "retry_sql", f"异常: {str(e)[:60]}", "done")
                return False
        self._update(state, "validate", "校验通过", "done")

        # Step 3: 执行 SQL
        self._step(state, "execute", "执行查询", "执行 SQL 并获取结果...",
                   "running", "execute_sql")
        er = exe.run(state)
        if not er.get("ok"):
            state.error = er.get("error", "查询执行失败")
            self._update(state, "execute", f"失败: {state.error[:60]}", "done")
            return False
        row_count = er.get("rowCount", 0)
        self._update(state, "execute", f"返回 {row_count} 条数据", "done")
        return True
