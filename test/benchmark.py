"""
DataPilot 自动化批量测试脚本
用法：先启动后端（python main.py），再运行本脚本（python test/benchmark.py）
"""
import json, time, statistics, sys, os
from datetime import datetime
from pathlib import Path

import requests

BASE_URL = "http://localhost:8080"
TIMEOUT = 120  # 单题超时秒数

# 找 questions.json
_THIS = Path(__file__).resolve().parent
QUESTIONS_FILE = _THIS / "questions.json"


def load_questions():
    with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("questions", [])


def ensure_sample_connected():
    """连接示例数据库，返回是否成功"""
    try:
        r = requests.post(f"{BASE_URL}/api/connect/sample", timeout=10)
        d = r.json()
        if d.get("ok"):
            print(f"  [OK] 已连接示例数据库，{len(d.get('tables', []))} 张表")
            return True
        print(f"  [FAIL] 连接失败: {d}")
        return False
    except Exception as e:
        print(f"  [FAIL] 无法访问后端: {e}")
        return False


def check_backend():
    """检查后端是否在线"""
    try:
        r = requests.get(f"{BASE_URL}/api/ping", timeout=5)
        return r.status_code == 200
    except Exception:
        return False


def run_one(q: dict) -> dict:
    """发送一次分析请求，返回结果记录"""
    t0 = time.time()
    record = {
        "id": q["id"],
        "question": q["question"],
        "level": q["level"],
        "type": q.get("type", ""),
        "ok": False,
        "http_status": 0,
        "has_sql": False,
        "has_chart": False,
        "has_report": False,
        "row_count": 0,
        "columns": 0,
        "steps_count": 0,
        "error": "",
        "elapsed_s": 0,
        "sql_preview": "",
    }

    try:
        r = requests.post(
            f"{BASE_URL}/api/analyze",
            json={"question": q["question"]},
            timeout=TIMEOUT,
        )
        dt = round(time.time() - t0, 2)
        record["elapsed_s"] = dt
        record["http_status"] = r.status_code

        d = r.json()
        record["ok"] = d.get("ok", False) and not d.get("error")
        record["error"] = d.get("error", "")
        record["has_sql"] = bool(d.get("sql"))
        record["sql_preview"] = d.get("sql", "")[:80] if d.get("sql") else ""
        record["has_chart"] = bool(d.get("chart")) and bool(d["chart"].get("type"))
        record["has_report"] = bool(d.get("report")) and bool(d["report"].get("summary"))
        result = d.get("result", {})
        record["row_count"] = result.get("rowCount", 0)
        record["columns"] = len(result.get("columns", []))
        record["steps_count"] = len(d.get("steps", []))
    except requests.exceptions.Timeout:
        record["error"] = f"请求超时 (>{TIMEOUT}s)"
        record["elapsed_s"] = round(time.time() - t0, 2)
    except requests.exceptions.ConnectionError:
        record["error"] = "无法连接后端（请先启动 python main.py）"
    except Exception as e:
        record["error"] = f"{type(e).__name__}: {str(e)[:100]}"
        record["elapsed_s"] = round(time.time() - t0, 2)

    return record


def print_separator(ch: str = "─", width: int = 72):
    print(ch * width)


