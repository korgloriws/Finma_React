import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PieChart, Calculator, CheckCircle, History } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip } from 'recharts'

interface CarteiraRebalanceamentoTabProps {
  carteira: any[]
  valorTotal: number
  rbConfig: any
  idealPreview: any
  setIdealPreview: (value: any) => void
  idealTargets: any
  rbStatus: any
  rbHistory: any
  saveRebalanceMutation: any
  queryClient: any
  user: any
  carteiraService: any
  toast: any
}

// Componente para configuração de período
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-end">
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
            <div className="flex gap-2 flex-col sm:flex-row">
              <select
                aria-label="Mês"
            title="Selecione o mês do último rebalanceamento"
                value={lastMonth ? lastMonth.split('-')[1] : ''}
            onChange={(e) => {
                  const m = e.target.value
                  const y = lastMonth ? lastMonth.split('-')[0] : String(new Date().getFullYear())
                  setLastMonth(`${y}-${m}`)
                }}
                className="px-3 py-2 border border-border rounded bg-background text-foreground w-full sm:w-auto"
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
                className="px-3 py-2 border border-border rounded bg-background text-foreground w-full sm:w-auto"
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
    queryFn: () => {
      // Mock function - replace with actual service call
      return Promise.resolve(['Ações', 'FIIs', 'BDRs', 'Tesouro'])
    },
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
      // toast.error('Nome do tipo é obrigatório')
      return
    }
    if (targets[name] != null) {
      // toast.error('Tipo já existe na configuração')
      return
    }
    try {
      // await carteiraService.criarTipo(name)
      const newTargets = { ...targets, [name]: 0 }
      setTargets(newTargets)
      setNovoTipo('')
      onChange(newTargets)
      queryClient.invalidateQueries({ queryKey: ['tipos-ativos'] })
      queryClient.invalidateQueries({ queryKey: ['carteira'] })
      // toast.success('Tipo criado com sucesso')
    } catch (e: any) {
      if (e?.response?.status === 401) {
        // toast.error('Sessão expirada. Faça login novamente.')
      } else {
        // toast.error('Falha ao criar tipo')
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
      // toast.error('Tipo já está na configuração')
      return
    }
    const newTargets = { ...targets, [tipo]: 0 }
    setTargets(newTargets)
    onChange(newTargets)
    // toast.success(`Tipo "${tipo}" adicionado`)
  }
  
  const total = Object.values(targets).reduce((s, v) => s + (v || 0), 0)

  return (
    <div className="space-y-4">
      {/* Lista de tipos e pesos */}
      <div className="space-y-3">
        <div className="text-sm font-medium">Tipos e Pesos (%)</div>
        <div className="max-h-[300px] overflow-auto space-y-2">
              {Object.entries(targets).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 sm:gap-3 p-3 bg-background rounded-lg border border-border flex-wrap">
              <div className="flex-1 min-w-[120px]">
                <span className="font-medium">{key}</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input 
                  type="number" 
                  value={val} 
                  onChange={(e) => handleChangeTarget(key, e.target.value)} 
                  className="w-full sm:w-20 px-3 py-2 border border-border rounded bg-background text-foreground text-center"
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
                className="px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors ml-auto"
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
      <div className="flex items-center justify-between pt-4 border-t border-border flex-col sm:flex-row gap-2">
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
function CurrentDistributionChart({ carteira }: { carteira: any[] }) {
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
    .filter(([_, valor]) => (valor as number) > 0)
    .map(([tipo, valor]) => ({ name: tipo, value: valor as number }))

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
  carteira: any[]
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
    acc[tipo] = valorTotal > 0 ? ((valor as number) / valorTotal) * 100 : 0
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
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')

  const handleRegister = () => {
    if (selectedMonth && selectedYear) {
      onRegisterHistory(`${selectedYear}-${selectedMonth}-01 00:00:00`)
      setSelectedMonth('')
      setSelectedYear('')
    }
  }

  return (
    <div className="space-y-4">
      {/* Registrar novo histórico */}
      <div className="flex items-end gap-2 flex-col sm:flex-row">
        <div>
          <label className="block text-sm font-medium mb-1">Mês</label>
          <select
            aria-label="Mês do rebalanceamento"
            title="Selecione o mês do rebalanceamento"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-border rounded bg-background text-foreground w-full sm:w-auto"
          >
            <option value="">Mês</option>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ano</label>
          <select
            aria-label="Ano do rebalanceamento"
            title="Selecione o ano do rebalanceamento"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-border rounded bg-background text-foreground w-full sm:w-auto"
          >''
            <option value="">Ano</option>
            {Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() - i)).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleRegister}
          disabled={!selectedMonth || !selectedYear}
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

export default function CarteiraRebalanceamentoTab({
  carteira,
  valorTotal,
  rbConfig,
  idealPreview,
  setIdealPreview,
  idealTargets,
  rbStatus,
  rbHistory,
  saveRebalanceMutation,
  queryClient,
  user,
  carteiraService,
  toast
}: CarteiraRebalanceamentoTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">⚖️ Rebalanceamento da Carteira</h2>
      
      {/* Configuração de Período e Último Rebalanceamento */}
      <div className="bg-muted/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📅 Configuração de Período</h3>
        <RebalanceConfigForm
          defaultPeriodo={(rbConfig as any)?.periodo || 'mensal'}
          defaultLastRebalanceDate={(rbConfig as any)?.last_rebalance_date}
          onSave={(periodo: string, lastDate?: string) => {
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
          onSave={(targets: any) => {
            const currentPeriodo = idealPreview?.periodo || (rbConfig as any)?.periodo || 'mensal'
            const currentLastDate = (rbConfig as any)?.last_rebalance_date
            saveRebalanceMutation.mutate({ periodo: currentPeriodo, targets, last_rebalance_date: currentLastDate })
          }}
          onChange={(targets: any) => {
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
            onRegisterHistory={(date: string) => {
              carteiraService.addRebalanceHistory(date)
                .then(() => {
                  toast.success('Histórico registrado com sucesso')
                  queryClient.invalidateQueries({ queryKey: ['rebalance-history', user] })
                  queryClient.invalidateQueries({ queryKey: ['rebalance-status', user] })
                })
                .catch((err: any) => {
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
  )
}
