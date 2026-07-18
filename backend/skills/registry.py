"""Skill Registry —— 自动发现并加载 skills/ 子目录下的 Agent Skill

每个 skill 子目录标准结构：
    skill_name/
    ├── skill.md          # System Prompt（定义 Agent 角色、工作流、规则）
    ├── references/
    │   └── examples.json # 输入输出参考示例
    └── skill.py          # 导出 create_skill() → AgentSkill 工厂函数

Registry 负责：
1. 扫描子目录，解析 skill.md 获取元数据
2. 加载 examples.json
3. 调用 skill.py 的 create_skill() 工厂函数创建 AgentSkill
4. 提供统一查询接口
"""
from __future__ import annotations
import importlib
import json
import re
from pathlib import Path
from typing import Any

from .agent import AgentSkill

_SKILLS_DIR = Path(__file__).resolve().parent


class SkillMeta:
    """从 skill.md 解析出的技能元数据"""
    def __init__(self, skill_id: str, dir_path: Path):
        self.skill_id = skill_id
        self.dir_path = dir_path
        self.name = skill_id
        self.label = ""
        self.category = ""
        self.description = ""
        self.complexity = "medium"
        self.version = "1.0.0"
        self.workflow: list[str] = []
        self.tools: list[str] = []
        self.triggers: str = ""
        self.cross_references: dict[str, str] = {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.skill_id,
            "label": self.label,
            "category": self.category,
            "description": self.description,
            "complexity": self.complexity,
            "version": self.version,
            "workflow": self.workflow,
            "tools": self.tools,
            "triggers": self.triggers,
            "cross_references": self.cross_references,
        }


def _parse_skill_md(md_path: Path) -> SkillMeta:
    """解析 skill.md 获取元数据（兼容 System Prompt 格式）"""
    skill_id = md_path.parent.name
    meta = SkillMeta(skill_id, md_path.parent)

    if not md_path.exists():
        return meta

    text = md_path.read_text(encoding="utf-8")

    # 解析标题作为 label
    m = re.search(r"^#\s+(.+)", text, re.MULTILINE)
    if m:
        raw = m.group(1).strip()
        # 去掉 "System Prompt:" 前缀
        meta.label = re.sub(r"^System\s*Prompt:\s*", "", raw).strip()

    # 解析 Description / 角色定位
    m = re.search(
        r"(?:##\s*Description|##\s*角色定位)\s*\n+(.+?)(?=\n##|\Z)",
        text, re.DOTALL)
    if m:
        meta.description = m.group(1).strip()

    # 解析 Triggers（兼容旧格式的 ## Triggers）
    m = re.search(r"## Triggers\s*\n+(.+?)(?=\n##|\Z)", text, re.DOTALL)
    if m:
        meta.triggers = m.group(1).strip()

    # 解析 Workflow
    m = re.search(r"##\s*工作流程.*?\n+(.+?)(?=\n##|\Z)", text, re.DOTALL)
    if m:
        for line in m.group(1).strip().split("\n"):
            line = line.strip()
            if re.match(r"^\d+\.", line):
                meta.workflow.append(line)

    # 解析 Tools 表格
    m = re.search(r"##\s*(?:工具速查|Tools)\s*\n.*?\n((?:\|.+\|\s*\n)+)", text, re.DOTALL)
    if m:
        for line in m.group(1).strip().split("\n"):
            if "`" in line:
                tool_name = re.search(r"`(\w+)`", line)
                if tool_name:
                    name = tool_name.group(1)
                    if name not in ("工具", "用途", "何时用", "作用"):
                        meta.tools.append(name)

    # 解析 Cross-reference（兼容旧格式）
    m = re.search(r"## Cross-reference\s*\n+(.+?)(?=\n#|\Z)", text, re.DOTALL)
    if m:
        for line in m.group(1).strip().split("\n"):
            if "→" in line and "`" in line:
                refs = re.findall(r"`(\w+)`", line)
                if len(refs) >= 2:
                    meta.cross_references[refs[0]] = refs[1]

    return meta


def _load_examples(skill_dir: Path) -> list[dict[str, Any]]:
    """加载 references/examples.json"""
    examples_path = skill_dir / "references" / "examples.json"
    if not examples_path.exists():
        return []
    try:
        return json.loads(examples_path.read_text(encoding="utf-8"))
    except Exception:
        return []


def _discover_skills() -> list[tuple[SkillMeta, AgentSkill]]:
    """扫描子目录，调用 create_skill() 工厂创建 AgentSkill"""
    skills: list[tuple[SkillMeta, AgentSkill]] = []

    for entry in sorted(_SKILLS_DIR.iterdir()):
        if not entry.is_dir():
            continue
        skill_py = entry / "skill.py"
        skill_md = entry / "skill.md"
        if not skill_py.exists():
            continue

        skill_id = entry.name

        # 1. 解析元数据
        meta = _parse_skill_md(skill_md)

        # 2. 加载示例
        examples = _load_examples(entry)

        # 3. 调用 create_skill() 工厂
        try:
            mod = importlib.import_module(f"backend.skills.{skill_id}.skill")
            factory = getattr(mod, "create_skill", None)
            if factory is None:
                # 向后兼容：尝试旧类名模式
                class_name = f"{skill_id.capitalize()}Skill"
                cls = getattr(mod, class_name, None)
                if cls:
                    factory = cls  # 旧模式：类本身就是工厂
            if factory is None:
                raise AttributeError(f"未找到 create_skill() 或 {skill_id.capitalize()}Skill")

            instance: AgentSkill = factory()
            instance.meta = meta          # type: ignore
            instance.examples = examples  # type: ignore
            skills.append((meta, instance))
            print(f"[Registry] 已加载 Agent: {skill_id} ({meta.label}, {len(examples)} 示例, "
                  f"max_iter={instance.max_iterations})")
        except Exception as e:
            print(f"[Registry] 加载 Skill '{skill_id}' 失败: {e}")
            import traceback
            traceback.print_exc()

    return skills


# ── 模块级单例 ──
_registry: dict[str, tuple[SkillMeta, AgentSkill]] = {}
_initialized = False


def init_registry():
    """初始化技能注册表"""
    global _registry, _initialized
    if _initialized:
        return
    discovered = _discover_skills()
    for meta, instance in discovered:
        _registry[meta.skill_id] = (meta, instance)
    _initialized = True
    print(f"[Registry] 初始化完成，共 {len(_registry)} 个 Agent Skill")


def get_skill(skill_id: str) -> AgentSkill | None:
    """按 ID 获取 Skill 实例"""
    init_registry()
    entry = _registry.get(skill_id)
    return entry[1] if entry else None


def get_meta(skill_id: str) -> SkillMeta | None:
    """按 ID 获取 Skill 元数据"""
    init_registry()
    entry = _registry.get(skill_id)
    return entry[0] if entry else None


def get_all_skills() -> list[AgentSkill]:
    """获取所有 Skill 实例"""
    init_registry()
    return [inst for _, inst in _registry.values()]


def get_all_meta() -> list[dict[str, Any]]:
    """获取所有 Skill 元数据"""
    init_registry()
    return [meta.to_dict() for meta, _ in _registry.values()]


def get_skill_registry() -> dict[str, AgentSkill]:
    """获取 {name: instance} 映射，供 SkillRouter 使用"""
    init_registry()
    return {meta.skill_id: inst for meta, inst in _registry.values()}
