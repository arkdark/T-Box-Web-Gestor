import { useEffect, useState } from 'react'
import type { ReleaseInfo } from '../types'

interface ReleasesResponse {
  success: boolean
  releases: ReleaseInfo[]
  source: string
}

export default function ReleaseList() {
  const [releases, setReleases] = useState<ReleaseInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/releases')
        const data: ReleasesResponse = await res.json()
        if (data.success) {
          setReleases(data.releases || [])
        }
      } catch (err) {
        console.error('Failed to fetch releases:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReleases()
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Releases</h1>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {releases.length} release(s)
        </span>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Versões Publicadas</h2>
          <p className="text-sm text-gray-500 mt-1">
            do repositório{' '}
            <a
              href="https://github.com/arkdark/arkdark-T-Box-Web-Releases/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1890ff] hover:underline"
            >
              arkdark/arkdark-T-Box-Web-Releases
            </a>
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-400">Carregando...</div>
        ) : releases.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            Nenhuma release encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Versão</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Publicado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Checksum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <span className="font-bold text-[#1890ff]">v{r.version}</span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {r.name || r.tag_name}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {formatDate(r.published_at)}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {r.asset_name ? (
                        <span className="text-gray-700">{r.asset_name}</span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {r.checksum ? (
                        <code className="text-xs text-gray-500">
                          {r.checksum.slice(0, 16)}...
                        </code>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {r.asset_url ? (
                        <a
                          href={r.asset_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#1890ff] hover:underline"
                        >
                          <i className="fas fa-download mr-1"></i>
                          Download
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
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
