# T-Box Web Gestor

Servidor central de gerenciamento para aplicações **T-Box Web** — um app Flask para gerenciamento de bancos de dados Firebird.

> **Frontend**: este repositório é **apenas o backend (API)**. O dashboard web será implementado como uma aplicação React separada que consome estas APIs. As páginas HTML embutidas (`templates/`) são um painel admin mínimo de fallback.

O Gestor fornece:
- **Heartbeat monitoring** — clientes T-Box Web enviam heartbeats periodicamente
- **Controle de versões** — integração com GitHub Releases do repositório `arkdark-T-Box-Web-Releases`
- **Dashboard web** — visualize todos os clientes conectados, status online/offline, versões
- **API para clientes** — verificação de versão e recepção de heartbeats

## Arquitetura

```
T-Box Web (cliente)            T-Box Web Gestor (servidor)            GitHub
    |                              |                                    |
    | 1. Heartbeat (POST)          |  3. API GitHub Releases            |
    |    - machine_id              |    - lista releases + checksums     |
    |    - version                |     |                                  |
    |    - server_info            |     | 2. Fetch releases               |
    |    - client_info            |     v                                  |
    |                             |  4. Armazena no PostgreSQL (Neon)       |
    | 2. Verifica versão          |                                    |
    |    GET /api/version/latest   |  5. Fornece version check + dashboard  |
    |    (opcional)              |                                    |
```

## Requisitos

- Python 3.8+
- Conta no [Neon](https://neon.tech) (PostgreSQL serverless) — gratuita
- Windows (recomendado — alinhado com T-Box Web)

## Instalação

```bash
pip install -r requirements.txt
```

## Configuração

Copie `.env.example` para `.env` e ajuste:

```bash
cp .env.example .env
```

| Variável                      | Descrição                                          | Padrão                                     |
|-------------------------------|----------------------------------------------------|--------------------------------------------|
| `SECRET_KEY`                  | Chave secreta do Flask                             | (gerada aleatoriamente)                    |
| `PORT`                        | Porta do servidor                                  | `5001`                                     |
| `DATABASE_URL`                | Connection string do PostgreSQL (Neon)               | **Obrigatório**                            |
| `GITHUB_TOKEN`                | PAT para acessar releases privados                 | (opcional)                                 |
| `RELEASES_REPO`               | Repo de releases do T-Box Web                      | `arkdark/arkdark-T-Box-Web-releases`       |
| `HEARTBEAT_TIMEOUT_MINUTES`   | Clientes offline após X min sem heartbeat          | `5`                                        |

## Execução

```bash
python app.py
```

Acesse `http://localhost:5001`

## API

### `POST /api/heartbeat`
Recebe heartbeat de um cliente T-Box Web.

**Payload:**
```json
{
  "machine_id": "abc123def456...",
  "version": "0.0.2",
  "hostname": "SRV-FILIAL-01",
  "client_name": "Razão Social Ltda",
  "config_ok": true,
  "firebird": {
    "host": "192.168.1.100",
    "port": "3050",
    "database_path": "C:\\Dados.fdb"
  },
  "server_info": {
    "hostname": "SRV-FILIAL-01",
    "cpu_percent": 12.5,
    "ram_percent": 45.2,
    "disk_percent": 60.1
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "latest_version": "0.0.2",
  "has_update": false,
  "is_new_client": true
}
```

### `GET /api/version/latest`
Retorna a versão mais recente disponível.

### `GET /api/clients`
Lista todos os clientes registrados.

### `GET /api/clients/<machine_id>`
Detalhes de um cliente específico + histórico de heartbeats.

### `GET /api/releases`
Lista todas as releases conhecidas (do banco local ou da API do GitHub).

### `GET /api/stats`
Estatísticas do dashboard (total, online, offline, versão mais recente, desatualizados).

### `GET /api/config`
Retorna as configurações atuais do Gestor.

## Web Routes

| Rota                         | Descrição                            |
|------------------------------|--------------------------------------|
| `/`                          | Dashboard                            |
| `/clients`                   | Lista de clientes                    |
| `/clients/<machine_id>`      | Detalhes do cliente                  |
| `/releases`                  | Histórico de releases                |
| `/config`                    | Configurações                        |

## Integração com T-Box Web (cliente)

No código do cliente T-Box Web, adicione um background thread que envia heartbeat periodicamente:

```python
import threading, requests, time

def heartbeat_worker():
    gestor_url = "http://gestor-server:5001"
    while True:
        try:
            requests.post(f"{gestor_url}/api/heartbeat", json={
                "machine_id": get_machine_id(),
                "version": get_app_version(),
                "hostname": socket.gethostname(),
                "config_ok": get_firebird_config() is not None,
                "firebird": get_firebird_config() or {},
                "server_info": ...,  # dados de /api/server-info
            }, timeout=10)
        except Exception:
            pass
        time.sleep(60)  # 1 minuto

threading.Thread(target=heartbeat_worker, daemon=True).start()
```

## Repositórios relacionados

| Repositório | Descrição |
|---|---|
| **Cliente** | [arkdark/T-Box-Web](https://github.com/arkdark/T-Box-Web) — app Flask cliente |
| **Releases** | [arkdark/arkdark-T-Box-Web-Releases](https://github.com/arkdark/arkdark-T-Box-Web-Releases) — binários e notas |
| **Gestor API** (este) | [arkdark/T-Box-Web-Gestor](https://github.com/arkdark/T-Box-Web-Gestor) — backend Python/Flask |
| **Gestor Frontend** | *(a planejar)* — aplicação React para o dashboard web |
