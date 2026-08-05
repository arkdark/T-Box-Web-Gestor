"""Módulo de banco de dados para o T-Box Web Gestor.

Usa SQLite local para armazenar heartbeats, clientes, releases e configurações.
Schema é migrado automaticamente na primeira inicialização.

Tabelas:
    clients      — instâncias do T-Box Web registradas
    heartbeats   — histórico de heartbeats (últimos N minutos)
    releases     — releases sincedos da API do GitHub
    gestor_config— configurações do Gestor (repo de releases, etc.)
"""
import os
import sqlite3
import json
from datetime import datetime, timedelta

DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "gestor.db"
)

HEARTBEAT_RETENTION_DAYS = 30


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS gestor_config (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS clients (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id      TEXT UNIQUE NOT NULL,
            hostname        TEXT,
            client_name     TEXT,
            firebird_host   TEXT,
            firebird_port   TEXT,
            firebird_db     TEXT,
            first_seen      TEXT,
            last_seen       TEXT,
            last_version    TEXT,
            status          TEXT DEFAULT 'offline',
            config_ok       INTEGER DEFAULT 0,
            last_heartbeat  TEXT
        );

        CREATE TABLE IF NOT EXISTS heartbeats (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id      TEXT NOT NULL,
            timestamp       TEXT NOT NULL,
            version         TEXT,
            cpu_percent     REAL,
            ram_percent     REAL,
            disk_percent    REAL,
            online          INTEGER DEFAULT 1,
            raw_data        TEXT
        );

        CREATE TABLE IF NOT EXISTS releases (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            version         TEXT NOT NULL,
            tag_name        TEXT NOT NULL,
            name            TEXT,
            published_at    TEXT,
            asset_name      TEXT,
            asset_url       TEXT,
            checksum        TEXT,
            html_url        TEXT,
            raw_data        TEXT,
            UNIQUE(version)
        );
    """)

    defaults = {
        "releases_repo": "arkdark/arkdark-T-Box-Web-releases",
        "heartbeat_timeout_minutes": "5",
        "github_token": "",
    }
    for k, v in defaults.items():
        existing = conn.execute(
            "SELECT value FROM gestor_config WHERE key = ?", (k,)
        ).fetchone()
        if existing is None:
            conn.execute(
                "INSERT INTO gestor_config (key, value) VALUES (?, ?)", (k, v)
            )

    conn.commit()
    conn.close()


def _now_iso():
    return datetime.now().isoformat(timespec="seconds")


def get_config(key, default=None):
    conn = get_db()
    row = conn.execute(
        "SELECT value FROM gestor_config WHERE key = ?", (key,)
    ).fetchone()
    conn.close()
    if row is None:
        return default
    val = row["value"]
    if val.lower() in ("true", "false"):
        return val.lower() == "true"
    try:
        return json.loads(val)
    except (ValueError, TypeError):
        return val


def set_config(key, value):
    conn = get_db()
    if isinstance(value, (dict, list)):
        val_str = json.dumps(value)
    elif isinstance(value, bool):
        val_str = "true" if value else "false"
    else:
        val_str = str(value)
    conn.execute(
        "INSERT INTO gestor_config (key, value) VALUES (?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, val_str)
    )
    conn.commit()
    conn.close()


def upsert_client(machine_id, hostname, client_name,
                  firebird_host, firebird_port, firebird_db,
                  version, config_ok, server_info=None, client_info=None):
    now = _now_iso()
    conn = get_db()
    client = conn.execute(
        "SELECT id FROM clients WHERE machine_id = ?", (machine_id,)
    ).fetchone()

    raw_data = json.dumps({
        "server_info": server_info or {},
        "client_info": client_info or {},
    }, ensure_ascii=False)

    if client is None:
        conn.execute(
            """INSERT INTO clients
               (machine_id, hostname, client_name, firebird_host, firebird_port,
                firebird_db, first_seen, last_seen, last_version, status,
                config_ok, last_heartbeat)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'online', ?, ?)""",
            (machine_id, hostname, client_name, firebird_host, firebird_port,
             firebird_db, now, now, version, int(config_ok), now)
        )
    else:
        conn.execute(
            """UPDATE clients SET
               hostname       = ?,
               client_name    = ?,
               firebird_host  = ?,
               firebird_port  = ?,
               firebird_db    = ?,
               last_seen      = ?,
               last_version   = ?,
               status         = 'online',
               config_ok      = ?,
               last_heartbeat = ?
               WHERE machine_id = ?""",
            (hostname, client_name, firebird_host, firebird_port, firebird_db,
             now, version, int(config_ok), now, machine_id)
        )
    conn.commit()
    conn.close()
    return client is None


def record_heartbeat(machine_id, version, server_info=None, client_info=None, raw=None):
    now = _now_iso()
    conn = get_db()
    hb = {
        "version": version,
        "cpu_percent": None,
        "ram_percent": None,
        "disk_percent": None,
        "online": 1,
        "raw_data": json.dumps(raw or {}, ensure_ascii=False),
    }
    if server_info:
        hb["cpu_percent"] = server_info.get("cpu_percent")
        hb["ram_percent"] = server_info.get("ram_percent")
        hb["disk_percent"] = server_info.get("disk_percent")

    conn.execute(
        """INSERT INTO heartbeats
           (machine_id, timestamp, version, cpu_percent, ram_percent,
            disk_percent, online, raw_data)
           VALUES (?, ?, :version, :cpu_percent, :ram_percent,
                   :disk_percent, :online, :raw_data)""",
        (machine_id, now), hb
    )
    conn.commit()
    conn.close()


def get_client(machine_id):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM clients WHERE machine_id = ?", (machine_id,)
    ).fetchone()
    conn.close()
    if row is None:
        return None
    return dict(row)


def get_all_clients():
    conn = get_db()
    rows = conn.execute(
        """SELECT * FROM clients
           ORDER BY last_seen DESC"""
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_recent_heartbeats(machine_id, limit=50):
    conn = get_db()
    rows = conn.execute(
        """SELECT * FROM heartbeats
           WHERE machine_id = ?
           ORDER BY timestamp DESC
           LIMIT ?""",
        (machine_id, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_client_status():
    timeout_min = int(get_config("heartbeat_timeout_minutes", "5"))
    cutoff = (datetime.now() - timedelta(minutes=timeout_min)).isoformat(timespec="seconds")
    conn = get_db()
    conn.execute(
        "UPDATE clients SET status = 'offline' WHERE last_seen < ?",
        (cutoff,)
    )
    conn.commit()
    conn.close()


def get_dashboard_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM clients").fetchone()[0]
    online = conn.execute(
        "SELECT COUNT(*) FROM clients WHERE status = 'online'"
    ).fetchone()[0]
    offline = total - online
    latest_release = conn.execute(
        "SELECT version FROM releases ORDER BY published_at DESC LIMIT 1"
    ).fetchone()
    latest_version = latest_release["version"] if latest_release else "N/A"
    outdated = conn.execute(
        "SELECT COUNT(*) FROM clients WHERE last_version IS NOT NULL AND last_version != ?",
        (latest_version,)
    ).fetchone()[0] if latest_version != "N/A" else 0
    conn.close()
    return {
        "total_clients": total,
        "online": online,
        "offline": offline,
        "latest_version": latest_version,
        "outdated": outdated,
    }


def upsert_release(version, tag_name, name, published_at,
                   asset_name, asset_url, checksum, html_url, raw_data=None):
    conn = get_db()
    conn.execute(
        """INSERT INTO releases
           (version, tag_name, name, published_at, asset_name, asset_url,
            checksum, html_url, raw_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(version) DO UPDATE SET
               tag_name    = excluded.tag_name,
               name        = excluded.name,
               published_at= excluded.published_at,
               asset_name  = excluded.asset_name,
               asset_url   = excluded.asset_url,
               checksum    = excluded.checksum,
               html_url    = excluded.html_url,
               raw_data    = excluded.raw_data""",
        (version, tag_name, name, published_at, asset_name, asset_url,
         checksum, html_url, json.dumps(raw_data or {}, ensure_ascii=False))
    )
    conn.commit()
    conn.close()


def get_all_releases():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM releases ORDER BY published_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def cleanup_old_heartbeats():
    cutoff = (datetime.now() - timedelta(days=HEARTBEAT_RETENTION_DAYS)).isoformat(timespec="seconds")
    conn = get_db()
    conn.execute("DELETE FROM heartbeats WHERE timestamp < ?", (cutoff,))
    deleted = conn.total_changes
    conn.commit()
    conn.close()
    return deleted
