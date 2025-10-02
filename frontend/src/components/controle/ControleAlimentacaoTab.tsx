import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Trash2, DollarSign, TrendingDown, BarChart3, 
  Eye, EyeOff, TrendingUp, Edit, Save, X, Plus, Calendar
} from 'lucide-react'
import { marmitasService } from '../../services/api'
import { formatCurrency } from '../../utils/formatters'
import { Marmita, GastoMensal } from '../../types'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface ControleAlimentacaoTabProps {
  filtroMes: string
  filtroAno: string
  ocultarValores: boolean
  setOcultarValores: (value: boolean) => void
}

export default function ControleAlimentacaoTab({ 
  filtroMes, 
  filtroAno, 
  ocultarValores, 
  setOcultarValores 
}: ControleAlimentacaoTabProps) {
  const [inputData, setInputData] = useState('')
  const [inputValor, setInputValor] = useState('')
  const [inputComprou, setInputComprou] = useState(true)
  const [periodoGrafico] = useState('3m')

  // Estados para edição de marmitas
  const [editingMarmitaId, setEditingMarmitaId] = useState<number | null>(null)
  const [editMarmitaData, setEditMarmitaData] = useState('')
  const [editMarmitaValor, setEditMarmitaValor] = useState('')
  const [editMarmitaComprou, setEditMarmitaComprou] = useState(true)

  const queryClient = useQueryClient()

  // Queries para marmitas
  const { data: marmitas, isLoading: loadingMarmitas } = useQuery<Marmita[]>({
    queryKey: ['marmitas', filtroMes, filtroAno],
    queryFn: () => marmitasService.getMarmitas(parseInt(filtroMes), parseInt(filtroAno)),
  })

  const { data: gastosMensais } = useQuery<GastoMensal[]>({
    queryKey: ['gastos-mensais', periodoGrafico],
    queryFn: () => marmitasService.getGastosMensais(periodoGrafico),
  })

  // Mutations para marmitas
  const adicionarMarmitaMutation = useMutation({
    mutationFn: ({ data, valor, comprou }: { data: string; valor: number; comprou: boolean }) =>
      marmitasService.adicionarMarmita(data, valor, comprou),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marmitas'] })
      queryClient.invalidateQueries({ queryKey: ['gastos-mensais'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      setInputData('')
      setInputValor('')
      setInputComprou(true)
    },
  })

  const atualizarMarmitaMutation = useMutation({
    mutationFn: ({ id, data, valor, comprou }: { id: number; data: string; valor: number; comprou: boolean }) =>
      marmitasService.atualizarMarmita(id, data, valor, comprou),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marmitas'] })
      queryClient.invalidateQueries({ queryKey: ['gastos-mensais'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
    },
  })

  const removerMarmitaMutation = useMutation({
    mutationFn: marmitasService.removerMarmita,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marmitas'] })
      queryClient.invalidateQueries({ queryKey: ['gastos-mensais'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
    },
  })

  // Handlers
  const handleAdicionarMarmita = useCallback(() => {
    if (!inputData || !inputValor) return
    
    const valor = parseFloat(inputValor.replace(',', '.'))
    if (!isFinite(valor) || valor <= 0) return

    adicionarMarmitaMutation.mutate({
      data: inputData,
      valor,
      comprou: inputComprou
    })
  }, [inputData, inputValor, inputComprou, adicionarMarmitaMutation])

  const handleRemoverMarmita = useCallback((id: number) => {
    if (confirm('Tem certeza que deseja remover esta marmita?')) {
      removerMarmitaMutation.mutate(id)
    }
  }, [removerMarmitaMutation])

  const handleIniciarEdicaoMarmita = useCallback((marmita: Marmita) => {
    setEditingMarmitaId(marmita.id)
    setEditMarmitaData(marmita.data)
    setEditMarmitaValor(marmita.valor.toString())
    setEditMarmitaComprou(marmita.comprou)
  }, [])

  const handleCancelarEdicaoMarmita = useCallback(() => {
    setEditingMarmitaId(null)
    setEditMarmitaData('')
    setEditMarmitaValor('')
    setEditMarmitaComprou(true)
  }, [])

  const handleSalvarEdicaoMarmita = useCallback(() => {
    if (!editingMarmitaId || !editMarmitaData || !editMarmitaValor) return
    
    const valor = parseFloat(editMarmitaValor.replace(',', '.'))
    if (!isFinite(valor) || valor <= 0) return

    atualizarMarmitaMutation.mutate({
      id: editingMarmitaId,
      data: editMarmitaData,
      valor,
      comprou: editMarmitaComprou
    })
    
    handleCancelarEdicaoMarmita()
  }, [editingMarmitaId, editMarmitaData, editMarmitaValor, editMarmitaComprou, atualizarMarmitaMutation])

  // Cálculos
  const totalGasto = marmitas?.reduce((total, marmita) => total + marmita.valor, 0) || 0
  const totalMarmitas = marmitas?.length || 0
  const marmitasCompradas = marmitas?.filter(m => m.comprou).length || 0
  const marmitasNaoCompradas = totalMarmitas - marmitasCompradas

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
    <>
      {/* Formulário de Adição */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 shadow-xl"
      >
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          Adicionar Marmita
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Data
            </label>
            <input
              type="date"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Data da marmita"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Valor
            </label>
            <input
              type="number"
              value={inputValor}
              onChange={(e) => setInputValor(e.target.value.replace(',', '.'))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Comprou
            </label>
            <select
              value={inputComprou ? '1' : '0'}
              onChange={(e) => setInputComprou(e.target.value === '1')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Comprou a marmita"
            >
              <option value="1">Sim</option>
              <option value="0">Não</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleAdicionarMarmita}
              disabled={adicionarMarmitaMutation.isPending}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {adicionarMarmitaMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Adicionar
            </button>
          </div>
        </div>
      </motion.div>

      {/* Estatísticas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 mt-8"
      >
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Total Gasto</span>
            <button
              onClick={() => setOcultarValores(!ocultarValores)}
              className="p-1 hover:bg-muted rounded"
              title={ocultarValores ? "Mostrar valores" : "Ocultar valores"}
            >
              {ocultarValores ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {ocultarValores ? '••••••' : formatCurrency(totalGasto)}
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Total Marmitas</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{totalMarmitas}</div>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-positive" />
            </div>
            <span className="text-sm text-muted-foreground">Compradas</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{marmitasCompradas}</div>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingDown className="w-5 h-5 text-negative" />
            </div>
            <span className="text-sm text-muted-foreground">Não Compradas</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{marmitasNaoCompradas}</div>
        </div>
      </motion.div>

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabela de Marmitas */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-xl"
        >
          <h3 className="text-lg font-semibold mb-4 text-foreground">Histórico de Marmitas</h3>
          
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
                        {editingMarmitaId === marmita.id ? (
                          <input
                            type="date"
                            value={editMarmitaData}
                            onChange={(e) => setEditMarmitaData(e.target.value)}
                            className="px-2 py-1 text-sm border border-border rounded bg-background"
                            aria-label="Data da marmita"
                          />
                        ) : (
                          marmita.data
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {editingMarmitaId === marmita.id ? (
                          <input
                            type="number"
                            value={editMarmitaValor}
                            onChange={(e) => setEditMarmitaValor(e.target.value.replace(',', '.'))}
                            className="px-2 py-1 text-sm border border-border rounded bg-background w-24"
                            step="0.01"
                            min="0"
                            aria-label="Valor da marmita"
                            placeholder="0.00"
                          />
                        ) : (
                          formatCurrency(marmita.valor)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingMarmitaId === marmita.id ? (
                          <select
                            value={editMarmitaComprou ? '1' : '0'}
                            onChange={(e) => setEditMarmitaComprou(e.target.value === '1')}
                            className="px-2 py-1 text-sm border border-border rounded bg-background"
                            aria-label="Comprou a marmita"
                          >
                            <option value="1">Sim</option>
                            <option value="0">Não</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            marmita.comprou 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {marmita.comprou ? 'Sim' : 'Não'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {editingMarmitaId === marmita.id ? (
                            <>
                              <button
                                onClick={handleSalvarEdicaoMarmita}
                                className="p-1 text-primary hover:bg-primary/10 rounded"
                                title="Salvar"
                                disabled={atualizarMarmitaMutation.isPending}
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={handleCancelarEdicaoMarmita}
                                className="p-1 text-muted-foreground hover:bg-muted rounded"
                                title="Cancelar"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleIniciarEdicaoMarmita(marmita)}
                                className="p-1 text-primary hover:bg-primary/10 rounded"
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleRemoverMarmita(marmita.id)}
                                className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                title="Remover"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
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
        </motion.div>

        {/* Gráfico e Estatísticas */}
        <div className="space-y-6">
          {/* Gráfico de Gastos Mensais */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
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
          </motion.div>

          {/* Estatísticas do Gráfico */}
          {gastosMensais && gastosMensais.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
                <div className="text-sm text-muted-foreground">Maior Gasto</div>
                <div className="text-lg font-bold text-destructive">{formatCurrency(maiorGasto)}</div>
              </div>
              
              <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
                <div className="text-sm text-muted-foreground">Menor Gasto</div>
                <div className="text-lg font-bold text-positive">{formatCurrency(menorGasto)}</div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
                <div className="text-sm text-muted-foreground">Média Mensal</div>
                <div className="text-lg font-bold text-primary">{formatCurrency(mediaGasto)}</div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}
