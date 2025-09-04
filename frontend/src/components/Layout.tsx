import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { Moon, Sun, BarChart3, Wallet, Calculator, Home, Search, LogOut, User, Menu, X, TrendingUp, BookOpen, DollarSign } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

const menuItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/analise', label: 'Análise de oportunidades', icon: BarChart3 },
  { path: '/detalhes', label: 'Detalhes dos ativos', icon: Search },
  { path: '/carteira', label: 'Carteira', icon: Wallet },
  { path: '/juros-compostos', label: 'Calculadora de Juros Compostos', icon: TrendingUp },
  { path: '/guia', label: 'Guia do Mercado', icon: BookOpen },
  { path: '/conversor', label: 'Conversor de Moedas', icon: DollarSign },
  { path: '/controle', label: 'Controle Financeiro', icon: Calculator },
]

export default function Layout({ children }: LayoutProps) {
  const { isDark, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar desktop */}
      <div className="hidden md:flex w-64 bg-card border-r border-border shadow-lg flex-col h-screen sticky top-0 overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-foreground">Finma</h1>
          <hr className="my-4 border-border" />
          {/* User Info */}
          <div className="flex items-center gap-2 mb-4 p-2 bg-accent/50 rounded-lg">
            <User size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{user}</span>
          </div>
          <p className="text-sm text-muted-foreground">Menu</p>
        </div>
        <nav className="flex-1 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            <span className="text-sm">Modo Escuro</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-card border-r border-border shadow-xl p-4 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-foreground">FinMa</h1>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded hover:bg-accent text-muted-foreground"
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4 p-2 bg-accent/50 rounded-lg">
              <User size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{user}</span>
            </div>
            <nav className="flex-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="pt-2 border-t border-border space-y-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                <span className="text-sm">Modo Escuro</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <LogOut size={18} />
                <span className="text-sm">Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded hover:bg-accent text-muted-foreground"
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Finma</h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded hover:bg-accent text-muted-foreground"
            aria-label="Alternar tema"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 