def main():
    print("\n" + "=" * 72)
    print("  DataPilot 批量测试 —— 真实测试值采集")
    print("=" * 72)

    # 0. 检查后端
    print("\n[0/3] 检查后端状态...")
    if not check_backend():
        print("  [ERROR] 后端未启动，请先运行: python main.py")
        sys.exit(1)
    print("  [OK] 后端在线")

    # 1. 连接示例库
    print("\n[1/3] 连接示例数据库...")
    if not ensure_sample_connected():
        print("  [ERROR] 无法连接示例数据库，退出")
        sys.exit(1)

    # 2. 加载问题
    print("\n[2/3] 加载测试问题集...")
    questions = load_questions()
    if not questions:
        print("  [ERROR] 测试问题集为空")
        sys.exit(1)
    print(f"  [OK] 共 {len(questions)} 题 "
          f"(easy:{sum(1 for q in questions if q['level']=='easy')}, "
          f"medium:{sum(1 for q in questions if q['level']=='medium')}, "
          f"hard:{sum(1 for q in questions if q['level']=='hard')})")

    # 3. 批量跑
    print(f"\n[3/3] 开始批量测试（预计 {len(questions) * 15}s ~ {len(questions) * 25}s）...\n")
    results = []
    total = len(questions)
    for i, q in enumerate(questions, 1):
        print(f"  [{i}/{total}] {q['id']} [{q['level']:6s}] {q['question'][:48]}...", end=" ", flush=True)
        rec = run_one(q)
        results.append(rec)

        if rec["ok"]:
            print(f"OK  {rec['elapsed_s']:5.1f}s  rows:{rec['row_count']}  "
                  f"chart:{'Y' if rec['has_chart'] else 'N'}  "
                  f"report:{'Y' if rec['has_report'] else 'N'}")
        else:
            print(f"FAIL  {rec['elapsed_s']:5.1f}s  err:{rec['error'][:50]}")

    # ── 汇总 ──────────────────────────────────
    print("\n")
    print_separator("=")
    print("  测试汇总报告")
    print(f"  时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print_separator("=")
    print()

    total_tests = len(results)
    success = sum(1 for r in results if r["ok"])
    sql_gen = sum(1 for r in results if r["has_sql"])
    chart_gen = sum(1 for r in results if r["has_chart"])
    report_gen = sum(1 for r in results if r["has_report"])

    print(f"  总题数:       {total_tests}")
    print(f"  成功数:       {success}")
    print(f"  端到端成功率: {success / total_tests * 100:.1f}%")
    print(f"  SQL 生成率:   {sql_gen / total_tests * 100:.1f}%  ({sql_gen}/{total_tests})")
    print(f"  图表生成率:   {chart_gen / total_tests * 100:.1f}%  ({chart_gen}/{total_tests})")
    print(f"  报告生成率:   {report_gen / total_tests * 100:.1f}%  ({report_gen}/{total_tests})")
    print()

    ok_times = [r["elapsed_s"] for r in results if r["ok"]]
    if ok_times:
        ok_times_sorted = sorted(ok_times)
        p50_idx = int(len(ok_times_sorted) * 0.5)
        p90_idx = int(len(ok_times_sorted) * 0.9)
        print(f"  平均耗时:     {statistics.mean(ok_times):.2f}s")
        print(f"  中位数耗时:   {ok_times_sorted[p50_idx]:.2f}s")
        print(f"  P90 耗时:     {ok_times_sorted[p90_idx]:.2f}s")
        print(f"  最快/最慢:    {ok_times_sorted[0]:.2f}s / {ok_times_sorted[-1]:.2f}s")

    all_times = [r["elapsed_s"] for r in results]
    total_time = sum(all_times)
    print(f"  总测试耗时:   {total_time:.0f}s")
    print()

    # 按难度分组
    for lv in ["easy", "medium", "hard"]:
        group = [r for r in results if r["level"] == lv]
        if not group:
            continue
        s = sum(1 for r in group if r["ok"])
        avg_t = statistics.mean([r["elapsed_s"] for r in group]) if group else 0
        print(f"  [{lv:6s}]  成功:{s}/{len(group)}  "
              f"成功率:{s / len(group) * 100:.0f}%  平均耗时:{avg_t:.1f}s")

    print()

    # 详细失败列表
    failed = [r for r in results if not r["ok"]]
    if failed:
        print_separator("-")
        print(f"  失败详情 ({len(failed)} 题)")
        print_separator("-")
        for f in failed:
            print(f"    [{f['id']}] {f['question'][:40]}...")
            print(f"            {f['error'][:100]}")
        print()

    # 保存结果
    out_path = _THIS / f"results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"ran_at": datetime.now().isoformat(),
                   "summary": {"total": total_tests, "success": success,
                                "success_rate": f"{success/total_tests*100:.1f}%"},
                   "results": results},
                  f, ensure_ascii=False, indent=2)
    print(f"  详细结果已保存至: {out_path}")
    print_separator("=")


if __name__ == "__main__":
    main()
