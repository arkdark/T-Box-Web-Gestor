"""
T-Box Web Gestor — Servidor central de gerenciamento.

Fornece:
    * API de heartbeat para clientes T-Box Web
    * Dashboard web para monitoramento de clientes
    * Integração com GitHub Releases para controle de versões
    * API de verificação de versão para clientes
"""
import os
import json
import threading
import time
import hashlib
from datetime import datetime
from flask import (
    Flask, render_template, request, jsonify, redirect,
    url_for, flash, session
)
from dotenv import load_dotenv
import requests

import gestor_db

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", os.urandom(32))
app.config["JSON_SORT_KEYS"] = False

gestor_db.init_db()


def _fetch_github_releases():
    repo = gestor_db.get_config("releases_repo", "arkdark/arkdark-T-Box-Web-releases")
    token = os.environ.get("GITHUB_TOKEN", "") or gestor_db.get_config("github_token", "")

    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        resp = requests.get(
            f"https://api.github.com/repos/{repo}/releases",
            headers=headers,
            timeout=15
        )
        if resp.status_code != 200:
            return resp.status_code, []

        releases = []
        for r in resp.json():
            tag = r.get("tag_name", "").lstrip("v")
            assets = r.get("assets", [])
            exe_asset = next(
                (a for a in assets if a.get("name", "").endswith(".exe")),
                None
            )
            sha_asset = next(
                (a for a in assets if a.get("name", "").endswith(".sha256")),
                None
            )
            checksum_url = sha_asset["browser_download_url"] if sha_asset else None
            checksum = None
            if checksum_url:
                try:
                    cresp = requests.get(checksum_url, timeout=10)
                    if cresp.status_code == 200:
                        checksum = cresp.text.strip().split()[0]
                except Exception:
                    pass

            releases.append({
                "version": tag,
                "tag_name": r["tag_name"],
                "name": r.get("name") or r["tag_name"],
                "published_at": r.get("published_at", ""),
                "asset_name": exe_asset["name"] if exe_asset else None,
                "asset_url": exe_asset["browser_download_url"] if exe_asset else None,
                "checksum": checksum,
                "html_url": r.get("html_url", ""),
                "body": r.get("body", ""),
            })

            if exe_asset and checksum:
                gestor_db.upsert_release(
                    version=tag,
                    tag_name=r["tag_name"],
                    name=r.get("name") or r["tag_name"],
                    published_at=r.get("published_at", ""),
                    asset_name=exe_asset["name"],
                    asset_url=exe_asset["browser_download_url"],
                    checksum=checksum,
                    html_url=r.get("html_url", ""),
                    raw_data=r,
                )

        return resp.status_code, releases
    except requests.RequestException:
        return 0, []


def _background_release_sync():
    while True:
        _fetch_github_releases()
        gestor_db.update_client_status()
        gestor_db.cleanup_old_heartbeats()
        time.sleep(300)


def _get_latest_version():
    releases = gestor_db.get_all_releases()
    if releases:
        return releases[0]["version"]
    status, gh_releases = _fetch_github_releases()
    if gh_releases:
        return gh_releases[0]["version"]
    return None


# ── API Routes ─────────────────────────────────────────────────

@app.route("/api/heartbeat", methods=["POST"])
def api_heartbeat():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "message": "JSON body requerido"}), 400

    machine_id = data.get("machine_id")
    if not machine_id:
        return jsonify({"success": False, "message": "machine_id requerido"}), 400

    version = data.get("version", "unknown")
    hostname = data.get("hostname", "")
    client_name = data.get("client_name", "")
    firebird = data.get("firebird", {})
    config_ok = data.get("config_ok", False)
    server_info = data.get("server_info", {})
    client_info = data.get("client_info", {})

    is_new = gestor_db.upsert_client(
        machine_id=machine_id,
        hostname=hostname,
        client_name=client_name,
        firebird_host=firebird.get("host", ""),
        firebird_port=firebird.get("port", ""),
        firebird_db=firebird.get("database_path", ""),
        version=version,
        config_ok=config_ok,
        server_info=server_info,
        client_info=client_info,
    )

    gestor_db.record_heartbeat(
        machine_id=machine_id,
        version=version,
        server_info=server_info,
        client_info=client_info,
        raw=data,
    )

    latest = _get_latest_version()
    has_update = latest is not None and latest != version

    resp = {
        "success": True,
        "received": True,
        "latest_version": latest,
        "has_update": has_update,
        "is_new_client": is_new,
    }
    return jsonify(resp)


