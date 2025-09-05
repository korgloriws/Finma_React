import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface DetalhesFixedIncomeTabProps {
  fiPeriodo: "1y" | "6m" | "3y" | "5y" | "max"
  setFiPeriodo: (value: "1y" | "6m" | "3y" | "5y" | "max") => void
  fiChartData: Array<{
    label: string
    Ativo: number | null
    CDI: number | null
    SELIC: number | null
    IPCA: number | null
  }>
  fiResumo: Record<string, number> | null
}

export default function DetalhesFixedIncomeTab({
  fiPeriodo,
  setFiPeriodo,
  fiChartData,
  fiResumo
}: DetalhesFixedIncomeTabProps) {
  return (
    <motion.div
      key="fixedincome"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Filtro de período */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Período:</label>
        <select
          className="px-3 py-2 border border-border rounded bg-background text-foreground"
          value={fiPeriodo}
          onChange={(e) => setFiPeriodo(e.target.value as "1y" | "6m" | "3y" | "5y" | "max")}
          aria-label="Selecionar período de comparação"
        >
          <option value="6m">6 meses</option>
          <option value="1y">1 ano</option>
          <option value="3y">3 anos</option>
          <option value="5y">5 anos</option>
          <option value="max">Máximo</option>
        </select>
      </div>

      {/* Gráfico comparativo rebase 100 */}
      <div className="bg-muted/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Crescimento Comparado (Ativo x CDI x SELIC x IPCA)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={fiChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} angle={-12} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 'auto']} />
              <Tooltip formatter={(v: any) => (v != null ? `${Number(v).toFixed(2)}%` : '-')} />
              <Legend />
              <Line type="monotone" dataKey="Ativo" stroke="#2563eb" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="CDI" stroke="#16a34a" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="SELIC" stroke="#f59e0b" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="IPCA" stroke="#ef4444" dot={false} strokeWidth={2} />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resumo textual da comparação */}
      {fiResumo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { k: 'Ativo', label: 'Ativo', color: 'text-blue-600' },
            { k: 'CDI', label: 'CDI', color: 'text-emerald-600' },
            { k: 'SELIC', label: 'SELIC', color: 'text-amber-600' },
            { k: 'IPCA', label: 'IPCA', color: 'text-rose-600' },
          ].map((it) => (
            <div key={it.k} className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">{it.label} ({fiPeriodo})</div>
              <div className={`text-xl font-bold ${it.color}`}>
                {isFinite(Number((fiResumo as any)[it.k]))
                  ? `${Number((fiResumo as any)[it.k]).toFixed(2)}%`
                  : '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
