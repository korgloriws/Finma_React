import  { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
// @ts-ignore
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { 
  BarChart3, 
  Wallet, 
  CreditCard, 
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Zap,
  Award,
  LineChart,
  PieChartIcon,
  Calendar,
  TrendingDown,
  BookOpen,
  DollarSign,
  Calculator,
  Target,
  Shield,
  Globe,
  Star,
  Activity,
  PieChart,
  BarChart as BarChartIcon,
  Lightbulb,
  MapPin,
  ChevronRight,
  Settings
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Label
} from 'recharts'
import { carteiraService, homeService } from '../services/api'
import { formatCurrency, } from '../utils/formatters'

export default function HomePage() {
  const { user } = useAuth()
  const [ocultarValor, setOcultarValor] = useState(true) 
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1)
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())
  const [abrirMesPicker, setAbrirMesPicker] = useState(false)
  const [metaAnual, setMetaAnual] = useState<number>(() => {
    const saved = localStorage.getItem('finma_meta_anual')
    return saved ? parseFloat(saved) : 12
  })
  const [abrirConfigMeta, setAbrirConfigMeta] = useState(false)


  const { data: carteira, isLoading: loadingCarteira } = useQuery({
    queryKey: ['carteira', user],
    queryFn: carteiraService.getCarteira,
    retry: 3,
    refetchOnWindowFocus: false,
    enabled: !!user
  })


  const { data: resumoHome, isLoading: loadingResumo } = useQuery({
    queryKey: ['home-resumo', user, mesAtual, anoAtual],
    queryFn: () => homeService.getResumo(mesAtual.toString(), anoAtual.toString()),
    retry: 3,
    refetchOnWindowFocus: false,
    enabled: !!user
  })


  const [filtroPeriodo, setFiltroPeriodo] = useState<'mensal' | 'semanal' | 'trimestral' | 'semestral' | 'anual'>('mensal')




  const prev = useMemo(() => {
    const m = mesAtual - 1
    if (m >= 1) return { mes: m, ano: anoAtual }
    return { mes: 12, ano: anoAtual - 1 }
  }, [mesAtual, anoAtual])

  const { data: resumoAnterior } = useQuery({
    queryKey: ['home-resumo', user, prev.mes, prev.ano],
    queryFn: () => homeService.getResumo(prev.mes.toString(), prev.ano.toString()),
    retry: 3,
    refetchOnWindowFocus: false,
    enabled: !!user
  })

 
  const { data: historicoCarteira } = useQuery({
    queryKey: ['carteira-historico', user, filtroPeriodo],
    queryFn: () => carteiraService.getHistorico(filtroPeriodo),
    retry: 3,
    refetchOnWindowFocus: false,
    enabled: !!user
  })


  const receitas = resumoHome?.receitas?.registros || []
  const cartoes = resumoHome?.cartoes?.registros || []
  const outros = resumoHome?.outros?.registros || []
  const marmitas = resumoHome?.marmitas?.registros || []

  
  



  const totalInvestido = carteira?.reduce((total: number, ativo: any) => total + (ativo?.valor_total || 0), 0) || 0
  

  const totalReceitas = resumoHome?.receitas?.total || receitas?.reduce((total: number, receita: any) => total + (receita?.valor || 0), 0) || 0
  

  const totalCartoes = resumoHome?.cartoes?.total || cartoes?.reduce((total: number, cartao: any) => total + (cartao?.valor || 0), 0) || 0
  const totalOutros = resumoHome?.outros?.total || outros?.reduce((total: number, outro: any) => total + (outro?.valor || 0), 0) || 0

  const totalMarmitas = resumoHome?.marmitas?.total || marmitas?.reduce((total: number, marmita: any) => total + (marmita?.valor || 0), 0) || 0
  

  const totalDespesas = totalCartoes + totalOutros
  const saldoCalculado = totalReceitas - totalDespesas
  

  

  

  const ativosPorTipo = carteira?.reduce((acc, ativo) => {
    const tipo = ativo?.tipo || 'Desconhecido'
    acc[tipo] = (acc[tipo] || 0) + (ativo?.valor_total || 0)
    return acc
  }, {} as Record<string, number>) || {}
  const topAtivos = carteira?.slice(0, 5) || []

  const dadosPizza = Object.entries(ativosPorTipo).map(([tipo, valor]) => ({
    name: tipo,
    value: valor,
    fill: getRandomColor(tipo),
    percentage: totalInvestido > 0 ? ((valor / totalInvestido) * 100).toFixed(1) : '0'
  }))

  // Evolução financeira diária (não usada no gráfico principal; mantida para futuras seções)
  // removido: dadosEvolucao não é usado neste card

  const dadosGastos = [
    { name: 'Cartões', valor: totalCartoes, cor: '#ef4444' },
    { name: 'Outros', valor: totalOutros, cor: '#f97316' },
    { name: 'Marmitas', valor: totalMarmitas, cor: '#eab308' }
  ].filter(item => item.valor > 0)


  function getRandomColor(seed: string) {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ]
    const index = seed.charCodeAt(0) % colors.length
    return colors[index]
  }

 
  const formatarValor = (valor: number, prefixo: string = "R$") => {
    if (ocultarValor) return "•••••••"
    return `${prefixo} ${formatCurrency(valor)}`
  }

  // Helpers para tendências
  const calcTrend = (atual: number, anterior: number | undefined | null): { value: number; isPositive: boolean } | undefined => {
    if (anterior === undefined || anterior === null) return undefined
    if (anterior === 0) {
      if (atual === 0) return { value: 0, isPositive: false }
      return { value: 100, isPositive: atual > 0 }
    }
    const change = ((atual - anterior) / Math.abs(anterior)) * 100
    const value = Math.round(change * 10) / 10
    return { value, isPositive: change >= 0 }
  }

  // Tendência Carteira (via histórico mensal)
  const carteiraTrend = useMemo(() => {
    const arr = historicoCarteira?.carteira_valor as Array<number | null> | undefined
    if (!arr || arr.length < 2) return undefined
    // pegar os dois últimos valores não-nulos
    let cur: number | undefined
    let prevVal: number | undefined
    for (let i = arr.length - 1; i >= 0; i--) {
      const v = arr[i]
      if (v != null) {
        if (cur === undefined) cur = v
        else { prevVal = v; break }
      }
    }
    if (cur === undefined || prevVal === undefined) return undefined
    return calcTrend(cur, prevVal)
  }, [historicoCarteira])

  // Totais anteriores para Receitas/Despesas/Saldo
  const totalReceitasAnterior = useMemo(() => {
    const rec = resumoAnterior?.receitas
    if (!rec) return undefined
    if (typeof rec.total === 'number') return rec.total
    const regs = rec.registros || []
    return regs.reduce((sum: number, r: any) => sum + (r?.valor || 0), 0)
  }, [resumoAnterior])

  const totalDespesasAnterior = useMemo(() => {
    if (typeof resumoAnterior?.total_despesas === 'number') return resumoAnterior.total_despesas
    const cart = resumoAnterior?.cartoes?.registros || []
    const out = resumoAnterior?.outros?.registros || []
    const marm = resumoAnterior?.marmitas?.registros || []
    const soma = (arr: any[]) => arr.reduce((s, it) => s + (it?.valor || 0), 0)
    return soma(cart) + soma(out) + soma(marm)
  }, [resumoAnterior])

  const saldoAnterior = useMemo(() => {
    if (typeof resumoAnterior?.saldo === 'number') return resumoAnterior.saldo
    if (totalReceitasAnterior === undefined || totalDespesasAnterior === undefined) return undefined
    return totalReceitasAnterior - totalDespesasAnterior
  }, [resumoAnterior, totalReceitasAnterior, totalDespesasAnterior])

  const getNomeMes = (mes: number) => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return meses[mes - 1]
  }

  const salvarMetaAnual = (novaMeta: number) => {
    setMetaAnual(novaMeta)
    localStorage.setItem('finma_meta_anual', novaMeta.toString())
    setAbrirConfigMeta(false)
  }

  // Funções auxiliares para insights brasileiros
  const getExposicaoInternacional = () => {
    if (!carteira || carteira.length === 0) return 0
    
    const ativosInternacionais = carteira.filter((ativo: any) => {
      const ticker = ativo.ticker?.toUpperCase() || ''
      return !ticker.endsWith('.SA') && !ticker.includes('11.SA') && !ticker.includes('FIX')
    })
    
    const valorInternacional = ativosInternacionais.reduce((total: number, ativo: any) => 
      total + (ativo.valor_total || 0), 0)
    
    return totalInvestido > 0 ? (valorInternacional / totalInvestido) * 100 : 0
  }

  const getAtivosComIndexadores = () => {
    if (!carteira || carteira.length === 0) return 0
    
    const ativosComIndexador = carteira.filter((ativo: any) => 
      ativo.indexador && ativo.indexador !== 'N/A' && ativo.indexador !== '')
    
    return ativosComIndexador.length
  }

  const getConcentracaoAtivos = () => {
    if (!carteira || carteira.length === 0) return { maxAtivo: 0, maxSetor: 0 }
    
    // Maior ativo individual
    const maxAtivo = Math.max(...carteira.map((a: any) => a.valor_total || 0))
    const maxAtivoPercent = totalInvestido > 0 ? (maxAtivo / totalInvestido) * 100 : 0
    
    // Maior setor (simplificado por tipo)
    const setores = carteira.reduce((acc: Record<string, number>, ativo: any) => {
      const tipo = ativo.tipo || 'Outros'
      acc[tipo] = (acc[tipo] || 0) + (ativo.valor_total || 0)
      return acc
    }, {})
    
    const maxSetor = Math.max(...Object.values(setores))
    const maxSetorPercent = totalInvestido > 0 ? (maxSetor / totalInvestido) * 100 : 0
    
    return { maxAtivo: maxAtivoPercent, maxSetor: maxSetorPercent }
  }

  const getInsightsBrasileiros = () => {
    const insights = []
    
    // Sazonalidade
    const mesAtual = new Date().getMonth() + 1
    if (mesAtual === 5 || mesAtual === 11) {
      insights.push({
        type: 'info',
        title: 'Mês de Proventos',
        message: 'Maio e novembro são meses típicos de pagamento de dividendos e JCP.',
        icon: Calendar
      })
    }
    
    // Concentração
    const concentracao = getConcentracaoAtivos()
    if (concentracao.maxAtivo > 20) {
      insights.push({
        type: 'warning',
        title: 'Concentração Elevada',
        message: `Seu maior ativo representa ${concentracao.maxAtivo.toFixed(1)}% da carteira. Considere diversificar.`,
        icon: AlertCircle
      })
    }
    
    if (concentracao.maxSetor > 40) {
      insights.push({
        type: 'warning',
        title: 'Setor Muito Concentrado',
        message: `Seu maior setor representa ${concentracao.maxSetor.toFixed(1)}% da carteira.`,
        icon: AlertCircle
      })
    }
    
    // Exposição internacional
    const exposicaoInt = getExposicaoInternacional()
    if (exposicaoInt > 30) {
      insights.push({
        type: 'info',
        title: 'Exposição Internacional',
        message: `${exposicaoInt.toFixed(1)}% da sua carteira está em ativos internacionais.`,
        icon: Globe
      })
    }
    
    // Ativos com indexadores
    const ativosIndexados = getAtivosComIndexadores()
    if (ativosIndexados > 0) {
      insights.push({
        type: 'success',
        title: 'Ativos Indexados',
        message: `${ativosIndexados} ativos estão vinculados a indexadores (IPCA, SELIC, CDI).`,
        icon: Target
      })
    }
    
    return insights
  }

  const CardPrincipal = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 

    to, 
    trend,
    loading = false,
    delay = 0
  }: {
    title: string
    value: string
    subtitle?: string
    icon: any
    color?: string
    to: string
    trend?: { value: number; isPositive: boolean }
    loading?: boolean
    delay?: number
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
              <Link to={to} className="block">
          <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
                          <div className="p-3 rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Icon className="w-6 h-6" />
            </div>
              {trend && !loading && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                    trend.isPositive 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {trend.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span className="hidden sm:inline">{trend.value}%</span>
                </motion.div>
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded w-32"></div>
                </div>
              ) : (
                <p className="text-3xl font-bold text-foreground">{value}</p>
              )}
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            
            <div className="mt-4 flex items-center text-sm text-muted-foreground">
              <span>Ver detalhes</span>
              <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )

  // Componente de estatística melhorado

  // Componente de insight melhorado
  const InsightCard = ({ 
    title, 
    message, 
    type = 'info',
    icon: Icon,
    delay = 0
  }: {
    title: string
    message: string
    type?: 'success' | 'warning' | 'info'
    icon: any
    delay?: number
  }) => {
    const colors = {
      success: {
        bg: 'bg-primary/5',
        border: 'border-primary/20',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
        titleColor: 'text-foreground',
        messageColor: 'text-muted-foreground'
      },
      warning: {
        bg: 'bg-destructive/5',
        border: 'border-destructive/20',
        iconBg: 'bg-destructive/10',
        iconColor: 'text-destructive',
        titleColor: 'text-foreground',
        messageColor: 'text-muted-foreground'
      },
      info: {
        bg: 'bg-primary/5',
        border: 'border-primary/20',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
        titleColor: 'text-foreground',
        messageColor: 'text-muted-foreground'
      }
    }
    const color = colors[type]
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ scale: 1.02 }}
        className={`p-4 ${color.bg} rounded-xl border ${color.border} hover:shadow-lg transition-all duration-200`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${color.iconBg} flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${color.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold ${color.titleColor} mb-2 text-base`}>{title}</h3>
            <p className={`text-sm ${color.messageColor} leading-relaxed`}>{message}</p>
          </div>
        </div>
      </motion.div>
    )
  }



  // Componente para status do sistema - focado no essencial
  const SystemStatusCard = ({ delay = 0 }: { delay?: number }) => {
    // 1. Ativos desatualizados (quantos precisam de refresh)
    const ativosDesatualizados = carteira?.filter((a: any) => {
      if (!a.preco_atual || a.preco_atual <= 0) return true
      // Verificar se o preço foi atualizado nos últimos 7 dias
      if (a.ultima_atualizacao) {
        const ultimaAtualizacao = new Date(a.ultima_atualizacao)
        const diasAtras = (Date.now() - ultimaAtualizacao.getTime()) / (1000 * 60 * 60 * 24)
        return diasAtras > 7
      }
      return true
    }).length || 0

    // 2. Proventos pendentes (baseado em histórico para estimativa)
    const proventosRecebidos = useQuery({
      queryKey: ['proventos-recebidos-status'],
      queryFn: () => carteiraService.getProventosRecebidos('3m'), // Últimos 3 meses
      staleTime: 300_000,
      enabled: !!user
    }).data

    const proventosEstimados = proventosRecebidos?.reduce((total: number, p: any) => 
      total + (p.total_recebido || 0), 0) || 0
    const proventosMensais = proventosEstimados / 3 // Média mensal

    // 3. Alertas de risco (concentração, liquidez)
    const concentracao = getConcentracaoAtivos()
    
    // Calcular liquidez (ativos com volume baixo)
    const ativosBaixaLiquidez = carteira?.filter((a: any) => {
      const liquidez = a.liquidez_diaria || 0
      return liquidez < 1000000 // Menos de 1M de liquidez
    }).length || 0

    const statusItems = [
      {
        title: 'Ativos Desatualizados',
        value: ativosDesatualizados,
        total: carteira?.length || 0,
        icon: AlertCircle,
        color: ativosDesatualizados > 0 ? 'text-orange-600' : 'text-green-600',
        bgColor: ativosDesatualizados > 0 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30',
        priority: ativosDesatualizados > 0 ? 'high' : 'low',
        description: ativosDesatualizados > 0 ? 'Precisam de atualização' : 'Todos atualizados'
      },
      {
        title: 'Proventos Mensais',
        value: formatCurrency(proventosMensais),
        icon: DollarSign,
        color: proventosMensais > 0 ? 'text-green-600' : 'text-muted-600',
        bgColor: proventosMensais > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted/50',
        priority: proventosMensais > 0 ? 'medium' : 'low',
        description: 'Média dos últimos 3 meses'
      },
      {
        title: 'Concentração',
        value: concentracao.maxAtivo.toFixed(1),
        suffix: '%',
        icon: Star,
        color: concentracao.maxAtivo > 20 ? 'text-red-600' : 'text-green-600',
        bgColor: concentracao.maxAtivo > 20 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30',
        priority: concentracao.maxAtivo > 20 ? 'high' : 'low',
        description: concentracao.maxAtivo > 20 ? 'Muito concentrado' : 'Bem distribuído'
      },
      {
        title: 'Baixa Liquidez',
        value: ativosBaixaLiquidez,
        total: carteira?.length || 0,
        icon: AlertCircle,
        color: ativosBaixaLiquidez > 0 ? 'text-orange-600' : 'text-green-600',
        bgColor: ativosBaixaLiquidez > 0 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30',
        priority: ativosBaixaLiquidez > 0 ? 'medium' : 'low',
        description: ativosBaixaLiquidez > 0 ? 'Pode dificultar venda' : 'Liquidez adequada'
      }
    ]

    // Ordenar por prioridade
    const sortedItems = statusItems.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
    })

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xl"
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Status do Sistema</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {sortedItems.map((item, index) => {
            const Icon = item.icon
            
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: delay + index * 0.1 }}
                className={`p-3 sm:p-4 rounded-xl border transition-all ${
                  item.priority === 'high' 
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
                    : item.priority === 'medium'
                    ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className={`p-1.5 sm:p-2 rounded-lg ${item.bgColor} flex-shrink-0`}>
                    <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${item.color}`} />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                    {item.title}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
                    {item.value}{item.suffix || ''}
                  </p>
                  {item.total && (
                    <p className="text-xs text-muted-foreground">
                      de {item.total} total
                    </p>
                  )}
                  {item.description && (
                    <p className="text-xs text-muted-foreground leading-tight">
                      {item.description}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Última atualização: {new Date().toLocaleTimeString('pt-BR')}
            </p>
            <Link 
              to="/carteira" 
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <span className="hidden xs:inline">Ver Carteira Completa</span>
              <span className="xs:hidden">Ver Carteira</span>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </div>
      </motion.div>
    )
  }

  // Componente para próximos eventos e vencimentos
  const UpcomingEventsCard = ({ delay = 0 }: { delay?: number }) => {
    // Buscar proventos recebidos (dados reais)
    const { data: proventosRecebidos } = useQuery({
      queryKey: ['proventos-recebidos'],
      queryFn: () => carteiraService.getProventosRecebidos('6m'), // Últimos 6 meses
      staleTime: 300_000,
      enabled: !!user
    })

    // Calcular total de proventos recebidos
    const totalProventos = proventosRecebidos?.reduce((total: number, p: any) => 
      total + (p.total_recebido || 0), 0) || 0

    // Identificar ativos que pagam dividendos (baseado na carteira real)
    const ativosComDividendos = carteira?.filter((ativo: any) => {
      // Ativos que normalmente pagam dividendos
      const ticker = ativo.ticker?.toUpperCase() || ''
      return ticker.endsWith('.SA') && !ticker.includes('11') && !ticker.includes('FIX')
    }) || []

    // Calcular valor médio de dividendos por ativo (estimativa baseada em dados históricos)
    const dividendosEstimados = ativosComDividendos.map((ativo: any) => {
      const proventosAtivo = proventosRecebidos?.find(p => p.ticker === ativo.ticker)
      const mediaMensal = proventosAtivo ? (proventosAtivo.total_recebido / 6) : 0
      
      return {
        ticker: ativo.ticker,
        nome: ativo.nome_completo || ativo.ticker,
        valorEstimado: mediaMensal,
        ultimoPagamento: proventosAtivo?.proventos_recebidos?.[0]?.data || 'N/A'
      }
    }).filter(d => d.valorEstimado > 0)
    .sort((a, b) => b.valorEstimado - a.valorEstimado)

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="bg-card border border-border rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Próximos Eventos</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proventos Pendentes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Proventos Pendentes</h3>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(totalProventos)}
              </span>
            </div>
            
            {proventosRecebidos && proventosRecebidos.length > 0 ? (
              <div className="space-y-3">
                {proventosRecebidos.slice(0, 3).map((provento: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-foreground">{provento.ticker}</p>
                        <p className="text-sm text-muted-foreground">
                          {provento.proventos_recebidos?.length || 0} pagamentos
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(provento.total_recebido)}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum provento registrado</p>
              </div>
            )}
          </div>

          {/* Dividendos Estimados */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Dividendos Estimados</h3>
              <span className="text-sm text-muted-foreground">Média mensal</span>
            </div>
            
            {dividendosEstimados.length > 0 ? (
              <div className="space-y-3">
                {dividendosEstimados.slice(0, 3).map((dividendo, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + index * 0.1 }}
                    className="p-3 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{dividendo.ticker}</p>
                        <p className="text-sm text-muted-foreground">
                          Último: {dividendo.ultimoPagamento !== 'N/A' 
                            ? new Date(dividendo.ultimoPagamento).toLocaleDateString('pt-BR')
                            : 'N/A'
                          }
                        </p>
                      </div>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(dividendo.valorEstimado)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum dividendo estimado</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Atualizado em tempo real
            </p>
            <Link 
              to="/carteira" 
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Ver Todos os Eventos
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </motion.div>
    )
  }

  // Componente Performance vs Meta
  const PerformanceVsMetaCard = ({ delay = 0 }: { delay?: number }) => {
    // Calcular performance da carteira vs IBOV
    const performanceCarteira = useMemo(() => {
      if (!historicoCarteira?.carteira_valor || historicoCarteira.carteira_valor.length < 2) return null
      
      const valores = historicoCarteira.carteira_valor.filter(v => v !== null) as number[]
      if (valores.length < 2) return null
      
      const primeiro = valores[0]
      const ultimo = valores[valores.length - 1]
      return ((ultimo - primeiro) / primeiro) * 100
    }, [historicoCarteira])

    const performanceIBOV = useMemo(() => {
      if (!historicoCarteira?.ibov || historicoCarteira.ibov.length < 2) return null
      
      const valores = historicoCarteira.ibov.filter(v => v !== null) as number[]
      if (valores.length < 2) return null
      
      const primeiro = valores[0]
      const ultimo = valores[valores.length - 1]
      return ((ultimo - primeiro) / primeiro) * 100
    }, [historicoCarteira])

    // Meta anual configurável pelo usuário
    const mesesPassados = new Date().getMonth() + 1
    const metaMensal = metaAnual / 12
    const metaAcumulada = metaMensal * mesesPassados

    const status = performanceCarteira !== null && performanceCarteira >= metaAcumulada ? 'success' : 'warning'

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="bg-card border border-border rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Performance vs Meta</h3>
          </div>
          <button
            onClick={() => setAbrirConfigMeta(true)}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
            title="Configurar meta anual"
          >
            <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Performance da Carteira */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Sua Carteira</p>
            <p className={`text-2xl font-bold ${
              performanceCarteira !== null && performanceCarteira >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {performanceCarteira !== null ? `${performanceCarteira.toFixed(1)}%` : 'N/A'}
            </p>
          </div>

          {/* Comparação com IBOV */}
          {performanceIBOV !== null && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">vs IBOV</p>
              <p className={`text-lg font-semibold ${
                performanceCarteira !== null && performanceCarteira > performanceIBOV 
                  ? 'text-green-600' 
                  : 'text-muted-600'
              }`}>
                {performanceIBOV.toFixed(1)}%
              </p>
            </div>
          )}

          {/* Meta */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Meta Anual</p>
            <p className="text-lg font-semibold text-foreground">{metaAnual}%</p>
            <p className="text-xs text-muted-foreground">
              {metaAcumulada.toFixed(1)}% acumulado ({mesesPassados}/12 meses)
            </p>
          </div>

          {/* Status */}
          <div className={`p-3 rounded-lg border ${
            status === 'success' 
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
              : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
          }`}>
            <div className="flex items-center gap-2">
              {status === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-600" />
              )}
              <p className={`text-sm font-medium ${
                status === 'success' ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'
              }`}>
                {status === 'success' 
                  ? 'Meta atingida!' 
                  : 'Meta não atingida'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <Link 
            to="/analise" 
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Ver Análise Detalhada
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    )
  }

  // Componente Oportunidades de Rebalanceamento
  const OportunidadesRebalanceamentoCard = ({ delay = 0 }: { delay?: number }) => {
    // Buscar configuração de rebalanceamento real
    const { data: rbConfig } = useQuery({
      queryKey: ['rebalance-config', user],
      queryFn: carteiraService.getRebalanceConfig,
      enabled: !!user,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    })

    const { data: rbStatus } = useQuery({
      queryKey: ['rebalance-status', user],
      queryFn: carteiraService.getRebalanceStatus,
      enabled: !!user,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    })

    // Calcular alocação atual vs ideal
    const alocacaoAtual = useMemo(() => {
      if (!carteira || carteira.length === 0) return {}
      
      return carteira.reduce((acc: Record<string, number>, ativo: any) => {
        const tipo = ativo.tipo || 'Outros'
        acc[tipo] = (acc[tipo] || 0) + (ativo.valor_total || 0)
        return acc
      }, {})
    }, [carteira])

    // Usar configuração real do usuário ou padrão
    const alocacaoIdeal = useMemo(() => {
      const configTargets = (rbConfig as any)?.targets || {}
      if (Object.keys(configTargets).length > 0) {
        return configTargets
      }
      
      // Fallback para alocação padrão se não houver configuração
      return {
        'Ações': 60,
        'Fundos Imobiliários': 20,
        'Renda Fixa': 15,
        'Internacional': 5
      }
    }, [rbConfig])

    // Identificar oportunidades de rebalanceamento
    const oportunidades = useMemo(() => {
      return Object.entries(alocacaoAtual).map(([tipo, valor]) => {
        const percentualAtual = totalInvestido > 0 ? (valor / totalInvestido) * 100 : 0
        const percentualIdeal = alocacaoIdeal[tipo] || 0
        const diferenca = percentualAtual - percentualIdeal
        
        return {
          tipo,
          atual: percentualAtual,
          ideal: percentualIdeal,
          diferenca,
          acao: diferenca > 5 ? 'Reduzir' : diferenca < -5 ? 'Aumentar' : 'Manter',
          valorAtual: valor,
          valorIdeal: totalInvestido * (percentualIdeal / 100)
        }
      }).filter(op => Math.abs(op.diferenca) > 5) // Só mostrar diferenças significativas
    }, [alocacaoAtual, alocacaoIdeal, totalInvestido])

    // Status do rebalanceamento
    const statusInfo = useMemo(() => {
      if (!rbStatus) return null
      
      const canRebalance = rbStatus.can_rebalance
      const nextDue = rbStatus.next_due_date
      const daysUntilNext = rbStatus.days_until_next || 0
      const periodo = (rbConfig as any)?.periodo || 'mensal'
      
      return {
        canRebalance,
        nextDue,
        daysUntilNext,
        periodo
      }
    }, [rbStatus, rbConfig])

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xl"
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
            <PieChart className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">Rebalanceamento</h3>
        </div>

        {/* Status do Rebalanceamento */}
        {statusInfo && (
          <div className={`p-3 rounded-lg border mb-4 ${
            statusInfo.canRebalance 
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
              : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {statusInfo.canRebalance ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-600" />
              )}
              <span className={`text-sm font-medium ${
                statusInfo.canRebalance ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'
              }`}>
                {statusInfo.canRebalance ? 'Pronto para Rebalancear' : 'Aguardando Período'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Período: {statusInfo.periodo} • 
              {statusInfo.canRebalance 
                ? ' Pode rebalancear agora'
                : ` Próximo em ${statusInfo.daysUntilNext} dias`
              }
            </p>
          </div>
        )}

        {/* Oportunidades de Rebalanceamento */}
        {oportunidades.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Ajustes Necessários:</h4>
            {oportunidades.map((op, index) => {
              const progressWidth = Math.min(op.atual, 100)
              const progressClass = `progress-bar-${Math.round(progressWidth / 5) * 5}`
              return (
              <motion.div
                key={op.tipo}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + index * 0.1 }}
                className={`p-3 rounded-lg border ${
                  op.acao === 'Reduzir' 
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground text-sm sm:text-base">{op.tipo}</span>
                  <span className={`text-xs sm:text-sm font-semibold ${
                    op.acao === 'Reduzir' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {op.acao}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mb-2">
                  <div>
                    <span className="text-muted-foreground">Atual: </span>
                    <span className="font-medium">{op.atual.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ideal: </span>
                    <span className="font-medium">{op.ideal}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-muted-foreground">Valor atual: </span>
                    <span className="font-medium">{formatCurrency(op.valorAtual)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor ideal: </span>
                    <span className="font-medium">{formatCurrency(op.valorIdeal)}</span>
                  </div>
                </div>
                
                <div className="mt-2 w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${progressClass} ${
                      op.acao === 'Reduzir' ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  />
                </div>
              </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm sm:text-base">Carteira bem balanceada!</p>
            <p className="text-xs mt-1">Todos os tipos estão dentro da alocação ideal</p>
          </div>
        )}

        {/* Resumo da Alocação */}
        {Object.keys(alocacaoAtual).length > 0 && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">Resumo da Alocação:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(alocacaoAtual).map(([tipo, valor]) => {
                const percentual = totalInvestido > 0 ? (valor / totalInvestido) * 100 : 0
                return (
                  <div key={tipo} className="flex justify-between">
                    <span className="truncate">{tipo}:</span>
                    <span className="font-medium">{percentual.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <Link 
            to="/carteira?tab=rebalance" 
            className="flex items-center gap-2 text-xs sm:text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <span className="hidden xs:inline">Configurar Rebalanceamento</span>
            <span className="xs:hidden">Rebalancear</span>
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </Link>
        </div>
      </motion.div>
    )
  }

  // Componente Alertas de Mercado
  const AlertasMercadoCard = ({ delay = 0 }: { delay?: number }) => {
    // Alertas baseados em dados reais da carteira
    const alertas = useMemo(() => {
      const alertasArray = []
      
      // Alerta de volatilidade (se IBOV teve queda > 5% no período)
      if (historicoCarteira?.ibov && historicoCarteira.ibov.length > 0) {
        const valoresIBOV = historicoCarteira.ibov.filter(v => v !== null) as number[]
        if (valoresIBOV.length > 1) {
          const queda = ((valoresIBOV[0] - valoresIBOV[valoresIBOV.length - 1]) / valoresIBOV[0]) * 100
          if (queda > 5) {
            alertasArray.push({
              tipo: 'warning',
              titulo: 'Mercado em Queda',
              mensagem: `IBOV caiu ${queda.toFixed(1)}% no período. Considere oportunidades.`,
              icon: TrendingDown
            })
          }
        }
      }

      // Alerta de concentração setorial
      const concentracao = getConcentracaoAtivos()
      if (concentracao.maxSetor > 50) {
        alertasArray.push({
          tipo: 'warning',
          titulo: 'Concentração Setorial',
          mensagem: `Setor ${concentracao.maxSetor.toFixed(1)}% da carteira. Risco elevado.`,
          icon: AlertCircle
        })
      }

      // Alerta de exposição internacional
      const exposicaoInt = getExposicaoInternacional()
      if (exposicaoInt > 40) {
        alertasArray.push({
          tipo: 'info',
          titulo: 'Exposição Internacional',
          mensagem: `${exposicaoInt.toFixed(1)}% em ativos internacionais.`,
          icon: Globe
        })
      }

      // Alerta de liquidez
      const ativosBaixaLiquidez = carteira?.filter((a: any) => {
        const liquidez = a.liquidez_diaria || 0
        return liquidez < 1000000
      }).length || 0
      
      if (ativosBaixaLiquidez > 2) {
        alertasArray.push({
          tipo: 'warning',
          titulo: 'Baixa Liquidez',
          mensagem: `${ativosBaixaLiquidez} ativos com baixa liquidez.`,
          icon: AlertCircle
        })
      }

      return alertasArray
    }, [carteira, historicoCarteira])

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="bg-card border border-border rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Alertas de Mercado</h3>
        </div>

        {alertas.length > 0 ? (
          <div className="space-y-3">
            {alertas.map((alerta, index) => {
              const Icon = alerta.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + index * 0.1 }}
                  className={`p-3 rounded-lg border ${
                    alerta.tipo === 'warning' 
                      ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
                      : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded ${
                      alerta.tipo === 'warning' 
                        ? 'bg-orange-100 dark:bg-orange-900/30' 
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        alerta.tipo === 'warning' ? 'text-orange-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm mb-1">
                        {alerta.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alerta.mensagem}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum alerta ativo</p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <Link 
            to="/guia" 
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Ver Guia de Mercado
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    )
  }

  // Componente para atalhos inteligentes baseados no contexto
  const SmartQuickActions = ({ delay = 0 }: { delay?: number }) => {
    const getContextualActions = () => {
      const actions = []
      
      // Baseado no estado da carteira
      if (!carteira || carteira.length === 0) {
        actions.push({
          to: "/carteira",
          icon: Building2,
          title: "Começar a Investir",
          subtitle: "Adicione seu primeiro ativo",
          priority: "high"
        })
      } else {
        actions.push({
          to: "/analise",
          icon: BarChart3,
          title: "Análise de Oportunidades",
          subtitle: "Encontre novos ativos",
          priority: "medium"
        })
      }
      
      // Baseado no saldo
      if (saldoCalculado < 0) {
        actions.push({
          to: "/controle",
          icon: Wallet,
          title: "Controle Financeiro",
          subtitle: "Organize suas finanças",
          priority: "high"
        })
      }
      
      // Baseado na diversificação
      const concentracao = getConcentracaoAtivos()
      if (concentracao.maxAtivo > 20 || concentracao.maxSetor > 40) {
        actions.push({
          to: "/guia",
          icon: BookOpen,
          title: "Guia do Mercado",
          subtitle: "Aprenda sobre diversificação",
          priority: "medium"
        })
      }
      
      // Funcionalidades educativas sempre disponíveis
      actions.push({
        to: "/juros-compostos",
        icon: Calculator,
        title: "Juros Compostos",
        subtitle: "Simule seus investimentos",
        priority: "low"
      })
      
      actions.push({
        to: "/conversor",
        icon: DollarSign,
        title: "Conversor de Moedas",
        subtitle: "Compare valores internacionais",
        priority: "low"
      })
      
      // Ordenar por prioridade
      return actions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
      }).slice(0, 6) // Máximo 6 ações
    }

    const contextualActions = getContextualActions()

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="bg-card border border-border rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Lightbulb className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Ações Inteligentes</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contextualActions.map((action, index) => {
            const Icon = action.icon
            
            return (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: delay + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link to={action.to} className="block">
                  <div className="p-4 bg-card border border-border rounded-xl hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 group">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 text-foreground group-hover:text-primary transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {action.subtitle}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center text-sm text-primary/70 group-hover:text-primary transition-colors">
                      <span>Acessar</span>
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Ações baseadas no seu perfil e contexto atual
            </p>
            <Link 
              to="/analise" 
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Ver Todas as Funcionalidades
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 space-y-8">
        {/* Header com animações */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
        
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Visão geral completa do seu sistema financeiro e patrimonial
          </p>
          
          {/* Controles: calendário discreto à esquerda, mostrar/ocultar à direita */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative">
              <button
                aria-haspopup="dialog"
                onClick={() => setAbrirMesPicker(v => !v)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-card/60 backdrop-blur border border-border rounded-full text-sm hover:bg-card/80 transition shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline select-none">{getNomeMes(mesAtual)} {anoAtual}</span>
              </button>
              {abrirMesPicker && (
                <div className="absolute left-0 mt-2 w-64 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-3 z-20">
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Selecionar mês"
                      value={mesAtual}
                      onChange={(e)=>setMesAtual(parseInt(e.target.value))}
                      className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{getNomeMes(m)}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Selecionar ano"
                      value={anoAtual}
                      onChange={(e)=>setAnoAtual(parseInt(e.target.value))}
                      className="w-[90px] px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                    >
                      {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 3 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <button
                      onClick={()=>setAbrirMesPicker(false)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setOcultarValor(!ocultarValor)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition shadow-sm"
              >
                {ocultarValor ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden sm:inline select-none">{ocultarValor ? 'Mostrar' : 'Ocultar'}</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Cards principais com animações - Ordem Contábil */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardPrincipal
            title="Receitas"
            value={formatarValor(totalReceitas)}
            subtitle={`${receitas?.length || 0} registros • ${getNomeMes(mesAtual)}`}
            icon={ArrowUpRight}
            color="green"
            to="/controle"
            trend={calcTrend(totalReceitas, totalReceitasAnterior)}
            loading={loadingResumo}
            delay={0.1}
          />
          
          <CardPrincipal
            title="Despesas"
            value={formatarValor(totalDespesas)}
            subtitle={`Cartões + Outros • ${getNomeMes(mesAtual)}`}
            icon={CreditCard}
            color="red"
            to="/controle"
            trend={calcTrend(totalDespesas, totalDespesasAnterior)}
            loading={loadingResumo}
            delay={0.2}
          />
          
          <CardPrincipal
            title="Saldo Mensal"
            value={formatarValor(saldoCalculado)}
            subtitle={`${formatarValor(totalReceitas, '')} - ${formatarValor(totalDespesas, '')} • ${getNomeMes(mesAtual)}`}
            icon={Wallet}
            color={saldoCalculado >= 0 ? 'green' : 'red'}
            to="/controle"
            trend={calcTrend(saldoCalculado, saldoAnterior)}
            loading={loadingResumo}
            delay={0.3}
          />
          
          <CardPrincipal
            title="Carteira"
            value={formatarValor(totalInvestido)}
            subtitle={`${carteira?.length || 0} ativos`}
            icon={Building2}
            color="blue"
            to="/carteira"
            trend={carteiraTrend}
            loading={loadingCarteira}
            delay={0.4}
          />
        </div>

        {/* Seção de gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gráfico de evolução financeira */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <LineChart className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Evolução da Carteira</h2>
              <div className="ml-auto">
                <select
                  value={filtroPeriodo}
                  onChange={(e)=>{
                    const val = e.target.value as any
                    setFiltroPeriodo(val)
                  }}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                  aria-label="Período do gráfico"
                >
                  <option value="mensal">Mensal</option>
                  <option value="semanal">Semanal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
            </div>
            
            {loadingResumo ? (
              <div className="animate-pulse h-64 bg-muted rounded-lg"></div>
            ) : (historicoCarteira?.datas?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={(historicoCarteira?.datas || []).map((d: string, i: number) => ({
                  data: d,
                  carteira: historicoCarteira?.carteira?.[i] ?? null,
                  ibov: historicoCarteira?.ibov?.[i] ?? null,
                  ivvb11: historicoCarteira?.ivvb11?.[i] ?? null,
                  ifix: historicoCarteira?.ifix?.[i] ?? null,
                  ipca: historicoCarteira?.ipca?.[i] ?? null,
                  cdi: historicoCarteira?.cdi?.[i] ?? null,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="data" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Area type="monotone" dataKey="carteira" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} strokeWidth={2} name="Carteira" />
                  <Area type="monotone" dataKey="ibov" stroke="#22c55e" fill="#22c55e" fillOpacity={0.08} strokeWidth={1.5} name="Ibovespa" />
                  <Area type="monotone" dataKey="ivvb11" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} strokeWidth={1.5} name="IVVB11" />
                  <Area type="monotone" dataKey="ifix" stroke="#a855f7" fill="#a855f7" fillOpacity={0.08} strokeWidth={1.5} name="IFIX" />
                  <Area type="monotone" dataKey="ipca" stroke="#ef4444" fill="#ef4444" fillOpacity={0.05} strokeWidth={1.2} name="IPCA" />
                  <Area type="monotone" dataKey="cdi" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.06} strokeWidth={1.2} name="CDI" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado.
              </div>
            )}
          </motion.div>

          {/* Gráfico de pizza da carteira */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <PieChartIcon className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Distribuição da Carteira</h2>
            </div>
            
            {loadingCarteira ? (
              <div className="animate-pulse h-64 bg-muted rounded-lg"></div>
            ) : dadosPizza.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={dadosPizza}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dadosPizza.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill}>
                        <Label
                          content={({ viewBox, percent }: any) => {
                            if (percent && percent > 0.05 && viewBox) { 
                              const { cx, cy, midAngle, innerRadius, outerRadius } = viewBox;
                              const RADIAN = Math.PI / 180;
                              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                              const y = cy + radius * Math.sin(-midAngle * RADIAN);
                              
                              return (
                                <text
                                  x={x}
                                  y={y}
                                  fill="white"
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fontSize="12"
                                  fontWeight="bold"
                                  filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))"
                                >
                                  {`${(percent * 100).toFixed(1)}%`}
                                </text>
                              );
                            }
                            return null;
                          }}
                        />
                      </Cell>
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: any, _name: any, props: any) => [
                      `${formatCurrency(value)} (${props.payload.percentage}%)`, 
                      'Valor'
                    ]}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
                          ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum ativo na carteira
                </div>
              )}
          </motion.div>
        </div>

        {/* Status do sistema e próximos vencimentos */}
        <div className="space-y-8">
          <SystemStatusCard delay={0.7} />
          <UpcomingEventsCard delay={0.8} />
        </div>

        {/* Novos Cards de Alto Impacto */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PerformanceVsMetaCard delay={0.9} />
          <OportunidadesRebalanceamentoCard delay={1.0} />
          <AlertasMercadoCard delay={1.1} />
        </div>

        {/* Seção de análise rápida */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top ativos */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Top 5 Ativos</h2>
            </div>
            
            {loadingCarteira ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {topAtivos.map((ativo: any, index: number) => (
                  <motion.div 
                    key={ativo.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">
                          {index + 1}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-lg truncate">{ativo.ticker}</p>
                        <p className="text-sm text-muted-foreground truncate">{ativo.nome_completo}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-foreground text-lg">{formatarValor(ativo.valor_total)}</p>
                      <p className="text-sm text-muted-foreground">
                        {ativo.quantidade} x {formatarValor(ativo.preco_atual)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Gráfico de gastos */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-xl"
          >
                          <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChartIcon className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Gastos por Categoria</h2>
              </div>
            {loadingResumo ? (
              <div className="animate-pulse h-64 bg-muted rounded-lg"></div>
            ) : dadosGastos.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dadosGastos}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: any) => [formatCurrency(value), 'Valor']}
                  />
                  <Bar dataKey="valor" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nenhuma despesa registrada para o período selecionado.
              </div>
            )}
          </motion.div>
        </div>

        {/* Seção de insights */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">Insights e Recomendações</h2>
          </div>
          
          {/* Insights básicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <InsightCard
              title="Diversificação"
              message={carteira && carteira.length < 5 
                ? "Considere diversificar mais sua carteira para reduzir riscos."
                : "Sua carteira está bem diversificada!"}
              type={carteira && carteira.length < 5 ? 'warning' : 'success'}
              icon={carteira && carteira.length < 5 ? AlertCircle : CheckCircle}
              delay={0.1}
            />
            <InsightCard
              title="Saldo"
              message={saldoCalculado < 0
                ? "Atenção: Saldo negativo. Considere reduzir gastos."
                : "Ótimo! Seu saldo está positivo."}
              type={saldoCalculado < 0 ? 'warning' : 'success'}
              icon={saldoCalculado < 0 ? AlertCircle : CheckCircle}
              delay={0.2}
            />
            <InsightCard
              title="Investimentos"
              message={totalInvestido === 0 
                ? "Nenhum ativo na carteira. Considere começar a investir."
                : `Você tem ${formatCurrency(totalInvestido)} investidos em ${carteira?.length || 0} ativos.`}
              type={totalInvestido === 0 ? 'warning' : 'success'}
              icon={totalInvestido === 0 ? AlertCircle : CheckCircle}
              delay={0.3}
            />
          </div>

          {/* Insights brasileiros contextuais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Insights do Mercado Brasileiro
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getInsightsBrasileiros().map((insight, index) => {
                const Icon = insight.icon
                return (
                  <InsightCard
                    key={insight.title}
                    title={insight.title}
                    message={insight.message}
                    type={insight.type as any}
                    icon={Icon}
                    delay={0.4 + index * 0.1}
                  />
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Ações inteligentes */}
        <SmartQuickActions delay={1.0} />

        {/* Modal de Configuração da Meta */}
        {abrirConfigMeta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setAbrirConfigMeta(false)}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Configurar Meta Anual</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Meta de Rentabilidade Anual (%)
                  </label>
                  <input
                    type="number"
                    value={metaAnual}
                    onChange={(e) => setMetaAnual(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Ex: 12"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Meta atual: {metaAnual}% ao ano
                  </p>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-foreground mb-2">Sugestões de Meta:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[8, 10, 12, 15, 18, 20].map((sugestao) => (
                      <button
                        key={sugestao}
                        onClick={() => setMetaAnual(sugestao)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          metaAnual === sugestao
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border hover:bg-muted/50'
                        }`}
                      >
                        {sugestao}%
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium mb-1">Dicas para definir sua meta:</p>
                      <ul className="text-xs space-y-1">
                        <li>• <strong>8-10%:</strong> Meta conservadora (CDI + 2-4%)</li>
                        <li>• <strong>12-15%:</strong> Meta moderada (inflação + 6-9%)</li>
                        <li>• <strong>18-20%:</strong> Meta agressiva (mercado de ações)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
                <button
                  onClick={() => setAbrirConfigMeta(false)}
                  className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => salvarMetaAnual(metaAnual)}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Salvar Meta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
} 