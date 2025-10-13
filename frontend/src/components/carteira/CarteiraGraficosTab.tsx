import { useMemo, useState } from 'react'
import { 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  Trophy, 
  Activity 
} from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { getDisplayTicker } from '../../utils/tickerUtils'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import AtivosDetalhesModal from './AtivosDetalhesModal'

interface CarteiraGraficosTabProps {
  carteira: any[]
  loadingHistorico: boolean
  historicoCarteira: {
    datas: string[]
    carteira_valor: number[]
    carteira: (number | null)[]
    ibov: (number | null)[]
    ivvb11: (number | null)[]
    ifix: (number | null)[]
    ipca: (number | null)[]
  } | null
  filtroPeriodo: string
  setFiltroPeriodo: (value: string) => void
  ativosPorTipo: Record<string, number>
  topAtivos: any[]
}

export default function CarteiraGraficosTab({
  carteira,
  loadingHistorico,
  historicoCarteira,
  filtroPeriodo,
  setFiltroPeriodo,
  ativosPorTipo,
  topAtivos
}: CarteiraGraficosTabProps) {
  const [indiceRef, setIndiceRef] = useState<'ibov' | 'ivvb11' | 'ifix' | 'ipca' | 'cdi'>('ibov')
  
  // Estado para modal de detalhes
  const [modalAberto, setModalAberto] = useState(false)
  const [modalTitulo, setModalTitulo] = useState('')
  const [modalAtivos, setModalAtivos] = useState<any[]>([])
  const [modalTipo, setModalTipo] = useState<'tipo' | 'ativo' | 'top'>('tipo')

  // Funções para abrir modal com dados específicos
  const abrirModalPorTipo = async (tipo: string) => {
    // Se for FII, buscar dados com metadados
    if (tipo.toLowerCase().includes('fii')) {
      try {
        const response = await fetch('/api/carteira/com-metadados-fii')
        const carteiraComMetadados = await response.json()
        const ativosDoTipo = carteiraComMetadados.filter((ativo: any) => ativo.tipo === tipo)
        setModalTitulo(`Ativos - ${tipo}`)
        setModalAtivos(ativosDoTipo)
        setModalTipo('tipo')
        setModalAberto(true)
      } catch (error) {
        console.error('Erro ao buscar metadados de FIIs:', error)
        // Fallback para dados normais
        const ativosDoTipo = carteira.filter(ativo => ativo.tipo === tipo)
        setModalTitulo(`Ativos - ${tipo}`)
        setModalAtivos(ativosDoTipo)
        setModalTipo('tipo')
        setModalAberto(true)
      }
    } else {
      const ativosDoTipo = carteira.filter(ativo => ativo.tipo === tipo)
      setModalTitulo(`Ativos - ${tipo}`)
      setModalAtivos(ativosDoTipo)
      setModalTipo('tipo')
      setModalAberto(true)
    }
  }

  const abrirModalTopAtivos = async () => {
    // Verificar se há FIIs nos top ativos
    const temFIIs = topAtivos.some(ativo => ativo.tipo && ativo.tipo.toLowerCase().includes('fii'))
    
    if (temFIIs) {
      try {
        const response = await fetch('/api/carteira/com-metadados-fii')
        const carteiraComMetadados = await response.json()
        const topAtivosComMetadados = carteiraComMetadados.filter((ativo: any) => 
          topAtivos.some(top => top.ticker === ativo.ticker)
        )
        setModalTitulo('Top Ativos por Valor')
        setModalAtivos(topAtivosComMetadados)
        setModalTipo('top')
        setModalAberto(true)
      } catch (error) {
        console.error('Erro ao buscar metadados de FIIs:', error)
        // Fallback para dados normais
        setModalTitulo('Top Ativos por Valor')
        setModalAtivos(topAtivos)
        setModalTipo('top')
        setModalAberto(true)
      }
    } else {
      setModalTitulo('Top Ativos por Valor')
      setModalAtivos(topAtivos)
      setModalTipo('top')
      setModalAberto(true)
    }
  }

  const abrirModalTodosAtivos = async () => {
    // Verificar se há FIIs na carteira
    const temFIIs = carteira.some(ativo => ativo.tipo && ativo.tipo.toLowerCase().includes('fii'))
    
    if (temFIIs) {
      try {
        const response = await fetch('/api/carteira/com-metadados-fii')
        const carteiraComMetadados = await response.json()
        setModalTitulo('Todos os Ativos')
        setModalAtivos(carteiraComMetadados)
        setModalTipo('ativo')
        setModalAberto(true)
      } catch (error) {
        console.error('Erro ao buscar metadados de FIIs:', error)
        // Fallback para dados normais
        setModalTitulo('Todos os Ativos')
        setModalAtivos(carteira)
        setModalTipo('ativo')
        setModalAberto(true)
      }
    } else {
      setModalTitulo('Todos os Ativos')
      setModalAtivos(carteira)
      setModalTipo('ativo')
      setModalAberto(true)
    }
  }

  const fecharModal = () => {
    setModalAberto(false)
    setModalTitulo('')
    setModalAtivos([])
  }

  const initialWealth = useMemo(() => {
    const arr = historicoCarteira?.carteira_valor || []
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i]
      if (typeof v === 'number' && !isNaN(v)) return v
    }
    return 0
  }, [historicoCarteira])

  const indiceSeries = useMemo(() => {
    if (!historicoCarteira) return [] as Array<number | null>
    const series = (historicoCarteira as any)[indiceRef] as Array<number | null> | undefined
    return series || []
  }, [historicoCarteira, indiceRef])

  const indiceValorSeries = useMemo(() => {
    if (!historicoCarteira || initialWealth <= 0) return [] as Array<number | null>
    return (indiceSeries || []).map((v) => {
      if (v == null || isNaN(Number(v))) return null
      return initialWealth * (Number(v) / 100)
    })
  }, [historicoCarteira, indiceSeries, initialWealth])

  const comparativoResumo = useMemo(() => {
    const carteiraArr = historicoCarteira?.carteira_valor || []
    if (!carteiraArr.length || !indiceValorSeries.length) return null as null | {
      indiceNome: string
      indiceInicial: number
      indiceFinal: number
      carteiraInicial: number
      carteiraFinal: number
      deltaIndice: number
      deltaCarteira: number
      gapAbsoluto: number
    }
    const carteiraInicial = carteiraArr.find((v) => typeof v === 'number') || 0
    const carteiraFinal = [...carteiraArr].reverse().find((v) => typeof v === 'number') || 0
    const indiceInicial = indiceValorSeries.find((v) => typeof v === 'number') || 0
    const indiceFinal = [...indiceValorSeries].reverse().find((v) => typeof v === 'number') || 0
    const deltaIndice = (indiceFinal || 0) - (indiceInicial || 0)
    const deltaCarteira = (carteiraFinal || 0) - (carteiraInicial || 0)
    const gapAbsoluto = (carteiraFinal || 0) - (indiceFinal || 0)
    const nomeMap: Record<string, string> = { ibov: 'IBOV', ivvb11: 'IVVB11', ifix: 'IFIX', ipca: 'IPCA', cdi: 'CDI' }
    return {
      indiceNome: nomeMap[indiceRef],
      indiceInicial: indiceInicial || 0,
      indiceFinal: indiceFinal || 0,
      carteiraInicial,
      carteiraFinal,
      deltaIndice,
      deltaCarteira,
      gapAbsoluto,
    }
  }, [historicoCarteira, indiceValorSeries, indiceRef])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">📈 Análise Gráfica</h2>
      
      {!carteira || carteira.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          Adicione ativos à sua carteira para ver os gráficos.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Gráfico de Evolução do Patrimônio */}
          <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
              <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground">Evolução do Patrimônio</h3>
                </div>
                <div className="text-sm text-muted-foreground">
                  Período: {(() => {
                    const periodos = {
                      'mensal': 'Mensal',
                      'trimestral': 'Trimestral',
                      'semestral': 'Semestral',
                      'anual': 'Anual',
                      'maximo': 'Máximo'
                    }
                    return periodos[filtroPeriodo as keyof typeof periodos] || 'Mensal'
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={filtroPeriodo}
                  onChange={(e) => setFiltroPeriodo(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm min-w-0 w-full sm:w-auto"
                  aria-label="Filtrar por período"
                >
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                  <option value="maximo">Máximo</option>
                </select>
                <select
                  value={indiceRef}
                  onChange={(e) => setIndiceRef(e.target.value as any)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm min-w-0 w-full sm:w-auto"
                  aria-label="Índice de comparação"
                >
                  <option value="ibov">IBOV</option>
                  <option value="ivvb11">IVVB11</option>
                  <option value="ifix">IFIX</option>
                  <option value="ipca">IPCA</option>
                  <option value="cdi">CDI</option>
                </select>
              </div>
            </div>
            
            {loadingHistorico ? (
              <div className="animate-pulse h-64 bg-muted rounded-lg"></div>
            ) : historicoCarteira && historicoCarteira.datas && historicoCarteira.datas.length > 0 ? (
              <>
                {/* Resumo estatístico e comparativo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                  <div className="bg-muted/50 rounded-lg p-3 md:p-4">
                    <div className="text-xs md:text-sm text-muted-foreground">Patrimônio Inicial</div>
                    <div className="text-base md:text-lg font-bold text-foreground">
                      {formatCurrency(historicoCarteira.carteira_valor?.[0] || 0)}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 md:p-4">
                    <div className="text-xs md:text-sm text-muted-foreground">Patrimônio Atual</div>
                    <div className="text-base md:text-lg font-bold text-foreground">
                      {formatCurrency(historicoCarteira.carteira_valor?.[historicoCarteira.carteira_valor.length - 1] || 0)}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 md:p-4">
                    <div className="text-xs md:text-sm text-muted-foreground">Ganho/Perda (R$)</div>
                    <div className={`text-base md:text-lg font-bold ${
                      (historicoCarteira.carteira_valor?.[historicoCarteira.carteira_valor.length - 1] || 0) > (historicoCarteira.carteira_valor?.[0] || 0) 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {(() => {
                        const inicial = historicoCarteira.carteira_valor?.[0] || 0
                        const atual = historicoCarteira.carteira_valor?.[historicoCarteira.carteira_valor.length - 1] || 0
                        const diferenca = atual - inicial
                        return `${diferenca >= 0 ? '+' : ''}${formatCurrency(diferenca, '')}`
                      })()}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 md:p-4">
                    <div className="text-xs md:text-sm text-muted-foreground">Ganho/Perda (%)</div>
                    <div className={`text-base md:text-lg font-bold ${
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
                {comparativoResumo && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
                    <div className="bg-muted/50 rounded-lg p-3 md:p-4">
                      <div className="text-xs md:text-sm text-muted-foreground">{`Se investido no ${comparativoResumo.indiceNome}`}</div>
                      <div className="text-base md:text-lg font-bold text-foreground">
                        {formatCurrency(comparativoResumo.indiceFinal)}
                      </div>
                      <div className={`text-xs md:text-sm ${comparativoResumo.deltaIndice >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {`${comparativoResumo.deltaIndice >= 0 ? '+' : ''}${formatCurrency(comparativoResumo.deltaIndice, '')}`}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 md:p-4">
                      <div className="text-xs md:text-sm text-muted-foreground">Carteira (Final)</div>
                      <div className="text-base md:text-lg font-bold text-foreground">
                        {formatCurrency(comparativoResumo.carteiraFinal)}
                      </div>
                      <div className={`text-xs md:text-sm ${comparativoResumo.deltaCarteira >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {`${comparativoResumo.deltaCarteira >= 0 ? '+' : ''}${formatCurrency(comparativoResumo.deltaCarteira, '')}`}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 md:p-4">
                      <div className="text-xs md:text-sm text-muted-foreground">Diferença vs Índice</div>
                      <div className={`text-base md:text-lg font-bold ${comparativoResumo.gapAbsoluto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {`${comparativoResumo.gapAbsoluto >= 0 ? '+' : ''}${formatCurrency(comparativoResumo.gapAbsoluto, '')}`}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Gráfico único: Carteira (R$) vs Índice simulado (R$) */}
                <div className="mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Carteira vs {indiceRef.toUpperCase()} (simulado em R$)</h4>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicoCarteira.datas.map((d, i) => ({
                        data: d,
                        carteira_valor: historicoCarteira.carteira_valor?.[i] ?? null,
                        indice_valor: indiceValorSeries?.[i] ?? null,
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
                          tickFormatter={(value) => formatCurrency(value, '')}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))', 
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                            fontSize: '12px'
                          }}
                          formatter={(value: any, name: string) => {
                            const label = name === 'carteira_valor' ? 'Carteira' : `${indiceRef.toUpperCase()} simulado`
                            return [formatCurrency(value), label]
                          }}
                          labelFormatter={(label) => `Data: ${label}`}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="carteira_valor" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} name="Carteira" />
                        <Area type="monotone" dataKey="indice_valor" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} name={`${indiceRef.toUpperCase()} simulado`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Distribuição por Tipo */}
            <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <PieChart className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-foreground">Distribuição por Tipo de Ativo</h3>
              </div>
              {Object.keys(ativosPorTipo).length > 0 ? (
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
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
                      onClick={(data) => {
                        if (data && data.name) {
                          abrirModalPorTipo(data.name)
                        }
                      }}
                      style={{ cursor: 'pointer' }}
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
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>

            {/* Distribuição por Ativo */}
            <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-foreground">Distribuição por Ativo</h3>
              </div>
              {carteira.length > 0 ? (
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
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
                      onClick={() => abrirModalTodosAtivos()}
                      style={{ cursor: 'pointer' }}
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
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum ativo disponível
                </div>
              )}
            </div>
          </div>

          {/* Gráficos de Barras */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Top 5 Maiores Posições */}
            <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-foreground">Top 5 Maiores Posições</h3>
              </div>
              {topAtivos.length > 0 ? (
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topAtivos}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="ticker" 
                      stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
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
                    <Bar 
                      dataKey="valor_total" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      onClick={() => abrirModalTopAtivos()}
                      style={{ cursor: 'pointer' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhuma posição disponível
                </div>
              )}
            </div>

            {/* Top 10 Ativos por Valor */}
            <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-foreground">Top 10 Ativos por Valor</h3>
              </div>
              {carteira.length > 0 ? (
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={carteira.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="ticker" 
                      stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                      angle={-45}
                      textAnchor="end"
                        height={60}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
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
                    <Bar 
                      dataKey="valor_total" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      onClick={() => abrirModalTodosAtivos()}
                      style={{ cursor: 'pointer' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum ativo disponível
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes dos Ativos */}
      <AtivosDetalhesModal
        isOpen={modalAberto}
        onClose={fecharModal}
        titulo={modalTitulo}
        ativos={modalAtivos}
        tipoFiltro={modalTipo}
      />
    </div>
  )
}
