export interface Client {
  id: number
  machine_id: string
  hostname: string | null
  client_name: string | null
  firebird_host: string | null
  firebird_port: string | null
  firebird_db: string | null
  first_seen: string | null
  last_seen: string | null
  last_version: string | null
  status: 'online' | 'offline'
  config_ok: boolean
  last_heartbeat: string | null
}

export interface Heartbeat {
  id: number
  machine_id: string
  timestamp: string
  version: string | null
  cpu_percent: number | null
  ram_percent: number | null
  disk_percent: number | null
  online: boolean
  raw_data: Record<string, unknown> | null
}

export interface ReleaseInfo {
  id: number
  version: string
  tag_name: string
  name: string | null
  published_at: string
  asset_name: string | null
  asset_url: string | null
  checksum: string | null
  html_url: string | null
  raw_data: Record<string, unknown> | null
}

export interface GestorConfig {
  releases_repo: string
  heartbeat_timeout_minutes: string
  github_token: string
}

export interface Stats {
  total_clients: number
  online: number
  offline: number
  latest_version: string
  outdated: number
}

export interface ClientDetailResponse {
  success: boolean
  client: Client
  heartbeats: Heartbeat[]
}

export interface VersionCheck {
  success: boolean
  latest_version: string | null
  repo: string
  url: string
}

export interface ApiResponse {
  success: boolean
  message?: string
}
