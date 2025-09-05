import { motion } from 'framer-motion'
import { 
  Target, 
  DollarSign, 
  TrendingUp
} from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'

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

// Componente para card de métrica
function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: {
  title: string
  value: string
  icon: any
  color: string
}) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${colorClasses[color as keyof typeof colorClasses]}`} />
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </motion.div>
  )
}

interface DetalhesConceptsTabProps {
  info: any
  grahamBadge: { label: string; color: string } | null
  bazinBadge: { label: string; color: string } | null
  grahamEPSText: string
  setGrahamEPSText: (value: string) => void
  commitGrahamEPS: () => void
  grahamGText: string
  setGrahamGText: (value: string) => void
  commitGrahamG: () => void
  grahamYText: string
  setGrahamYText: (value: string) => void
  commitGrahamY: () => void
  grahamFairPrice: number | null
  dividends12m: number | null
  bazinRatePct: number
  setBazinRatePct: (value: number) => void
  bazinCeilingPrice: number | null
}

export default function DetalhesConceptsTab({
  info,
  grahamBadge,
  bazinBadge,
  grahamEPSText,
  setGrahamEPSText,
  commitGrahamEPS,
  grahamGText,
  setGrahamGText,
  commitGrahamG,
  grahamYText,
  setGrahamYText,
  commitGrahamY,
  grahamFairPrice,
  dividends12m,
  bazinRatePct,
  setBazinRatePct,
  bazinCeilingPrice
}: DetalhesConceptsTabProps) {
  return (
    <motion.div
      key="concepts"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Preço Justo de Graham */}
      <InfoSection title="Preço Justo de Graham" icon={Target} color="blue">
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground leading-relaxed">
            Fórmula clássica (adaptada): <strong>V = LPA × (8,5 + 2g) × (4,4 / Y)</strong><br/>
            Onde: LPA = lucro por ação (EPS), g = crescimento esperado anual (%), Y = taxa de juros de referência (%).<br/>
            Quanto maior o crescimento e menor a taxa de juros, maior o preço justo estimado.
          </div>
          {/* Selos */}
          <div className="flex flex-wrap gap-2">
            {grahamBadge && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${
                grahamBadge.color === 'green' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-300 dark:border-green-800' :
                grahamBadge.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/10 dark:text-yellow-300 dark:border-yellow-800' :
                'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-300 dark:border-red-800'
              }`}>
                {grahamBadge.label}
              </span>
            )}
          </div>
          {/* Parâmetros e resultados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">LPA (EPS)</label>
              <input
                type="text"
                value={grahamEPSText}
                onChange={(e)=>setGrahamEPSText(e.target.value)}
                onKeyDown={(e)=>{ if (e.key==='Enter') commitGrahamEPS() }}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                placeholder="Ex.: 5.32"
              />
              <div className="text-xs text-muted-foreground mt-1">Pressione Enter para aplicar; padrão: EPS automático.</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Crescimento (g) %</label>
              <input
                type="text"
                value={grahamGText}
                onChange={(e)=>setGrahamGText(e.target.value)}
                onKeyDown={(e)=>{ if (e.key==='Enter') commitGrahamG() }}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                placeholder="Ex.: 10"
              />
              <div className="text-xs text-muted-foreground mt-1">Pressione Enter para aplicar; padrão: crescimento automático.</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Taxa de juros (Y) %</label>
              <input
                type="text"
                value={grahamYText}
                onChange={(e)=>setGrahamYText(e.target.value)}
                onKeyDown={(e)=>{ if (e.key==='Enter') commitGrahamY() }}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                placeholder="Ex.: 15"
              />
              <div className="text-xs text-muted-foreground mt-1">Pressione Enter para aplicar; padrão: taxa automática (SELIC se BR).</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard title="Preço Justo (Graham)" value={formatCurrency(grahamFairPrice)} icon={DollarSign} color="green" />
            <MetricCard title="Preço Atual" value={formatCurrency(info.currentPrice)} icon={DollarSign} color="purple" />
            <MetricCard title="Margem vs Atual" value={grahamFairPrice!=null&&info.currentPrice? `${(((grahamFairPrice-info.currentPrice)/info.currentPrice)*100).toFixed(2)}%` : '-'} icon={TrendingUp} color="orange" />
          </div>
        </div>
      </InfoSection>

      {/* Método Bazin */}
      <InfoSection title="Método Bazin (Teto por Dividendos)" icon={DollarSign} color="green">
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground leading-relaxed">
            Fórmula: <strong>Preço Teto = Dividendos dos últimos 12 meses / (Taxa de DY desejada)</strong>.<br/>
            Ex.: se a empresa pagou R$ 2,00 em 12 meses e você deseja 8% ao ano, o teto seria 2 / 0,08 = R$ 25,00.
          </div>
          {/* Selo */}
          <div className="flex flex-wrap gap-2">
            {bazinBadge && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${
                bazinBadge.color === 'green' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-300 dark:border-green-800' :
                'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-300 dark:border-red-800'
              }`}>
                {bazinBadge.label}
              </span>
            )}
          </div>
          {/* Parâmetros e resultados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Dividendos 12m</label>
              <div className="px-3 py-2 border border-border rounded bg-background text-foreground">
                {formatCurrency(dividends12m)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Se indisponível, usa dividendRate anual do yfinance.</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Taxa DY desejada (%)</label>
              <input type="number" value={bazinRatePct} onChange={(e)=>setBazinRatePct(parseFloat(e.target.value)||0)} className="w-full px-3 py-2 border border-border rounded bg-background text-foreground" placeholder="Ex.: 8" title="Taxa mínima desejada de DY em %"/>
              <div className="text-xs text-muted-foreground mt-1">Ajuste conforme seu objetivo (ex.: 8% a.a.).</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preço Teto (Bazin)</label>
              <div className="px-3 py-2 border border-border rounded bg-background text-foreground">
                {formatCurrency(bazinCeilingPrice)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard title="Preço Teto (Bazin)" value={formatCurrency(bazinCeilingPrice)} icon={DollarSign} color="green" />
            <MetricCard title="Preço Atual" value={formatCurrency(info.currentPrice)} icon={DollarSign} color="purple" />
            <MetricCard title="Margem vs Atual" value={bazinCeilingPrice!=null&&info.currentPrice? `${(((bazinCeilingPrice-info.currentPrice)/info.currentPrice)*100).toFixed(2)}%` : '-'} icon={TrendingUp} color="orange" />
          </div>
        </div>
      </InfoSection>
    </motion.div>
  )
}
