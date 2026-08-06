import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import apiClient from '../api/client'
import StatusBadge from './StatusBadge'
import type { Client, Heartbeat } from '../types'

interface ClientDetailResponse {
  success: boolean
  client: Client
  heartbeats: Heartbeat[]
}

export default function ClientDetail() {
  const { machineId } = useParams<{ machineId: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([])
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!machineId) return
      try {
        setLoading(true)
        const [detailRes, versionRes] = await Promise.all([
          apiClient.getClient(machineId) as Promise<ClientDetailResponse>,
          apiClient.getLatestVersion(),
        ])
        setClient(detailRes.client)
        setHeartbeats(detailRes.heartbeats || [])
        setLatestVersion(versionRes.latest_version || null)
      } catch (err) {
        console.error('Failed to fetch client detail:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [machineId])

  if (loading || !client) {
    return (
      <div className="p-6 text-center text-gray-400">
        {loading ? 'Carregando...' : 'Cliente não encontrado'}
      </div>
    )
  }

  const detailRows = [
    { label: 'Machine ID', value: client.machine_id },
    { label: 'Nome', value: client.client_name || '-' },
    { label: 'Hostname', value: client.hostname || '-' },
    { label: 'First Seen', value: client.first_seen || '-' },
    { label: 'Último Heartbeat', value: client.last_heartbeat || 'Nunca' },
    { label: 'Firebird Host', value: client.firebird_host || '-' },
    { label: 'Firebird Port', value: client.firebird_port || '-' },
    { label: 'Firebird Database', value: client.firebird_db || '-' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cliente {client.machine_id.slice(0, 8)}...</h1>
          <p className="text-gray-500 mt-1">
            {client.client_name || 'Sem nome'} — {client.hostname || '-'}
          </p>
        </div>
        <Link to="/clients" className="text-[#1890ff] hover:underline text-sm">
          ← Voltar para Clientes
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Status</div>
          <div className="text-2xl font-bold">
            <StatusBadge client={client} />
          </div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Versão Atual</div>
          <div className="text-2xl font-bold text-[#722ed1]">
            {client.last_version || 'N/A'}
          </div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Última Versão</div>
          <div className="text-2xl font-bold text-[#52c41a]">
            {latestVersion || 'N/A'}
          </div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Config OK</div>
          <div className={`text-2xl font-bold ${client.config_ok ? 'text-[#52c41a]' : 'text-[#f5222d]'}`}>
            {client.config_ok ? 'Sim' : 'Não'}
          </div>
        </div>
      </div>

      {client.last_version && latestVersion && client.last_version !== latestVersion && (
        <div className="bg-[#fff7e6] border border-[#ffd591] text-[#8a4a00] rounded-xl p-4 mb-6 flex items-center gap-3">
          <i className="fas fa-exclamation-triangle"></i>
          <span>
            <strong>Atualização disponível:</strong> está na v{client.last_version}, mas v{latestVersion} está disponível.
          </span>
        </div>
      )}

      <div className="card mb-6">
        <div className="card-header">
          <i className="fas fa-info-circle mr-2"></i>
          Detalhes do Cliente
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody>
              {detailRows.map((row) => (
                <tr key={row.label}>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 bg-gray-50 w-48">
                    {row.label}
                  </th>
                  <td className="px-6 py-3 text-sm">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <i className="fas fa-heartbeat mr-2"></i>
          Histórico de Heartbeats (últimos {heartbeats.length})
        </div>
        {heartbeats.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            Nenhum heartbeat registrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Versão</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">CPU %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">RAM %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Disco %</th>
                </tr>
              </thead>
              <tbody>
                {heartbeats.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-xs text-gray-500">{h.timestamp}</td>
                    <td className="px-6 py-3 text-sm">{h.version || 'N/A'}</td>
                    <td className="px-6 py-3 text-sm">
                      {h.cpu_percent !== null ? h.cpu_percent.toFixed(1) : '-'}%
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {h.ram_percent !== null ? h.ram_percent.toFixed(1) : '-'}%
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {h.disk_percent !== null ? h.disk_percent.toFixed(1) : '-'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
