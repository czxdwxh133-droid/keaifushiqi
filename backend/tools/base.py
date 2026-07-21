"""Tool 基类 + LLM 调用辅助（支持 Function Calling）"""
from __future__ import annotations
import json, os, sys, urllib.request, urllib.error
from abc import ABC, abstractmethod
from typing import Any

# ── LLM 配置 ──────────────────────────
_llm_config: dict[str, Any] = {
    "apiKey": os.getenv("LLM_API_KEY", ""),
    "baseUrl": os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1"),
    "model": os.getenv("LLM_MODEL", "deepseek-chat"),
}

# ── 代理配置 ──
# 只有显式设置了 LLM_PROXY 环境变量才走代理，屏蔽 Windows 系统代理干扰
_http_proxy = os.getenv("LLM_PROXY") or None
def _build_opener():
    if _http_proxy:
        proxy_handler = urllib.request.ProxyHandler({"https": _http_proxy, "http": _http_proxy})
        return urllib.request.build_opener(proxy_handler)
    # 不传 handlers 会用系统默认（包括 Windows IE 代理设置），
    # 这里显式传入空代理，强制直连
    return urllib.request.build_opener(urllib.request.ProxyHandler({}))
_opener = _build_opener()


def get_llm_config() -> dict[str, Any]:
    return dict(_llm_config)


def update_llm_config(apiKey: str = "", baseUrl: str = "", model: str = ""):
    if apiKey:
        _llm_config["apiKey"] = apiKey
    if baseUrl:
        _llm_config["baseUrl"] = baseUrl
    if model:
        _llm_config["model"] = model


def _llm_request(body_dict: dict, timeout: int = 60) -> dict:
    """底层 HTTP 请求"""
    api_key = _llm_config["apiKey"] or ""
    base_url = (_llm_config["baseUrl"] or "https://api.deepseek.com/v1").rstrip("/")

    body = json.dumps(body_dict, ensure_ascii=False).encode("utf-8")
    url = f"{base_url}/chat/completions"

    req = urllib.request.Request(url, data=body)
    req.add_header("Content-Type", "application/json; charset=utf-8")
    req.add_header("Authorization", f"Bearer {api_key}")

    try:
        with _opener.open(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"LLM 调用失败 [{e.code}]: {error_body[:300]}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"LLM 网络连接失败: {e.reason}")
    except json.JSONDecodeError as e:
        raise RuntimeError(f"LLM 响应解析失败: {str(e)}")


def call_llm(messages: list[dict], temperature: float = 0.1,
              max_tokens: int = 2048) -> str:
    """调用 OpenAI 兼容 LLM API（纯文本，无 function calling）"""
    model = _llm_config["model"] or "deepseek-chat"
    body_dict = {
        "model": model, "messages": messages,
        "temperature": temperature, "max_tokens": max_tokens,
    }
    data = _llm_request(body_dict, timeout=25)
    return data["choices"][0]["message"]["content"]


def call_llm_with_tools(messages: list[dict],
                         tools: list[dict] | None = None,
                         temperature: float = 0.1,
                         max_tokens: int = 2048) -> dict[str, Any]:
    """调用 LLM，支持 Function Calling。

    返回 dict: {"content": str|None, "tool_calls": list|None}

    content  - LLM 的文本回复（可能为 None 或空）
    tool_calls - 工具调用列表，每项 {"id": str, "type": "function",
                "function": {"name": str, "arguments": str(JSON)}}
    """
    model = _llm_config["model"] or "deepseek-chat"
    body_dict = {
        "model": model, "messages": messages,
        "temperature": temperature, "max_tokens": max_tokens,
    }
    if tools:
        body_dict["tools"] = tools

    data = _llm_request(body_dict, timeout=60)
    msg = data["choices"][0]["message"]
    return {
        "content": msg.get("content"),
        "tool_calls": msg.get("tool_calls"),
    }


class BaseTool(ABC):
    """工具基类。
    
    子类需定义：
    - name: str         工具唯一标识（也是 function calling 的函数名）
    - description: str  工具描述（LLM 根据此决定何时调用）
    - parameters_schema: dict (可选) OpenAI function parameters JSON Schema
    """
    name: str
    description: str
    parameters_schema: dict[str, Any] = {
        "type": "object", "properties": {}, "required": [],
    }

    @abstractmethod
    def run(self, state: Any, **kwargs) -> dict[str, Any]:
        """执行工具，返回结果字典。state 为 AgentState 实例，kwargs 来自 LLM"""
        ...

    def to_function_schema(self) -> dict[str, Any]:
        """生成 OpenAI function calling 工具定义"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters_schema,
            },
        }
