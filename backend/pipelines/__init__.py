"""Pipeline 架构 —— 固定流水线执行层

Tool 由代码按序调用，非 LLM 自主决策。
相比 ReAct Agent：更快、更省、更稳、更适合确定性 SQL 场景。
"""
from .base import BasePipeline
from .query import QueryPipeline
from .analysis import AnalysisPipeline
from .visualization import VisualizationPipeline
from .report import ReportPipeline

ALL_PIPELINES: dict[str, BasePipeline] = {
    "query": QueryPipeline(),
    "analysis": AnalysisPipeline(),
    "visualization": VisualizationPipeline(),
    "report": ReportPipeline(),
}
