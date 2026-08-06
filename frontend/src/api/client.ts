import type { Client, Heartbeat, ReleaseInfo, GestorConfig, Stats, VersionCheck } from '../types'

const API_BASE = '/api'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export const apiClient = {
  getStats: () => apiFetch<{ success: boolean; stats: Stats }>('/stats'),

  getClients: () =>
    apiFetch<{ success: boolean; clients: Client[] }>('/clients'),

  getClient: (machineId: string) =>
    apiFetch<{ success: boolean; client: Client; heartbeats: Heartbeat[] }>(
      `/clients/${machineId}`
    ),

  getReleases: () =>
    apiFetch<{ success: boolean; releases: ReleaseInfo[]; source: string }>(
      '/releases'
    ),

  getLatestVersion: () => apiFetch<VersionCheck>('/version/latest'),

  getConfig: () =>
    apiFetch<{ success: boolean; config: GestorConfig }>('/config'),

  saveConfig: (config: Partial<GestorConfig>) =>
    apiFetch<{ success: boolean; message: string }>('/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
}

export default apiClient
