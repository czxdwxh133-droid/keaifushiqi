"""query pipeline —— 数据查询：查数、查列表、查具体值"""
from .base import BasePipeline


class QueryPipeline(BasePipeline):
    name = "query"
    label = "数据查询"
    description = "简单数据查询/检索：查总数、查列表、查具体值"

    def execute(self, state):
        state.skill_name = "query"
        self._step(state, "start", "数据查询", "开始查询数据...", "running", "")
        ok = self._run_query_chain(state)
        self._step(state, "done", "完成", "查询完成" if ok else state.error or "未知错误",
                   "done" if ok else "error", "")
        return state
