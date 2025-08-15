import { useState, useCallback, useMemo } from 'react'
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
  TrendingUp,
  Activity,
  DollarSign,

  ArrowUpRight,
  ArrowDownRight,
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
  PieChart
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { carteiraService } from '../services/api'
import { AtivoCarteira, Movimentacao } from '../types'
import { formatCurrency, formatPercentage, formatDividendYield, formatNumber } from '../utils/formatters'
import TickerWithLogo from '../components/TickerWithLogo'
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
  const [inputTipo, setInputTipo] = useState('Ação')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editQuantidade, setEditQuantidade] = useState('')
  const [filtroMes, setFiltroMes] = useState<number>(new Date().getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState<number>(new Date().getFullYear())
  const [activeTab, setActiveTab] = useState('ativos')
  const [ocultarValor, setOcultarValor] = useState(true)
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
    queryFn: carteiraService.getCarteira,
    enabled: !!user, 
  })

  const { data: movimentacoes, isLoading: loadingMovimentacoes } = useQuery<Movimentacao[]>({
    queryKey: ['movimentacoes', user, filtroMes, filtroAno], 
    queryFn: () => carteiraService.getMovimentacoes(filtroMes, filtroAno),
    enabled: !!user, // Só executar se houver usuário logado
  })

  // Query para proventos dos ativos da carteira com filtro
  const { data: proventos, isLoading: loadingProventos, error: proventosError } = useQuery({
    queryKey: ['proventos', user, carteira?.map(ativo => ativo?.ticker), filtroProventos], // Incluir filtro na chave
    queryFn: () => carteiraService.getProventosComFiltro(carteira?.map(ativo => ativo?.ticker || '') || [], filtroProventos),
    enabled: !!user && !!carteira && carteira.length > 0, // Só executar se houver usuário logado e carteira
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Query para proventos recebidos baseado na carteira
  const { data: proventosRecebidos, isLoading: loadingProventosRecebidos } = useQuery({
    queryKey: ['proventos-recebidos', user, filtroProventos],
    queryFn: () => carteiraService.getProventosRecebidos(filtroProventos),
    enabled: !!user && !!carteira && carteira.length > 0,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Query para histórico da carteira
  const { data: historicoCarteira, isLoading: loadingHistorico } = useQuery({
    queryKey: ['historico-carteira', user, filtroPeriodo],
    queryFn: () => carteiraService.getHistorico(filtroPeriodo),
    enabled: !!user,
    retry: 3,
    refetchOnWindowFocus: false,
  })

  // Debug: verificar dados recebidos
  console.log('DEBUG: historicoCarteira recebido:', historicoCarteira)
  if (historicoCarteira && historicoCarteira.datas && historicoCarteira.datas.length > 0) {
    console.log('DEBUG: Primeiros 3 datas do histórico:', historicoCarteira.datas.slice(0, 3))
  }





  // Mutations
  const adicionarMutation = useMutation({
    mutationFn: ({ ticker, quantidade, tipo }: { ticker: string; quantidade: number; tipo: string }) =>
      carteiraService.adicionarAtivo(ticker, quantidade, tipo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carteira', user] })
      queryClient.invalidateQueries({ queryKey: ['movimentacoes', user] })
      queryClient.invalidateQueries({ queryKey: ['historico-carteira', user] })
      queryClient.invalidateQueries({ queryKey: ['proventos', user] })
      queryClient.invalidateQueries({ queryKey: ['proventos-recebidos', user] })
      setInputTicker('')
      setInputQuantidade('')
      setInputTipo('Ação')
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

  // Handlers
  const handleAdicionar = useCallback(() => {
    if (!inputTicker.trim() || !inputQuantidade.trim()) return
    
    const quantidade = parseFloat(inputQuantidade.replace(',', '.'))
    if (isNaN(quantidade) || quantidade <= 0) return
    
    const normalizedTicker = normalizeTicker(inputTicker.trim())
    
    adicionarMutation.mutate({
      ticker: getDisplayTicker(normalizedTicker),
      quantidade,
      tipo: inputTipo
    })
  }, [inputTicker, inputQuantidade, inputTipo, adicionarMutation])

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

  // Cálculos
  const valorTotal = carteira?.reduce((total, ativo) => total + (ativo?.valor_total || 0), 0) || 0
  const ativosPorTipo = carteira?.reduce((acc, ativo) => {
    const tipo = ativo?.tipo || 'Desconhecido'
    acc[tipo] = (acc[tipo] || 0) + (ativo?.valor_total || 0)
    return acc
  }, {} as Record<string, number>) || {}

  const topAtivos = carteira?.slice(0, 5) || []
  const ativosPositivos = carteira?.filter(ativo => ativo?.dy && ativo.dy > 0).length || 0

  // Labels de período para insights
  const periodoLabel = useMemo(() => {
    switch (filtroPeriodo) {
      case 'mensal': return 'no último mês'
      case 'trimestral': return 'no último trimestre'
      case 'semestral': return 'no último semestre'
      case 'anual': return 'no último ano'
      case 'maximo': return 'no período'
      default: return 'no período'
    }
  }, [filtroPeriodo])

  // Cálculo de variação percentual a partir de séries rebaseadas (100 no início)
  const calcDeltaFromSeries = useCallback((series?: (number | null)[]) => {
    if (!series || series.length < 2) return null
    let firstIndex = -1
    for (let i = 0; i < series.length; i++) { if (series[i] != null) { firstIndex = i; break } }
    let lastIndex = -1
    for (let i = series.length - 1; i >= 0; i--) { if (series[i] != null) { lastIndex = i; break } }
    if (firstIndex === -1 || lastIndex === -1 || lastIndex === firstIndex) return null
    const firstVal = series[firstIndex] as number
    const lastVal = series[lastIndex] as number
    return lastVal - firstVal
  }, [])

  const performanceResumo = useMemo(() => {
    if (!historicoCarteira) return null
    return {
      carteira: calcDeltaFromSeries(historicoCarteira.carteira),
      ibov: calcDeltaFromSeries(historicoCarteira.ibov),
      ipca: calcDeltaFromSeries(historicoCarteira.ipca)
    }
  }, [historicoCarteira, calcDeltaFromSeries])

  
  const ativosComProventos = useMemo(() => {
    return proventosRecebidos?.filter(a => a?.proventos_recebidos && a.proventos_recebidos.length > 0).length || 0
  }, [proventosRecebidos])

  const totalProventosRecebidos = useMemo(() => {
    return proventosRecebidos?.reduce((sum, a) => sum + (a?.total_recebido || 0), 0) || 0
  }, [proventosRecebidos])

  const proventosPeriodoLabel = useMemo(() => {
    switch (filtroProventos) {
      case 'mes': return 'neste mês'
      case '6meses': return 'nos últimos 6 meses'
      case '1ano': return 'no último ano'
      case '5anos': return 'nos últimos 5 anos'
      case 'total': return 'no histórico'
      default: return 'no período'
    }
  }, [filtroProventos])

  
  const calcDrawdownFromSeries = useCallback((series?: (number | null)[]) => {
    if (!series || series.length < 2) return null
    let peak = -Infinity
    let maxDD = 0
    for (const v of series) {
      if (v == null) continue
      if (v > peak) {
        peak = v
      } else if (peak > 0) {
        const dd = ((v - peak) / peak) * 100
        if (dd < maxDD) maxDD = dd
      }
    }
    return maxDD // negativo ou 0
  }, [])

  const calcVolFromSeries = useCallback((series?: (number | null)[]) => {
    if (!series || series.length < 3) return null
    const vals = series.filter(v => v != null) as number[]
    if (vals.length < 3) return null
    const returns: number[] = []
    for (let i = 1; i < vals.length; i++) {
      if (vals[i - 1] > 0) {
        returns.push(((vals[i] / vals[i - 1]) - 1) * 100)
      }
    }
    if (returns.length < 2) return null
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1)
    return Math.sqrt(variance)
  }, [])

  const carteiraDrawdown = useMemo(() => calcDrawdownFromSeries(historicoCarteira?.carteira), [historicoCarteira, calcDrawdownFromSeries])
  const carteiraVol = useMemo(() => calcVolFromSeries(historicoCarteira?.carteira), [historicoCarteira, calcVolFromSeries])
  const retornoReal = useMemo(() => {
    if (!performanceResumo || performanceResumo.carteira == null) return null
    const ipcaDelta = performanceResumo.ipca ?? 0
    return performanceResumo.carteira - ipcaDelta
  }, [performanceResumo])

  
  const topConcentracao = useMemo(() => {
    if (!valorTotal || !topAtivos || topAtivos.length === 0) return 0
    return (topAtivos[0].valor_total || 0) / valorTotal
  }, [topAtivos, valorTotal])

  const recomendacoes = useMemo(() => {
    const recs: string[] = []
    if ((carteira?.length || 0) < 5) recs.push('Carteira com baixa diversificação. Considere aumentar o número de ativos.')
    if (topConcentracao > 0.25) recs.push(`Alta concentração em ${topAtivos[0]?.ticker}. Avalie rebalancear (> ${(topConcentracao * 100).toFixed(1)}% da carteira).`)
    const qtdPLAlto = carteira?.filter(a => (a?.pl ?? 0) > 20).length || 0
    if (qtdPLAlto > 0) recs.push(`${qtdPLAlto} ativo(s) com P/L elevado (> 20).`)
    const semDY = carteira?.filter(a => a?.dy == null || a.dy <= 0).length || 0
    if (semDY > 0) recs.push(`${semDY} ativo(s) sem pagamentos recentes de proventos.`)
    return recs.slice(0, 3)
  }, [carteira, topConcentracao, topAtivos])

  // Dados para gráfico de proventos por mês
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
      .slice(-12) // Últimos 12 meses
  }, [proventosRecebidos])

  // Componente de indicador visual
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

  // Componente de aba
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




  // Componente de tabela de ativos por tipo
  const TabelaAtivosPorTipo = ({ tipo }: { tipo: string }) => {
    const ativosDoTipo = carteira?.filter(ativo => ativo?.tipo === tipo) || []
    const totalTipo = ativosDoTipo.reduce((total, ativo) => total + (ativo?.valor_total || 0), 0)
    const porcentagemTipo = valorTotal > 0 ? (totalTipo / valorTotal * 100).toFixed(1) : '0.0'
    const isExpanded = expandedTipos[tipo] || false

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
            <div className="text-right">
              <div className="text-lg font-bold">{formatCurrency(totalTipo)}</div>
              <div className="text-sm text-muted-foreground">{porcentagemTipo}% do total</div>
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
        <h1 className="text-3xl font-bold">Minha Carteira</h1>
        <button
          onClick={() => setOcultarValor(!ocultarValor)}
          className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
          title={ocultarValor ? 'Mostrar valor' : 'Ocultar valor'}
        >
          {ocultarValor ? '👁 Mostrar Valor' : '🔒 Ocultar Valor'}
        </button>
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
        <TabButton id="movimentacoes" label="Movimentações" icon={History} isActive={activeTab === 'movimentacoes'} />
      </div>

      {/* Conteúdo das Abas */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
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
                  <select
                    value={inputTipo}
                    onChange={(e) => setInputTipo(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Selecionar tipo de ativo"
                  >
                    <option value="Ação">Ação</option>
                    <option value="FII">FII</option>
                    <option value="BDR">BDR</option>
                    <option value="Criptomoeda">Criptomoeda</option>
                    <option value="Fixa">Fixa</option>
                  </select>
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
                {['Ação', 'FII', 'BDR', 'Criptomoeda', 'Fixa'].map(tipo => (
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
            <h2 className="text-xl font-semibold mb-4">Insights</h2>
            
            {carteira && carteira.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Insights Principais */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                        <h3 className="text-lg font-semibold text-blue-800">Análise de Performance</h3>
                      </div>
                      {performanceResumo && performanceResumo.carteira != null ? (
                        <p className="text-blue-700">
                          Sua carteira variou <strong>{(performanceResumo.carteira >= 0 ? '+' : '')}{performanceResumo.carteira.toFixed(2)}%</strong> {periodoLabel},
                          {performanceResumo.ibov != null && (
                            <>
                              {' '}
                              {performanceResumo.carteira >= (performanceResumo.ibov || 0) ? 'superando' : 'ficando abaixo do'} o Ibovespa que teve <strong>{(performanceResumo.ibov >= 0 ? '+' : '')}{performanceResumo.ibov.toFixed(2)}%</strong>.
                            </>
                          )}
                          {retornoReal != null && (
                            <>
                              {' '}Em termos reais (após IPCA), seu retorno foi <strong>{(retornoReal >= 0 ? '+' : '')}{retornoReal.toFixed(2)}%</strong>.
                            </>
                          )}
                        </p>
                      ) : (
                        <p className="text-blue-700">Sem dados suficientes para calcular a performance {periodoLabel}.</p>
                      )}
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                        <h3 className="text-lg font-semibold text-green-800">Distribuição de Dividendos</h3>
                      </div>
                      <p className="text-green-700">
                        {proventosRecebidos && proventosRecebidos.length > 0 ? (
                          <>Recebeu <strong>{formatCurrency(totalProventosRecebidos)}</strong> em proventos {proventosPeriodoLabel}, com <strong>{ativosComProventos}</strong> ativo(s) contribuindo.</>
                        ) : (
                          <>Sem proventos {proventosPeriodoLabel} para os ativos em carteira.</>
                        )}
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Target className="w-6 h-6 text-purple-600" />
                        <h3 className="text-lg font-semibold text-purple-800">Maior Posição</h3>
                      </div>
                      <p className="text-purple-700">
                        Sua maior posição é <strong>{topAtivos[0]?.ticker || 'N/A'}</strong> 
                        com <strong>{formatCurrency(topAtivos[0]?.valor_total || 0)}</strong> 
                        ({((topAtivos[0]?.valor_total || 0) / valorTotal * 100).toFixed(1)}% da carteira).
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Activity className="w-6 h-6 text-orange-600" />
                        <h3 className="text-lg font-semibold text-orange-800">Risco e Diversificação</h3>
                      </div>
                      <p className="text-orange-700">
                        Sua carteira tem <strong>{carteira?.length || 0} ativos</strong> em <strong>{Object.keys(ativosPorTipo).length}</strong> categorias.{' '}
                        {carteiraDrawdown != null && (
                          <>Drawdown máx: <strong>{carteiraDrawdown.toFixed(2)}%</strong>. </>
                        )}
                        {carteiraVol != null && (
                          <>Volatilidade: <strong>{carteiraVol.toFixed(2)}%</strong>.</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Insights Secundários */}
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-500" />
                    Recomendações
                  </h3>
                  <div className="space-y-3">
                    {(recomendacoes.length > 0 ? recomendacoes : ['Sem recomendações no momento.']).map((msg, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-background rounded">
                        <div className={`w-2 h-2 ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-green-500' : 'bg-yellow-500'} rounded-full mt-2 flex-shrink-0`}></div>
                        <p className="text-sm text-muted-foreground">{msg}</p>
                      </div>
                    ))}
                  </div>
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
                        {(carteira?.filter(ativo => (ativo?.pl ?? 0) > 20).length || 0)} ativos com P/L elevado (&gt; 20).
                      </p>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-background rounded">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-muted-foreground">
                        {(carteira?.filter(ativo => (ativo?.dy ?? 0) < 0.02).length || 0)} ativos com baixo dividend yield (&lt; 2%).
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
      </div>
    </div>
  )
} 