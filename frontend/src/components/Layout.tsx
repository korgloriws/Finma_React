import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { Moon, Sun, BarChart3, Wallet, Calculator, Home, Search, LogOut, User } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

const menuItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/analise', label: 'Análise', icon: BarChart3 },
  { path: '/detalhes', label: 'Detalhes', icon: Search },
  { path: '/carteira', label: 'Carteira', icon: Wallet },
  { path: '/controle', label: 'Controle Financeiro', icon: Calculator },
]

export default function Layout({ children }: LayoutProps) {
  const { isDark, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
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

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 