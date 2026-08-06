import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-[#001529] to-[#003a70] text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#e6f7ff] to-[#bae7ff] rounded-full flex items-center justify-center">
            <span className="text-[#003a70] font-bold text-sm">GW</span>
          </div>
          <span className="font-bold text-lg">T-Box Web</span>
          <span className="text-[#5ac8fa] font-semibold text-lg">Gestor</span>
        </div>
        <nav className="flex gap-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#1890ff] text-white'
                  : 'text-gray-300 hover:bg-white/10'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/clients"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#1890ff] text-white'
                  : 'text-gray-300 hover:bg-white/10'
              }`
            }
          >
            Clientes
          </NavLink>
          <NavLink
            to="/releases"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#1890ff] text-white'
                  : 'text-gray-300 hover:bg-white/10'
              }`
            }
          >
            Releases
          </NavLink>
          <NavLink
            to="/config"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#1890ff] text-white'
                  : 'text-gray-300 hover:bg-white/10'
              }`
            }
          >
            Configurações
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">{children}</main>
      <footer className="text-center py-4 text-sm text-gray-400">
        T-Box Web Gestor © 2026 ·{' '}
        <a
          href="https://github.com/arkdark/T-Box-Web"
          className="text-[#1890ff] hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cliente
        </a>{' '}
        ·{' '}
        <a
          href="https://github.com/arkdark/arkdark-T-Box-Web-Releases/releases"
          className="text-[#1890ff] hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Releases
        </a>
      </footer>
    </div>
  )
}
