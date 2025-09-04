import { useState, useCallback, useMemo, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { 
  Plus, 
  Minus, 
  Target, 
  BarChart3, 
  Trophy, 
  Calendar, 
  Brain, 
  History,
  FileText,
  TrendingUp,
  Activity,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
  PieChart,
  Settings,
  Calculator,
  CheckCircle,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { carteiraService } from '../services/api'
import { AtivoCarteira, Movimentacao } from '../types'
import { formatCurrency, formatPercentage, formatDividendYield, formatNumber } from '../utils/formatters'
import TickerWithLogo from '../components/TickerWithLogo'
import HelpTips from '../components/HelpTips'
import { normalizeTicker, getDisplayTicker } from '../utils/tickerUtils'
import { 

  AreaChart, 
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,

  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts'

export default function CarteiraPage() {
  const { user } = useAuth()
  const [inputTicker, setInputTicker] = useState('')
  const [inputQuantidade, setInputQuantidade] = useState('')
  const [inputTipo, setInputTipo] = useState('')
  const [inputPreco, setInputPreco] = useState('')
  const [inputIndexador, setInputIndexador] = useState<'CDI' | 'IPCA' | 'SELIC' | ''>('')
  const [inputIndexadorPct, setInputIndexadorPct] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editQuantidade, setEditQuantidade] = useState('')
  const [filtroMes, setFiltroMes] = useState<number>(new Date().getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState<number>(new Date().getFullYear())
  const [activeTab, setActiveTab] = useState('ativos')
  const now = new Date()
  const [repMes, setRepMes] = useState<string>(String(now.getMonth() + 1).padStart(2, '0'))
  const [repAno, setRepAno] = useState<string>(String(now.getFullYear()))
  const [repRendPeriodo, setRepRendPeriodo] = useState<'mensal'|'trimestral'|'semestral'|'anual'|'maximo'>('mensal')
  const [previewMovs, setPreviewMovs] = useState<Movimentacao[] | null>(null)
  const [loadingPreviewMovs, setLoadingPreviewMovs] = useState(false)
  const [previewRend, setPreviewRend] = useState<{ datas: string[]; carteira_valor: number[] } | null>(null)
  const [loadingPreviewRend, setLoadingPreviewRend] = useState(false)
  const [manageTipoOpen, setManageTipoOpen] = useState<{open: boolean; tipo?: string}>({open: false})
  const [renameTipoValue, setRenameTipoValue] = useState('')
  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ['carteira-insights', user],
    queryFn: carteiraService.getInsights,
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
  const { data: rbConfig } = useQuery({
    queryKey: ['rebalance-config', user],
    queryFn: carteiraService.getRebalanceConfig,
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  })
  const { data: rbStatus, refetch: refetchRbStatus } = useQuery({
    queryKey: ['rebalance-status', user],
    queryFn: carteiraService.getRebalanceStatus,
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })
  const { data: rbHistory } = useQuery({
    queryKey: ['rebalance-history', user],
    queryFn: carteiraService.getRebalanceHistory,
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  })
  const saveRebalanceMutation = useMutation({
    mutationFn: carteiraService.saveRebalanceConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rebalance-config', user] })
      queryClient.invalidateQueries({ queryKey: ['rebalance-status', user] })
      queryClient.invalidateQueries({ queryKey: ['rebalance-history', user] })
      refetchRbStatus()
      toast.success('Configuração salva')
    },
    onError: (err: any) => {
      if (err?.response?.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.')
      } else {
        toast.error('Falha ao salvar configuração')
      }
    }
  })
  const [idealPreview, setIdealPreview] = useState<{ periodo: string; targets: Record<string, number> } | null>(null)
  
  // Inicializar preview quando rbConfig mudar
  useEffect(() => {
    if (rbConfig && !idealPreview) {
      const cfg: any = rbConfig as any
      const initTargets = cfg?.targets || {}
      const initPeriodo = cfg?.periodo || 'mensal'
      setIdealPreview({ periodo: initPeriodo, targets: initTargets })
    }
  }, [rbConfig, idealPreview])
  const idealTargets = useMemo(() => {
    return idealPreview?.targets ?? (rbConfig as any)?.targets ?? {}
  }, [idealPreview, rbConfig])
  const [ocultarValor, setOcultarValor] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
 
  const [expandedTipos, setExpandedTipos] = useState<Record<string, boolean>>({
    'Ação': true,
    'FII': true,
    'BDR': true,
    'Criptomoeda': true,
    'Fixa': true
  })
  const [filtroPeriodo, setFiltroPeriodo] = useState<'mensal' | 'trimestral' | 'semestral' | 'anual' | 'maximo'>('mensal')
  const [filtroProventos, setFiltroProventos] = useState<'mes' | '6meses' | '1ano' | '5anos' | 'total'>('mes')

  const queryClient = useQueryClient()


  const [didInitialRefresh, setDidInitialRefresh] = useState(false)
  useEffect(() => {
    if (!user) return
    const keyBase = typeof user === 'string' ? user : 'auth'
    const flagKey = `finma_carteira_refreshed_${keyBase}`
    const already = sessionStorage.getItem(flagKey)
    if (already) return
    ;(async () => {
      try {
        sessionStorage.setItem(flagKey, '1')
        await carteiraService.refreshCarteira()
      } catch (_) {}
      finally {
        queryClient.invalidateQueries({ queryKey: ['carteira', user] })
        queryClient.invalidateQueries({ queryKey: ['carteira-insights', user] })
      }
    })()
  }, [user, queryClient])
  const { data: carteira, isLoading: loadingCarteira } = useQuery<AtivoCarteira[]>({
    queryKey: ['carteira', user], 
    queryFn: async () => {
      const flagKey = `finma_carteira_refreshed_${user || 'anon'}`
      const already = sessionStorage.getItem(flagKey)
      if (!already && !didInitialRefresh) {
        sessionStorage.setItem(flagKey, '1')
        setDidInitialRefresh(true)
        return await carteiraService.getCarteiraRefresh()
      }
      return await carteiraService.getCarteira()
    },
    enabled: !!user, 
    staleTime: 0,
  })

  const { data: tiposApi } = useQuery({
    queryKey: ['tipos-ativos', user],
    queryFn: carteiraService.getTipos,
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 60000,
  })
  const tiposDisponiveisComputed = useMemo(() => {
    const fromCarteira = (carteira || []).map(a => (a?.tipo || 'Desconhecido')).filter(Boolean) as string[]
    const fromApi = (tiposApi || []) as string[]
    return Array.from(new Set([ ...fromApi, ...fromCarteira ]))
  }, [carteira, tiposApi])

  const { data: movimentacoes, isLoading: loadingMovimentacoes } = useQuery<Movimentacao[]>({
    queryKey: ['movimentacoes', user, filtroMes, filtroAno], 
    queryFn: () => carteiraService.getMovimentacoes(filtroMes, filtroAno),
    enabled: !!user, 
  })


  const { data: movimentacoesAll } = useQuery<Movimentacao[]>({
    queryKey: ['movimentacoes-all', user],
    queryFn: () => carteiraService.getMovimentacoes(),
    enabled: !!user,
    refetchOnWindowFocus: false,
  })

  
  const { data: proventos, isLoading: loadingProventos, error: proventosError } = useQuery({
    queryKey: ['proventos', user, carteira?.map(ativo => ativo?.ticker), filtroProventos], 
    queryFn: () => carteiraService.getProventosComFiltro(carteira?.map(ativo => ativo?.ticker || '') || [], filtroProventos),
    enabled: !!user && !!carteira && carteira.length > 0, 
    retry: 1,
    refetchOnWindowFocus: false,
  })

  
  const { data: indicadores } = useQuery({
    queryKey: ['indicadores'],
    queryFn: carteiraService.getIndicadores,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  
  const { data: proventosRecebidos, isLoading: loadingProventosRecebidos } = useQuery({
    queryKey: ['proventos-recebidos', user, filtroProventos],
    queryFn: () => carteiraService.getProventosRecebidos(filtroProventos),
    enabled: !!user && !!carteira && carteira.length > 0,
    retry: 1,
    refetchOnWindowFocus: false,
  })


  const { data: historicoCarteira, isLoading: loadingHistorico } = useQuery({
    queryKey: ['historico-carteira', user, filtroPeriodo],
    queryFn: () => carteiraService.getHistorico(filtroPeriodo),
    enabled: !!user,
    retry: 3,
    refetchOnWindowFocus: false,
  })


  console.log('DEBUG: historicoCarteira recebido:', historicoCarteira)
  if (historicoCarteira && historicoCarteira.datas && historicoCarteira.datas.length > 0) {
    console.log('DEBUG: Primeiros 3 datas do histórico:', historicoCarteira.datas.slice(0, 3))
  }


  
  const adicionarMutation = useMutation({
    mutationFn: ({ ticker, quantidade, tipo, preco_inicial, nome_personalizado, indexador, indexador_pct }: { ticker: string; quantidade: number; tipo: string; preco_inicial?: number; nome_personalizado?: string; indexador?: 'CDI'|'IPCA'|'SELIC'; indexador_pct?: number }) =>
      carteiraService.adicionarAtivo(ticker, quantidade, tipo, preco_inicial, nome_personalizado, indexador, indexador_pct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carteira', user] })
      queryClient.invalidateQueries({ queryKey: ['movimentacoes', user] })
      queryClient.invalidateQueries({ queryKey: ['historico-carteira', user] })
      queryClient.invalidateQueries({ queryKey: ['proventos', user] })
      queryClient.invalidateQueries({ queryKey: ['proventos-recebidos', user] })
      setInputTicker('')
      setInputQuantidade('')
      setInputTipo('')
      setInputPreco('')
      setInputIndexador('')
      setInputIndexadorPct('')
    },
  })

  const removerMutation = useMutation({
    mutationFn: carteiraService.removerAtivo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carteira', user] })
      queryClient.invalidateQueries({ queryKey: ['movimentacoes', user] })
      queryClient.invalidateQueries({ queryKey: ['historico-carteira', user] })
      queryClient.invalidateQueries({ queryKey: ['proventos', user] })
      queryClient.invalidateQueries({ queryKey: ['proventos-recebidos', user] })
    },
  })

  const atualizarMutation = useMutation({
    mutationFn: ({ id, quantidade }: { id: number; quantidade: number }) =>
      carteiraService.atualizarAtivo(id, quantidade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carteira', user] })
      queryClient.invalidateQueries({ queryKey: ['historico-carteira', user] })
      queryClient.invalidateQueries({ queryKey: ['proventos', user] })
      queryClient.invalidateQueries({ queryKey: ['proventos-recebidos', user] })
      setEditingId(null)
      setEditQuantidade('')
    },
  })


  const handleAdicionar = useCallback(() => {
    if (!inputTicker.trim() || !inputQuantidade.trim()) return
    
    const quantidade = parseFloat(inputQuantidade.replace(',', '.'))
    if (isNaN(quantidade) || quantidade <= 0) return
    
    const normalizedTicker = normalizeTicker(inputTicker.trim())
    

    let precoInicialNum: number | undefined
    if (inputPreco && inputPreco.trim() !== '') {
      const pn = parseFloat(inputPreco.replace(',', '.'))
      if (!isNaN(pn)) precoInicialNum = pn
    }
    const finalTipo = inputTipo || ''
    const finalTicker = getDisplayTicker(normalizedTicker)
    adicionarMutation.mutate({
      ticker: finalTicker,
      quantidade,
      tipo: finalTipo,
      preco_inicial: precoInicialNum,
      nome_personalizado: undefined,
      indexador: (inputIndexador || undefined) as any,
      indexador_pct: inputIndexadorPct && !isNaN(parseFloat(inputIndexadorPct.replace(',', '.'))) ? parseFloat(inputIndexadorPct.replace(',', '.')) : undefined,
    })
  }, [inputTicker, inputQuantidade, inputTipo, inputPreco, inputIndexador, inputIndexadorPct, adicionarMutation])

  const handleRemover = useCallback((id: number) => {
    if (confirm('Tem certeza que deseja remover este ativo?')) {
      removerMutation.mutate(id)
    }
  }, [removerMutation])

  const handleEditar = useCallback((id: number, quantidade: number) => {
    setEditingId(id)
    setEditQuantidade(quantidade.toString())
  }, [])

  const handleSalvarEdicao = useCallback(() => {
    if (!editingId || !editQuantidade.trim()) return
    
    const quantidade = parseFloat(editQuantidade.replace(',', '.'))
    if (isNaN(quantidade) || quantidade <= 0) return
    
    atualizarMutation.mutate({ id: editingId, quantidade })
  }, [editingId, editQuantidade, atualizarMutation])

  const handleCancelarEdicao = useCallback(() => {
    setEditingId(null)
    setEditQuantidade('')
  }, [])


  const valorTotal = carteira?.reduce((total, ativo) => total + (ativo?.valor_total || 0), 0) || 0
  const ativosPorTipo = carteira?.reduce((acc, ativo) => {
    const tipo = ativo?.tipo || 'Desconhecido'
    acc[tipo] = (acc[tipo] || 0) + (ativo?.valor_total || 0)
    return acc
  }, {} as Record<string, number>) || {}

  const topAtivos = carteira?.slice(0, 5) || []
  const ativosPositivos = carteira?.filter(ativo => ativo?.dy && ativo.dy > 0).length || 0


  const dadosGraficoProventos = useMemo(() => {
    if (!proventosRecebidos || proventosRecebidos.length === 0) return []
    
    const proventosPorMes: Record<string, number> = {}
    
    proventosRecebidos.forEach(ativo => {
      ativo.proventos_recebidos.forEach(provento => {
        const data = new Date(provento.data)
        const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
        
        if (!proventosPorMes[mesAno]) {
          proventosPorMes[mesAno] = 0
        }
        proventosPorMes[mesAno] += provento.valor_recebido
      })
    })
    
    return Object.entries(proventosPorMes)
      .map(([mesAno, valor]) => ({
        mes: mesAno,
        valor: valor
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12) 
  }, [proventosRecebidos])


  const IndicadorVisual = ({ 
    label, 
    valor, 
    variacao, 
    icon: Icon, 
    color = 'blue' 
  }: { 
    label: string
    valor: string
    variacao?: number
    icon: any
    color?: string
  }) => (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 text-${color}-500`} />
          <span className="font-medium text-sm text-muted-foreground">{label}</span>
        </div>
        {variacao !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${
            variacao > 0 ? 'text-green-500' : variacao < 0 ? 'text-red-500' : 'text-gray-500'
          }`}>
            {variacao > 0 ? <ArrowUpRight size={14} /> : variacao < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
            <span>{Math.abs(variacao).toFixed(2)}%</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold">{valor}</div>
    </div>
  )


  const TabButton = ({ id, label, icon: Icon, isActive }: { id: string; label: string; icon: any; isActive: boolean }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
        isActive 
          ? 'bg-primary text-primary-foreground shadow-md' 
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  )





  const TabelaAtivosPorTipo = ({ tipo }: { tipo: string }) => {
    const ativosDoTipo = carteira?.filter(ativo => ativo?.tipo === tipo) || []
    const totalTipo = ativosDoTipo.reduce((total, ativo) => total + (ativo?.valor_total || 0), 0)
    const porcentagemTipo = valorTotal > 0 ? (totalTipo / valorTotal * 100).toFixed(1) : '0.0'
    const isExpanded = expandedTipos[tipo] || false
    const podeRemoverTipo = ativosDoTipo.length === 0

    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-lg mb-6">
        <div 
          className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-border cursor-pointer hover:bg-primary/20 transition-colors"
          onClick={() => setExpandedTipos(prev => ({ ...prev, [tipo]: !prev[tipo] }))}
        >
      <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button className="p-1 hover:bg-white/20 rounded transition-colors">
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              <Target className="w-5 h-5" />
              <div>
                <h3 className="text-lg font-semibold">{tipo}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{ativosDoTipo.length} ativo{ativosDoTipo.length !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{porcentagemTipo}% da carteira</span>
                  <span>•</span>
                  <span>Média DY: {ativosDoTipo.length > 0 ? 
                    formatDividendYield(ativosDoTipo.reduce((sum, ativo) => sum + (ativo?.dy || 0), 0) / ativosDoTipo.length) : 
                    'N/A'
                  }</span>
                </div>
              </div>
            </div>
            <div className="text-right flex items-center gap-3">
              <div className="text-lg font-bold">{formatCurrency(totalTipo)}</div>
              {(() => {
                const movs = movimentacoesAll || []
                let somaValoresAtuais = 0
                let somaValoresInvestidos = 0
                for (const a of ativosDoTipo) {
                  const mlist = movs
                    .filter(m => m.ticker?.toUpperCase?.() === (a?.ticker || '').toUpperCase())
                    .sort((x, y) => String(x.data).localeCompare(String(y.data)))
                  type Lot = { qty: number; price: number; date: string }
                  const lots: Lot[] = []
                  for (const m of mlist) {
                    const q = Number(m.quantidade || 0)
                    const p = Number(m.preco || 0)
                    if (m.tipo === 'compra') {
                      lots.push({ qty: q, price: p, date: m.data })
                    } else if (m.tipo === 'venda') {
                      let remaining = q
                      while (remaining > 0 && lots.length > 0) {
                        const lot = lots[0]
                        const consume = Math.min(lot.qty, remaining)
                        lot.qty -= consume
                        remaining -= consume
                        if (lot.qty <= 0) lots.shift()
                      }
                    }
                  }
                  const qtd = lots.reduce((s, l) => s + l.qty, 0)
                  const val = lots.reduce((s, l) => s + l.qty * l.price, 0)
                  const precoMed = qtd > 0 ? (val / qtd) : null
                  if (precoMed != null) {
                    somaValoresInvestidos += precoMed * (a?.quantidade || 0)
                    somaValoresAtuais += (a?.preco_atual || 0) * (a?.quantidade || 0)
                  }
                }
                const rendTipo = (somaValoresInvestidos > 0) ? ((somaValoresAtuais - somaValoresInvestidos) / somaValoresInvestidos) * 100 : null
                return (
                  <div className={`text-sm font-medium ${rendTipo != null ? (rendTipo >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                    {rendTipo != null ? `${rendTipo.toFixed(2).replace('.', ',')}%` : '-'}
                  </div>
                )
              })()}
              <div className="text-sm text-muted-foreground">{porcentagemTipo}% do total</div>
              <button
                onClick={(e)=>{ e.stopPropagation(); setManageTipoOpen({open: true, tipo}); setRenameTipoValue(tipo) }}
                className="p-2 rounded hover:bg-white/20"
                title="Gerenciar tipo"
              >
                <Settings size={18} />
              </button>
              {podeRemoverTipo && (
                <button
                  onClick={(e)=>{
                    e.stopPropagation()
                   
                    setExpandedTipos(prev => {
                      const copy = { ...prev }
                      delete copy[tipo]
                      return copy
                    })
                  }}
                  className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                  title="Remover seção (somente tipos sem ativos)"
                >
                  Remover seção
                </button>
              )}
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <>
            {ativosDoTipo.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Ticker</th>
                      <th className="px-4 py-3 text-left font-medium">Nome</th>
                      <th className="px-4 py-3 text-left font-medium">Quantidade</th>
                      <th className="px-4 py-3 text-left font-medium">Preço Atual</th>
                      <th className="px-4 py-3 text-left font-medium">Valor Total</th>
                      <th className="px-4 py-3 text-left font-medium">Indexado</th>
                      <th className="px-4 py-3 text-left font-medium">Rentab. Estimada</th>
                      <th className="px-4 py-3 text-left font-medium">Preço Médio</th>
                      <th className="px-4 py-3 text-left font-medium">Valorização</th>
                      <th className="px-4 py-3 text-left font-medium">Rendimento do Ticket</th>
                      <th className="px-4 py-3 text-left font-medium">% Carteira</th>
                      <th className="px-4 py-3 text-left font-medium">DY</th>
                      <th className="px-4 py-3 text-left font-medium">ROE</th>
                      <th className="px-4 py-3 text-left font-medium">P/L</th>
                      <th className="px-4 py-3 text-left font-medium">P/VP</th>
                      <th className="px-4 py-3 text-left font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ativosDoTipo.map((ativo) => {
                      const movsDoTicker = (movimentacoesAll || [])
                        .filter(m => m.ticker?.toUpperCase?.() === (ativo?.ticker || '').toUpperCase())
                        .sort((a, b) => String(a.data).localeCompare(String(b.data)))

                      type Lot = { qty: number; price: number; date: string }
                      const lots: Lot[] = []
                      for (const m of movsDoTicker) {
                        const qty = Number(m.quantidade || 0)
                        const price = Number(m.preco || 0)
                        if (m.tipo === 'compra') {
                          lots.push({ qty, price, date: m.data })
                        } else if (m.tipo === 'venda') {
                          let remaining = qty
                          while (remaining > 0 && lots.length > 0) {
                            const lot = lots[0]
                            const consume = Math.min(lot.qty, remaining)
                            lot.qty -= consume
                            remaining -= consume
                            if (lot.qty <= 0) lots.shift()
                          }
                          // Se vendeu mais do que possuía, ignorar excedente (sem posição short)
                        }
                      }
                      const totalQtd = lots.reduce((s, l) => s + l.qty, 0)
                      const totalValor = lots.reduce((s, l) => s + l.qty * l.price, 0)
                      const precoMedio = totalQtd > 0 ? (totalValor / totalQtd) : null
                      const rendimentoPct = (precoMedio != null && ativo?.preco_atual)
                        ? ((ativo.preco_atual - precoMedio) / precoMedio) * 100
                        : null
                      const valorizacaoAbs = (precoMedio != null && ativo?.preco_atual && totalQtd > 0)
                        ? (ativo.preco_atual - precoMedio) * totalQtd
                        : null
                      const porcentagemAtivo = valorTotal > 0 ? ((ativo?.valor_total || 0) / valorTotal * 100).toFixed(1) : '0.0'
                      return (
                        <tr key={ativo?.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3 min-w-[160px]">
                            <TickerWithLogo ticker={ativo?.ticker || ''} nome={ativo?.nome_completo || ''} />
                          </td>
                          <td className="px-4 py-3">{ativo?.nome_completo}</td>
                          <td className="px-4 py-3">
                            {editingId === ativo?.id ? (
                              <input
                                type="text"
                                value={editQuantidade}
                                onChange={(e) => setEditQuantidade(e.target.value)}
                                className="w-20 px-2 py-1 border border-border rounded bg-background text-foreground"
                                aria-label="Editar quantidade"
                                placeholder="Qtd"
                              />
                            ) : (
                              ativo?.quantidade
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold">{formatCurrency(ativo?.preco_atual)}</td>
                          <td className="px-4 py-3 font-semibold">{formatCurrency(ativo?.valor_total)}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {ativo?.indexador ? `${ativo.indexador} ${ativo.indexador_pct ? `${ativo.indexador_pct}%` : ''}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {(() => {
                              const pct = (ativo?.indexador_pct || 0)
                              const idx = (ativo?.indexador || '') as 'CDI'|'IPCA'|'SELIC'|''
                              const getVal = (d:any) => {
                                if (!d) return null
                                const v = parseFloat(String(d.valor))
                                return isFinite(v) ? v : null
                              }
                              const raw = idx === 'CDI' ? getVal(indicadores?.cdi)
                                : idx === 'IPCA' ? getVal(indicadores?.ipca)
                                : idx === 'SELIC' ? getVal(indicadores?.selic)
                                : null
                              if (!idx || raw == null || !pct) return '-'
              
                              const baseAnual = raw <= 2 ? ((Math.pow(1 + (raw/100), 12) - 1) * 100) : raw
                              const anual = (pct/100) * baseAnual
                              return `${anual.toFixed(2)}% a.m.`
                            })()}
                          </td>
                          <td className="px-4 py-3 text-sm">{precoMedio != null ? formatCurrency(precoMedio) : '-'}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${valorizacaoAbs != null ? (valorizacaoAbs >= 0 ? 'text-emerald-600' : 'text-red-600') : ''}`}>
                            {valorizacaoAbs != null ? formatCurrency(valorizacaoAbs) : '-'}
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium ${rendimentoPct != null ? (rendimentoPct >= 0 ? 'text-emerald-600' : 'text-red-600') : ''}`}>
                            {rendimentoPct != null ? `${rendimentoPct.toFixed(2).replace('.', ',')}%` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{porcentagemAtivo}%</td>
                          <td className="px-4 py-3 text-green-600 font-medium">
                            {formatDividendYield(ativo?.dy)}
                          </td>
                          <td className={`px-4 py-3 font-medium ${ativo?.roe && ativo.roe > 15 ? 'text-blue-600' : ''}`}>
                            {formatPercentage(ativo?.roe ? ativo.roe * 100 : null)}
                          </td>
                          <td className="px-4 py-3">{formatNumber(ativo?.pl)}</td>
                          <td className="px-4 py-3">{formatNumber(ativo?.pvp)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {editingId === ativo?.id ? (
                                <>
                                  <button
                                    onClick={handleSalvarEdicao}
                                    className="p-1 text-green-600 hover:text-green-700"
                                    title="Salvar"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={handleCancelarEdicao}
                                    className="p-1 text-gray-600 hover:text-gray-700"
                                    title="Cancelar"
                                  >
                                    ✕
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditar(ativo?.id || 0, ativo?.quantidade || 0)}
                                    className="p-1 text-blue-600 hover:text-blue-700"
                                    title="Editar"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleRemover(ativo?.id || 0)}
                                    className="p-1 text-red-600 hover:text-red-700"
                                    title="Remover"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Nenhum ativo do tipo {tipo} na carteira.
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Minha Carteira</h1>
          <HelpTips
            title="Como usar a Carteira"
            tips={[
              { title: 'Adicionar ativos', content: 'Use o formulário para incluir ticker, quantidade, tipo e opcionalmente preço e indexador (CDI/IPCA/SELIC). Itens sem dados do yfinance também são aceitos.' },
              { title: 'Tipos dinâmicos', content: 'Crie/renomeie tipos. As tabelas se adaptam automaticamente aos tipos existentes na carteira.' },
              { title: 'Indexados', content: 'Preencha % do indexador para ver a rentabilidade estimada anual, calculada com base em CDI/IPCA/SELIC reais.' },
              { title: 'Rebalanceamento', content: 'Na aba Rebalanceamento, defina metas por classe, período e registre histórico. O status mostra desvios e sugestões.' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOcultarValor(!ocultarValor)}
            className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
            title={ocultarValor ? 'Mostrar valor' : 'Ocultar valor'}
          >
            {ocultarValor ? '👁 Mostrar Valor' : '🔒 Ocultar Valor'}
          </button>
          <button
            onClick={async () => {
              if (isRefreshing) return
              setIsRefreshing(true)
              try {
                const res = await carteiraService.refreshCarteira()
                const n = (res && typeof res.updated === 'number') ? res.updated : undefined
                toast.success(n != null ? `Preços atualizados (${n})` : 'Preços atualizados')
              } catch (e: any) {
                if (e?.response?.status === 401) toast.error('Sessão expirada. Faça login novamente.')
                else toast.error('Falha ao atualizar preços')
              } finally {
                setIsRefreshing(false)
                queryClient.invalidateQueries({ queryKey: ['carteira', user] })
                queryClient.invalidateQueries({ queryKey: ['carteira-insights', user] })
              }
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isRefreshing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'}`}
            title="Atualizar preços agora"
            aria-label="Atualizar preços agora"
          >
            <Activity className="w-4 h-4" /> {isRefreshing ? 'Atualizando...' : 'Atualizar preços'}
          </button>

          <button
            onClick={async () => {
              try {
                const res = await carteiraService.refreshIndexadores()
                const n = (res && typeof res.updated === 'number') ? res.updated : 0
                toast.success(n != null ? `Indexadores atualizados (${n})` : 'Indexadores atualizados')
                queryClient.invalidateQueries({ queryKey: ['carteira', user] })
                queryClient.invalidateQueries({ queryKey: ['carteira-insights', user] })
              } catch (e: any) {
                if (e?.response?.status === 401) toast.error('Sessão expirada. Faça login novamente.')
                else toast.error('Falha ao atualizar indexadores')
              }
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            title="Atualizar indexadores (CDI, IPCA, SELIC)"
            aria-label="Atualizar indexadores"
          >
            <TrendingUp className="w-4 h-4" /> Atualizar Indexadores
          </button>
        </div>
      </div>

      {/* Indicadores Visuais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <IndicadorVisual
          label="Valor Total"
          valor={ocultarValor ? '•••••••' : formatCurrency(valorTotal)}
          icon={DollarSign}
          color="green"
        />
        <IndicadorVisual
          label="Total de Ativos"
          valor={carteira?.length.toString() || '0'}
          icon={Target}
          color="blue"
        />
        <IndicadorVisual
          label="Ativos com DY"
          valor={`${ativosPositivos} / ${carteira?.length || 0}`}
          icon={TrendingUp}
          color="purple"
        />
        <IndicadorVisual
          label="Movimentações"
          valor={movimentacoes?.length.toString() || '0'}
          icon={Activity}
          color="orange"
        />
      </div>

      
      {/* Navegação por Abas */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <TabButton id="ativos" label="Ativos" icon={Target} isActive={activeTab === 'ativos'} />
        <TabButton id="graficos" label="Gráficos" icon={BarChart3} isActive={activeTab === 'graficos'} />
        <TabButton id="ranking" label="Ranking" icon={Trophy} isActive={activeTab === 'ranking'} />
        <TabButton id="proventos" label="Proventos" icon={Calendar} isActive={activeTab === 'proventos'} />
        <TabButton id="insights" label="Insights" icon={Brain} isActive={activeTab === 'insights'} />
        <TabButton id="rebalance" label="Rebalanceamento" icon={Target} isActive={activeTab === 'rebalance'} />
        <TabButton id="movimentacoes" label="Movimentações" icon={History} isActive={activeTab === 'movimentacoes'} />
        <TabButton id="relatorios" label="Relatórios" icon={FileText} isActive={activeTab === 'relatorios'} />
      </div>

      {/* Conteúdo das Abas */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
        {/* Modal de gerenciamento de tipo */}
        {manageTipoOpen.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={()=>setManageTipoOpen({open:false})}></div>
            <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Gerenciar tipo: {manageTipoOpen.tipo}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Renomear para</label>
                  <input
                    type="text"
                    value={renameTipoValue}
                    onChange={(e)=>setRenameTipoValue(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                    placeholder="Novo nome do tipo"
                    aria-label="Novo nome do tipo"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={()=>setManageTipoOpen({open:false})}
                    className="px-3 py-2 rounded bg-muted text-foreground hover:bg-muted/80"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async ()=>{
                      if (!manageTipoOpen.tipo) return
                      try {
                        await carteiraService.renomearTipo(manageTipoOpen.tipo, renameTipoValue)
                        queryClient.invalidateQueries({ queryKey: ['tipos-ativos', user] })
                        queryClient.invalidateQueries({ queryKey: ['carteira', user] })
                        setManageTipoOpen({open:false})
                      } catch {}
                    }}
                    className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Salvar
                  </button>
                  {/* Exclusão removida do modal conforme solicitado */}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'ativos' && (
          <div className="space-y-6">
            {/* Formulário de Adição */}
            <div className="bg-muted/30 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-500" />
                Adicionar Ativo
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Ticker</label>
                  <input
                    type="text"
                    value={inputTicker}
                    onChange={(e) => setInputTicker(e.target.value)}
                    placeholder="Ex: PETR4, AAPL, VISC11"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Quantidade</label>
                  <input
                    type="text"
                    value={inputQuantidade}
                    onChange={(e) => setInputQuantidade(e.target.value)}
                    placeholder="Ex: 100 ou 0,0012"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo</label>
                  <input
                    list="tipos-ativos"
                    value={inputTipo}
                    onChange={(e) => setInputTipo(e.target.value)}
                    placeholder="Ex.: Ação, FII, Criptomoeda, ..."
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Selecionar ou digitar tipo de ativo"
                  />
                  <datalist id="tipos-ativos">
                    {(tiposDisponiveisComputed || []).map(t => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                  
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Preço (opcional)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 10,50 (se vazio tenta buscar)"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={inputPreco}
                    onChange={(e)=>setInputPreco(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Indexador (opcional)</label>
                  <div className="flex gap-2">
                    <select
                      value={inputIndexador}
                      onChange={(e)=>setInputIndexador(e.target.value as any)}
                      className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      aria-label="Selecionar indexador"
                    >
                      <option value="">Sem indexador</option>
                      <option value="CDI">CDI</option>
                      <option value="IPCA">IPCA</option>
                      <option value="SELIC">SELIC</option>
                    </select>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex.: 110 (para 110%)"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      value={inputIndexadorPct}
                      onChange={(e)=>setInputIndexadorPct(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Use N% do CDI/IPCA/SELIC. Ex.: 110 = 110%.</p>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={handleAdicionar}
                    disabled={adicionarMutation.isPending}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {adicionarMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Resumo da Carteira */}
            {!loadingCarteira && carteira && carteira.length > 0 && (
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-border rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Resumo da Carteira
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Total de Ativos</div>
                    <div className="text-2xl font-bold text-primary">{carteira.length}</div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Tipos de Ativos</div>
                    <div className="text-2xl font-bold text-primary">{Object.keys(ativosPorTipo).length}</div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Média DY</div>
                    <div className="text-2xl font-bold text-primary">
                      {formatDividendYield(carteira.reduce((sum, ativo) => sum + (ativo?.dy || 0), 0) / carteira.length)}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Maior Posição</div>
                    <div className="text-lg font-bold text-primary">
                      {topAtivos[0]?.ticker || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(topAtivos[0]?.valor_total || 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabelas por Tipo */}
            {loadingCarteira ? (
              <div className="text-center text-muted-foreground py-8">
                Carregando carteira...
              </div>
            ) : (
              <div className="space-y-6">
                {Object.keys(ativosPorTipo).sort().map(tipo => (
                  <TabelaAtivosPorTipo key={tipo} tipo={tipo} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'graficos' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">📈 Análise Gráfica</h2>
            

            
            {!carteira || carteira.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Adicione ativos à sua carteira para ver os gráficos.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Gráfico de Evolução do Patrimônio */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">Evolução do Patrimônio</h3>
                      <div className="text-sm text-muted-foreground">
                        Período: {{
                          'mensal': 'Mensal',
                          'trimestral': 'Trimestral',
                          'semestral': 'Semestral',
                          'anual': 'Anual',
                          'maximo': 'Máximo'
                        }[filtroPeriodo]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={filtroPeriodo}
                        onChange={(e) => setFiltroPeriodo(e.target.value as any)}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                        aria-label="Filtrar por período"
                      >
                        <option value="mensal">Mensal</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="semestral">Semestral</option>
                        <option value="anual">Anual</option>
                        <option value="maximo">Máximo</option>
                      </select>
                    </div>
                  </div>
                  
                  {loadingHistorico ? (
                    <div className="animate-pulse h-64 bg-muted rounded-lg"></div>
                  ) : historicoCarteira && historicoCarteira.datas && historicoCarteira.datas.length > 0 ? (
                    <>
                      {/* Resumo estatístico */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-sm text-muted-foreground">Patrimônio Inicial</div>
                          <div className="text-lg font-bold text-foreground">
                            {formatCurrency(historicoCarteira.carteira_valor?.[0] || 0)}
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-sm text-muted-foreground">Patrimônio Atual</div>
                          <div className="text-lg font-bold text-foreground">
                            {formatCurrency(historicoCarteira.carteira_valor?.[historicoCarteira.carteira_valor.length - 1] || 0)}
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-sm text-muted-foreground">Crescimento</div>
                          <div className={`text-lg font-bold ${
                            (historicoCarteira.carteira_valor?.[historicoCarteira.carteira_valor.length - 1] || 0) > (historicoCarteira.carteira_valor?.[0] || 0) 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {(() => {
                              const inicial = historicoCarteira.carteira_valor?.[0] || 0
                              const atual = historicoCarteira.carteira_valor?.[historicoCarteira.carteira_valor.length - 1] || 0
                              if (inicial === 0) return '0%'
                              const crescimento = ((atual - inicial) / inicial) * 100
                              return `${crescimento > 0 ? '+' : ''}${crescimento.toFixed(2)}%`
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Gráfico comparativo rebase 100 */}
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={historicoCarteira.datas.map((d, i) => ({
                          data: d,
                          carteira: historicoCarteira.carteira?.[i] ?? null,
                          ibov: historicoCarteira.ibov?.[i] ?? null,
                          ivvb11: historicoCarteira.ivvb11?.[i] ?? null,
                          ifix: historicoCarteira.ifix?.[i] ?? null,
                          ipca: historicoCarteira.ipca?.[i] ?? null,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="data" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickFormatter={(value) => `${value}`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))', 
                              borderRadius: '8px',
                              color: 'hsl(var(--foreground))'
                            }}
                            formatter={(value: any, name: string) => [
                              name === 'carteira' ? `${value?.toFixed?.(2)}` : `${value?.toFixed?.(2)}`,
                              name.toUpperCase()
                            ]}
                            labelFormatter={(label) => `Período: ${label}`}
                          />
                          <Area type="monotone" dataKey="carteira" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                          <Area type="monotone" dataKey="ibov" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={1.5} />
                          <Area type="monotone" dataKey="ivvb11" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={1.5} />
                          <Area type="monotone" dataKey="ifix" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1} strokeWidth={1.5} />
                          <Area type="monotone" dataKey="ipca" stroke="#ef4444" fill="#ef4444" fillOpacity={0.06} strokeWidth={1.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <div className="text-lg font-semibold mb-2">Nenhum dado histórico disponível</div>
                        <div className="text-sm text-muted-foreground mb-4">
                          Adicione movimentações à sua carteira para ver a evolução patrimonial
                  </div>
                        <div className="text-xs text-muted-foreground">
                          Dados de exemplo serão mostrados para demonstração
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gráficos de Distribuição */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Distribuição por Tipo */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <PieChart className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">Distribuição por Tipo de Ativo</h3>
                    </div>
                    {Object.keys(ativosPorTipo).length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={Object.entries(ativosPorTipo)
                              .filter(([_, valor]) => valor > 0)
                              .map(([tipo, valor]) => ({ name: tipo, value: valor }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {Object.entries(ativosPorTipo)
                              .filter(([_, valor]) => valor > 0)
                              .map((_, index) => (
                                <Cell key={index} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'][index % 5]} />
                              ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => [formatCurrency(value), 'Valor']} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Nenhum dado disponível
                      </div>
                    )}
                  </div>

                  {/* Distribuição por Ativo */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BarChart3 className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">Distribuição por Ativo</h3>
                    </div>
                    {carteira.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={carteira
                              .filter(ativo => ativo?.valor_total && ativo.valor_total > 0)
                              .slice(0, 8)
                              .map(ativo => ({
                                name: getDisplayTicker(ativo?.ticker || ''),
                                value: ativo?.valor_total || 0
                              }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {carteira
                              .filter(ativo => ativo?.valor_total && ativo.valor_total > 0)
                              .slice(0, 8)
                              .map((_, index) => (
                                <Cell key={index} fill={['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'][index % 8]} />
                              ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => [formatCurrency(value), 'Valor']} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Nenhum ativo disponível
                      </div>
                    )}
                  </div>
                </div>

                {/* Gráficos de Barras */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top 5 Maiores Posições */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Trophy className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">Top 5 Maiores Posições</h3>
                    </div>
                    {topAtivos.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topAtivos}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="ticker" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickFormatter={(value) => formatCurrency(value).replace('R$ ', '')}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))', 
                              borderRadius: '8px',
                              color: 'hsl(var(--foreground))'
                            }}
                            formatter={(value: any) => [formatCurrency(value), 'Valor Total']}
                          />
                          <Bar dataKey="valor_total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Nenhuma posição disponível
                      </div>
                    )}
                  </div>

                  {/* Posições Positivas vs Negativas */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Activity className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">Top 10 Ativos por Valor</h3>
                    </div>
                    {carteira.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={carteira.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="ticker" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickFormatter={(value) => formatCurrency(value).replace('R$ ', '')}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))', 
                              borderRadius: '8px',
                              color: 'hsl(var(--foreground))'
                            }}
                            formatter={(value: any) => [formatCurrency(value), 'Valor Total']}
                          />
                          <Bar dataKey="valor_total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        Nenhum ativo disponível
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">🏆 Rankings da Carteira</h2>
            
            {carteira && carteira.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top ROE */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-blue-500" />
                    Top ROE
                  </h3>
                  <div className="space-y-2">
                    {carteira
                      .filter(ativo => ativo?.roe && ativo.roe > 0)
                      .sort((a, b) => (b?.roe || 0) - (a?.roe || 0))
                      .slice(0, 7)
                      .map((ativo) => (
                        <div key={ativo?.id} className="flex justify-between items-center p-2 bg-background rounded">
                          <div className="min-w-[120px]"><TickerWithLogo ticker={ativo?.ticker || ''} size="sm" /></div>
                          <span className="text-blue-600 font-bold">
                            {(ativo?.roe || 0).toFixed(2)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Top Dividend Yield */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Top Dividend Yield
                  </h3>
                  <div className="space-y-2">
                    {carteira
                      .filter(ativo => ativo?.dy && ativo.dy > 0)
                      .sort((a, b) => (b?.dy || 0) - (a?.dy || 0))
                      .slice(0, 7)
                      .map((ativo) => (
                        <div key={ativo?.id} className="flex justify-between items-center p-2 bg-background rounded">
                          <div className="min-w-[120px]"><TickerWithLogo ticker={ativo?.ticker || ''} size="sm" /></div>
                          <span className="text-green-600 font-bold">
                            {formatDividendYield(ativo?.dy)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Top P/L (Menor) */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-yellow-500" />
                    Top P/L (Menor)
                  </h3>
                  <div className="space-y-2">
                    {carteira
                      .filter(ativo => ativo?.pl && ativo.pl > 0)
                      .sort((a, b) => (a?.pl || 0) - (b?.pl || 0))
                      .slice(0, 7)
                      .map((ativo) => (
                        <div key={ativo?.id} className="flex justify-between items-center p-2 bg-background rounded">
                          <div className="min-w-[120px]"><TickerWithLogo ticker={ativo?.ticker || ''} size="sm" /></div>
                          <span className="text-yellow-600 font-bold">
                            {(ativo?.pl || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Top P/VP (Menor) */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-orange-500" />
                    Top P/VP (Menor)
                  </h3>
                  <div className="space-y-2">
                    {carteira
                      .filter(ativo => ativo?.pvp && ativo.pvp > 0)
                      .sort((a, b) => (a?.pvp || 0) - (b?.pvp || 0))
                      .slice(0, 7)
                      .map((ativo) => (
                        <div key={ativo?.id} className="flex justify-between items-center p-2 bg-background rounded">
                          <div className="min-w-[120px]"><TickerWithLogo ticker={ativo?.ticker || ''} size="sm" /></div>
                          <span className="text-orange-600 font-bold">
                            {(ativo?.pvp || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Adicione ativos à sua carteira para ver os rankings.
              </div>
            )}
          </div>
        )}

        {activeTab === 'proventos' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">💰 Proventos</h2>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Filtro por período:</label>
                <select
                  value={filtroProventos}
                  onChange={(e) => setFiltroProventos(e.target.value as any)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                  aria-label="Filtrar proventos por período"
                >
                  <option value="mes">Mês atual</option>
                  <option value="6meses">6 meses</option>
                  <option value="1ano">1 ano</option>
                  <option value="5anos">5 anos</option>
                  <option value="total">Total</option>
                </select>
              </div>
            </div>
            
            {!carteira || carteira.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Adicione ativos à sua carteira para ver os proventos.
              </div>
            ) : loadingProventosRecebidos ? (
              <div className="text-center text-muted-foreground py-8">
                Carregando proventos...
              </div>
            ) : proventosError ? (
              <div className="text-center text-red-500 py-8">
                Erro ao carregar proventos: {proventosError.message}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Seção 1: Proventos Pagos (Histórico) */}
                  <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">📊 Proventos Pagos (Histórico)</h3>
                  
                  {loadingProventos ? (
                    <div className="text-center text-muted-foreground py-8">
                      Carregando histórico de proventos...
                    </div>
                  ) : proventosError ? (
                    <div className="text-center text-red-500 py-8">
                      Erro ao carregar histórico de proventos
                    </div>
                  ) : proventos && proventos.length > 0 ? (
                    <div className="space-y-4">
                      {/* Resumo do histórico */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {proventos.filter(p => p.proventos && p.proventos.length > 0).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Ativos com Proventos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {proventos.reduce((total, p) => total + (p.proventos?.length || 0), 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total de Proventos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(proventos.reduce((total, p) => 
                            total + (p.proventos?.reduce((sum, prov) => sum + prov.valor, 0) || 0), 0
                          ))}
                        </div>
                        <div className="text-sm text-muted-foreground">Valor Total</div>
                      </div>
                    </div>

                      {/* Lista de proventos pagos */}
                <div className="space-y-4">
                        {proventos.map((ativo) => (
                          <div key={ativo.ticker} className="bg-background rounded-lg p-4 border border-border">
                            <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <TickerWithLogo ticker={ativo.ticker} nome={ativo.nome} size="md" />
                          {ativo.erro && (
                            <span className="text-sm text-red-500 bg-red-100 px-2 py-1 rounded">
                              {ativo.erro}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {formatCurrency(ativo.proventos?.reduce((sum, prov) => sum + prov.valor, 0) || 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {ativo.proventos?.length || 0} provento{ativo.proventos?.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      
                      {ativo.proventos && ativo.proventos.length > 0 ? (
                         <div className="overflow-x-auto">
                           <table className="w-full min-w-[600px]">
                            <thead className="bg-muted/30">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium">Data</th>
                                <th className="px-4 py-2 text-left font-medium">Tipo</th>
                                <th className="px-4 py-2 text-left font-medium">Valor (R$)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ativo.proventos.map((provento, index) => (
                                <tr key={index} className="hover:bg-muted/40 transition-colors">
                                  <td className="px-4 py-2">
                                    {new Date(provento.data).toLocaleDateString('pt-BR')}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                      {provento.tipo}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 font-semibold">
                                    {formatCurrency(provento.valor)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : !ativo.erro ? (
                        <div className="text-center text-muted-foreground py-4">
                                Nenhum provento encontrado para este ativo no período selecionado.
                        </div>
                      ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhum provento encontrado para os ativos da carteira no período selecionado.
                    </div>
                  )}
                </div>

                {/* Seção 2: Proventos Recebidos */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">💰 Proventos Recebidos (Baseado na Carteira)</h3>
                  
                  {loadingProventosRecebidos ? (
                    <div className="text-center text-muted-foreground py-8">
                      Carregando proventos recebidos...
                    </div>
                                    ) : proventosRecebidos && proventosRecebidos.length > 0 ? (
                    <div className="space-y-6">
                      {/* Resumo de Proventos Recebidos */}
                      <div className="bg-muted/30 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">Resumo de Proventos Recebidos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {proventosRecebidos.length}
                            </div>
                            <div className="text-sm text-muted-foreground">Ativos com Proventos</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {formatCurrency(proventosRecebidos.reduce((total, p) => total + p.total_recebido, 0))}
                            </div>
                            <div className="text-sm text-muted-foreground">Valor Total Recebido</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {proventosRecebidos.reduce((total, p) => total + p.proventos_recebidos.length, 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">Total de Proventos</div>
                          </div>
                        </div>
                      </div>

                      {/* Lista de Proventos por Ativo */}
                      <div className="space-y-4">
                    {proventosRecebidos?.map((provento) => (
                      <div key={provento.ticker} className="bg-muted/30 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <TickerWithLogo ticker={provento.ticker} nome={provento.nome} size="md" />
                            <div className="text-sm text-muted-foreground">
                              {provento.quantidade_carteira} ações
                              {provento.data_aquisicao && (
                                <span className="ml-2 text-xs">
                                  (Adquirido em {new Date(provento.data_aquisicao).toLocaleDateString('pt-BR')})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {formatCurrency(provento.total_recebido)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {provento.proventos_recebidos.length} provento{provento.proventos_recebidos.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        
                        {provento.proventos_recebidos && provento.proventos_recebidos.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px]">
                              <thead className="bg-muted/30">
                                <tr>
                                  <th className="px-4 py-2 text-left font-medium">Data</th>
                                  <th className="px-4 py-2 text-left font-medium">Valor Unitário</th>
                                  <th className="px-4 py-2 text-left font-medium">Quantidade</th>
                                  <th className="px-4 py-2 text-left font-medium">Valor Recebido</th>
                                </tr>
                              </thead>
                              <tbody>
                                {provento.proventos_recebidos.map((prov, index) => (
                                  <tr key={index} className="hover:bg-muted/40 transition-colors">
                                    <td className="px-4 py-2">
                                      {new Date(prov.data).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-4 py-2">
                                      {formatCurrency(prov.valor_unitario)}
                                    </td>
                                    <td className="px-4 py-2">
                                      {prov.quantidade}
                                    </td>
                                    <td className="px-4 py-2 font-semibold">
                                      {formatCurrency(prov.valor_recebido)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground py-4">
                            Nenhum provento recebido para este ativo no período selecionado.
                          </div>
                        )}
                    </div>
                  ))}
                </div>

                {/* Gráfico de Proventos */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Proventos por Mês</h3>
                        {dadosGraficoProventos.length > 0 ? (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={dadosGraficoProventos}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="mes" 
                                  tickFormatter={(value) => {
                                    const [ano, mes] = value.split('-')
                                    return `${mes}/${ano.slice(2)}`
                                  }}
                                />
                                <YAxis 
                                  tickFormatter={(value) => formatCurrency(value)}
                                />
                                <Tooltip 
                                  formatter={(value: number) => [formatCurrency(value), 'Valor Recebido']}
                                  labelFormatter={(label) => {
                                    const [ano, mes] = label.split('-')
                                    return `${mes}/${ano}`
                                  }}
                                />
                                <Bar dataKey="valor" fill="#10b981" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                            Nenhum provento recebido no período selecionado para gerar o gráfico.
                  </div>
                        )}
                </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhum provento recebido para os ativos da carteira no período selecionado.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">🤖 Insights </h2>
            
            {carteira && carteira.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Insights Principais */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                        <h3 className="text-lg font-semibold text-blue-800">Resumo</h3>
                      </div>
                      {loadingInsights ? (
                        <div className="text-blue-700">Calculando…</div>
                      ) : insights ? (
                        <div className="text-blue-700 space-y-1 text-sm">
                          <div>Total investido: <strong>{formatCurrency(insights.resumo?.total_investido || 0)}</strong></div>
                          <div>Nº ativos: <strong>{insights.resumo?.num_ativos || 0}</strong></div>
                          <div>DY médio (pond.): <strong>{insights.resumo?.weighted_dy_pct != null ? formatPercentage(insights.resumo.weighted_dy_pct) : (insights.resumo?.weighted_dy != null ? formatPercentage((insights.resumo.weighted_dy || 0) * 100) : 'N/A')}</strong></div>
                          <div>PL médio: <strong>{insights.resumo?.avg_pl?.toFixed?.(2) ?? 'N/A'}</strong></div>
                          <div>P/VP médio: <strong>{insights.resumo?.avg_pvp?.toFixed?.(2) ?? 'N/A'}</strong></div>
                          <div>ROE médio: <strong>{insights.resumo?.avg_roe != null ? formatPercentage((insights.resumo.avg_roe || 0) * 100) : 'N/A'}</strong></div>
                        </div>
                      ) : null}
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Target className="w-6 h-6 text-purple-600" />
                        <h3 className="text-lg font-semibold text-purple-800">Concentração</h3>
                      </div>
                      {loadingInsights ? (
                        <div className="text-purple-700">Calculando…</div>
                      ) : insights ? (
                        <div className="text-purple-700 text-sm space-y-1">
                          {(insights.concentracao?.top_positions || []).map((p: any) => (
                            <div key={p.ticker} className="flex justify-between">
                              <span>{p.ticker}</span>
                              <span>{formatCurrency(p.valor_total)} • {((p.percentual || 0).toFixed?.(1) || '0.0')}%</span>
                            </div>
                          ))}
                          {(insights.concentracao?.alerts || []).length > 0 && (
                            <div className="text-xs text-red-600 mt-2">Alerta: posições acima de 25% detectadas.</div>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                        <h3 className="text-lg font-semibold text-green-800">Renda (DY)</h3>
                      </div>
                      {loadingInsights ? (
                        <div className="text-green-700">Calculando…</div>
                      ) : insights ? (
                        <div className="text-green-700 text-sm space-y-1">
                          <div>DY ponderado: <strong>{insights.renda?.weighted_dy_pct != null ? formatPercentage(insights.renda.weighted_dy_pct) : (insights.renda?.weighted_dy != null ? formatPercentage((insights.renda.weighted_dy || 0) * 100) : 'N/A')}</strong></div>
                          <div className="mt-2 font-medium">Top DY</div>
                          {(insights.renda?.top_dy || []).map((a: any) => (
                            <div key={a.ticker} className="flex justify-between">
                              <span>{a.ticker}</span>
                              <span>{formatPercentage(a.dy_pct ?? ((a.dy || 0) * 100))} • {((a.percentual_carteira || 0).toFixed?.(1) || '0.0')}%</span>
                            </div>
                          ))}
                          <div className="text-xs mt-2">Ativos sem DY: {insights.renda?.ativos_sem_dy || 0}</div>
                        </div>
                      ) : null}
                    </div>

                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Activity className="w-6 h-6 text-orange-600" />
                        <h3 className="text-lg font-semibold text-orange-800">Avaliação</h3>
                      </div>
                      {loadingInsights ? (
                        <div className="text-orange-700">Calculando…</div>
                      ) : insights ? (
                        <div className="text-orange-700 text-sm space-y-1">
                          <div>
                            PL alto (&gt;25): <strong>{insights.avaliacao?.pl?.high_count || 0}</strong> • PL baixo (&le;10): <strong>{insights.avaliacao?.pl?.low_count || 0}</strong>
                          </div>
                          <div>
                            Undervalued (P/VP &le; 1): <strong>{insights.avaliacao?.pvp?.undervalued_count || 0}</strong> • Overpriced (P/VP &ge; 3): <strong>{insights.avaliacao?.pvp?.overpriced_count || 0}</strong>
                          </div>
                          <div>
                            ROE médio: <strong>{insights.resumo?.avg_roe != null ? formatPercentage((insights.resumo.avg_roe || 0) * 100) : 'N/A'}</strong> • ROE negativo: <strong>{insights.avaliacao?.roe?.negative_count || 0}</strong>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Insights Secundários */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-500" />
                    Recomendações
                  </h3>
                  {loadingInsights ? (
                    <div className="text-sm text-muted-foreground">Calculando…</div>
                  ) : insights ? (
                    <div className="space-y-3">
                      {insights.avaliacao?.pvp?.undervalued_count > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-background rounded">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-muted-foreground">
                            Existem {insights.avaliacao.pvp.undervalued_count} ativos com P/VP ≤ 1, potenciais oportunidades de valor.
                          </p>
                        </div>
                      )}
                      {insights.avaliacao?.pl?.low_count > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-background rounded">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-muted-foreground">
                            {insights.avaliacao.pl.low_count} ativos com P/L ≤ 10 sugerem múltiplos atrativos.
                          </p>
                        </div>
                      )}
                      {insights.avaliacao?.roe?.negative_count > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-background rounded">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-muted-foreground">
                            {insights.avaliacao.roe.negative_count} ativos com ROE negativo: avaliação de manutenção/redução recomendada.
                          </p>
                        </div>
                      )}
                      {(insights.concentracao?.alerts || []).length > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-background rounded">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-muted-foreground">
                            Concentração elevada detectada em {insights.concentracao.alerts.length} posição(ões). Considere rebalanceamento.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    Alertas
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 p-3 bg-background rounded">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-muted-foreground">
                        {carteira?.filter(ativo => ativo?.pl && ativo.pl > 20).length || 0} ativos com P/L elevado.
                      </p>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-background rounded">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-muted-foreground">
                        {carteira?.filter(ativo => ativo?.dy && ativo.dy < 0.02).length || 0} ativos com baixo dividend yield.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Adicione ativos à sua carteira para receber insights personalizados.
              </div>
            )}
          </div>
        )}

        {activeTab === 'rebalance' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">⚖️ Rebalanceamento da Carteira</h2>
            
            {/* Configuração de Período e Último Rebalanceamento */}
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">📅 Configuração de Período</h3>
              <RebalanceConfigForm
                defaultPeriodo={(rbConfig as any)?.periodo || 'mensal'}
                defaultLastRebalanceDate={(rbConfig as any)?.last_rebalance_date}
                onSave={(periodo, lastDate) => {
                  const currentTargets = idealPreview?.targets || (rbConfig as any)?.targets || {}
                  saveRebalanceMutation.mutate({ periodo, targets: currentTargets, last_rebalance_date: lastDate })
                }}
              />
            </div>

            {/* Configuração de Tipos e Porcentagens */}
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">🎯 Configuração de Tipos e Porcentagens</h3>
              <TargetsForm
                defaultTargets={(rbConfig as any)?.targets || {}}
                onSave={(targets) => {
                  const currentPeriodo = idealPreview?.periodo || (rbConfig as any)?.periodo || 'mensal'
                  const currentLastDate = (rbConfig as any)?.last_rebalance_date
                  saveRebalanceMutation.mutate({ periodo: currentPeriodo, targets, last_rebalance_date: currentLastDate })
                }}
                onChange={(targets) => {
                  const currentPeriodo = idealPreview?.periodo || (rbConfig as any)?.periodo || 'mensal'
                  setIdealPreview({ periodo: currentPeriodo, targets })
                }}
              />
            </div>

            {/* Gráficos e Cálculos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico da Proporção Ideal */}
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-purple-600" />
                  Proporção Ideal
                </h3>
                <IdealDistributionChart targets={idealTargets} />
              </div>

              {/* Gráfico da Carteira Atual */}
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Carteira Atual
                </h3>
                <CurrentDistributionChart carteira={carteira} />
              </div>
            </div>

            {/* Cálculos de Rebalanceamento */}
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-600" />
                Cálculos de Rebalanceamento
              </h3>
              <RebalanceCalculations 
                carteira={carteira} 
                idealTargets={idealTargets} 
                valorTotal={valorTotal}
              />
            </div>

            {/* Status e Histórico */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">📊 Status do Rebalanceamento</h3>
                {rbStatus ? (
                  <RebalanceStatus status={rbStatus} />
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhuma configuração encontrada.</div>
                )}
              </div>
              
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">📝 Histórico de Rebalanceamentos</h3>
                <RebalanceHistory 
                  history={rbHistory?.history || []}
                  onRegisterHistory={(date) => {
                    carteiraService.addRebalanceHistory(date)
                      .then(() => {
                        toast.success('Histórico registrado com sucesso')
                        queryClient.invalidateQueries({ queryKey: ['rebalance-history', user] })
                        queryClient.invalidateQueries({ queryKey: ['rebalance-status', user] })
                      })
                      .catch((err) => {
                        if (err?.response?.status === 401) {
                          toast.error('Sessão expirada. Faça login novamente.')
                        } else {
                          toast.error('Falha ao registrar histórico')
                        }
                      })
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'movimentacoes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">🔄 Movimentações</h2>
              <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Mês</label>
                <select
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(parseInt(e.target.value))}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                  aria-label="Selecionar mês"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                    <option key={mes} value={mes}>
                      {new Date(2024, mes - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Ano</label>
                <select
                  value={filtroAno}
                  onChange={(e) => setFiltroAno(parseInt(e.target.value))}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                  aria-label="Selecionar ano"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
                </div>
              </div>
            </div>
            
            {/* Loading State */}
            {loadingMovimentacoes ? (
              <div className="text-center text-muted-foreground py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Carregando movimentações...</p>
              </div>
            ) : (
              <>
                {/* Resumo das Movimentações */}
                {movimentacoes && movimentacoes.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Resumo do Período</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {movimentacoes.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total de Movimentações</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {movimentacoes.filter(m => m?.tipo === 'compra').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Compras</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {movimentacoes.filter(m => m?.tipo === 'venda').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Vendas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(movimentacoes.reduce((total, m) => {
                        const valor = (m?.quantidade || 0) * (m?.preco || 0)
                        return m?.tipo === 'compra' ? total + valor : total - valor
                      }, 0))}
                    </div>
                    <div className="text-sm text-muted-foreground">Fluxo de Caixa</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Lista de Movimentações */}
            {movimentacoes && movimentacoes.length > 0 ? (
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Histórico de Movimentações</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Data</th>
                      <th className="px-4 py-3 text-left font-medium">Ticker</th>
                      <th className="px-4 py-3 text-left font-medium">Nome</th>
                      <th className="px-4 py-3 text-left font-medium">Quantidade</th>
                      <th className="px-4 py-3 text-left font-medium">Preço</th>
                        <th className="px-4 py-3 text-left font-medium">Valor Total</th>
                      <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentacoes.map((mov) => (
                      <tr key={mov?.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3">
                            {new Date(mov?.data || '').toLocaleDateString('pt-BR')}
                          </td>
                        <td className="px-4 py-3">
                          <TickerWithLogo ticker={mov?.ticker || ''} size="sm" />
                        </td>
                        <td className="px-4 py-3">{mov?.nome_completo}</td>
                        <td className="px-4 py-3">{mov?.quantidade}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(mov?.preco)}</td>
                          <td className="px-4 py-3 font-semibold">
                            {formatCurrency((mov?.quantidade || 0) * (mov?.preco || 0))}
                          </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            mov?.tipo === 'compra' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {mov?.tipo === 'compra' ? 'Compra' : 'Venda'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma movimentação encontrada para o período selecionado.</p>
                <p className="text-sm mt-2">
                  As movimentações aparecem aqui quando você adiciona, remove ou atualiza ativos na carteira.
                </p>
              </div>
            )}
              </>
            )}
          </div>
        )}

        {activeTab === 'relatorios' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">📄 Relatórios</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Movimentações */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Movimentações</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex items-center gap-2">
                    <select aria-label="Selecione o mês" className="px-3 py-2 border border-border rounded bg-background text-foreground" value={repMes} onChange={e=>setRepMes(e.target.value)}>
                      {Array.from({ length: 12 }).map((_, i) => {
                        const v = String(i+1).padStart(2, '0')
                        return <option key={v} value={v}>{v}</option>
                      })}
                    </select>
                    <select aria-label="Selecione o ano" className="px-3 py-2 border border-border rounded bg-background text-foreground" value={repAno} onChange={e=>setRepAno(e.target.value)}>
                      {Array.from({ length: 10 }).map((_, i) => {
                        const y = new Date().getFullYear() - i
                        return <option key={y} value={String(y)}>{y}</option>
                      })}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const blob = await carteiraService.downloadMovimentacoesCSV({ mes: repMes, ano: repAno })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url; a.download = 'movimentacoes.csv'
                          document.body.appendChild(a)
                          a.click()
                          a.remove(); URL.revokeObjectURL(url)
                        } catch (e: any) {
                          toast.error('Falha ao baixar CSV')
                        }
                      }}
                      className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                    >CSV</button>
                    <button
                      onClick={async () => {
                        try {
                          const blob = await carteiraService.downloadMovimentacoesPDF({ mes: repMes, ano: repAno })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url; a.download = 'movimentacoes.pdf'
                          document.body.appendChild(a)
                          a.click()
                          a.remove(); URL.revokeObjectURL(url)
                        } catch (e: any) {
                          toast.error('Falha ao baixar PDF')
                        }
                      }}
                      className="px-3 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >PDF</button>
                    <button
                      onClick={async () => {
                        setLoadingPreviewMovs(true)
                        try {
                          const data = await carteiraService.getMovimentacoes(Number(repMes), Number(repAno))
                          setPreviewMovs(data)
                        } catch {
                          toast.error('Falha ao carregar prévia')
                          setPreviewMovs([])
                        } finally {
                          setLoadingPreviewMovs(false)
                        }
                      }}
                      className="px-3 py-2 rounded bg-muted text-foreground hover:bg-muted/80"
                    >Prévia</button>
                  </div>
                </div>
                {/* Prévia Movimentações */}
                <div className="mt-3">
                  {loadingPreviewMovs ? (
                    <div className="text-sm text-muted-foreground">Carregando…</div>
                  ) : previewMovs && previewMovs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] text-sm">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="px-3 py-2 text-left">Data</th>
                            <th className="px-3 py-2 text-left">Ticker</th>
                            <th className="px-3 py-2 text-left">Tipo</th>
                            <th className="px-3 py-2 text-left">Quantidade</th>
                            <th className="px-3 py-2 text-left">Preço</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewMovs.slice(0, 50).map((m) => (
                            <tr key={m.id} className="border-b border-border">
                              <td className="px-3 py-2">{String(m.data).slice(0,10)}</td>
                              <td className="px-3 py-2">{m.ticker}</td>
                              <td className="px-3 py-2">{m.tipo}</td>
                              <td className="px-3 py-2">{m.quantidade}</td>
                              <td className="px-3 py-2">{formatCurrency(m.preco)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {previewMovs.length > 50 && (
                        <div className="text-xs text-muted-foreground mt-2">Mostrando 50 de {previewMovs.length} registros.</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Sem dados para o período.</div>
                  )}
                </div>
              </div>

              {/* Posições atuais */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Posições (Atual)</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const blob = await carteiraService.downloadPosicoesCSV()
                        const url = URL.createObjectURL(blob); const a = document.createElement('a')
                        a.href = url; a.download = 'posicoes.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
                      } catch {
                        toast.error('Falha ao baixar CSV')
                      }
                    }}
                    className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                  >CSV</button>
                  <button
                    onClick={async () => {
                      try {
                        const blob = await carteiraService.downloadPosicoesPDF()
                        const url = URL.createObjectURL(blob); const a = document.createElement('a')
                        a.href = url; a.download = 'posicoes.pdf'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
                      } catch {
                        toast.error('Falha ao baixar PDF')
                      }
                    }}
                    className="px-3 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  >PDF</button>
                </div>
                {/* Prévia Posições */}
                <div className="mt-3 overflow-x-auto">
                  {carteira && carteira.length > 0 ? (
                    <table className="w-full min-w-[700px] text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-3 py-2 text-left">Ticker</th>
                          <th className="px-3 py-2 text-left">Nome</th>
                          <th className="px-3 py-2 text-left">Quantidade</th>
                          <th className="px-3 py-2 text-left">Preço</th>
                          <th className="px-3 py-2 text-left">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {carteira.slice(0, 50).map((it) => (
                          <tr key={it.id} className="border-b border-border">
                            <td className="px-3 py-2">{it.ticker}</td>
                            <td className="px-3 py-2">{it.nome_completo}</td>
                            <td className="px-3 py-2">{it.quantidade}</td>
                            <td className="px-3 py-2">{formatCurrency(it.preco_atual)}</td>
                            <td className="px-3 py-2">{formatCurrency(it.valor_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-muted-foreground">Sem posições.</div>
                  )}
                </div>
              </div>

              {/* Rendimentos no período */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Rendimentos (Período)</h3>
                <div className="flex items-center gap-2">
                  <select 
                    aria-label="Período dos rendimentos" 
                    title="Selecione o período dos rendimentos"
                    className="px-3 py-2 border border-border rounded bg-background text-foreground" 
                    value={repRendPeriodo} 
                    onChange={e=>setRepRendPeriodo(e.target.value as any)}
                  >
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                    <option value="maximo">Máximo</option>
                  </select>
                  <button
                    onClick={async () => {
                      try {
                        const blob = await carteiraService.downloadRendimentosCSV(repRendPeriodo)
                        const url = URL.createObjectURL(blob); const a = document.createElement('a')
                        a.href = url; a.download = 'rendimentos.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
                      } catch {
                        toast.error('Falha ao baixar CSV')
                      }
                    }}
                    className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                  >CSV</button>
                  <button
                    onClick={async () => {
                      try {
                        const blob = await carteiraService.downloadRendimentosPDF(repRendPeriodo)
                        const url = URL.createObjectURL(blob); const a = document.createElement('a')
                        a.href = url; a.download = 'rendimentos.pdf'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
                      } catch {
                        toast.error('Falha ao baixar PDF')
                      }
                    }}
                    className="px-3 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  >PDF</button>
                  <button
                    onClick={async () => {
                      setLoadingPreviewRend(true)
                      try {
                        const data = await carteiraService.getHistorico(repRendPeriodo)
                        setPreviewRend({ datas: data.datas || [], carteira_valor: data.carteira_valor || [] })
                      } catch {
                        toast.error('Falha ao carregar prévia')
                        setPreviewRend({ datas: [], carteira_valor: [] })
                      } finally {
                        setLoadingPreviewRend(false)
                      }
                    }}
                    className="px-3 py-2 rounded bg-muted text-foreground hover:bg-muted/80"
                  >Prévia</button>
                </div>
                {/* Prévia Rendimentos */}
                <div className="mt-3 overflow-x-auto">
                  {loadingPreviewRend ? (
                    <div className="text-sm text-muted-foreground">Carregando…</div>
                  ) : previewRend && previewRend.datas.length > 0 ? (
                    <table className="w-full min-w-[500px] text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-3 py-2 text-left">Período</th>
                          <th className="px-3 py-2 text-left">Valor Carteira</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRend.datas.slice(-50).map((d: string, i: number) => (
                          <tr key={`${d}-${i}`} className="border-b border-border">
                            <td className="px-3 py-2">{d}</td>
                            <td className="px-3 py-2">{formatCurrency(previewRend.carteira_valor[Math.max(0, previewRend.carteira_valor.length - previewRend.datas.slice(-50).length + i)])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-muted-foreground">Sem dados para o período.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 

// Componente para configuração de período e último rebalanceamento
function RebalanceConfigForm({ defaultPeriodo, defaultLastRebalanceDate, onSave }: {
  defaultPeriodo: string
  defaultLastRebalanceDate?: string
  onSave: (periodo: string, lastDate?: string) => void
}) {
  const [periodo, setPeriodo] = useState<string>(defaultPeriodo)
  const [lastMonth, setLastMonth] = useState<string>(() => {
    if (!defaultLastRebalanceDate) return ''
    const d = new Date(defaultLastRebalanceDate)
    if (isNaN(d.getTime())) return ''
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })

  useEffect(() => {
    setPeriodo(defaultPeriodo)
  }, [defaultPeriodo])

  const handleSave = () => {
    const payloadLast = lastMonth ? `${lastMonth}-01 00:00:00` : undefined
    onSave(periodo, payloadLast)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
      <div>
        <label htmlFor="periodo-select" className="block text-sm font-medium mb-2">Período de Rebalanceamento</label>
        <select 
          id="periodo-select" 
          title="Selecione o período de rebalanceamento"
          value={periodo} 
          onChange={(e) => setPeriodo(e.target.value)} 
          className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
        >
          <option value="mensal">Mensal</option>
          <option value="trimestral">Trimestral</option>
          <option value="semestral">Semestral</option>
          <option value="anual">Anual</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Último Rebalanceamento</label>
        <div className="flex gap-2">
          <select
            aria-label="Mês"
            title="Selecione o mês do último rebalanceamento"
            value={lastMonth ? lastMonth.split('-')[1] : ''}
            onChange={(e) => {
              const m = e.target.value
              const y = lastMonth ? lastMonth.split('-')[0] : String(new Date().getFullYear())
              setLastMonth(`${y}-${m}`)
            }}
            className="px-3 py-2 border border-border rounded bg-background text-foreground"
          >
            <option value="">Mês</option>
            {Array.from({length:12}, (_,i) => String(i+1).padStart(2,'0')).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            aria-label="Ano"
            title="Selecione o ano do último rebalanceamento"
            value={lastMonth ? lastMonth.split('-')[0] : ''}
            onChange={(e) => {
              const y = e.target.value
              const m = lastMonth ? lastMonth.split('-')[1] : String(new Date().getMonth()+1).padStart(2,'0')
              setLastMonth(`${y}-${m}`)
            }}
            className="px-3 py-2 border border-border rounded bg-background text-foreground"
          >
            <option value="">Ano</option>
            {Array.from({length:8}, (_,i) => String(new Date().getFullYear()-i)).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div>
        <button
          onClick={handleSave}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Salvar Configuração
        </button>
      </div>
    </div>
  )
}

// Componente para configuração de tipos e porcentagens
function TargetsForm({ defaultTargets, onSave, onChange }: {
  defaultTargets: Record<string, number>
  onSave: (targets: Record<string, number>) => void
  onChange: (targets: Record<string, number>) => void
}) {
  const [targets, setTargets] = useState<Record<string, number>>(defaultTargets)
  const [novoTipo, setNovoTipo] = useState<string>('')
  const queryClient = useQueryClient()

  // Buscar tipos disponíveis da carteira
  const { data: tiposApi } = useQuery({
    queryKey: ['tipos-ativos'],
    queryFn: carteiraService.getTipos,
    refetchOnWindowFocus: false,
    staleTime: 60000,
  })

  useEffect(() => {
    setTargets(defaultTargets || {})
  }, [defaultTargets])

  const handleChangeTarget = (key: string, val: string) => {
    const num = parseFloat(val.replace(',', '.'))
    const newTargets = { ...targets, [key]: isFinite(num) ? num : 0 }
    setTargets(newTargets)
    onChange(newTargets)
  }
  
  const handleCreateTypePersisted = async () => {
    const name = (novoTipo || '').trim()
    if (!name) {
      toast.error('Nome do tipo é obrigatório')
      return
    }
    if (targets[name] != null) {
      toast.error('Tipo já existe na configuração')
      return
    }
    try {
      await carteiraService.criarTipo(name)
      const newTargets = { ...targets, [name]: 0 }
      setTargets(newTargets)
      setNovoTipo('')
      onChange(newTargets)
      queryClient.invalidateQueries({ queryKey: ['tipos-ativos'] })
      queryClient.invalidateQueries({ queryKey: ['carteira'] })
      toast.success('Tipo criado com sucesso')
    } catch (e: any) {
      if (e?.response?.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.')
      } else {
        toast.error('Falha ao criar tipo')
      }
    }
  }
  
  const handleRemoveClass = (key: string) => {
    const newTargets = { ...targets }
    delete newTargets[key]
    setTargets(newTargets)
    onChange(newTargets)
  }
  
  const handleAddExistingType = (tipo: string) => {
    if (targets[tipo] != null) {
      toast.error('Tipo já está na configuração')
      return
    }
    const newTargets = { ...targets, [tipo]: 0 }
    setTargets(newTargets)
    onChange(newTargets)
    toast.success(`Tipo "${tipo}" adicionado`)
  }
  
  const total = Object.values(targets).reduce((s, v) => s + (v || 0), 0)

  return (
    <div className="space-y-4">
      {/* Lista de tipos e pesos */}
      <div className="space-y-3">
        <div className="text-sm font-medium">Tipos e Pesos (%)</div>
        <div className="max-h-[300px] overflow-auto space-y-2">
          {Object.entries(targets).map(([key, val]) => (
            <div key={key} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
              <div className="flex-1 min-w-[140px]">
                <span className="font-medium">{key}</span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={val} 
                  onChange={(e) => handleChangeTarget(key, e.target.value)} 
                  className="w-20 px-3 py-2 border border-border rounded bg-background text-foreground text-center"
                  min="0"
                  max="100"
                  step="0.1"
                  title={`Peso percentual para ${key}`}
                  aria-label={`Peso percentual para ${key}`}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <button 
                onClick={() => handleRemoveClass(key)} 
                className="px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Adicionar tipos existentes */}
      {tiposApi && tiposApi.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-2">Adicionar tipos existentes:</div>
          <div className="flex flex-wrap gap-2">
            {tiposApi
              .filter(tipo => !targets[tipo])
              .map(tipo => (
                <button
                  key={tipo}
                  onClick={() => handleAddExistingType(tipo)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  + {tipo}
                </button>
              ))}
          </div>
        </div>
      )}
      
      {/* Criar novo tipo */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={novoTipo}
          onChange={(e) => setNovoTipo(e.target.value)}
          placeholder="Novo tipo (persiste no sistema)"
          title="Digite o nome do novo tipo de ativo"
          className="flex-1 px-3 py-2 border border-border rounded bg-background text-foreground"
          aria-label="Novo tipo"
        />
        <button 
          onClick={handleCreateTypePersisted} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          disabled={!novoTipo.trim()}
        >
          Criar tipo
        </button>
      </div>
      
      {/* Total e botão salvar */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className={`text-sm font-medium ${Math.abs(total-100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
          Total: {total.toFixed(2)}%
        </div>
        <button
          onClick={() => onSave(targets)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          disabled={total <= 0}
        >
          Salvar Tipos e Pesos
        </button>
      </div>
    </div>
  )
}

// Componente para gráfico da distribuição ideal
function IdealDistributionChart({ targets }: { targets: Record<string, number> }) {
  const chartData = Object.entries(targets)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value: Number(value) || 0 }))
  
  const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F43F5E']

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Defina tipos e pesos para visualizar a distribuição ideal</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number, n: string) => [`${v.toFixed(2)}%`, n]} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Componente para gráfico da distribuição atual
function CurrentDistributionChart({ carteira }: { carteira: AtivoCarteira[] | undefined }) {
  if (!carteira || carteira.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum ativo na carteira</p>
        </div>
      </div>
    )
  }

  const ativosPorTipo = carteira.reduce((acc, ativo) => {
    const tipo = ativo?.tipo || 'Desconhecido'
    acc[tipo] = (acc[tipo] || 0) + (ativo?.valor_total || 0)
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(ativosPorTipo)
    .filter(([_, valor]) => valor > 0)
    .map(([tipo, valor]) => ({ name: tipo, value: valor }))

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum valor encontrado</p>
        </div>
      </div>
    )
  }

  const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F43F5E']

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any, name: string) => [formatCurrency(value), name]}
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))', 
              borderRadius: '8px',
              color: 'hsl(var(--foreground))'
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Componente para cálculos de rebalanceamento
function RebalanceCalculations({ carteira, idealTargets, valorTotal }: {
  carteira: AtivoCarteira[] | undefined
  idealTargets: Record<string, number>
  valorTotal: number
}) {
  if (!carteira || carteira.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Adicione ativos à carteira para ver os cálculos de rebalanceamento</p>
      </div>
    )
  }

  // Calcular distribuição atual
  const ativosPorTipo = carteira.reduce((acc, ativo) => {
    const tipo = ativo?.tipo || 'Desconhecido'
    acc[tipo] = (acc[tipo] || 0) + (ativo?.valor_total || 0)
    return acc
  }, {} as Record<string, number>)

  // Calcular percentuais atuais
  const percentuaisAtuais = Object.entries(ativosPorTipo).reduce((acc, [tipo, valor]) => {
    acc[tipo] = valorTotal > 0 ? (valor / valorTotal) * 100 : 0
    return acc
  }, {} as Record<string, number>)

  // Calcular diferenças e sugestões
  const calculos = Object.keys({ ...idealTargets, ...percentuaisAtuais }).map(tipo => {
    const atual = percentuaisAtuais[tipo] || 0
    const ideal = idealTargets[tipo] || 0
    const diferenca = ideal - atual
    const valorDiferenca = (diferenca / 100) * valorTotal
    
    return {
      tipo,
      atual: atual.toFixed(1),
      ideal: ideal.toFixed(1),
      diferenca: diferenca.toFixed(1),
      valorDiferenca,
      acao: diferenca > 0 ? 'comprar' : diferenca < 0 ? 'vender' : 'manter'
    }
  }).filter(calc => Math.abs(parseFloat(calc.diferenca)) > 0.1) // Só mostrar diferenças significativas

  if (calculos.length === 0) {
    return (
      <div className="text-center text-green-600 py-8">
        <CheckCircle className="w-12 h-12 mx-auto mb-4" />
        <p className="font-semibold">Carteira já está balanceada!</p>
        <p className="text-sm text-muted-foreground">Não são necessários ajustes no momento</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {calculos.map((calc) => (
          <div key={calc.tipo} className="bg-background border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">{calc.tipo}</h4>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                calc.acao === 'comprar' 
                  ? 'bg-green-100 text-green-800' 
                  : calc.acao === 'vender' 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {calc.acao === 'comprar' ? 'Comprar' : calc.acao === 'vender' ? 'Vender' : 'Manter'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atual:</span>
                <span className="font-medium">{calc.atual}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ideal:</span>
                <span className="font-medium">{calc.ideal}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Diferença:</span>
                <span className={`font-medium ${parseFloat(calc.diferenca) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(calc.diferenca) > 0 ? '+' : ''}{calc.diferenca}%
                </span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className={`font-semibold ${calc.valorDiferenca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calc.valorDiferenca > 0 ? '+' : ''}{formatCurrency(Math.abs(calc.valorDiferenca))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-semibold mb-2">Resumo das Ações</h4>
        <div className="space-y-2 text-sm">
          {calculos.filter(c => c.acao === 'comprar').length > 0 && (
            <div className="text-green-600">
              <strong>Comprar:</strong> {calculos.filter(c => c.acao === 'comprar').map(c => `${c.tipo} (${formatCurrency(c.valorDiferenca)})`).join(', ')}
            </div>
          )}
          {calculos.filter(c => c.acao === 'vender').length > 0 && (
            <div className="text-red-600">
              <strong>Vender:</strong> {calculos.filter(c => c.acao === 'vender').map(c => `${c.tipo} (${formatCurrency(Math.abs(c.valorDiferenca))})`).join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente para histórico de rebalanceamentos
function RebalanceHistory({ history, onRegisterHistory }: {
  history: string[]
  onRegisterHistory: (date: string) => void
}) {
  const [selectedDate, setSelectedDate] = useState<string>('')

  const handleRegister = () => {
    if (selectedDate) {
      onRegisterHistory(`${selectedDate}-01 00:00:00`)
      setSelectedDate('')
    }
  }

  return (
    <div className="space-y-4">
      {/* Registrar novo histórico */}
      <div className="flex items-center gap-2">
        <input
          type="month"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-border rounded bg-background text-foreground"
          title="Selecione o mês e ano do rebalanceamento"
          aria-label="Data do rebalanceamento"
        />
        <button
          onClick={handleRegister}
          disabled={!selectedDate}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Registrar
        </button>
      </div>

      {/* Lista de histórico */}
      {history.length > 0 ? (
        <div className="space-y-2">
          {history.map((date, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-background border border-border rounded">
              <span>{new Date(date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
              <span className="text-sm text-muted-foreground">{new Date(date).toLocaleDateString('pt-BR')}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-4">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum histórico registrado</p>
        </div>
      )}
    </div>
  )
}

function RebalanceStatus({ status }: { status: any }) {
  const can = !!status?.can_rebalance
  const nextDue = status?.next_due_date
  const daysUntilNext = status?.days_until_next
  const deviations = status?.deviations || {}
  const current = status?.current_distribution || {}
  const targets = status?.targets || {}
  const suggestions = status?.suggestions || []
  return (
    <div className="space-y-4">
      <div className={`p-3 rounded border ${can ? 'border-yellow-300 bg-yellow-50 text-yellow-800' : 'border-green-300 bg-green-50 text-green-800'}`}>
        {can ? (
          <div>
            <strong>Atenção:</strong> Rebalanceamento devido. Próxima data sugerida: {nextDue ? new Date(nextDue).toLocaleDateString('pt-BR') : '—'}
          </div>
        ) : (
          <div>
            Próximo rebalanceamento em {Math.max(0, daysUntilNext ?? 0)} dias {nextDue ? `(${new Date(nextDue).toLocaleDateString('pt-BR')})` : ''}.
          </div>
        )}
      </div>
      <div>
        <h4 className="font-semibold mb-2">Distribuição Atual x Meta (%)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.keys({ ...targets, ...current }).map((k) => (
            <div key={k} className="text-sm bg-background border border-border rounded px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">{k}</span>
                <span className="whitespace-nowrap">Meta: {(targets?.[k] ?? 0).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="whitespace-nowrap">Atual: {(current?.[k] ?? 0).toFixed(1)}%</span>
                <span className="whitespace-nowrap">Desvio: {(deviations?.[k] ?? ( (current?.[k] ?? 0) - (targets?.[k] ?? 0) )).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Sugestões</h4>
        {suggestions.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sem sugestões no momento.</div>
        ) : (
          <div className="space-y-2 text-sm">
            {suggestions.map((s: any, idx: number) => (
              <div key={idx} className="bg-background border border-border rounded px-3 py-2">
                {s.acao === 'comprar' ? 'Comprar' : 'Vender'} aproximadamente {s.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} da classe <strong>{s.classe}</strong>.
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}