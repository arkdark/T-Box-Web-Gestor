import { useEffect, useState } from 'react'
import apiClient from '../api/client'
import type { GestorConfig } from '../types'

interface ConfigResponse {
  success: boolean
  config: GestorConfig
}

interface SaveResponse {
  success: boolean
  message: string
}

export default function Config() {
  const [config, setConfig] = useState<Partial<GestorConfig>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true)
        const res = await apiClient.getConfig() as ConfigResponse
        if (res.success) {
          setConfig(res.config)
        }
      } catch (err) {
        console.error('Failed to fetch config:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  const handleChange = (field: keyof GestorConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await apiClient.saveConfig(config) as SaveResponse
      setMessage(res.message || 'Configuração salva com sucesso!')
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage('Erro ao salvar configuração')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Carregando...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Configurações do Gestor</h1>
      <p className="text-gray-500 mb-6">
        Gerencie repositórios, tokens e limites de timeout
      </p>

      {message && (
        <div
          className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
            message.includes('sucesso')
              ? 'bg-[#f6ffed] border border-[#b7eb8f] text-[#2d8659]'
              : 'bg-[#fff2f0] border border-[#ffccc7] text-[#cf1322]'
          }`}
        >
          <i
            className={`fas ${
              message.includes('sucesso') ? 'fa-check-circle' : 'fa-exclamation-circle'
            }`}
          ></i>
          <span>{message}</span>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <i className="fas fa-cog mr-2"></i>
          Configurações
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repositório de Releases (GitHub)
            </label>
            <input
              type="text"
              className="form-input"
              value={config.releases_repo || ''}
              onChange={(e) => handleChange('releases_repo', e.target.value)}
              placeholder="ex: arkdark/arkdark-T-Box-Web-Releases"
            />
            <p className="text-xs text-gray-400 mt-1">
              Repositório GitHub onde os binários e checksums são publicados.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub Token (PAT)
            </label>
            <input
              type="password"
              className="form-input"
              value={config.github_token || ''}
              onChange={(e) => handleChange('github_token', e.target.value)}
              placeholder="github_pat_..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Necessário apenas se o repo de releases for privado.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeout de Heartbeat (minutos)
            </label>
            <input
              type="number"
              className="form-input w-24"
              value={config.heartbeat_timeout_minutes || '5'}
              onChange={(e) => handleChange('heartbeat_timeout_minutes', e.target.value)}
              min="1"
              max="60"
            />
            <p className="text-xs text-gray-400 mt-1">
              Clientes sem heartbeat por este período são marcados como offline.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-save"></i>
          )}
          {saving ? ' Salvando...' : ' Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}
