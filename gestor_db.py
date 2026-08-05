"""Módulo de banco de dados para o T-Box Web Gestor.

Usa PostgreSQL (Neon) para armazenar heartbeats, clientes, releases e configurações.

Tabelas:
    clients      — instâncias do T-Box Web registradas
    heartbeats   — histórico de heartbeats
    releases     — releases sincedos da API do GitHub
    gestor_config— configurações do Gestor
"""
import os
import json
from datetime import datetime, timedelta

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import sql as pgm

DATABASE_URL = os.environ.get("DATABASE_URL", "")

HEARTBEAT_RETENTION_DAYS = 30


def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    conn.autocommit = True
    return conn


def init_db():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL não configurada. Veja .env.example")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS gestor_config (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id              SERIAL PRIMARY KEY,
            machine_id      TEXT UNIQUE NOT NULL,
            hostname        TEXT,
            client_name     TEXT,
            firebird_host   TEXT,
            firebird_port   TEXT,
            firebird_db     TEXT,
            first_seen      TIMESTAMP,
            last_seen       TIMESTAMP,
            last_version    TEXT,
            status          TEXT DEFAULT 'offline',
            config_ok       BOOLEAN DEFAULT FALSE,
            last_heartbeat  TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS heartbeats (
            id              SERIAL PRIMARY KEY,
            machine_id      TEXT NOT NULL,
            timestamp       TIMESTAMP NOT NULL DEFAULT NOW(),
            version         TEXT,
            cpu_percent     REAL,
            ram_percent     REAL,
            disk_percent    REAL,
            online          BOOLEAN DEFAULT TRUE,
            raw_data        JSONB
        )
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_heartbeats_machine
        ON heartbeats (machine_id, timestamp DESC)
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS releases (
            id              SERIAL PRIMARY KEY,
            version         TEXT NOT NULL UNIQUE,
            tag_name        TEXT NOT NULL,
            name            TEXT,
            published_at    TEXT,
            asset_name      TEXT,
            asset_url       TEXT,
            checksum        TEXT,
            html_url        TEXT,
            raw_data        JSONB
        )
    """)

    defaults = {
        "releases_repo": "arkdark/arkdark-T-Box-Web-releases",
        "heartbeat_timeout_minutes": "5",
        "github_token": "",
    }

    for k, v in defaults.items():
        cur.execute(
            "SELECT value FROM gestor_config WHERE key = %s",
            (k,)
        )
        if cur.fetchone() is None:
            cur.execute(
                "INSERT INTO gestor_config (key, value) VALUES (%s, %s)",
                (k, v)
            )

    conn.commit()
    cur.close()
    conn.close()


def _now_iso():
    return datetime.now().isoformat(timespec="seconds")


def get_config(key, default=None):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT value FROM gestor_config WHERE key = %s", (key,))
    row = cur.fetchone()
    conn.close()
    if row is None:
        return default
    val = row["value"]
    if val is None:
        return None
    if val.lower() in ("true", "false"):
        return val.lower() == "true"
    try:
        return json.loads(val)
    except (ValueError, TypeError):
        return val


def set_config(key, value):
    conn = get_db()
    cur = conn.cursor()
    if isinstance(value, (dict, list)):
        val_str = json.dumps(value)
    elif isinstance(value, bool):
        val_str = "true" if value else "false"
    else:
        val_str = str(value)
    cur.execute(
        "INSERT INTO gestor_config (key, value) VALUES (%s, %s) "
        "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        (key, val_str)
    )
    conn.commit()
    conn.close()


def upsert_client(machine_id, hostname, client_name,
                  firebird_host, firebird_port, firebird_db,
                  version, config_ok, server_info=None, client_info=None):
    now = _now_iso()
    conn = get_db()
    cur = conn.cursor()

    raw_data = json.dumps({
        "server_info": server_info or {},
        "client_info": client_info or {},
    }, ensure_ascii=False)

    cur.execute("SELECT id FROM clients WHERE machine_id = %s", (machine_id,))
    existing = cur.fetchone()

    if existing is None:
        cur.execute(
            """INSERT INTO clients
               (machine_id, hostname, client_name, firebird_host, firebird_port,
                firebird_db, first_seen, last_seen, last_version, status,
                config_ok, last_heartbeat)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'online', %s, %s)""",
            (machine_id, hostname, client_name, firebird_host, firebird_port,
             firebird_db, now, now, version, config_ok, now)
        )
    else:
        cur.execute(
            """UPDATE clients SET
               hostname       = %s,
               client_name    = %s,
               firebird_host  = %s,
               firebird_port  = %s,
               firebird_db    = %s,
               last_seen      = %s,
               last_version   = %s,
               status         = 'online',
               config_ok      = %s,
               last_heartbeat = %s
               WHERE machine_id = %s""",
            (hostname, client_name, firebird_host, firebird_port, firebird_db,
             now, version, config_ok, now, machine_id)
        )
    conn.commit()
    conn.close()
    return existing is None


def record_heartbeat(machine_id, version, server_info=None, client_info=None, raw=None):
    now = _now_iso()
    conn = get_db()
    cur = conn.cursor()

    cpu = (server_info or {}).get("cpu_percent")
    ram = (server_info or {}).get("ram_percent")
    disk = (server_info or {}).get("disk_percent")

    cur.execute(
        """INSERT INTO heartbeats
           (machine_id, timestamp, version, cpu_percent, ram_percent,
            disk_percent, online, raw_data)
           VALUES (%s, %s, %s, %s, %s, %s, TRUE, %s)""",
        (machine_id, now, version, cpu, ram, disk,
         json.dumps(raw or {}, ensure_ascii=False))
    )
    conn.commit()
    conn.close()


def get_client(machine_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM clients WHERE machine_id = %s", (machine_id,))
    row = cur.fetchone()
    conn.close()
    if row is None:
        return None
    return dict(row)


def get_all_clients():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM clients ORDER BY last_seen DESC")
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_recent_heartbeats(machine_id, limit=50):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT * FROM heartbeats
           WHERE machine_id = %s
           ORDER BY timestamp DESC
           LIMIT %s""",
        (machine_id, limit)
    )
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_client_status():
    timeout_min = int(get_config("heartbeat_timeout_minutes", "5"))
    cutoff = (datetime.now() - timedelta(minutes=timeout_min)).isoformat(timespec="seconds")
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE clients SET status = 'offline' WHERE last_seen < %s::timestamp",
        (cutoff,)
    )
    conn.commit()
    conn.close()


