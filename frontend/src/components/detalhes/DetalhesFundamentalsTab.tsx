import { motion } from 'framer-motion'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  Award,
  AlertTriangle,
  PieChart,
  Activity,
  Calendar
} from 'lucide-react'
import { formatCurrency, formatPercentage, formatNumber } from '../../utils/formatters'


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


function InfoRow({ 
  label, 
  value, 
  icon: Icon 
}: {
  label: string
  value: string | number | null | undefined
  icon: any
}) {
  if (!value || value === '-') return null

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  )
}

interface DetalhesFundamentalsTabProps {
  info: any
  fiiInfo: any
}

export default function DetalhesFundamentalsTab({
  info,
  fiiInfo
}: DetalhesFundamentalsTabProps) {
  return (
    <motion.div
      key="fundamentals"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoSection title="Resultados e Crescimento" icon={TrendingUp} color="green">
          <div className="space-y-1">
            <InfoRow label="Receita Total" value={formatCurrency(info.totalRevenue)} icon={DollarSign} />
            <InfoRow label="Lucro Líquido" value={formatCurrency(info.netIncomeToCommon)} icon={DollarSign} />
            <InfoRow label="EBITDA" value={formatCurrency(info.ebitda)} icon={DollarSign} />
            <InfoRow label="Lucro por Ação (EPS)" value={formatCurrency(info.trailingEps, '')} icon={Award} />
            <InfoRow label="BVPS" value={formatCurrency(info.bookValue)} icon={FileText} />
            <InfoRow label="Crescimento Receita (5y)" value={formatPercentage(info.revenueGrowth ? info.revenueGrowth * 100 : null)} icon={TrendingUp} />
            <InfoRow label="Crescimento Lucro (5y)" value={formatPercentage(info.earningsGrowth ? info.earningsGrowth * 100 : null)} icon={TrendingUp} />
          </div>
        </InfoSection>

        <InfoSection title="Endividamento" icon={TrendingDown} color="red">
          <div className="space-y-1">
            <InfoRow label="Dívida Líquida" value={formatNumber(info.debtToEquity)} icon={AlertTriangle} />
            <InfoRow label="Dívida/EBITDA" value={formatPercentage(info.debtToEbitda ? info.debtToEbitda * 100 : null)} icon={AlertTriangle} />
            <InfoRow label="Dívida/Ativos" value={formatPercentage(info.debtToAssets ? info.debtToAssets * 100 : null)} icon={AlertTriangle} />
            <InfoRow label="Dívida/Capital" value={formatPercentage(info.debtToCapital ? info.debtToCapital * 100 : null)} icon={AlertTriangle} />
            <InfoRow label="Dívida/Fluxo de Caixa" value={formatPercentage(info.debtToCashFlow ? info.debtToCashFlow * 100 : null)} icon={AlertTriangle} />
            <InfoRow label="Dívida/Fluxo de Caixa Livre" value={formatPercentage(info.debtToFreeCashFlow ? info.debtToFreeCashFlow * 100 : null)} icon={AlertTriangle} />
            <InfoRow label="Dívida/EBIT" value={formatPercentage(info.debtToEbit ? info.debtToEbit * 100 : null)} icon={AlertTriangle} />
            <InfoRow label="Dívida/Lucro Líquido" value={formatPercentage(info.debtToNetIncome ? info.debtToNetIncome * 100 : null)} icon={AlertTriangle} />
          </div>
        </InfoSection>

        <InfoSection title="Dividendos" icon={DollarSign} color="purple">
          <div className="space-y-1">
            <InfoRow label="Último Dividendo" value={formatCurrency(info.lastDiv)} icon={DollarSign} />
            <InfoRow label="Dividendos por Ação" value={formatCurrency(info.dividendRate)} icon={DollarSign} />
            <InfoRow label="Payout Ratio" value={formatPercentage(info.payoutRatio ? info.payoutRatio * 100 : null)} icon={PieChart} />
            {/* FII extras */}
            <InfoRow label="DY 12 meses (calc.)" value={fiiInfo?.dy_12m != null ? `${fiiInfo.dy_12m.toFixed(2)}%` : '-'} icon={TrendingUp} />
            <InfoRow label="Dividendo médio (12m)" value={formatCurrency(fiiInfo?.dividendo_medio_12m)} icon={DollarSign} />
            <InfoRow label="Último rendimento" value={formatCurrency(fiiInfo?.ultimo_rendimento_valor)} icon={DollarSign} />
            <InfoRow label="Data último rendimento" value={fiiInfo?.ultimo_rendimento_data ? new Date(fiiInfo.ultimo_rendimento_data).toLocaleDateString('pt-BR') : '-'} icon={Calendar} />
          </div>
        </InfoSection>

        <InfoSection title="Eficiência Operacional" icon={Activity} color="blue">
          <div className="space-y-1">
            <InfoRow label="Margem Bruta" value={formatPercentage(info.grossMargins ? info.grossMargins * 100 : null)} icon={TrendingUp} />
            <InfoRow label="Margem Operacional" value={formatPercentage(info.operatingMargins ? info.operatingMargins * 100 : null)} icon={TrendingUp} />
            <InfoRow label="Margem Líquida" value={formatPercentage(info.profitMargins ? info.profitMargins * 100 : null)} icon={TrendingUp} />
            <InfoRow label="ROA" value={formatPercentage(info.returnOnAssets ? info.returnOnAssets * 100 : null)} icon={Activity} />
            <InfoRow label="ROIC" value={formatPercentage(info.returnOnInvestedCapital ? info.returnOnInvestedCapital * 100 : null)} icon={Activity} />
          </div>
        </InfoSection>
      </div>
    </motion.div>
  )
}
