import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import StatusBadge from './StatusBadge'
import type { Client } from '../types'

interface ClientsResponse {
  success: boolean
  clients: Client[]
}

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true)
        const res = await apiClient.getClients() as ClientsResponse
        setClients(res.clients || [])
      } catch (err) {
        console.error('Failed to fetch clients:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchClients()
    const interval = setInterval(fetchClients, 30000)
    return () => clearInterval(interval)
  }, [])

  const filtered = clients.filter(
    (c) =>
      c.hostname?.toLowerCase().includes(search.toLowerCase()) ||
      c.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.machine_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.firebird_host?.toLowerCase().includes(search.toLowerCase()) ||
      c.last_version?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1890ff] focus:border-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '240px' }}
          />
          <i className="fas fa-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}></i>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">
            Instâncias T-Box Web ({clients.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              Nenhum cliente encontrado.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Máquina ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Hostname</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Versão</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Firebird</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">First Seen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client, i) => (
                  <tr key={client.machine_id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-500">{i + 1}</td>
                    <td className="px-6 py-3">
                      <StatusBadge client={client} />
                    </td>
                    <td className="px-6 py-3">
                      <code className="text-xs text-gray-600">{client.machine_id}</code>
                    </td>
                    <td className="px-6 py-3">{client.hostname || '-'}</td>
                    <td className="px-6 py-3 text-sm">{client.client_name || '-'}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 bg-[#e6f7ff] text-[#1890ff] rounded-full text-xs">
                        {client.last_version || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {client.firebird_host || '-'}
                      {client.firebird_port ? `:${client.firebird_port}` : ''}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {client.first_seen?.slice(0, 10) || '-'}
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
    </div>
  )
}
