import { motion } from 'framer-motion'
import { formatPercentage } from '../../utils/formatters'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  ScatterChart,
  Scatter,
} from 'recharts'
import { AtivoAnalise } from '../../types'

interface AnaliseGraficosTabProps {
  ativosAcoes: AtivoAnalise[]
  ativosBdrs: AtivoAnalise[]
  ativosFiis: AtivoAnalise[]
}

export default function AnaliseGraficosTab({ 
  ativosAcoes, 
  ativosBdrs, 
  ativosFiis 
}: AnaliseGraficosTabProps) {

  const todosAtivos = [
    ...ativosAcoes,
    ...ativosBdrs,
    ...ativosFiis
  ]

  if (todosAtivos.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-muted-foreground py-8"
      >
        Aplique filtros para ver os gráficos.
      </motion.div>
    )
  }

  const topDy = todosAtivos
    .sort((a, b) => (b.dividend_yield || 0) - (a.dividend_yield || 0))
    .slice(0, 5)
    .map(ativo => ({
      ticker: ativo.ticker,
      valor: ativo.dividend_yield || 0
    }))

  const topRoe = todosAtivos
    .sort((a, b) => (b.roe || 0) - (a.roe || 0))
    .slice(0, 5)
    .map(ativo => ({
      ticker: ativo.ticker,
      valor: ativo.roe || 0
    }))

  const menorPl = todosAtivos
    .filter(ativo => ativo.pl && ativo.pl > 0)
    .sort((a, b) => (a.pl || 0) - (b.pl || 0))
    .slice(0, 5)
    .map(ativo => ({
      ticker: ativo.ticker,
      valor: ativo.pl || 0
    }))

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* P/L vs Dividend Yield */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">P/L vs Dividend Yield</h3>
        <ResponsiveContainer width="100%" height={250}>
          <ScatterChart data={todosAtivos}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="pl" 
              name="P/L" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              dataKey="dividend_yield" 
              name="Dividend Yield (%)" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tick={{ fontSize: 10 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))', 
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                fontSize: '12px'
              }}
              formatter={(value: any, name: string) => [value, name]} 
            />
            <Scatter dataKey="dividend_yield" fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Top 5 Dividend Yield */}
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Top 5 Dividend Yield</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RechartsBarChart data={topDy}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="ticker" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tick={{ fontSize: 8 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tick={{ fontSize: 8 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                  fontSize: '12px'
                }}
                formatter={(value: any) => [formatPercentage(value), 'DY']} 
              />
              <Bar dataKey="valor" fill="#10b981" />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 ROE */}
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Top 5 ROE</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RechartsBarChart data={topRoe}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="ticker" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tick={{ fontSize: 8 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tick={{ fontSize: 8 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                  fontSize: '12px'
                }}
                formatter={(value: any) => [formatPercentage(value), 'ROE']} 
              />
              <Bar dataKey="valor" fill="#3b82f6" />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        {/* Menor P/L */}
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Menor P/L</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RechartsBarChart data={menorPl}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="ticker" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tick={{ fontSize: 8 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tick={{ fontSize: 8 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                  fontSize: '12px'
                }}
                formatter={(value: any) => [value.toFixed(2), 'P/L']} 
              />
              <Bar dataKey="valor" fill="#f59e0b" />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}