def get_dashboard_stats():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) as cnt FROM clients")
    total = cur.fetchone()["cnt"]

    cur.execute("SELECT COUNT(*) as cnt FROM clients WHERE status = 'online'")
    online = cur.fetchone()["cnt"]

    offline = total - online

    cur.execute("SELECT version FROM releases ORDER BY published_at DESC LIMIT 1")
    latest_row = cur.fetchone()
    latest_version = latest_row["version"] if latest_row else None

    if latest_version:
        cur.execute(
            "SELECT COUNT(*) as cnt FROM clients WHERE last_version IS NOT NULL AND last_version != %s",
            (latest_version,)
        )
        outdated = cur.fetchone()["cnt"]
    else:
        outdated = 0

    conn.close()
    return {
        "total_clients": total,
        "online": online,
        "offline": offline,
        "latest_version": latest_version or "N/A",
        "outdated": outdated,
    }


def upsert_release(version, tag_name, name, published_at,
                   asset_name, asset_url, checksum, html_url, raw_data=None):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO releases
           (version, tag_name, name, published_at, asset_name, asset_url,
            checksum, html_url, raw_data)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
           ON CONFLICT (version) DO UPDATE SET
               tag_name     = EXCLUDED.tag_name,
               name         = EXCLUDED.name,
               published_at = EXCLUDED.published_at,
               asset_name   = EXCLUDED.asset_name,
               asset_url    = EXCLUDED.asset_url,
               checksum     = EXCLUDED.checksum,
               html_url     = EXCLUDED.html_url,
               raw_data     = EXCLUDED.raw_data""",
        (version, tag_name, name, published_at, asset_name, asset_url,
         checksum, html_url, json.dumps(raw_data or {}, ensure_ascii=False))
    )
    conn.commit()
    conn.close()


def get_all_releases():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM releases ORDER BY published_at DESC")
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def cleanup_old_heartbeats():
    cutoff = (datetime.now() - timedelta(days=HEARTBEAT_RETENTION_DAYS)).isoformat(timespec="seconds")
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM heartbeats WHERE timestamp < %s::timestamp", (cutoff,))
    deleted = cur.rowcount
    conn.commit()
    conn.close()
    return deleted