@app.route("/api/version/latest")
def api_version_latest():
    latest = _get_latest_version()
    return jsonify({
        "success": True,
        "latest_version": latest,
        "repo": gestor_db.get_config("releases_repo", ""),
        "url": f"https://github.com/{gestor_db.get_config('releases_repo', '')}/releases/latest",
    })




@app.route("/api/config", methods=["POST"])
def api_config_save():
    """Atualiza configuracoes do Gestor via JSON (para frontend React)."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "message": "JSON body requerido"}), 400
    for key in ["releases_repo", "heartbeat_timeout_minutes", "github_token"]:
        if key in data:
            gestor_db.set_config(key, data[key])
    return jsonify({"success": True, "message": "Configuracao salva com sucesso"})
@app.route("/api/clients")
def api_clients():
    clients = gestor_db.get_all_clients()
    return jsonify({"success": True, "clients": clients})


@app.route("/api/clients/<machine_id>")
def api_client_detail(machine_id):
    client = gestor_db.get_client(machine_id)
    if not client:
        return jsonify({"success": False, "message": "Cliente não encontrado"}), 404
    heartbeats = gestor_db.get_recent_heartbeats(machine_id, limit=30)
    return jsonify({"success": True, "client": client, "heartbeats": heartbeats})


@app.route("/api/releases")
def api_releases():
    releases = gestor_db.get_all_releases()
    if not releases:
        status, gh_releases = _fetch_github_releases()
        if gh_releases:
            return jsonify({"success": True, "releases": gh_releases, "source": "github-api"})
    return jsonify({"success": True, "releases": releases, "source": "local-db"})


@app.route("/api/stats")
def api_stats():
    gestor_db.update_client_status()
    stats = gestor_db.get_dashboard_stats()
    return jsonify({"success": True, "stats": stats})


@app.route("/api/config")
def api_config():
    conn = gestor_db.get_db()
    rows = conn.execute("SELECT key, value FROM gestor_config").fetchall()
    conn.close()
    return jsonify({"success": True, "config": {r["key"]: r["value"] for r in rows}})


# ── Web Routes ─────────────────────────────────────────────────

@app.route("/")
def dashboard():
    gestor_db.update_client_status()
    clients = gestor_db.get_all_clients()
    stats = gestor_db.get_dashboard_stats()
    latest_version = _get_latest_version()
    releases = gestor_db.get_all_releases()
    if not releases:
        _fetch_github_releases()
        releases = gestor_db.get_all_releases()
    return render_template(
        "index.html",
        clients=clients,
        stats=stats,
        latest_version=latest_version,
        releases=releases,
    )


@app.route("/clients")
def clients_page():
    gestor_db.update_client_status()
    clients = gestor_db.get_all_clients()
    return render_template("clients.html", clients=clients)


@app.route("/clients/<machine_id>")
def client_detail(machine_id):
    client = gestor_db.get_client(machine_id)
    if not client:
        flash("Cliente não encontrado", "error")
        return redirect(url_for("clients_page"))
    heartbeats = gestor_db.get_recent_heartbeats(machine_id, limit=50)
    return render_template("client_detail.html", client=client, heartbeats=heartbeats)


@app.route("/releases")
def releases_page():
    releases = gestor_db.get_all_releases()
    if not releases:
        _fetch_github_releases()
        releases = gestor_db.get_all_releases()
    return render_template("releases.html", releases=releases)


@app.route("/config")
def config_page():
    conn = gestor_db.get_db()
    rows = conn.execute("SELECT key, value FROM gestor_config").fetchall()
    conn.close()
    config = {r["key"]: r["value"] for r in rows}
    return render_template("config.html", config=config)


@app.route("/config/save", methods=["POST"])
def config_save():
    for key in ["releases_repo", "heartbeat_timeout_minutes", "github_token"]:
        val = request.form.get(key, "")
        gestor_db.set_config(key, val)
    flash("Configurações salvas com sucesso", "success")
    return redirect(url_for("config_page"))


# ── Background thread ─────────────────────────────────────────

threading.Thread(target=_background_release_sync, daemon=True).start()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, host="0.0.0.0", port=port)
