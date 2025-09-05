import { motion } from 'framer-motion'
import { 
  Zap, 
  DollarSign, 
  Target, 
  FileText, 
  TrendingUp, 
  Activity
} from 'lucide-react'
import { formatCurrency, formatNumber, formatDividendYield, formatPercentage } from '../../utils/formatters'
import TickerWithLogo from '../TickerWithLogo'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
} from 'recharts'

// Componente para loading spinner
function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

// Componente para seção de informações
function InfoSection({ 
  title, 
  icon: Icon, 
  color, 
  children 
}: {
  title: string
  icon: any
  color: string
  children: React.ReactNode
}) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${colorClasses[color as keyof typeof colorClasses]}`} />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}

interface DetalhesComparisonTabProps {
  compararInputRef: React.RefObject<HTMLInputElement>
  handleCompararKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleComparar: () => void
  loadingComparacao: boolean
  comparacao: Array<{
    ticker: string
    nome: string
    preco_atual: number | null
    pl: number | null
    pvp: number | null
    dy: number | null
    roe: number | null
    setor: string | null
    pais: string | null
  }>
  comparisonData: Array<{
    ticker: string
    preco: number
    pl: number
    pvp: number
    dy: number
    roe: number
  }>
}

export default function DetalhesComparisonTab({
  compararInputRef,
  handleCompararKeyDown,
  handleComparar,
  loadingComparacao,
  comparacao,
  comparisonData
}: DetalhesComparisonTabProps) {
  return (
    <motion.div
      key="comparison"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Input para comparação */}
      <InfoSection title="Comparação com Outros Ativos" icon={Zap} color="yellow">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="font-medium flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Comparar com outros ativos:
            </label>
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Digite tickers separados por vírgula (ex: PETR4, ITUB4, VALE3)"
                ref={compararInputRef}
                onKeyDown={handleCompararKeyDown}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleComparar}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Comparar
            </motion.button>
          </div>

          {/* Tabela de Comparação */}
          {loadingComparacao ? (
            <LoadingSpinner text="Carregando comparação..." />
          ) : comparacao && comparacao.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Ticker</th>
                    <th className="px-4 py-3 text-left font-medium">Nome</th>
                    <th className="px-4 py-3 text-left font-medium">Preço Atual</th>
                    <th className="px-4 py-3 text-left font-medium">P/L</th>
                    <th className="px-4 py-3 text-left font-medium">P/VP</th>
                    <th className="px-4 py-3 text-left font-medium">DY</th>
                    <th className="px-4 py-3 text-left font-medium">ROE</th>
                    <th className="px-4 py-3 text-left font-medium">Setor</th>
                    <th className="px-4 py-3 text-left font-medium">País</th>
                  </tr>
                </thead>
                <tbody>
                  {comparacao.map((ativo, index) => (
                    <motion.tr 
                      key={ativo.ticker} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-muted/40 transition-colors`}
                    >
                      <td className="px-4 py-3 min-w-[120px]">
                        <TickerWithLogo ticker={ativo.ticker} size="sm" />
                      </td>
                      <td className="px-4 py-3">{ativo.nome || '-'}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(ativo.preco_atual)}</td>
                      <td className="px-4 py-3">{formatNumber(ativo.pl)}</td>
                      <td className="px-4 py-3">{formatNumber(ativo.pvp)}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{formatDividendYield(ativo.dy)}</td>
                      <td className="px-4 py-3">{formatPercentage(ativo.roe ? ativo.roe * 100 : null)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{ativo.setor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{ativo.pais || '-'}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Gráficos de comparação */}
          {comparisonData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <InfoSection title="Comparação de Preços" icon={DollarSign} color="green">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="ticker" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Preço']}
                    />
                    <Bar dataKey="preco" fill="#10b981" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </InfoSection>

              <InfoSection title="Comparação de P/L" icon={Target} color="blue">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="ticker" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number) => [value.toFixed(2), 'P/L']}
                    />
                    <Bar dataKey="pl" fill="#3b82f6" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </InfoSection>

              <InfoSection title="Comparação de P/VP" icon={FileText} color="indigo">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="ticker" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number) => [value.toFixed(2), 'P/VP']}
                    />
                    <Bar dataKey="pvp" fill="#8b5cf6" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </InfoSection>

              <InfoSection title="Comparação de Dividend Yield" icon={TrendingUp} color="purple">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="ticker" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'DY']}
                    />
                    <Bar dataKey="dy" fill="#a855f7" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </InfoSection>

              <InfoSection title="Comparação de ROE" icon={Activity} color="orange">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="ticker" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'ROE']}
                    />
                    <Bar dataKey="roe" fill="#f59e0b" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </InfoSection>
            </div>
          )}
        </div>
      </InfoSection>
    </motion.div>
  )
}
