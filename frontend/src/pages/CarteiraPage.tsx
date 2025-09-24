import { useState, useCallback, useMemo, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'

import { 
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
  Calculator,
  PlusCircle,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { carteiraService } from '../services/api'
import { AtivoCarteira, Movimentacao } from '../types'
import { formatCurrency } from '../utils/formatters'
import HelpTips from '../components/HelpTips'
import { normalizeTicker, getDisplayTicker } from '../utils/tickerUtils'
import CarteiraAtivosTab from '../components/carteira/CarteiraAtivosTab'
import CarteiraGraficosTab from '../components/carteira/CarteiraGraficosTab'
import CarteiraRankingTab from '../components/carteira/CarteiraRankingTab'
import CarteiraProventosTab from '../components/carteira/CarteiraProventosTab'
import CarteiraInsightsTab from '../components/carteira/CarteiraInsightsTab'
import CarteiraRebalanceamentoTab from '../components/carteira/CarteiraRebalanceamentoTab'
import CarteiraMovimentacoesTab from '../components/carteira/CarteiraMovimentacoesTab'
import CarteiraProjecaoTab from '../components/carteira/CarteiraProjecaoTab'
import CarteiraRelatoriosTab from '../components/carteira/CarteiraRelatoriosTab'
import AddAtivoModal from '../components/carteira/AddAtivoModal'

export default function CarteiraPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [inputTicker, setInputTicker] = useState('')
  const [inputQuantidade, setInputQuantidade] = useState('')
  const [inputTipo, setInputTipo] = useState('')
  const [inputPreco, setInputPreco] = useState('')
  const [inputIndexador, setInputIndexador] = useState<'CDI' | 'IPCA' | 'SELIC' | 'PREFIXADO' | ''>('')
  const [inputIndexadorPct, setInputIndexadorPct] = useState('')
  // Novos campos RF
  const [inputDataAplicacao, setInputDataAplicacao] = useState<string>('')
  const [inputVencimento, setInputVencimento] = useState<string>('')
  const [inputIsentoIr, setInputIsentoIr] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editQuantidade, setEditQuantidade] = useState('')
  const [editPreco, setEditPreco] = useState('')
  const [filtroMes, setFiltroMes] = useState<number>(new Date().getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState<number>(new Date().getFullYear())
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab')
    const validTabs = ['ativos', 'graficos', 'ranking', 'proventos', 'insights', 'rebalance', 'movimentacoes', 'relatorios', 'projecao']
    return validTabs.includes(tabFromUrl || '') ? tabFromUrl! : 'ativos'
  })
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

  // Atalho: Ctrl+I para abrir a modal de adição (somente na aba Ativos)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        if (activeTab === 'ativos') setAddModalOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTab])
  const idealTargets = useMemo(() => {
    return idealPreview?.targets ?? (rbConfig as any)?.targets ?? {}
  }, [idealPreview, rbConfig])
  const [ocultarValor, setOcultarValor] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
 
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


  const { data: carteira, isLoading: loadingCarteira } = useQuery<AtivoCarteira[]>({
    queryKey: ['carteira', user], 
    queryFn: async () => await carteiraService.getCarteira(),
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

  // Atualizações em background ao entrar na tela (não bloqueia UI)
  useEffect(() => {
    let cancelled = false
    const runBackgroundUpdates = async () => {
      try {
        // Dispara as duas atualizações em paralelo e silenciosas
        const [resIdx, resPrecos] = await Promise.allSettled([
          carteiraService.refreshIndexadores(),
          carteiraService.refreshCarteira(),
        ])
        if (cancelled) return
        // Invalidar dados após conclusão
        queryClient.invalidateQueries({ queryKey: ['carteira', user] })
        queryClient.invalidateQueries({ queryKey: ['carteira-insights', user] })
        // Notificações leves
        if (resIdx.status === 'fulfilled') {
          const n = (resIdx.value && typeof resIdx.value.updated === 'number') ? resIdx.value.updated : undefined
          toast.success(n != null ? `Indexadores atualizados (${n})` : 'Indexadores atualizados')
        }
        if (resPrecos.status === 'fulfilled') {
          const n = (resPrecos.value && typeof resPrecos.value.updated === 'number') ? resPrecos.value.updated : undefined
          toast.success(n != null ? `Preços atualizados (${n})` : 'Preços atualizados')
        }
      } catch {
        // Erros já tratados abaixo; evitamos bloquear a UI
      }
    }
    runBackgroundUpdates()
    return () => { cancelled = true }
  // Executa ao entrar, e também quando usuário/logged-in mudar
  }, [user, queryClient])

  // Tesouro Direto - lista de títulos para autocompletar
  const { data: tesouroData } = useQuery({
    queryKey: ['tesouro-titulos'],
    queryFn: carteiraService.getTesouroTitulos,
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
    mutationFn: ({ ticker, quantidade, tipo, preco_inicial, nome_personalizado, indexador, indexador_pct, data_aplicacao, vencimento, isento_ir }: { ticker: string; quantidade: number; tipo: string; preco_inicial?: number; nome_personalizado?: string; indexador?: 'CDI'|'IPCA'|'SELIC'|'PREFIXADO'; indexador_pct?: number; data_aplicacao?: string; vencimento?: string; isento_ir?: boolean }) =>
      carteiraService.adicionarAtivo(ticker, quantidade, tipo, preco_inicial, nome_personalizado, indexador, indexador_pct, data_aplicacao, vencimento, isento_ir),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carteira', user] })
      queryClient.invalidateQueries({ queryKey: ['movimentacoes', user] })
      queryClient.invalidateQueries({ queryKey: ['historico-carteira', user] })
      queryClient.invalidateQueries({ queryKey: ['proventos', user] })
      queryClient.invalidateQueries({ queryKey: ['proventos-recebidos', user] })
      
      // Limpar formulário após sucesso
      setInputTicker('')
      setInputQuantidade('')
      setInputTipo('')
      setInputPreco('')
      setInputIndexador('')
      setInputIndexadorPct('')
      setInputDataAplicacao('')
      setInputVencimento('')
      setInputIsentoIr(false)
      
      toast.success('Ativo adicionado com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar ativo:', error)
      toast.error('Erro ao adicionar ativo. Tente novamente.')
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
    mutationFn: ({ id, quantidade, preco_atual }: { id: number; quantidade?: number; preco_atual?: number }) =>
      carteiraService.atualizarAtivo(id, { quantidade, preco_atual }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carteira', user] })
      queryClient.invalidateQueries({ queryKey: ['historico-carteira', user] })
      queryClient.invalidateQueries({ queryKey: ['proventos', user] })
      queryClient.invalidateQueries({ queryKey: ['proventos-recebidos', user] })
      
      queryClient.invalidateQueries({ queryKey: ['movimentacoes', user] })
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-all', user] })
      setEditingId(null)
      setEditQuantidade('')
      setEditPreco('')
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
    const payload: any = {
      ticker: finalTicker,
      quantidade,
      tipo: finalTipo,
      preco_inicial: precoInicialNum,
      nome_personalizado: undefined,
      indexador: (inputIndexador || undefined) as any,
      indexador_pct: inputIndexadorPct && !isNaN(parseFloat(inputIndexadorPct.replace(',', '.'))) ? parseFloat(inputIndexadorPct.replace(',', '.')) : undefined,
    }
    if (inputDataAplicacao) payload.data_aplicacao = inputDataAplicacao
    if (inputVencimento) payload.vencimento = inputVencimento
    if (inputIsentoIr) payload.isento_ir = true
    adicionarMutation.mutate(payload)
  }, [inputTicker, inputQuantidade, inputTipo, inputPreco, inputIndexador, inputIndexadorPct, adicionarMutation])

  const handlePickTesouro = useCallback((item: any) => {
    // Preenche campos com base no título escolhido
    const idxNorm = (item?.indexador_normalizado || item?.indexador || '').toUpperCase()
    const tipo = 'Renda Fixa Pública'
    setInputTipo(tipo)
    // Ticker simbólico: TD-<INDEX>-<AAAA>
    const ano = item?.vencimento ? String(item.vencimento).slice(0,4) : 'NA'
    const simb = `TD-${idxNorm || 'X'}-${ano}`
    setInputTicker(simb)
    // Indexador/taxa
    if (idxNorm === 'PREFIXADO') {
      setInputIndexador('PREFIXADO')
      setInputIndexadorPct(typeof item?.taxa_compra_aa === 'number' ? String(item.taxa_compra_aa) : '')
    } else if (idxNorm === 'IPCA') {
      setInputIndexador('IPCA')
      // spread não disponível; manter vazio para cálculo aproximado
      setInputIndexadorPct('')
    } else if (idxNorm === 'SELIC') {
      setInputIndexador('SELIC')
      setInputIndexadorPct('100')
    } else {
      setInputIndexador('')
      setInputIndexadorPct('')
    }
    // Datas
    const today = new Date()
    setInputDataAplicacao(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`)
    if (item?.vencimento) setInputVencimento(String(item.vencimento).slice(0,10))
  }, [])

  const handleRemover = useCallback((id: number) => {
    if (confirm('Tem certeza que deseja remover este ativo?')) {
      removerMutation.mutate(id)
    }
  }, [removerMutation])

  const handleEditar = useCallback((id: number, quantidade: number) => {
    setEditingId(id)
    setEditQuantidade(quantidade.toString())
    const ativo = (carteira || []).find((a: any) => a?.id === id)
    setEditPreco(ativo && typeof ativo.preco_atual === 'number' ? String(ativo.preco_atual) : '')
  }, [carteira])

  const handleSalvarEdicao = useCallback(() => {
    if (!editingId) return
    const payload: { id: number; quantidade?: number; preco_atual?: number } = { id: editingId }
    if (editQuantidade.trim()) {
      const quantidade = parseFloat(editQuantidade.replace(',', '.'))
      if (!isNaN(quantidade) && quantidade > 0) payload.quantidade = quantidade
    }
    if (editPreco.trim()) {
      const preco = parseFloat(editPreco.replace(',', '.'))
      if (!isNaN(preco) && preco >= 0) payload.preco_atual = preco
    }
    if (payload.quantidade == null && payload.preco_atual == null) return
    atualizarMutation.mutate(payload)
  }, [editingId, editQuantidade, editPreco, atualizarMutation])

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
        <TabButton id="projecao" label="Projeção" icon={Calculator} isActive={activeTab === 'projecao'} />
      </div>

      {/* Conteúdo das Abas */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
        {/* CTA destacado para adicionar ativo (somente na aba Ativos) */}
        {activeTab === 'ativos' && (
          <div className="mb-4 rounded-xl border border-border bg-gradient-to-r from-primary/10 to-primary/5 p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Adicionar novo ativo</div>
              <div className="text-base sm:text-lg font-semibold text-foreground truncate">Ações, FIIs, BDRs e Renda Fixa</div>
              <div className="text-xs text-muted-foreground">Dica: pressione Ctrl+I para abrir rapidamente</div>
            </div>
            <button
              onClick={()=>setAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow"
            >
              <PlusCircle size={18} /> Adicionar Ativo
            </button>
          </div>
        )}
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
          <CarteiraAtivosTab
            inputTicker={inputTicker}
            setInputTicker={setInputTicker}
            inputQuantidade={inputQuantidade}
            setInputQuantidade={setInputQuantidade}
            inputTipo={inputTipo}
            setInputTipo={setInputTipo}
            inputPreco={inputPreco}
            setInputPreco={setInputPreco}
            inputIndexador={inputIndexador}
            setInputIndexador={(value: string) => setInputIndexador(value as "" | "CDI" | "IPCA" | "SELIC" | "PREFIXADO")}
            inputIndexadorPct={inputIndexadorPct}
            setInputIndexadorPct={setInputIndexadorPct}
            inputDataAplicacao={inputDataAplicacao}
            setInputDataAplicacao={setInputDataAplicacao}
            inputVencimento={inputVencimento}
            setInputVencimento={setInputVencimento}
            inputIsentoIr={inputIsentoIr}
            setInputIsentoIr={setInputIsentoIr}
            handleAdicionar={handleAdicionar}
            adicionarMutation={adicionarMutation}
            carteira={carteira || []}
            loadingCarteira={loadingCarteira}
            ativosPorTipo={ativosPorTipo as unknown as Record<string, any[]>}
            valorTotal={valorTotal}
            topAtivos={topAtivos}
            editingId={editingId}
            editQuantidade={editQuantidade}
            setEditQuantidade={setEditQuantidade}
            editPreco={editPreco}
            setEditPreco={setEditPreco}
            handleEditar={handleEditar}
            handleSalvarEdicao={handleSalvarEdicao}
            handleCancelarEdicao={handleCancelarEdicao}
            handleRemover={handleRemover}
            expandedTipos={expandedTipos}
            setExpandedTipos={setExpandedTipos}
            setManageTipoOpen={setManageTipoOpen}
            setRenameTipoValue={setRenameTipoValue}
            movimentacoesAll={movimentacoesAll || []}
            indicadores={indicadores}
            tiposDisponiveisComputed={tiposDisponiveisComputed}
            tesouroTitulos={tesouroData as any}
            onPickTesouro={handlePickTesouro}
          />
        )}

        {activeTab === 'graficos' && (
          <CarteiraGraficosTab
            carteira={carteira || []}
            loadingHistorico={loadingHistorico}
            historicoCarteira={historicoCarteira as any || null}
            filtroPeriodo={filtroPeriodo}
            setFiltroPeriodo={(value: string) => setFiltroPeriodo(value as "mensal" | "trimestral" | "semestral" | "anual" | "maximo")}
            ativosPorTipo={ativosPorTipo as unknown as Record<string, number>}
            topAtivos={topAtivos}
          />
        )}


        {activeTab === 'ranking' && (
          <CarteiraRankingTab
            carteira={carteira || []}
          />
        )}

        {activeTab === 'proventos' && (
          <CarteiraProventosTab
            carteira={carteira || []}
            filtroProventos={filtroProventos}
            setFiltroProventos={(value: string) => setFiltroProventos(value as any)}
            loadingProventos={loadingProventos}
            proventosError={proventosError}
            proventos={proventos || []}
            loadingProventosRecebidos={loadingProventosRecebidos}
            proventosRecebidos={proventosRecebidos || []}
            dadosGraficoProventos={dadosGraficoProventos || []}
          />
        )}


        {activeTab === 'insights' && (
          <CarteiraInsightsTab
            carteira={carteira || []}
            loadingInsights={loadingInsights}
            insights={insights}
          />
        )}

        {activeTab === 'rebalance' && (
          <CarteiraRebalanceamentoTab
            carteira={carteira || []}
                valorTotal={valorTotal}
            rbConfig={rbConfig}
            idealPreview={idealPreview}
            setIdealPreview={setIdealPreview}
            idealTargets={idealTargets}
            rbStatus={rbStatus}
            rbHistory={rbHistory}
            saveRebalanceMutation={saveRebalanceMutation}
            queryClient={queryClient}
            user={user}
            carteiraService={carteiraService}
            toast={toast}
          />
        )}

        {activeTab === 'movimentacoes' && (
          <CarteiraMovimentacoesTab
            filtroMes={filtroMes}
            setFiltroMes={setFiltroMes}
            filtroAno={filtroAno}
            setFiltroAno={setFiltroAno}
            loadingMovimentacoes={loadingMovimentacoes}
            movimentacoes={movimentacoes || []}
          />
        )}

        {activeTab === 'relatorios' && (
          <CarteiraRelatoriosTab
            carteira={carteira || []}
            carteiraService={carteiraService}
          />
        )}

        {activeTab === 'projecao' && (
          <CarteiraProjecaoTab
            carteira={carteira || []}
            historicoCarteira={historicoCarteira}
            proventosRecebidos={proventosRecebidos || []}
            filtroPeriodo={filtroPeriodo}
            setFiltroPeriodo={(value: string) => setFiltroPeriodo(value as "mensal" | "trimestral" | "semestral" | "anual" | "maximo")}
          />
        )}
      </div>
      {/* FAB mobile para adicionar ativo rapidamente (somente na aba Ativos) */}
      {activeTab === 'ativos' && (
        <div className="md:hidden fixed bottom-6 right-6 z-20">
          <button
            onClick={() => setAddModalOpen(true)}
            className="rounded-full p-4 bg-primary text-primary-foreground shadow-lg"
            aria-label="Adicionar ativo"
            title="Adicionar ativo"
          >
            <PlusCircle size={20} />
          </button>
        </div>
      )}
      {activeTab === 'ativos' && addModalOpen && (
        <AddAtivoModal open={addModalOpen} onClose={()=>setAddModalOpen(false)} />
      )}
    </div>
  )
} 



