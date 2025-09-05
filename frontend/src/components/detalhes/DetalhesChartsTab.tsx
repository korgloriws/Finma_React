import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign
} from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
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

interface DetalhesChartsTabProps {
  periodo: string
  handlePeriodoChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  loadingHistorico: boolean
  chartData: Array<Record<string, any>>
  dividendYieldChartData: Array<Record<string, any>>
}

export default function DetalhesChartsTab({
  periodo,
  handlePeriodoChange,
  loadingHistorico,
  chartData,
  dividendYieldChartData
}: DetalhesChartsTabProps) {
  return (
    <motion.div
      key="charts"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Controles dos gráficos */}
      <div className="flex items-center gap-4">
        <label className="font-medium flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          Período dos Gráficos:
        </label>
        <select
          value={periodo}
          onChange={handlePeriodoChange}
          className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
          aria-label="Selecionar período dos gráficos"
        >
          <option value="1mo">1 mês</option>
          <option value="3mo">3 meses</option>
          <option value="6mo">6 meses</option>
          <option value="1y">1 ano</option>
          <option value="5y">5 anos</option>
          <option value="max">Máximo</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Preço */}
        <InfoSection title="Evolução do Preço de Fechamento" icon={TrendingUp} color="blue">
          {loadingHistorico ? (
            <LoadingSpinner text="Carregando gráfico..." />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="Date" 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))', 
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  formatter={(value: number) => [formatCurrency(value), 'Preço']}
                />
                <Line type="monotone" dataKey="Close" stroke="#3b82f6" strokeWidth={2} />
              </RechartsLineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Histórico não disponível
            </div>
          )}
        </InfoSection>

        {/* Gráfico de Dividend Yield */}
        <InfoSection title="Evolução do Dividend Yield" icon={BarChart3} color="green">
          {loadingHistorico ? (
            <LoadingSpinner text="Carregando gráfico..." />
          ) : dividendYieldChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={dividendYieldChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="Date" 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))', 
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  formatter={(value: number, name: string) => [
                    name === 'DividendYield' ? `${value.toFixed(2)}%` : formatCurrency(value), 
                    name === 'DividendYield' ? 'Dividend Yield' : name === 'Dividend' ? 'Dividendo' : 'Preço'
                  ]}
                />
                <Bar dataKey="DividendYield" fill="#10b981" name="Dividend Yield" />
              </RechartsBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Dados não disponíveis
            </div>
          )}
        </InfoSection>
      </div>

      {/* Gráfico de Dividendos em Valores */}
      <InfoSection title="Evolução dos Dividendos" icon={DollarSign} color="purple">
        {loadingHistorico ? (
          <LoadingSpinner text="Carregando gráfico..." />
        ) : dividendYieldChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={dividendYieldChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="Date" 
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                formatter={(value: number) => [formatCurrency(value), 'Dividendo']}
              />
              <Line type="monotone" dataKey="Dividend" stroke="#f59e0b" strokeWidth={2} />
            </RechartsLineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Dados não disponíveis
          </div>
        )}
      </InfoSection>
    </motion.div>
  )
}
