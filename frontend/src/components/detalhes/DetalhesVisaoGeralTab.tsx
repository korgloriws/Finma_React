import { motion } from 'framer-motion'
import { 
  DollarSign, 
  Target, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  Building2,
  Globe,
  Users,
  PieChart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  BarChart3,
  Award
} from 'lucide-react'
import { formatCurrency, formatPercentage, formatNumber, formatDividendYield } from '../../utils/formatters'

// Componente para card de métrica
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color, 
  trend, 
  loading 
}: {
  title: string
  value: string
  subtitle?: string
  icon: any
  color: string
  trend?: { value: number; isPositive: boolean }
  loading?: boolean
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
        {trend && !loading && (
          <div className={`flex items-center gap-1 text-xs ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(trend.value).toFixed(2)}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </motion.div>
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

// Componente para linha de informação
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
        {typeof value === 'string' && value.startsWith('http') ? (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
            title="Abrir link"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          value
        )}
      </span>
    </div>
  )
}

// Função para calcular variação
function calcularVariacao(valorAtual: number, valorAnterior: number): number {
  if (!valorAnterior || valorAnterior === 0) return 0
  return ((valorAtual - valorAnterior) / valorAnterior) * 100
}

interface DetalhesVisaoGeralTabProps {
  ticker: string
  info: any
  logoUrl: string | null | undefined
  historico: Array<Record<string, any>> | undefined
  loadingHistorico: boolean
  strategyDetails: {
    meets: boolean
    criteria: Array<{ label: string; value: string; ok: boolean }>
  }
  tipoAtivo: string
  fiiInfo: any
  grahamBadge: { label: string; color: string } | null
  bazinBadge: { label: string; color: string } | null
  enterpriseValue: number | null
  ebitComputed: number | null
  evToEbit: number | null
}

export default function DetalhesVisaoGeralTab({
  ticker,
  info,
  logoUrl,
  historico,
  loadingHistorico,
  strategyDetails,
  tipoAtivo,
  fiiInfo,
  grahamBadge,
  bazinBadge,
  enterpriseValue,
  ebitComputed,
  evToEbit
}: DetalhesVisaoGeralTabProps) {
  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header do ativo */}
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20 flex-wrap">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={ticker} 
            className="w-16 h-16 rounded-lg object-contain border-2 border-border bg-white p-2 shadow-md"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
            {ticker.replace('.SA', '').replace('.sa', '').slice(0, 4)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-foreground min-w-0 break-words">{info.longName}</h2>
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border shrink-0 ${
                strategyDetails.meets
                  ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                  : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
              }`}
              title={strategyDetails.meets ? 'Dentro da estratégia' : 'Fora da estratégia'}
            >
              {strategyDetails.meets ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline whitespace-nowrap">
                {strategyDetails.meets ? 'Dentro da estratégia' : 'Fora da estratégia'}
              </span>
            </motion.span>
            <div className="w-full mt-2 flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="hidden md:inline">Critérios:</span>
              {strategyDetails.criteria.map((c, idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * idx }}
                  className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full border text-xs ${
                    c.ok
                      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-300 dark:border-green-800'
                      : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-300 dark:border-red-800'
                  }`}
                  title={`${c.label}: ${c.value}`}
                >
                  {c.ok ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  <span className="max-w-[80px] sm:max-w-[120px] truncate">{c.label}</span>
                </motion.span>
              ))}
              {tipoAtivo === 'FII' && (
                <>
                  {fiiInfo?.tipo && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/10 dark:text-purple-300 dark:border-purple-800 text-xs"
                      title={`Tipo de FII: ${fiiInfo?.tipo}`}
                    >
                      <PieChart className="w-3 h-3" />
                      <span className="max-w-[100px] sm:max-w-[140px] truncate">{fiiInfo?.tipo}</span>
                    </span>
                  )}
                  {fiiInfo?.segmento && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/10 dark:text-indigo-300 dark:border-indigo-800 text-xs"
                      title={`Segmento: ${fiiInfo?.segmento}`}
                    >
                      <Building2 className="w-3 h-3" />
                      <span className="max-w-[120px] sm:max-w-[160px] truncate">{fiiInfo?.segmento}</span>
                    </span>
                  )}
                </>
              )}
              {/* Selos de Graham e Bazin no overview (responsivos) */}
              {grahamBadge && (
                <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full border text-xs font-medium ${
                  grahamBadge.color === 'green' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-300 dark:border-green-800' :
                  grahamBadge.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/10 dark:text-yellow-300 dark:border-yellow-800' :
                  'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-300 dark:border-red-800'
                }`}>
                  <span className="hidden sm:inline">{grahamBadge.label}</span>
                  <span className="sm:hidden">{grahamBadge.label.split(' ')[0]}</span>
                </span>
              )}
              {bazinBadge && (
                <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full border text-xs font-medium ${
                  bazinBadge.color === 'green' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-300 dark:border-green-800' :
                  'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-300 dark:border-red-800'
                }`}>
                  <span className="hidden sm:inline">{bazinBadge.label}</span>
                  <span className="sm:hidden">{bazinBadge.label.split(' ')[0]}</span>
                </span>
              )}
            </div>
          </div>
          <p className="text-lg text-muted-foreground">{info.symbol}</p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-muted-foreground">
            {info.sector && <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{info.sector}</span>}
            {info.country && <span className="flex items-center gap-1"><Globe className="w-4 h-4" />{info.country}</span>}
            {info.website && (
              <a 
                href={info.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Website
              </a>
            )}
            <a 
              href={`https://www.google.com/search?q=${encodeURIComponent(ticker)}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
              title="Pesquisar no Google"
            >
              <ExternalLink className="w-4 h-4" />
              Google
            </a>
          </div>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Preço Atual"
          value={formatCurrency(info.currentPrice)}
          icon={DollarSign}
          color="green"
          trend={historico && historico.length > 1 ? {
            value: calcularVariacao(historico[historico.length - 1].Close, historico[historico.length - 2].Close),
            isPositive: historico[historico.length - 1].Close > historico[historico.length - 2].Close
          } : undefined}
          loading={loadingHistorico}
        />
        <MetricCard
          title="P/L"
          value={formatNumber(info.trailingPE)}
          subtitle="Price/Earnings"
          icon={Target}
          color="blue"
        />
        <MetricCard
          title="P/VP"
          value={formatNumber(info.priceToBook)}
          subtitle="Price/Book Value"
          icon={FileText}
          color="indigo"
        />
        <MetricCard
          title="Dividend Yield"
          value={formatDividendYield(info.dividendYield)}
          icon={TrendingUp}
          color="purple"
        />
        <MetricCard
          title="ROE"
          value={formatPercentage(info.returnOnEquity ? info.returnOnEquity * 100 : null)}
          subtitle="Return on Equity"
          icon={Activity}
          color="orange"
        />
      </div>

      {/* Informações da empresa / FII */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoSection title="Informações Gerais" icon={Building2} color="blue">
          <div className="space-y-1">
            <InfoRow label="Nome Completo" value={info.longName} icon={FileText} />
            <InfoRow label="Ticker" value={info.symbol} icon={Award} />
            <InfoRow label="País" value={info.country} icon={Globe} />
            <InfoRow label="Setor" value={info.sector} icon={Building2} />
            {/* Campos adicionais para FII */}
            <InfoRow label="Tipo de FII" value={fiiInfo?.tipo} icon={PieChart} />
            <InfoRow label="Segmento" value={fiiInfo?.segmento} icon={Target} />
            <InfoRow label="Gestora" value={fiiInfo?.gestora} icon={Users} />
            <InfoRow label="Administradora" value={fiiInfo?.administradora} icon={Users} />
            <InfoRow label="Patrimônio Líquido" value={formatCurrency(fiiInfo?.patrimonio_liquido)} icon={DollarSign} />
            <InfoRow label="Vacância" value={fiiInfo?.vacancia ? `${fiiInfo.vacancia}%` : '-'} icon={AlertTriangle} />
            <InfoRow label="Nº de Cotistas" value={fiiInfo?.num_cotistas?.toLocaleString('pt-BR')} icon={Users} />
            <InfoRow label="Nº de Imóveis" value={fiiInfo?.num_imoveis?.toString()} icon={Building2} />
            <InfoRow label="Indústria" value={info.industry} icon={Target} />
            <InfoRow label="Website" value={info.website} icon={ExternalLink} />
            <InfoRow label="Funcionários" value={info.fullTimeEmployees?.toLocaleString('pt-BR')} icon={Users} />
            <InfoRow label="Moeda" value={info.currency} icon={DollarSign} />
          </div>
        </InfoSection>

        <InfoSection title="Indicadores de Mercado" icon={TrendingUp} color="green">
          <div className="space-y-1">
            <InfoRow label="Market Cap" value={formatCurrency(info.marketCap)} icon={DollarSign} />
            <InfoRow label="Enterprise Value (EV)" value={formatCurrency(enterpriseValue)} icon={DollarSign} />
            <InfoRow label="EBIT (estimado)" value={formatCurrency(ebitComputed)} icon={Target} />
            <InfoRow label="EV/EBIT" value={formatNumber(evToEbit)} icon={FileText} />
            <InfoRow label="Volume Médio" value={formatCurrency(info.averageVolume)} icon={BarChart3} />
            <InfoRow label="Beta" value={formatNumber(info.beta)} icon={Activity} />
            <InfoRow label="Média 50 dias" value={formatCurrency(info.fiftyDayAverage)} icon={TrendingUp} />
            <InfoRow label="Média 200 dias" value={formatCurrency(info.twoHundredDayAverage)} icon={TrendingUp} />
            <InfoRow label="Máx 52 Semanas" value={formatCurrency(info.fiftyTwoWeekHigh)} icon={TrendingUp} />
            <InfoRow label="Mín 52 Semanas" value={formatCurrency(info.fiftyTwoWeekLow)} icon={TrendingDown} />
          </div>
        </InfoSection>
      </div>
    </motion.div>
  )
}
