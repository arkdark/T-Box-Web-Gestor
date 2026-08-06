import type { Client } from '../types'

interface StatusBadgeProps {
  client: Client
  latestVersion?: string
  showVersion?: boolean
  className?: string
}

export default function StatusBadge({
  client,
  latestVersion,
  showVersion = false,
  className = '',
}: StatusBadgeProps) {
  const isOnline = client.status === 'online'
  const versionBadge =
    latestVersion && client.last_version
      ? client.last_version === latestVersion
        ? 'bg-[#e6f7ff] text-[#1890ff]'
        : 'bg-[#fff7e6] text-[#fa8c16]'
      : ''

  const baseClasses =
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium'

  if (showVersion && latestVersion) {
    return (
      <span className={`${baseClasses} ${versionBadge || 'bg-[#f5f5f5] text-gray-600'} ${className}`}>
        {client.last_version || 'N/A'}
        {client.last_version && client.last_version !== latestVersion && (
          <span className="ml-1 text-[#fa8c16]"></span>
        )}
      </span>
    )
  }

  return (
    <span
      className={`${baseClasses} ${
        isOnline
          ? 'bg-[#f6ffed] text-[#52c41a]'
          : 'bg-[#fff2f0] text-[#f5222d]'
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isOnline ? 'bg-[#52c41a]' : 'bg-[#f5222d]'
        }`}
      />
      {client.status}
    </span>
  )
}
