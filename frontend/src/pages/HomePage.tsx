import  { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { 
  BarChart3, 
  Wallet, 
  CreditCard, 
  UtensilsCrossed,
  Search,
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
  PieChartIcon
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
          
          {/* Controles melhorados */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 shadow-lg">
              <span className="text-sm font-medium text-muted-foreground">Período:</span>
              <span className="text-sm font-semibold text-foreground">
                {getNomeMes(mesAtual)}/{anoAtual}
              </span>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (mesAtual > 1) {
                      setMesAtual(mesAtual - 1)
                    } else {
                      setMesAtual(12)
                      setAnoAtual(anoAtual - 1)
                    }
                  }}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    if (mesAtual < 12) {
                      setMesAtual(mesAtual + 1)
                    } else {
                      setMesAtual(1)
                      setAnoAtual(anoAtual + 1)
                    }
                  }}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  →
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setOcultarValor(!ocultarValor)}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors"
              >
                {ocultarValor ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {ocultarValor ? 'Mostrar' : 'Ocultar'}
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Cards principais com animações */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardPrincipal
            title="Carteira"
            value={formatarValor(totalInvestido)}
            subtitle={`${carteira?.length || 0} ativos`}
            icon={Building2}
            color="blue"
            to="/carteira"
            trend={carteiraTrend}
            loading={loadingCarteira}
            delay={0.1}
          />
          
          <CardPrincipal
            title="Receitas"
            value={formatarValor(totalReceitas)}
            subtitle={`${receitas?.length || 0} registros • ${getNomeMes(mesAtual)}`}
            icon={ArrowUpRight}
            color="green"
            to="/controle"
            trend={calcTrend(totalReceitas, totalReceitasAnterior)}
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
            title="Despesas"
            value={formatarValor(totalDespesas)}
            subtitle={`Cartões + Outros • ${getNomeMes(mesAtual)}`}
            icon={CreditCard}
            color="red"
            to="/controle"
            trend={calcTrend(totalDespesas, totalDespesasAnterior)}
            loading={loadingResumo}
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
                <BarChart3 className="w-6 h-6 text-primary" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
              delay={0.5}
            />
            <InsightCard
              title="Controle"
              message={totalDespesas === 0 
                ? "Nenhuma despesa registrada. Mantenha o controle de seus gastos."
                : "Você está controlando bem suas despesas."}
              type={totalDespesas === 0 ? 'info' : 'success'}
              icon={totalDespesas === 0 ? AlertCircle : CheckCircle}
              delay={0.6}
            />
          </div>
        </motion.div>

        {/* Ações rápidas */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="bg-card border border-border rounded-2xl p-8 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">Ações Rápidas</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { to: "/carteira", icon: Building2, title: "Gerenciar Carteira", key: "carteira" },
              { to: "/controle", icon: Wallet, title: "Controle Financeiro", key: "controle-financeiro" },
              { to: "/controle?tab=alimentacao", icon: UtensilsCrossed, title: "Controle de Marmitas", key: "marmitas" },
              { to: "/analise", icon: BarChart3, title: "Análise de Ativos", key: "analise" }
            ].map((action, index) => (
              <motion.div
                key={action.key}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 1.1 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link to={action.to} className="block">
                  <div className="p-6 bg-card border border-border rounded-xl hover:bg-muted transition-all duration-200">
                    <div className="flex items-center gap-3">
                                             <div className="p-3 rounded-lg bg-primary/10">
                         <action.icon className="w-6 h-6 text-primary" />
                       </div>
                                             <span className="font-semibold text-foreground text-lg">{action.title}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
} 