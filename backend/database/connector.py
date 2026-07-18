"""数据库连接器 —— 统一管理 MySQL 和 SQLite 连接"""
import sqlite3
from pathlib import Path
from typing import Any, Optional

import pymysql
from pymysql.cursors import DictCursor


class DBConnector:
    """数据库连接抽象层，支持 MySQL / SQLite"""

    def __init__(self):
        self._conn: Any = None
        self._kind: Optional[str] = None
        self._config: dict[str, Any] = {}

    @property
    def connected(self) -> bool:
        if self._conn is None:
            return False
        if self._kind == "mysql":
            return self._conn.open
        return True

    @property
    def kind(self) -> Optional[str]:
        return self._kind

    @property
    def config(self) -> dict[str, Any]:
        return dict(self._config)

    def connect_mysql(self, host: str, port: int, user: str,
                       password: str, database: str) -> list[dict]:
        self.disconnect()
        self._config = {
            "host": host, "port": port, "user": user,
            "password": password, "database": database,
            "charset": "utf8mb4", "cursorclass": DictCursor,
        }
        self._conn = pymysql.connect(**self._config)
        self._kind = "mysql"
        return self.get_tables()

    def connect_sqlite(self, path: Path) -> list[dict]:
        self.disconnect()
        self._config = {"database": "DataPilot Demo", "path": str(path)}
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._kind = "sqlite"
        return self.get_tables()

    def disconnect(self):
        if self._conn:
            try:
                self._conn.close()
            except Exception:
                pass
        self._conn = None
        self._kind = None
        self._config = {}

    def get_tables(self) -> list[dict[str, Any]]:
        tables = []
        if self._kind == "mysql":
            with self._conn.cursor() as cur:
                cur.execute("SHOW TABLES")
                for row in cur.fetchall():
                    tbl_name = list(row.values())[0]
                    cur.execute(f"SHOW COLUMNS FROM `{tbl_name}`")
                    cols = [{"field": c["Field"], "type": c["Type"],
                              "key": c["Key"]} for c in cur.fetchall()]
                    tables.append({"name": tbl_name, "columns": cols})
        elif self._kind == "sqlite":
            cur = self._conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            for row in cur.fetchall():
                tbl_name = row["name"]
                if tbl_name == "sqlite_sequence":
                    continue
                cur.execute(f"PRAGMA table_info({tbl_name})")
                cols = []
                for c in cur.fetchall():
                    key = "PRI" if c["pk"] else ""
                    cols.append({"field": c["name"], "type": c["type"], "key": key})
                tables.append({"name": tbl_name, "columns": cols})
        return tables

    def execute(self, sql: str) -> tuple[list[str], list[dict[str, Any]]]:
        if self._kind == "mysql":
            with self._conn.cursor() as cur:
                cur.execute(sql)
                rows = cur.fetchall()
                columns = [d[0] for d in cur.description] if cur.description else []
        else:
            cur = self._conn.cursor()
            cur.execute(sql)
            rows = [dict(r) for r in cur.fetchall()]
            columns = [d[0] for d in cur.description] if cur.description else []
        return columns, rows


_db = DBConnector()


def get_conn() -> DBConnector:
    if not _db.connected:
        raise ConnectionError("No database connected")
    return _db


def close_conn():
    _db.disconnect()
