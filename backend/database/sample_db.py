"""示例数据库 —— 电商销售场景（users/products/orders/reviews）"""
from __future__ import annotations
import sqlite3, random, sys, os
from datetime import datetime, timedelta
from pathlib import Path


def _base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent.parent  # 回到项目根目录


SAMPLE_DB_PATH = _base_dir() / "sample_data.db"


def _safe_delete(path: Path):
    """删除旧示例数据库（兼容升级时 schema 变更）"""
    try:
        path.unlink()
    except Exception:
        pass


def ensure_sample_db() -> None:
    # 判断是否已经存在新 schema 的数据库
    if SAMPLE_DB_PATH.exists():
        try:
            conn = sqlite3.connect(SAMPLE_DB_PATH)
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            tables = [r[0] for r in cur.fetchall()]
            conn.close()
            # 新 schema 包含 reviews 表，旧的不含
            if "reviews" in tables:
                return
            # schema 不匹配，删除重建
            _safe_delete(SAMPLE_DB_PATH)
        except Exception:
            _safe_delete(SAMPLE_DB_PATH)

    conn = sqlite3.connect(SAMPLE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # ── 建表 ──────────────────────────
    cur.executescript(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            gender TEXT NOT NULL,
            city TEXT NOT NULL,
            register_time TEXT NOT NULL
        );

        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL
        );

        CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            quantity INTEGER NOT NULL,
            create_time TEXT NOT NULL,
            status TEXT NOT NULL
        );

        CREATE TABLE reviews (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            content TEXT NOT NULL
        );
        """
    )

    # ── 商品 ──────────────────────────
    product_specs = [
        ("凉鞋", "鞋类", 299, 150), ("运动鞋", "鞋类", 599, 200),
        ("商务皮鞋", "鞋类", 899, 80), ("帆布鞋", "鞋类", 199, 300),
        ("手机", "数码", 3999, 50), ("耳机", "数码", 399, 200),
        ("平板电脑", "数码", 2999, 40), ("智能手表", "数码", 1499, 60),
        ("T恤", "服装", 99, 500), ("牛仔裤", "服装", 299, 300),
        ("连衣裙", "服装", 399, 200), ("羽绒服", "服装", 899, 100),
        ("洗发水", "个护", 79, 400), ("沐浴露", "个护", 59, 350),
        ("面霜", "个护", 199, 150), ("口红", "个护", 169, 250),
        ("薯片", "食品", 9, 1000), ("坚果", "食品", 39, 600),
        ("牛奶", "食品", 69, 300), ("巧克力", "食品", 29, 800),
    ]
    for pid, (name, cat, price, stock) in enumerate(product_specs, 1):
        cur.execute("INSERT INTO products VALUES (?,?,?,?,?)",
                     (pid, name, cat, price, stock))

    # ── 用户 ──────────────────────────
    cities = ["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "西安", "南京", "重庆"]
    surnames = ["李", "王", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴"]
    given_names = ["伟", "芳", "娜", "敏", "静", "丽", "强", "磊", "洋", "勇"]
    genders = ["男", "女"]
    for uid in range(1, 201):
        name = random.choice(surnames) + random.choice(given_names)
        gender = random.choice(genders)
        city = random.choice(cities)
        reg = (datetime(2023, 1, 1) + timedelta(days=random.randint(0, 730))).strftime("%Y-%m-%d")
        cur.execute("INSERT INTO users VALUES (?,?,?,?,?)",
                     (uid, name, gender, city, reg))

    # ── 订单 ──────────────────────────
    statuses = ["已完成", "已完成", "已完成", "已完成", "已取消", "待发货", "已退款"]
    oid = 1
    start = datetime(2024, 1, 1)
    for _ in range(800):
        uid = random.randint(1, 200)
        pid = random.randint(1, len(product_specs))
        qty = random.randint(1, 3)
        cur.execute("SELECT price FROM products WHERE id=?", (pid,))
        price = float(cur.fetchone()["price"])
        amount = round(price * qty * random.uniform(0.85, 1.0), 2)
        ctime = (start + timedelta(days=random.randint(0, 365),
                                    hours=random.randint(0, 23))).strftime("%Y-%m-%d %H:%M:%S")
        status = random.choices(statuses, weights=[60, 10, 0, 0, 10, 10, 5])[0]
        cur.execute("INSERT INTO orders VALUES (?,?,?,?,?,?,?)",
                     (oid, uid, pid, amount, qty, ctime, status))
        oid += 1

    # ── 评论 ──────────────────────────
    review_texts = [
        "质量很好，推荐购买", "性价比不错", "物流很快", "包装精美",
        "一般般，凑合能用", "不太满意，有点失望", "颜色和图片一致",
        "尺码刚好", "用了一段时间还不错", "家人很喜欢",
    ]
    rid = 1
    for uid in range(1, 201):
        n_reviews = random.randint(0, 4)
        reviewed_pids = set()
        for _ in range(n_reviews):
            pid = random.randint(1, len(product_specs))
            if pid in reviewed_pids:
                continue
            reviewed_pids.add(pid)
            score = random.choices([5, 4, 3, 2, 1], weights=[30, 35, 20, 10, 5])[0]
            content = random.choice(review_texts)
            cur.execute("INSERT INTO reviews VALUES (?,?,?,?,?)",
                         (rid, uid, pid, score, content))
            rid += 1

    conn.commit()
    conn.close()
