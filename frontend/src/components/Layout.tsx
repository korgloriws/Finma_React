import React, { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { Moon, Sun, BarChart3, Wallet, Calculator, Home, Search, LogOut, User, Menu, X, TrendingUp, BookOpen, DollarSign } from 'lucide-react'
import FinmasLogo from './FinmasLogo'

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
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  // Detectar scroll para esconder barra superior mobile
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setIsScrolled(scrollTop > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const searchItems: Array<{ label: string; path: string; keywords: string; params?: Record<string, string> }> = [
    // Páginas principais
    ...menuItems.map((m) => ({ label: m.label, path: m.path, keywords: m.label.toLowerCase() })),
    // Abas conhecidas
    { label: 'Análise – Lista', path: '/analise', keywords: 'analise lista oportunidades', params: { tab: 'lista' } },
    { label: 'Análise – Gráficos', path: '/analise', keywords: 'analise graficos oportunidades', params: { tab: 'graficos' } },
    { label: 'Análise – FIIs', path: '/analise', keywords: 'analise fiis lista fundos imobiliarios', params: { tab: 'lista', sub: 'fiis' } },
    { label: 'Análise – Ações', path: '/analise', keywords: 'analise acoes lista', params: { tab: 'lista', sub: 'acoes' } },
    { label: 'Análise – BDRs', path: '/analise', keywords: 'analise bdrs lista', params: { tab: 'lista', sub: 'bdrs' } },
    { label: 'Controle – Financeiro', path: '/controle', keywords: 'controle financeiro receitas despesas fluxo', params: { tab: 'financeiro' } },
    { label: 'Controle – Alimentação', path: '/controle', keywords: 'controle alimentacao marmitas', params: { tab: 'alimentacao' } },
    { label: 'Carteira – Projeção', path: '/carteira', keywords: 'carteira projecao projeção simulacao', params: { tab: 'projecao' } },
    { label: 'Carteira – Ativos', path: '/carteira', keywords: 'carteira ativos posicoes', params: { tab: 'ativos' } },
    { label: 'Carteira – Proventos', path: '/carteira', keywords: 'carteira proventos dividendos', params: { tab: 'proventos' } },
    { label: 'Carteira – Rebalanceamento', path: '/carteira', keywords: 'carteira rebalanceamento metas', params: { tab: 'rebalanceamento' } },
  ]

  const filteredResults = searchQuery
    ? searchItems.filter((it) => {
        const q = searchQuery.toLowerCase().trim()
        return it.label.toLowerCase().includes(q) || it.keywords.includes(q)
      }).slice(0, 8)
    : []

  const handleGoTo = (item: { path: string; params?: Record<string, string> }) => {
    const sp = new URLSearchParams()
    if (item.params) {
      Object.entries(item.params).forEach(([k, v]) => sp.set(k, v))
    }
    const target = sp.toString() ? `${item.path}?${sp.toString()}` : item.path
    navigate(target)
    setSearchOpen(false)
    setSearchQuery('')
    setMobileMenuOpen(false)
  }


  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = (e && typeof e.key === 'string' ? e.key : '').toLowerCase()
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      } else if (key === 'escape') {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar desktop */}
      <div className={`hidden md:flex w-64 border-r border-border shadow-lg flex-col h-screen sticky top-0 overflow-hidden ${
        isDark ? 'bg-black' : 'bg-card'
      }`}>
        <div className="p-6">
          <FinmasLogo size="md" showText={false} className="mb-4 justify-center" />
          <hr className="my-4 border-border" />
          {/* User Info */}
          <div className="flex items-center gap-2 mb-4 p-2 bg-accent/50 rounded-lg">
            <User size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{user}</span>
          </div>
          <div className="mt-2 mb-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-accent/50 hover:bg-accent rounded-lg text-sm text-muted-foreground transition-colors"
              aria-label="Abrir busca"
            >
              <Search size={16} />
              <span>Buscar (Ctrl+K)</span>
            </button>
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
          <div className={`absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-border shadow-xl p-4 flex flex-col overflow-y-auto ${
            isDark ? 'bg-black' : 'bg-card'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <FinmasLogo size="sm" showText={false} />
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
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-2 mb-2 bg-accent/50 hover:bg-accent rounded-lg text-sm text-muted-foreground transition-colors"
              aria-label="Abrir busca"
            >
              <Search size={16} />
              <span>Buscar</span>
            </button>
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
        <div className={`md:hidden sticky top-0 z-30 border-b border-border px-4 py-3 flex items-center justify-between shadow-sm transition-transform duration-300 ${
          isScrolled ? '-translate-y-full' : 'translate-y-0'
        } ${isDark ? 'bg-black' : 'bg-card'}`}>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded hover:bg-accent text-muted-foreground"
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>
          <FinmasLogo size="sm" showText={false} />
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

      {/* Command Palette / Busca Global */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSearchOpen(false)} />
          <div className="absolute inset-0 flex items-start justify-center pt-24 px-4">
            <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                <Search size={16} className="text-muted-foreground" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredResults[0]) handleGoTo(filteredResults[0])
                  }}
                  className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="Buscar páginas e abas..."
                  aria-label="Buscar páginas e abas"
                />
              </div>
              <div className="max-h-80 overflow-auto">
                {filteredResults.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">Nenhum resultado</div>
                ) : (
                  filteredResults.map((item, idx) => (
                    <button
                      key={`${item.path}-${idx}`}
                      onClick={() => handleGoTo(item)}
                      className="w-full text-left px-4 py-3 hover:bg-accent transition-colors"
                    >
                      <div className="text-sm text-foreground">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.path}{item.params ? `?${new URLSearchParams(item.params).toString()}` : ''}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 