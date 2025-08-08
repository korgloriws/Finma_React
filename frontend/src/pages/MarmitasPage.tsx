import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Calendar, DollarSign, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import { marmitasService } from '../services/api'
import { formatCurrency } from '../utils/formatters'
import { Marmita, GastoMensal } from '../types'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function MarmitasPage() {
  const [inputData, setInputData] = useState('')
  const [inputValor, setInputValor] = useState('')
  const [inputComprou, setInputComprou] = useState(true)
  const [filtroMes, setFiltroMes] = useState<number>(new Date().getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState<number>(new Date().getFullYear())
  const [periodoGrafico, setPeriodoGrafico] = useState('6m')

  const queryClient = useQueryClient()

  // Queries
  const { data: marmitas, isLoading: loadingMarmitas } = useQuery<Marmita[]>({
    queryKey: ['marmitas', filtroMes, filtroAno],
    queryFn: () => marmitasService.getMarmitas(filtroMes, filtroAno),
  })

  const { data: gastosMensais } = useQuery<GastoMensal[]>({
    queryKey: ['gastos-mensais', periodoGrafico],
    queryFn: () => marmitasService.getGastosMensais(periodoGrafico),
  })

  // Mutations
  const adicionarMutation = useMutation({
    mutationFn: ({ data, valor, comprou }: { data: string; valor: number; comprou: boolean }) =>
      marmitasService.adicionarMarmita(data, valor, comprou),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marmitas'] })
      queryClient.invalidateQueries({ queryKey: ['gastos-mensais'] })
      setInputData('')
      setInputValor('')
      setInputComprou(true)
    },
  })

  const removerMutation = useMutation({
    mutationFn: marmitasService.removerMarmita,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marmitas'] })
      queryClient.invalidateQueries({ queryKey: ['gastos-mensais'] })
    },
  })

  // Handlers
  const handleAdicionar = useCallback(() => {
    if (!inputData.trim() || !inputValor.trim()) return
    
    const valor = parseFloat(inputValor)
    if (isNaN(valor) || valor < 0) return
    
    // Enviar a string de data como veio do input (YYYY-MM-DD) sem criar Date()
    adicionarMutation.mutate({
      data: inputData,
      valor,
      comprou: inputComprou
    })
  }, [inputData, inputValor, inputComprou, adicionarMutation])

  const handleRemover = useCallback((id: number) => {
    if (confirm('Tem certeza que deseja remover esta marmita?')) {
      removerMutation.mutate(id)
    }
  }, [removerMutation])

  // Cálculos
  const totalGasto = marmitas?.reduce((total, marmita) => total + marmita.valor, 0) || 0
  const totalMarmitas = marmitas?.length || 0
  const marmitasCompradas = marmitas?.filter(m => m.comprou).length || 0
  const marmitasNaoCompradas = totalMarmitas - marmitasCompradas

  // Estatísticas do gráfico
  const maiorGasto = Array.isArray(gastosMensais) && gastosMensais.length > 0
    ? gastosMensais.reduce((max, gasto) => Math.max(max, gasto.valor), gastosMensais[0].valor)
    : 0

  const menorGasto = Array.isArray(gastosMensais) && gastosMensais.length > 0
    ? gastosMensais.reduce((min, gasto) => Math.min(min, gasto.valor), gastosMensais[0].valor)
    : 0

  const mediaGasto = Array.isArray(gastosMensais) && gastosMensais.length > 0
    ? gastosMensais.reduce((sum, gasto) => sum + gasto.valor, 0) / gastosMensais.length
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Controle de Marmitas</h1>
      </div>

      {/* Formulário de Adição */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-green-500" />
          Adicionar Marmita
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Data</label>
            <input
              type="date"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Selecionar data da marmita"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Valor (R$)</label>
            <input
              type="number"
              value={inputValor}
              onChange={(e) => setInputValor(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Comprou?</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                 type="radio"
                 checked={inputComprou}
                 onChange={() => setInputComprou(true)}
                 className="text-primary"
                 aria-label="Sim, comprou marmita"
               />
                <span>Sim</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                 type="radio"
                 checked={!inputComprou}
                 onChange={() => setInputComprou(false)}
                 className="text-primary"
                 aria-label="Não, não comprou marmita"
               />
                <span>Não</span>
              </label>
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleAdicionar}
              disabled={adicionarMutation.isPending}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {adicionarMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mês</label>
            <select
               value={filtroMes}
               onChange={(e) => setFiltroMes(parseInt(e.target.value))}
               className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
               className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
               aria-label="Selecionar ano"
             >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Período do Gráfico</label>
            <select
               value={periodoGrafico}
               onChange={(e) => setPeriodoGrafico(e.target.value)}
               className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
               aria-label="Selecionar período do gráfico"
             >
              <option value="6m">6 meses</option>
              <option value="1y">1 ano</option>
              <option value="all">Tudo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Total Gasto</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(totalGasto)}</div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-muted-foreground">Total Marmitas</span>
          </div>
          <div className="text-2xl font-bold">{totalMarmitas}</div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Compradas</span>
          </div>
          <div className="text-2xl font-bold">{marmitasCompradas}</div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <span className="text-sm text-muted-foreground">Não Compradas</span>
          </div>
          <div className="text-2xl font-bold">{marmitasNaoCompradas}</div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabela de Marmitas */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Histórico de Marmitas</h3>
          
          {loadingMarmitas ? (
            <div className="text-center text-muted-foreground py-8">
              Carregando marmitas...
            </div>
          ) : marmitas && marmitas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Data</th>
                    <th className="px-4 py-3 text-left font-medium">Valor</th>
                    <th className="px-4 py-3 text-left font-medium">Comprou</th>
                    <th className="px-4 py-3 text-left font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {marmitas.map((marmita) => (
                    <tr key={marmita.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        {marmita.data}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatCurrency(marmita.valor)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          marmita.comprou 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {marmita.comprou ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRemover(marmita.id)}
                          className="p-1 text-red-600 hover:text-red-700"
                          title="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma marmita encontrada para o período selecionado.
            </div>
          )}
        </div>

        {/* Gráfico e Estatísticas */}
        <div className="space-y-6">
          {/* Gráfico de Gastos Mensais */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Gastos por Mês
            </h3>
            
            {gastosMensais && gastosMensais.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gastosMensais}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [formatCurrency(value), 'Gasto']} />
                  <Bar dataKey="valor" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado.
              </div>
            )}
          </div>

          {/* Estatísticas do Gráfico */}
          {gastosMensais && gastosMensais.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Maior Gasto</div>
                <div className="text-lg font-bold text-red-600">{formatCurrency(maiorGasto)}</div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Menor Gasto</div>
                <div className="text-lg font-bold text-green-600">{formatCurrency(menorGasto)}</div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Média Mensal</div>
                <div className="text-lg font-bold text-blue-600">{formatCurrency(mediaGasto)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 