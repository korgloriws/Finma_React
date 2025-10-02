import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'

import { 
  Trash2, DollarSign, TrendingUp, BarChart3, 
  Eye, EyeOff, Edit, Save, X, Plus, Calendar,
  ArrowUpRight, ArrowDownRight, TrendingDown
} from 'lucide-react'
import { controleService } from '../../services/api'
import { formatCurrency } from '../../utils/formatters'
import { Receita } from '../../types'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

interface ControleReceitaTabProps {
  filtroMes: string
  filtroAno: string
  ocultarValores: boolean
  setOcultarValores: (value: boolean) => void
}

export default function ControleReceitaTab({ 
  filtroMes, 
  filtroAno, 
  ocultarValores, 
  setOcultarValores 
}: ControleReceitaTabProps) {
  const [inputNome, setInputNome] = useState('')
  const [inputValor, setInputValor] = useState('')
  const [inputData, setInputData] = useState('')
  const [inputCategoria, setInputCategoria] = useState('')
  const [inputTipo, setInputTipo] = useState('fixo')
  const [inputRecorrencia, setInputRecorrencia] = useState('mensal')
  const [periodoGrafico, setPeriodoGrafico] = useState('6m')


  const [editingReceitaId, setEditingReceitaId] = useState<number | null>(null)
  const [editReceitaNome, setEditReceitaNome] = useState('')
  const [editReceitaValor, setEditReceitaValor] = useState('')
  const [editReceitaData, setEditReceitaData] = useState('')
  const [editReceitaCategoria, setEditReceitaCategoria] = useState('')
  const [editReceitaTipo, setEditReceitaTipo] = useState('fixo')
  const [editReceitaRecorrencia, setEditReceitaRecorrencia] = useState('mensal')

  const queryClient = useQueryClient()

  const { data: receitas, isLoading: loadingReceitas } = useQuery<Receita[]>({
    queryKey: ['receitas', filtroMes, filtroAno],
    queryFn: () => controleService.getReceitas(filtroMes, filtroAno),
    retry: 1,
    refetchOnWindowFocus: false,
  })


  const { data: evolucaoReceitas } = useQuery({
    queryKey: ['evolucao-receitas', periodoGrafico],
    queryFn: () => controleService.getEvolucaoReceitas(periodoGrafico),
  })


  const adicionarReceitaMutation = useMutation({
    mutationFn: ({ nome, valor, opts }: { nome: string; valor: number; opts?: any }) =>
      controleService.adicionarReceita(nome, valor, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-receitas'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      setInputNome('')
      setInputValor('')
      setInputData('')
      setInputCategoria('')
      setInputTipo('fixo')
      setInputRecorrencia('mensal')
    },
  })

  const atualizarReceitaMutation = useMutation({
    mutationFn: ({ id, nome, valor, opts }: { id: number; nome: string; valor: number; opts?: any }) =>
      controleService.atualizarReceita(id, nome, valor, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-receitas'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
    },
  })

  const removerReceitaMutation = useMutation({
    mutationFn: controleService.removerReceita,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-receitas'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
    },
  })


  const handleAdicionarReceita = useCallback(() => {
    if (!inputNome || !inputValor) return
    
    const valor = parseFloat(inputValor.replace(',', '.'))
    if (!isFinite(valor) || valor <= 0) return

    const opts = {
      data: inputData || new Date().toISOString().split('T')[0],
      categoria: inputCategoria || undefined,
      tipo: inputTipo,
      recorrencia: inputRecorrencia
    }

    adicionarReceitaMutation.mutate({
      nome: inputNome,
      valor,
      opts
    })
  }, [inputNome, inputValor, inputData, inputCategoria, inputTipo, inputRecorrencia, adicionarReceitaMutation])

  const handleRemoverReceita = useCallback((id: number) => {
    if (confirm('Tem certeza que deseja remover esta receita?')) {
      removerReceitaMutation.mutate(id)
    }
  }, [removerReceitaMutation])

  const handleIniciarEdicaoReceita = useCallback((receita: Receita) => {
    setEditingReceitaId(receita.id)
    setEditReceitaNome(receita.nome)
    setEditReceitaValor(receita.valor.toString())
    setEditReceitaData(receita.data)
    setEditReceitaCategoria(receita.categoria || '')
    setEditReceitaTipo(receita.tipo || 'fixo')
    setEditReceitaRecorrencia(receita.recorrencia || 'mensal')
  }, [])

  const handleCancelarEdicaoReceita = useCallback(() => {
    setEditingReceitaId(null)
    setEditReceitaNome('')
    setEditReceitaValor('')
    setEditReceitaData('')
    setEditReceitaCategoria('')
    setEditReceitaTipo('fixo')
    setEditReceitaRecorrencia('mensal')
  }, [])

  const handleSalvarEdicaoReceita = useCallback(() => {
    if (!editingReceitaId || !editReceitaNome || !editReceitaValor) return
    
    const valor = parseFloat(editReceitaValor.replace(',', '.'))
    if (!isFinite(valor) || valor <= 0) return

    const opts = {
      data: editReceitaData || new Date().toISOString().split('T')[0],
      categoria: editReceitaCategoria || undefined,
      tipo: editReceitaTipo,
      recorrencia: editReceitaRecorrencia
    }

    atualizarReceitaMutation.mutate({
      id: editingReceitaId,
      nome: editReceitaNome,
      valor,
      opts
    })
    
    handleCancelarEdicaoReceita()
  }, [editingReceitaId, editReceitaNome, editReceitaValor, editReceitaData, editReceitaCategoria, editReceitaTipo, editReceitaRecorrencia, atualizarReceitaMutation])

  // Cálculos
  const totalReceitas = receitas?.reduce((total, receita) => total + receita.valor, 0) || 0
  const totalReceitasCount = receitas?.length || 0
  const receitasFixo = receitas?.filter(r => r.tipo === 'fixo').length || 0
  const receitasVariavel = receitas?.filter(r => r.tipo === 'variavel').length || 0

  // Comparação com mês anterior
  const comparacaoMesAnterior = useMemo(() => {
    if (!evolucaoReceitas || evolucaoReceitas.length < 2) return null
    
    const mesAtual = evolucaoReceitas[evolucaoReceitas.length - 1]
    const mesAnterior = evolucaoReceitas[evolucaoReceitas.length - 2]
    
    const variacao = mesAnterior.receitas > 0 
      ? ((mesAtual.receitas - mesAnterior.receitas) / mesAnterior.receitas) * 100
      : 0
    
    return {
      valorAtual: mesAtual.receitas,
      valorAnterior: mesAnterior.receitas,
      variacao: variacao,
      isAumento: variacao > 0
    }
  }, [evolucaoReceitas])

  // Dados do gráfico
  const dadosGrafico = useMemo(() => {
    if (!evolucaoReceitas) return []
    
    return evolucaoReceitas.map((item: {mes: string, receitas: number}, index: number) => ({
      mes: item.mes,
      receitas: item.receitas,
      variacao: index > 0 
        ? ((item.receitas - evolucaoReceitas[index - 1].receitas) / evolucaoReceitas[index - 1].receitas) * 100
        : 0
    }))
  }, [evolucaoReceitas])

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
          Adicionar Receita
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nome da Receita
            </label>
            <input
              type="text"
              value={inputNome}
              onChange={(e) => setInputNome(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex: Salário, Freelance..."
              aria-label="Nome da receita"
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
              aria-label="Valor da receita"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Data
            </label>
            <input
              type="date"
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Data da receita"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Categoria
            </label>
            <input
              type="text"
              value={inputCategoria}
              onChange={(e) => setInputCategoria(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex: Trabalho, Investimentos..."
              aria-label="Categoria da receita"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Tipo
            </label>
            <select
              value={inputTipo}
              onChange={(e) => setInputTipo(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Tipo da receita"
            >
              <option value="fixo">Fixo</option>
              <option value="variavel">Variável</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Recorrência
            </label>
            <select
              value={inputRecorrencia}
              onChange={(e) => setInputRecorrencia(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Recorrência da receita"
            >
              <option value="mensal">Mensal</option>
              <option value="semanal">Semanal</option>
              <option value="anual">Anual</option>
              <option value="nenhuma">Nenhuma</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={handleAdicionarReceita}
            disabled={adicionarReceitaMutation.isPending}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {adicionarReceitaMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Adicionar Receita
          </button>
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
            <span className="text-sm text-muted-foreground">Total Receitas</span>
            <button
              onClick={() => setOcultarValores(!ocultarValores)}
              className="p-1 hover:bg-muted rounded"
              title={ocultarValores ? "Mostrar valores" : "Ocultar valores"}
            >
              {ocultarValores ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {ocultarValores ? '••••••' : formatCurrency(totalReceitas)}
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Total Lançamentos</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{totalReceitasCount}</div>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Receitas Fixas</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{receitasFixo}</div>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingDown className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Receitas Variáveis</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{receitasVariavel}</div>
        </div>
      </motion.div>

      {/* Comparação com Mês Anterior */}
      {comparacaoMesAnterior && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-xl"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            Comparação com Mês Anterior
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Mês Atual</div>
              <div className="text-xl font-bold text-green-600">
                {ocultarValores ? '••••••' : formatCurrency(comparacaoMesAnterior.valorAtual)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Mês Anterior</div>
              <div className="text-xl font-bold text-gray-600">
                {ocultarValores ? '••••••' : formatCurrency(comparacaoMesAnterior.valorAnterior)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Variação</div>
              <div className={`text-xl font-bold flex items-center justify-center gap-1 ${
                comparacaoMesAnterior.isAumento ? 'text-green-600' : 'text-red-600'
              }`}>
                {comparacaoMesAnterior.isAumento ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ArrowDownRight className="w-5 h-5" />
                )}
                {Math.abs(comparacaoMesAnterior.variacao).toFixed(1)}%
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabela de Receitas */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-xl"
        >
          <h3 className="text-lg font-semibold mb-4 text-foreground">Histórico de Receitas</h3>
          
          {loadingReceitas ? (
            <div className="text-center text-muted-foreground py-8">
              Carregando receitas...
            </div>
          ) : receitas && receitas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Nome</th>
                    <th className="px-4 py-3 text-left font-medium">Valor</th>
                    <th className="px-4 py-3 text-left font-medium">Data</th>
                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {receitas.map((receita) => (
                    <tr key={receita.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        {editingReceitaId === receita.id ? (
                          <input
                            type="text"
                            value={editReceitaNome}
                            onChange={(e) => setEditReceitaNome(e.target.value)}
                            className="px-2 py-1 text-sm border border-border rounded bg-background w-full"
                            placeholder="Nome da receita"
                            aria-label="Nome da receita"
                          />
                        ) : (
                          <div>
                            <div className="font-medium">{receita.nome}</div>
                            {receita.categoria && (
                              <div className="text-xs text-muted-foreground">{receita.categoria}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {editingReceitaId === receita.id ? (
                          <input
                            type="number"
                            value={editReceitaValor}
                            onChange={(e) => setEditReceitaValor(e.target.value.replace(',', '.'))}
                            className="px-2 py-1 text-sm border border-border rounded bg-background w-24"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            aria-label="Valor da receita"
                          />
                        ) : (
                          formatCurrency(receita.valor)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingReceitaId === receita.id ? (
                          <input
                            type="date"
                            value={editReceitaData}
                            onChange={(e) => setEditReceitaData(e.target.value)}
                            className="px-2 py-1 text-sm border border-border rounded bg-background"
                            aria-label="Data da receita"
                          />
                        ) : (
                          new Date(receita.data).toLocaleDateString('pt-BR')
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingReceitaId === receita.id ? (
                          <select
                            value={editReceitaTipo}
                            onChange={(e) => setEditReceitaTipo(e.target.value)}
                            className="px-2 py-1 text-sm border border-border rounded bg-background"
                            aria-label="Tipo da receita"
                          >
                            <option value="fixo">Fixo</option>
                            <option value="variavel">Variável</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            receita.tipo === 'fixo' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {receita.tipo === 'fixo' ? 'Fixo' : 'Variável'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {editingReceitaId === receita.id ? (
                            <>
                              <button
                                onClick={handleSalvarEdicaoReceita}
                                className="p-1 text-primary hover:bg-primary/10 rounded"
                                title="Salvar"
                                disabled={atualizarReceitaMutation.isPending}
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={handleCancelarEdicaoReceita}
                                className="p-1 text-muted-foreground hover:bg-muted rounded"
                                title="Cancelar"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleIniciarEdicaoReceita(receita)}
                                className="p-1 text-primary hover:bg-primary/10 rounded"
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleRemoverReceita(receita.id)}
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
              Nenhuma receita encontrada para o período selecionado.
            </div>
          )}
        </motion.div>

        {/* Gráfico de Evolução */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              Evolução das Receitas
            </h3>
            
            <select
              value={periodoGrafico}
              onChange={(e) => setPeriodoGrafico(e.target.value)}
              className="px-3 py-1 text-sm border border-border rounded bg-background"
              aria-label="Período do gráfico"
            >
              <option value="3m">Últimos 3 meses</option>
              <option value="6m">Últimos 6 meses</option>
              <option value="12m">Últimos 12 meses</option>
            </select>
          </div>
          
          {dadosGrafico && dadosGrafico.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Receitas']}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="receitas" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível para o período selecionado.
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}
