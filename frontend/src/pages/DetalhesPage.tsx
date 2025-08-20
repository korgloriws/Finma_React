import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  TrendingUp, 
  BarChart3, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Activity, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Building2,
  Globe,
  Users,
  FileText,
  PieChart,
  LineChart,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { ativoService } from '../services/api'
import { AtivoDetalhes, AtivoInfo } from '../types'
import { formatCurrency, formatPercentage, formatNumber, formatDividendYield } from '../utils/formatters'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, } from 'recharts'
import TickerWithLogo from '../components/TickerWithLogo'
import { normalizeTicker, getDisplayTicker } from '../utils/tickerUtils'

export default function DetalhesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputTicker, setInputTicker] = useState('')
  const [periodo, setPeriodo] = useState('1y')
  const [, setTickersComparar] = useState<string[]>([])
  const compararInputRef = useRef<HTMLInputElement>(null)
  const [periodoDividendos, setPeriodoDividendos] = useState('1y')
  const [activeTab, setActiveTab] = useState<'overview' | 'fundamentals' | 'charts' | 'comparison' | 'dividends'>('overview')

  const ticker = searchParams.get('ticker') || ''

  const { data: detalhes, isLoading: loadingDetalhes, error: errorDetalhes, refetch: refetchDetalhes } = useQuery<AtivoDetalhes & { fii?: Record<string, any> }>({
    queryKey: ['ativo-detalhes', ticker],
    queryFn: () => ativoService.getDetalhes(ticker),
    enabled: !!ticker,
  })

  const { data: historico, isLoading: loadingHistorico } = useQuery<Array<Record<string, any>>>({
    queryKey: ['ativo-historico', ticker, periodo],
    queryFn: () => ativoService.getHistorico(ticker, periodo),
    enabled: !!ticker,
  })



  const [comparacao, setComparacao] = useState<AtivoInfo[]>([])
  const [loadingComparacao, setLoadingComparacao] = useState(false)

  const handleBuscar = useCallback(() => {
    if (inputTicker.trim()) {
      const normalizedTicker = normalizeTicker(inputTicker.trim())
      setSearchParams({ ticker: getDisplayTicker(normalizedTicker) })
    }
  }, [inputTicker, setSearchParams])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputTicker(e.target.value)
  }, [])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBuscar()
    }
  }, [handleBuscar])



  

  const handleComparar = useCallback(async () => {
    const value = compararInputRef.current?.value || ''
    if (!value.trim()) {
      setTickersComparar([])
      setComparacao([])
      return
    }
    const tickers = value.split(',').map(t => t.trim()).filter(t => t)
    setTickersComparar(tickers)
    
    setLoadingComparacao(true)
    try {
      const resultado = await ativoService.comparar([...tickers, ticker].filter(Boolean))
      setComparacao(resultado)
    } catch (error) {
      console.error('Erro ao comparar ativos:', error)
      setComparacao([])
    } finally {
      setLoadingComparacao(false)
    }
  }, [ticker])

  const handleCompararKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleComparar()
    }
  }, [handleComparar])

  const handlePeriodoChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPeriodo(e.target.value)
  }, [])

  const handlePeriodoDividendosChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPeriodoDividendos(e.target.value)
  }, [])

  const { data: logoUrl } = useQuery<string | null>({
    queryKey: ['logo', ticker],
    queryFn: () => ativoService.getLogoUrl(ticker),
    enabled: !!ticker,
  })

  useEffect(() => {
    if (ticker && ticker !== inputTicker) {
      setInputTicker(ticker)
    }
  }, [ticker])


  const info: any = detalhes?.info || {}
  const fiiInfo: any = detalhes?.fii

  
  const tipoAtivo: 'Ação' | 'BDR' | 'FII' = useMemo(() => {
    const sym = (info?.symbol || ticker || '').toUpperCase()
    const base = sym.replace('.SA', '')
    if (base.endsWith('11')) return 'FII'
    const sufixo = base.slice(-2)
    const num = parseInt(sufixo, 10)
    if ([31, 32, 33, 34, 35, 36, 39, 40].includes(num)) return 'BDR'
    return 'Ação'
  }, [info, ticker])

  // Métricas normalizadas
  const roePct = useMemo(() => {
    const v = info?.returnOnEquity as number | undefined
    if (v == null) return null
    return v * 100 // yfinance retorna fração
  }, [info])

  const dyPct = useMemo(() => {
    
    if (tipoAtivo === 'FII') {
      if (typeof fiiInfo?.dy_12m === 'number') return fiiInfo.dy_12m
      const d = info?.dividendYield as number | undefined
      return d != null ? d * 100 : null
    }
    const d = info?.dividendYield as number | undefined
    return d != null ? d * 100 : null
  }, [info, fiiInfo, tipoAtivo])

  const pl = info?.trailingPE ?? null
  const pvp = info?.priceToBook ?? null
  const liquidezDiaria = info?.averageDailyVolume10Day ?? info?.averageVolume ?? 0

  // Regras da estratégia por tipo (declarado antes de qualquer return condicional)
  const strategyDetails = useMemo(() => {
    if (tipoAtivo === 'FII') {
      const c1 = dyPct != null && dyPct >= 12 && dyPct <= 15
      const c2 = liquidezDiaria > 1_000_000
      return {
        meets: Boolean(c1 && c2),
        criteria: [
          { label: 'DY entre 12% e 15%', ok: Boolean(c1), value: dyPct != null ? `${dyPct.toFixed(2)}%` : '-' },
          { label: 'Liquidez diária > 1.000.000', ok: Boolean(c2), value: liquidezDiaria?.toLocaleString('pt-BR') },
        ],
      }
    }
    if (tipoAtivo === 'BDR') {
      const c1 = roePct != null && roePct >= 15
      const c2 = dyPct != null && dyPct > 2
      const c3 = pl != null && pl >= 1 && pl <= 15
      const c4 = pvp != null && pvp <= 2
      return {
        meets: Boolean(c1 && c2 && c3 && c4),
        criteria: [
          { label: 'ROE ≥ 15%', ok: Boolean(c1), value: roePct != null ? `${roePct.toFixed(2)}%` : '-' },
          { label: 'DY > 2%', ok: Boolean(c2), value: dyPct != null ? `${dyPct.toFixed(2)}%` : '-' },
          { label: 'P/L entre 1 e 15', ok: Boolean(c3), value: pl != null ? pl.toFixed(2) : '-' },
          { label: 'P/VP ≤ 2', ok: Boolean(c4), value: pvp != null ? pvp.toFixed(2) : '-' },
        ],
      }
    }
    // Ação (default)
    const c1 = roePct != null && roePct >= 15
    const c2 = dyPct != null && dyPct > 12
    const c3 = pl != null && pl >= 1 && pl <= 10
    const c4 = pvp != null && pvp <= 2
    return {
      meets: Boolean(c1 && c2 && c3 && c4),
      criteria: [
        { label: 'ROE ≥ 15%', ok: Boolean(c1), value: roePct != null ? `${roePct.toFixed(2)}%` : '-' },
        { label: 'DY > 12%', ok: Boolean(c2), value: dyPct != null ? `${dyPct.toFixed(2)}%` : '-' },
        { label: 'P/L entre 1 e 10', ok: Boolean(c3), value: pl != null ? pl.toFixed(2) : '-' },
        { label: 'P/VP ≤ 2', ok: Boolean(c4), value: pvp != null ? pvp.toFixed(2) : '-' },
      ],
    }
  }, [tipoAtivo, roePct, dyPct, pl, pvp, liquidezDiaria])

  // Componente de loading animado
  const LoadingSpinner = ({ text }: { text: string }) => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 space-y-4"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
      />
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-foreground">{text}</p>
        <p className="text-sm text-muted-foreground">
          Carregando dados ...
        </p>
      </div>
    </motion.div>
  )


  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color = 'blue',
    trend,
    loading = false
  }: { 
    title: string
    value: string
    subtitle?: string
    icon: any
    color?: string
    trend?: { value: number; isPositive: boolean }
    loading?: boolean
  }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
        </div>
        {trend && !loading && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              trend.isPositive 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {trend.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend.value).toFixed(1)}%
          </motion.div>
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-24"></div>
          </div>
        ) : (
          <p className="text-2xl font-bold text-foreground">{value}</p>
        )}
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </motion.div>
  )


  const InfoRow = ({ label, value, icon: Icon, color = 'gray' }: { 
    label: string
    value: string | null | undefined
    icon?: any
    color?: string
  }) => (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between flex-wrap gap-3 py-3 px-4 rounded-lg hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon className={`w-4 h-4 text-${color}-500`} />
        )}
        <span className="font-medium text-sm text-muted-foreground">{label}:</span>
      </div>
      <span className="text-sm font-semibold text-foreground text-right break-all max-w-full sm:max-w-[60%] ml-auto">
        {value || '-'}
      </span>
    </motion.div>
  )


  const InfoSection = ({ 
    title, 
    icon: Icon, 
    color = 'blue', 
    children 
  }: { 
    title: string
    icon: any
    color?: string
    children: React.ReactNode
  }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-6 shadow-lg"
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
        </div>
        {title}
      </h3>
      {children}
    </motion.div>
  )

  
  const calcularVariacao = (atual: number, anterior: number) => {
    return ((atual - anterior) / anterior) * 100
  }


  const chartData = useMemo(() => {
    if (!historico || historico.length === 0) return []
    
    return historico.map(item => ({
      ...item,
      Date: new Date(item.Date).toISOString().split('T')[0]
    }))
  }, [historico])

  const dividendData = useMemo(() => {
    if (!detalhes?.dividends) return []
    
    
    const now = new Date()
    let startDate: Date
    
    switch (periodoDividendos) {
      case '1mo':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
      case '3mo':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        break
      case '6mo':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        break
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      case '2y':
        startDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
        break
      case '5y':
        startDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())
        break
      case 'max':
      default:
        startDate = new Date(0) 
        break
    }
    
    return Object.entries(detalhes.dividends)
      .filter(([date]) => new Date(date) >= startDate)
      .map(([date, dividend]) => ({
        Date: date,
        Dividend: dividend,
        DividendYield: 0, 
        Price: 0 
      }))
      .sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())
  }, [detalhes, periodoDividendos])

  
  const dividendYieldChartData = useMemo(() => {
    if (!historico || !detalhes?.dividends) return []
    
    return Object.entries(detalhes.dividends).map(([date, dividend]) => {
      const price = historico.find(h => h.Date === date)?.Close || 1
      return {
        Date: date,
        Dividend: dividend,
        DividendYield: (dividend / price) * 100,
        Price: price
      }
    }).filter(item => item.DividendYield > 0).sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime())
  }, [historico, detalhes])

  
  const comparisonData = useMemo(() => {
    if (!comparacao || comparacao.length === 0) return []
    
    return comparacao.map(ativo => ({
      ticker: ativo.ticker,
      preco: ativo.preco_atual || 0,
      pl: ativo.pl || 0,
      pvp: ativo.pvp || 0,
      dy: ativo.dy || 0,
      roe: ativo.roe || 0
    }))
  }, [comparacao])

  if (!ticker) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h1 className="text-3xl font-bold text-foreground">Detalhes do Ativo</h1>
        
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Digite o ticker (ex: PETR4, AAPL, MSFT, ITUB4.SA, VISC11)..."
              value={inputTicker}
              onChange={handleInputChange}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBuscar}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Buscar
          </motion.button>
        </div>

        <div className="text-center text-muted-foreground">
          <p>Digite um ticker para buscar os detalhes do ativo.</p>
          <p className="text-sm mt-2">Exemplos: PETR4, AAPL, MSFT, ITUB4.SA, VISC11, TSLA, BOVA11.SA, AMZO34.SA</p>
        </div>
      </motion.div>
    )
  }

  if (loadingDetalhes) {
    return <LoadingSpinner text="Carregando detalhes do ativo..." />
  }

  if (errorDetalhes || !detalhes?.info?.longName) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h1 className="text-3xl font-bold text-foreground">Detalhes do Ativo</h1>
        
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Digite o ticker (ex: PETR4, AAPL, MSFT, ITUB4.SA, VISC11)..."
              value={inputTicker}
              onChange={handleInputChange}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBuscar}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Buscar
          </motion.button>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-destructive/10 border border-destructive/20 rounded-lg p-4"
        >
          <p className="text-destructive font-medium">Nenhuma informação detalhada disponível para o ticker informado.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Exemplos válidos: PETR4, AAPL, MSFT, ITUB4.SA, VISC11, TSLA, BOVA11.SA, AMZO34.SA
          </p>
        </motion.div>
      </motion.div>
    )
  }


  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header com busca */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground">Detalhes do Ativo</h1>
        
        <div className="flex gap-2 sm:gap-4 items-center w-full lg:w-auto">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="text"
              placeholder="Digite o ticker..."
            value={inputTicker}
            onChange={handleInputChange}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          onClick={handleBuscar}
          className="px-4 sm:px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          Buscar
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => refetchDetalhes()}
            className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Tabs de navegação */}
      <div className="bg-card border border-border rounded-lg">
        <div className="border-b border-border">
          <div className="flex overflow-x-auto">
            {[
              { id: 'overview', label: 'Visão Geral', icon: PieChart },
              { id: 'fundamentals', label: 'Fundamentos', icon: Target },
              { id: 'charts', label: 'Gráficos', icon: LineChart },
              { id: 'dividends', label: 'Proventos', icon: DollarSign },
              { id: 'comparison', label: 'Comparação', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
        </button>
            ))}
          </div>
      </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="hidden md:inline">Critérios:</span>
                        {strategyDetails.criteria.map((c, idx) => (
                          <motion.span
                            key={idx}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.03 * idx }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
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
                            <span className="max-w-[120px] truncate">{c.label}</span>
                          </motion.span>
                        ))}
                      </div>
                    </div>
                    <p className="text-lg text-muted-foreground">{info.symbol}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
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
            )}

            {activeTab === 'fundamentals' && (
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
            )}

            {activeTab === 'charts' && (
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
                        <BarChart data={dividendYieldChartData}>
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
                </BarChart>
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
            )}

            {activeTab === 'dividends' && (
              <motion.div
                key="dividends"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Controles dos proventos */}
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                  <label className="font-medium flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-500" />
                    Período dos Proventos:
                  </label>
                  <select
                    value={periodoDividendos}
                    onChange={handlePeriodoDividendosChange}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    aria-label="Selecionar período dos proventos"
                  >
                    <option value="1mo">1 mês</option>
                    <option value="3mo">3 meses</option>
                    <option value="6mo">6 meses</option>
                    <option value="1y">1 ano</option>
                    <option value="2y">2 anos</option>
                    <option value="5y">5 anos</option>
                    <option value="max">Máximo</option>
                  </select>
          </div>

                {/* Tabela de Proventos */}
                <InfoSection title="Histórico de Proventos" icon={DollarSign} color="green">
                  {dividendData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Data</th>
                            <th className="px-4 py-3 text-left font-medium">Valor do Dividendo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dividendData.map((item, index) => (
                            <motion.tr 
                              key={item.Date} 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-muted/40 transition-colors`}
                            >
                              <td className="px-4 py-3 font-medium">
                                {new Date(item.Date).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-4 py-3 font-semibold text-green-600">
                                {formatCurrency(item.Dividend)}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
        </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum provento encontrado para este período.</p>
                    </div>
                  )}
                </InfoSection>

                {/* Resumo dos Proventos */}
                {dividendData.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InfoSection title="Total de Proventos" icon={DollarSign} color="green">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(dividendData.reduce((sum, item) => sum + item.Dividend, 0))}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Soma de todos os proventos
                        </p>
            </div>
                    </InfoSection>

                    <InfoSection title="Média por Provento" icon={TrendingUp} color="blue">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(dividendData.reduce((sum, item) => sum + item.Dividend, 0) / dividendData.length)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Média do período
                        </p>
                      </div>
                    </InfoSection>

                    <InfoSection title="Maior Provento" icon={Award} color="purple">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(Math.max(...dividendData.map(item => item.Dividend)))}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Maior valor do período
                        </p>
                      </div>
                    </InfoSection>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'comparison' && (
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
                                <td className="px-4 py-3">{ativo.nome}</td>
                                <td className="px-4 py-3 font-semibold">{formatCurrency(ativo.preco_atual)}</td>
                                <td className="px-4 py-3">{formatNumber(ativo.pl)}</td>
                                <td className="px-4 py-3">{formatNumber(ativo.pvp)}</td>
                                <td className="px-4 py-3 text-green-600 font-medium">{formatDividendYield(ativo.dy)}</td>
                                <td className="px-4 py-3">{formatPercentage(ativo.roe ? ativo.roe * 100 : null)}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">{ativo.setor}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">{ativo.pais}</td>
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
                            <BarChart data={comparisonData}>
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
                            </BarChart>
            </ResponsiveContainer>
                        </InfoSection>

                        <InfoSection title="Comparação de P/L" icon={Target} color="blue">
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonData}>
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
                            </BarChart>
                          </ResponsiveContainer>
                        </InfoSection>

                        <InfoSection title="Comparação de P/VP" icon={FileText} color="indigo">
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonData}>
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
                            </BarChart>
                          </ResponsiveContainer>
                        </InfoSection>

                        <InfoSection title="Comparação de Dividend Yield" icon={TrendingUp} color="purple">
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonData}>
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
                            </BarChart>
                          </ResponsiveContainer>
                        </InfoSection>

                        <InfoSection title="Comparação de ROE" icon={Activity} color="orange">
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonData}>
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
                            </BarChart>
            </ResponsiveContainer>
                        </InfoSection>
            </div>
          )}
        </div>
                </InfoSection>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    </div>
    </motion.div>
  )
} 