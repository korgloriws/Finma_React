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
} from 'recharts'

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
              </div>
            </div>
            
            {loadingHistorico ? (
              <div className="animate-pulse h-64 bg-muted rounded-lg"></div>
            ) : historicoCarteira && historicoCarteira.datas && historicoCarteira.datas.length > 0 ? (
              <>
                {/* Resumo estatístico */}
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
                
                {/* Gráfico de Valores Absolutos */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Valores Absolutos</h4>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicoCarteira.datas.map((d, i) => ({
                        data: d,
                        carteira: historicoCarteira.carteira_valor?.[i] ?? null,
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
                            if (name === 'carteira') {
                              return [formatCurrency(value), 'Carteira']
                            }
                            return [`${value?.toFixed?.(2)}%`, name.toUpperCase()]
                          }}
                          labelFormatter={(label) => `Data: ${label}`}
                        />
                        <Area type="monotone" dataKey="carteira" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                        <Area type="monotone" dataKey="ibov" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={1.5} />
                        <Area type="monotone" dataKey="ivvb11" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={1.5} />
                        <Area type="monotone" dataKey="ifix" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1} strokeWidth={1.5} />
                        <Area type="monotone" dataKey="ipca" stroke="#ef4444" fill="#ef4444" fillOpacity={0.06} strokeWidth={1.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico Comparativo (Rebase 100) */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Comparativo de Performance (Rebase 100)</h4>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
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
                          tickFormatter={(value) => `${value}%`}
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
                            const valorInicial = name === 'carteira' ? (historicoCarteira.carteira_valor?.[0] || 0) : 100
                            const valorAtual = value
                            const variacao = valorAtual - 100
                            const variacaoAbs = name === 'carteira' ? 
                              (historicoCarteira.carteira_valor?.[historicoCarteira.datas.findIndex(d => d === value)] || 0) - valorInicial :
                              null
                            
                            return [
                              <div key={name} className="space-y-1">
                                <div className="font-medium">{name.toUpperCase()}</div>
                                <div>Performance: <span className="font-semibold">{valorAtual?.toFixed(2)}%</span></div>
                                <div>Variação: <span className={`font-semibold ${variacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {variacao >= 0 ? '+' : ''}{variacao?.toFixed(2)}%
                                </span></div>
                                {variacaoAbs !== null && (
                                  <div>Valor: <span className="font-semibold">{formatCurrency(variacaoAbs + valorInicial)}</span></div>
                                )}
                              </div>,
                              ''
                            ]
                          }}
                          labelFormatter={(label) => `Data: ${label}`}
                        />
                        <Area type="monotone" dataKey="carteira" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                        <Area type="monotone" dataKey="ibov" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={1.5} />
                        <Area type="monotone" dataKey="ivvb11" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={1.5} />
                        <Area type="monotone" dataKey="ifix" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1} strokeWidth={1.5} />
                        <Area type="monotone" dataKey="ipca" stroke="#ef4444" fill="#ef4444" fillOpacity={0.06} strokeWidth={1.2} />
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
                    <Bar dataKey="valor_total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                    <Bar dataKey="valor_total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
    </div>
  )
}
