"""RAG 检索模块 —— TF-IDF 向量化 + 余弦相似度语义检索（零额外依赖）"""
from __future__ import annotations

import sys
import pickle
from pathlib import Path
from typing import Optional


# ── 模块级状态 ──
_vectorizer: Optional[object] = None   # sklearn TfidfVectorizer
_tfidf_matrix: Optional[object] = None  # 文档 TF-IDF 矩阵
_chunks: list[str] = []                # 文档片段列表
_indexed: bool = False


def _get_cache_path() -> Path:
    """索引缓存路径"""
    base = Path(__file__).resolve().parent.parent.parent
    return base / ".rag_index_cache.pkl"


def _split_markdown(md_text: str) -> list[str]:
    """将 markdown 文档按 ## 标题切片，每段为一个检索单元"""
    chunks: list[str] = []
    current_lines: list[str] = []
    has_title = False

    for line in md_text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("## ") or stripped.startswith("# "):
            if len(current_lines) >= 3:
                text = "\n".join(current_lines).strip()
                if len(text) > 30:
                    chunks.append(text)
            current_lines = [stripped.lstrip("# ")]
            has_title = True
        elif stripped:
            current_lines.append(line)

    # 最后一段
    if len(current_lines) >= 3:
        text = "\n".join(current_lines).strip()
        if len(text) > 30:
            chunks.append(text)

    return chunks


def _build_index():
    """从 knowledge/ 目录构建 TF-IDF 索引"""
    from sklearn.feature_extraction.text import TfidfVectorizer

    global _vectorizer, _tfidf_matrix, _chunks, _indexed

    knowledge_dir = Path(__file__).resolve().parent / "knowledge"
    if not knowledge_dir.exists():
        print("[RAG] 知识库目录不存在，跳过索引")
        return

    all_chunks: list[str] = []
    for md_file in sorted(knowledge_dir.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        chunks = _split_markdown(text)
        all_chunks.extend(chunks)

    if not all_chunks:
        print("[RAG] 无有效知识片段可供索引")
        return

    # 构建 TF-IDF 向量化器（中英文混合分词）
    # char_wb + word 混合：对中文按字切分，对英文按词切分
    _vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(2, 4),  # 2-4 gram 捕获中文词组和英文单词片段
        max_features=2000,
        sublinear_tf=True,   # 1 + log(tf) 抑制高频词
    )
    _tfidf_matrix = _vectorizer.fit_transform(all_chunks)
    _chunks = all_chunks
    _indexed = True

    # 持久化缓存
    try:
        cache = {
            "vectorizer": _vectorizer,
            "matrix": _tfidf_matrix,
            "chunks": _chunks,
        }
        with open(_get_cache_path(), "wb") as f:
            pickle.dump(cache, f)
    except Exception:
        pass

    print(f"[RAG] TF-IDF 索引已构建，共 {len(all_chunks)} 条知识片段")


def _load_cache() -> bool:
    """尝试从缓存加载索引"""
    global _vectorizer, _tfidf_matrix, _chunks, _indexed
    cache_path = _get_cache_path()
    if not cache_path.exists():
        return False
    try:
        with open(cache_path, "rb") as f:
            cache = pickle.load(f)
        _vectorizer = cache["vectorizer"]
        _tfidf_matrix = cache["matrix"]
        _chunks = cache["chunks"]
        _indexed = True
        print(f"[RAG] 从缓存加载索引，共 {len(_chunks)} 条知识片段")
        return True
    except Exception:
        return False


def _ensure_index():
    """确保索引已构建"""
    global _indexed
    if _indexed:
        return
    if not _load_cache():
        _build_index()


def index_knowledge(force_rebuild: bool = False):
    """加载 knowledge/*.md 文档，构建 TF-IDF 向量索引"""
    if force_rebuild:
        cache_path = _get_cache_path()
        try:
            cache_path.unlink()
        except Exception:
            pass
        global _indexed
        _indexed = False
    _ensure_index()


def retrieve(query: str, top_k: int = 3) -> list[str]:
    """根据用户查询检索最相关的知识片段，返回内容文本列表"""
    try:
        from sklearn.metrics.pairwise import cosine_similarity

        _ensure_index()
        if not _chunks:
            return []

        query_vec = _vectorizer.transform([query])
        similarities = cosine_similarity(query_vec, _tfidf_matrix).flatten()

        # 取 top_k
        top_indices = similarities.argsort()[-top_k:][::-1]

        results = []
        for idx in top_indices:
            if similarities[idx] > 0.01:  # 最低相似度阈值
                results.append(_chunks[idx])

        return results
    except Exception as e:
        print(f"[RAG] 检索失败: {e}", file=sys.stderr)
        return []


def retrieve_as_context(query: str, top_k: int = 3) -> str:
    """检索结果拼接为 Prompt 可用的上下文文本"""
    chunks = retrieve(query, top_k)
    if not chunks:
        return ""
    lines = ["\n## 参考知识（从知识库检索的相关内容）"]
    for i, ch in enumerate(chunks, 1):
        lines.append(f"\n知识片段 {i}:\n{ch}")
    return "\n".join(lines)
