import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import StatusBadge from './StatusBadge'
import type { Client, Stats as StatsType } from '../types'

export default function Dashboard() {
  const [stats, setStats] = useState<StatsType | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [statsRes, clientsRes] = await Promise.all([
          apiClient.getStats(),
          apiClient.getClients(),
        ])
        setStats(statsRes.stats)
        setClients(clientsRes.clients)
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const statCards = [
    {
      label: 'Total de Clientes',
      value: stats?.total_clients ?? '-',
      color: 'text-[#1890ff]',
    },
    {
      label: 'Online',
      value: stats?.online ?? '-',
      color: 'text-[#52c41a]',
    },
    {
      label: 'Offline',
      value: stats?.offline ?? '-',
      color: 'text-[#f5222d]',
    },
    {
      label: 'Versão Mais Recente',
      value: stats?.latest_version ?? 'N/A',
      color: 'text-[#722ed1]',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-6">
        Monitoramento de instâncias T-Box Web conectadas ao Gestor
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="card p-5 text-center"
          >
            <div className="text-xs text-gray-500 mb-1">{card.label}</div>
            <div className={`text-3xl font-bold ${card.color}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {stats && stats.outdated > 0 && (
        <div className="bg-[#fff2f0] border border-[#ffccc7] text-[#cf1322] rounded-xl p-4 mb-6 flex items-center gap-3">
          <i className="fas fa-exclamation-triangle"></i>
          <span>
            <strong>{stats.outdated}</strong> cliente(s) com versão desatualizada.
          </span>
        </div>
      )}

      <div className="card mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Clientes Conectados</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-400">Carregando...</div>
          ) : clients.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              Nenhum cliente registrado.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Máquina</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Hostname</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Versão</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Firebird</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Último Heartbeat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.machine_id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <StatusBadge client={client} />
                    </td>
                    <td className="px-6 py-3">
                      <code className="text-xs text-gray-600">
                        {client.machine_id.slice(0, 12)}...
                      </code>
                    </td>
                    <td className="px-6 py-3">{client.hostname || '-'}</td>
                    <td className="px-6 py-3">
                      <StatusBadge
                        client={client}
                        latestVersion={stats?.latest_version}
                        showVersion
                      />
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {client.firebird_host || '-'}
                      {client.firebird_port ? `:${client.firebird_port}` : ''}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {client.last_heartbeat || 'Nunca'}
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        to={`/clients/${client.machine_id}`}
                        className="text-xs text-[#1890ff] hover:underline"
                      >
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {clients.length > 0 && (
        <div className="text-center">
          <Link
            to="/clients"
            className="text-sm text-[#1890ff] hover:underline"
          >
            Ver todos os clientes ({clients.length})
          </Link>
        </div>
      )}
    </div>
  )
}
