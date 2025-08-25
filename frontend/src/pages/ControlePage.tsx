import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'

import { 
  Trash2, DollarSign, TrendingDown,  BarChart3, 
  Eye, EyeOff, TrendingUp, AlertTriangle, CheckCircle, 
  Info,  Wallet, PiggyBank, ArrowUpRight, ArrowDownRight,
  Edit, Save, X, Plus, Calendar, ChefHat, Calculator
} from 'lucide-react'
import { controleService, marmitasService } from '../services/api'
import HelpTips from '../components/HelpTips'
import { formatCurrency } from '../utils/formatters'
import { Cartao, OutroGasto, EvolucaoFinanceira, ReceitasDespesas, Receita, Marmita, GastoMensal } from '../types'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,  Line, PieChart as RechartsPieChart, Pie, Cell, Area, ComposedChart, BarChart, Bar } from 'recharts'

export default function ControlePage() {
  // Estados para filtros
  const [filtroMes, setFiltroMes] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [filtroAno, setFiltroAno] = useState<string>(String(new Date().getFullYear()))
  const [ocultarValores, setOcultarValores] = useState(false)
  const [hasError, setHasError] = useState(false)
  
  // Estado para controlar as abas
  const [abaAtiva, setAbaAtiva] = useState<'financeiro' | 'alimentacao'>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      return tab === 'alimentacao' ? 'alimentacao' : 'financeiro'
    } catch {
      return 'financeiro'
    }
  })

  // Estados para marmitas (nova aba)
  const [inputData, setInputData] = useState('')
  const [inputValor, setInputValor] = useState('')
  const [inputComprou, setInputComprou] = useState(true)
  const [periodoGrafico, setPeriodoGrafico] = useState('6m')

  useEffect(() => {
    const handleError = () => {
      setHasError(true)
    }
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', () => {
      setHasError(true)
    })
    return () => {
      window.removeEventListener('error', handleError)
    }
  }, [])

  // Estados para formulários
  const [inputNomeReceita, setInputNomeReceita] = useState('')
  const [inputValorReceita, setInputValorReceita] = useState('')
  const [inputNomeCartao, setInputNomeCartao] = useState('')
  const [inputValorCartao, setInputValorCartao] = useState('')
  const [inputPagoCartao, setInputPagoCartao] = useState('Sim')
  const [inputNomeOutro, setInputNomeOutro] = useState('')
  const [inputValorOutro, setInputValorOutro] = useState('')

  // Estados para edição
  const [editandoReceita, setEditandoReceita] = useState<number | null>(null)
  const [editandoCartao, setEditandoCartao] = useState<number | null>(null)
  const [editandoOutro, setEditandoOutro] = useState<number | null>(null)
  
  // Estados para valores de edição
  const [editNomeReceita, setEditNomeReceita] = useState('')
  const [editValorReceita, setEditValorReceita] = useState('')
  const [editNomeCartao, setEditNomeCartao] = useState('')
  const [editValorCartao, setEditValorCartao] = useState('')
  const [editPagoCartao, setEditPagoCartao] = useState('Sim')
  const [editNomeOutro, setEditNomeOutro] = useState('')
  const [editValorOutro, setEditValorOutro] = useState('')

  const queryClient = useQueryClient()

  // Queries
  const { data: cartoes, isLoading: loadingCartoes } = useQuery<Cartao[]>({
    queryKey: ['cartoes', filtroMes, filtroAno],
    queryFn: () => controleService.getCartoes(filtroMes, filtroAno),
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: outros, isLoading: loadingOutros } = useQuery<OutroGasto[]>({
    queryKey: ['outros', filtroMes, filtroAno],
    queryFn: () => controleService.getOutros(filtroMes, filtroAno),
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: receitas, isLoading: loadingReceitas } = useQuery<Receita[]>({
    queryKey: ['receitas', filtroMes, filtroAno],
    queryFn: () => controleService.getReceitas(filtroMes, filtroAno),
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: saldo } = useQuery<{ saldo: number }>({
    queryKey: ['saldo', filtroMes, filtroAno],
    queryFn: () => controleService.getSaldo(filtroMes, filtroAno),
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: evolucaoFinanceira } = useQuery<EvolucaoFinanceira[]>({
    queryKey: ['evolucao-financeira', filtroMes, filtroAno],
    queryFn: () => controleService.getEvolucaoFinanceira(filtroMes, filtroAno),
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: receitasDespesas } = useQuery<ReceitasDespesas>({
    queryKey: ['receitas-despesas', filtroMes, filtroAno],
    queryFn: () => controleService.getReceitasDespesas(filtroMes, filtroAno),
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Queries para marmitas
  const { data: marmitas, isLoading: loadingMarmitas } = useQuery<Marmita[]>({
    queryKey: ['marmitas', filtroMes, filtroAno],
    queryFn: () => marmitasService.getMarmitas(parseInt(filtroMes), parseInt(filtroAno)),
  })

  const { data: gastosMensais } = useQuery<GastoMensal[]>({
    queryKey: ['gastos-mensais', periodoGrafico],
    queryFn: () => marmitasService.getGastosMensais(periodoGrafico),
  })

  // Mutations
  const adicionarReceitaMutation = useMutation({
    mutationFn: ({ nome, valor }: { nome: string; valor: number }) =>
      controleService.adicionarReceita(nome, valor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
      setInputNomeReceita('')
      setInputValorReceita('')
    },
  })


  const removerReceitaMutation = useMutation({
    mutationFn: (id: number) => controleService.removerReceita(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
    },
  })

  const adicionarCartaoMutation = useMutation({
    mutationFn: ({ nome, valor, pago }: { nome: string; valor: number; pago: string }) =>
      controleService.adicionarCartao(nome, valor, pago),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartoes'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
      setInputNomeCartao('')
      setInputValorCartao('')
      setInputPagoCartao('Sim')
    },
  })


  const removerCartaoMutation = useMutation({
    mutationFn: (id: number) => controleService.removerCartao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartoes'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
    },
  })

  const adicionarOutroMutation = useMutation({
    mutationFn: ({ nome, valor }: { nome: string; valor: number }) =>
      controleService.adicionarOutro(nome, valor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outros'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
      setInputNomeOutro('')
      setInputValorOutro('')
    },
  })


  const removerOutroMutation = useMutation({
    mutationFn: (id: number) => controleService.removerOutro(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outros'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
    },
  })

  // Mutations para atualização
  const atualizarReceitaMutation = useMutation({
    mutationFn: ({ id, nome, valor }: { id: number; nome: string; valor: number }) =>
      controleService.atualizarReceita(id, nome, valor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
    },
  })

  const atualizarCartaoMutation = useMutation({
    mutationFn: ({ id, nome, valor, pago }: { id: number; nome: string; valor: number; pago: string }) =>
      controleService.atualizarCartao(id, nome, valor, pago),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartoes'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
    },
  })

  const atualizarOutroMutation = useMutation({
    mutationFn: ({ id, nome, valor }: { id: number; nome: string; valor: number }) =>
      controleService.atualizarOutro(id, nome, valor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outros'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
    },
  })

  // Mutations para marmitas
  const adicionarMarmitaMutation = useMutation({
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

  const removerMarmitaMutation = useMutation({
    mutationFn: marmitasService.removerMarmita,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marmitas'] })
      queryClient.invalidateQueries({ queryKey: ['gastos-mensais'] })
    },
  })

  // Handlers
  const handleAdicionarReceita = useCallback(() => {
    if (!inputNomeReceita || !inputValorReceita) return
    adicionarReceitaMutation.mutate({
      nome: inputNomeReceita,
      valor: parseFloat(inputValorReceita)
    })
  }, [inputNomeReceita, inputValorReceita, adicionarReceitaMutation])


  const handleRemoverReceita = useCallback((id: number) => {
    removerReceitaMutation.mutate(id)
  }, [removerReceitaMutation])

  const handleAdicionarCartao = useCallback(() => {
    if (!inputNomeCartao || !inputValorCartao) return
    adicionarCartaoMutation.mutate({
      nome: inputNomeCartao,
      valor: parseFloat(inputValorCartao),
      pago: inputPagoCartao
    })
  }, [inputNomeCartao, inputValorCartao, inputPagoCartao, adicionarCartaoMutation])


  const handleRemoverCartao = useCallback((id: number) => {
      removerCartaoMutation.mutate(id)
  }, [removerCartaoMutation])

  const handleAdicionarOutro = useCallback(() => {
    if (!inputNomeOutro || !inputValorOutro) return
    adicionarOutroMutation.mutate({
      nome: inputNomeOutro,
      valor: parseFloat(inputValorOutro)
    })
  }, [inputNomeOutro, inputValorOutro, adicionarOutroMutation])


  const handleRemoverOutro = useCallback((id: number) => {
      removerOutroMutation.mutate(id)
  }, [removerOutroMutation])

  // Handlers para atualização
  const handleAtualizarReceita = useCallback((id: number, nome: string, valor: number) => {
    atualizarReceitaMutation.mutate({ id, nome, valor })
  }, [atualizarReceitaMutation])

  const handleAtualizarCartao = useCallback((id: number, nome: string, valor: number, pago: string) => {
    atualizarCartaoMutation.mutate({ id, nome, valor, pago })
  }, [atualizarCartaoMutation])

  const handleAtualizarOutro = useCallback((id: number, nome: string, valor: number) => {
    atualizarOutroMutation.mutate({ id, nome, valor })
  }, [atualizarOutroMutation])

  // Funções para iniciar edição
  const iniciarEdicaoReceita = useCallback((receita: Receita) => {
    setEditandoReceita(receita.id)
    setEditNomeReceita(receita.nome)
    setEditValorReceita(receita.valor.toString())
  }, [])

  const iniciarEdicaoCartao = useCallback((cartao: Cartao) => {
    setEditandoCartao(cartao.id)
    setEditNomeCartao(cartao.nome)
    setEditValorCartao(cartao.valor.toString())
    setEditPagoCartao(cartao.pago)
  }, [])

  const iniciarEdicaoOutro = useCallback((outro: OutroGasto) => {
    setEditandoOutro(outro.id)
    setEditNomeOutro(outro.nome)
    setEditValorOutro(outro.valor.toString())
  }, [])

  // Funções para cancelar edição
  const cancelarEdicaoReceita = useCallback(() => {
    setEditandoReceita(null)
    setEditNomeReceita('')
    setEditValorReceita('')
  }, [])

  const cancelarEdicaoCartao = useCallback(() => {
    setEditandoCartao(null)
    setEditNomeCartao('')
    setEditValorCartao('')
    setEditPagoCartao('Sim')
  }, [])

  const cancelarEdicaoOutro = useCallback(() => {
    setEditandoOutro(null)
    setEditNomeOutro('')
    setEditValorOutro('')
  }, [])

  // Funções para salvar edição
  const salvarEdicaoReceita = useCallback(() => {
    if (editandoReceita && editNomeReceita && editValorReceita) {
      handleAtualizarReceita(editandoReceita, editNomeReceita, parseFloat(editValorReceita))
      cancelarEdicaoReceita()
    }
  }, [editandoReceita, editNomeReceita, editValorReceita, handleAtualizarReceita, cancelarEdicaoReceita])

  const salvarEdicaoCartao = useCallback(() => {
    if (editandoCartao && editNomeCartao && editValorCartao) {
      handleAtualizarCartao(editandoCartao, editNomeCartao, parseFloat(editValorCartao), editPagoCartao)
      cancelarEdicaoCartao()
    }
  }, [editandoCartao, editNomeCartao, editValorCartao, editPagoCartao, handleAtualizarCartao, cancelarEdicaoCartao])

  const salvarEdicaoOutro = useCallback(() => {
    if (editandoOutro && editNomeOutro && editValorOutro) {
      handleAtualizarOutro(editandoOutro, editNomeOutro, parseFloat(editValorOutro))
      cancelarEdicaoOutro()
    }
  }, [editandoOutro, editNomeOutro, editValorOutro, handleAtualizarOutro, cancelarEdicaoOutro])

  // Handlers para marmitas
  const handleAdicionarMarmita = useCallback(() => {
    if (!inputData.trim() || !inputValor.trim()) return
    
    const valor = parseFloat(inputValor)
    if (isNaN(valor) || valor < 0) return
    
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

  // Dados para gráficos
  const dadosGraficoEvolucao = useMemo(() => {
    if (!evolucaoFinanceira) return []
    return evolucaoFinanceira.map(item => ({
      data: new Date(item.data).toLocaleDateString('pt-BR'),
      receitas: item.receitas,
      despesas: item.despesas,
      saldo: item.saldo_dia
    }))
  }, [evolucaoFinanceira])

  const dadosGraficoReceitasDespesas = useMemo(() => {
    if (!receitasDespesas) return []
    return [
      { name: 'Receitas', value: receitasDespesas.receitas, fill: '#10b981' },
      { name: 'Despesas', value: receitasDespesas.despesas, fill: '#ef4444' }
    ]
  }, [receitasDespesas])

  // Dados para dicas financeiras
  const dicasFinanceiras = useMemo(() => {
    const saldoAtual = saldo?.saldo || 0
    const receitasTotal = receitasDespesas?.receitas || 0
    const despesasTotal = receitasDespesas?.despesas || 0

    const dicas = []

    if (saldoAtual < 0) {
      dicas.push({
        tipo: 'warning',
        titulo: 'Saldo Negativo',
        mensagem: 'Seu saldo está negativo. Considere reduzir gastos ou aumentar receitas.',
        icone: AlertTriangle
      })
    }

    if (despesasTotal > receitasTotal * 0.8) {
      dicas.push({
        tipo: 'info',
        titulo: 'Gastos Elevados',
        mensagem: 'Suas despesas representam mais de 80% das receitas. Considere revisar seus gastos.',
        icone: Info
      })
    }

    if (saldoAtual > 0 && saldoAtual < receitasTotal * 0.1) {
      dicas.push({
        tipo: 'success',
        titulo: 'Bom Controle',
        mensagem: 'Você está mantendo um bom controle financeiro!',
        icone: CheckCircle
      })
    }

    return dicas
  }, [saldo, receitasDespesas])

  // Cálculos para marmitas
  const totalGasto = marmitas?.reduce((total, marmita) => total + marmita.valor, 0) || 0
  const totalMarmitas = marmitas?.length || 0
  const marmitasCompradas = marmitas?.filter(m => m.comprou).length || 0
  const marmitasNaoCompradas = totalMarmitas - marmitasCompradas

  // Estatísticas do gráfico de marmitas
  const maiorGasto = Array.isArray(gastosMensais) && gastosMensais.length > 0
    ? gastosMensais.reduce((max, gasto) => Math.max(max, gasto.valor), gastosMensais[0].valor)
    : 0

  const menorGasto = Array.isArray(gastosMensais) && gastosMensais.length > 0
    ? gastosMensais.reduce((min, gasto) => Math.min(min, gasto.valor), gastosMensais[0].valor)
    : 0

  const mediaGasto = Array.isArray(gastosMensais) && gastosMensais.length > 0
    ? gastosMensais.reduce((sum, gasto) => sum + gasto.valor, 0) / gastosMensais.length
    : 0

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Erro ao carregar dados</h3>
          <p className="text-muted-foreground">Tente recarregar a página</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Controle Financeiro</h1>
            <p className="text-muted-foreground">Gerencie suas receitas, despesas e alimentação</p>
          </div>
          <HelpTips
            title="Como usar o Controle"
            tips={[
              { title: 'Filtros de período', content: 'Use mês/ano no topo para filtrar todos os dados da tela.' },
              { title: 'Receitas e Despesas', content: 'Adicione receitas, cartões e outros gastos. Edite e remova quando necessário.' },
              { title: 'Ocultar valores', content: 'Use o botão para ocultar/mostrar valores sensíveis.' },
              { title: 'Gastos e evolução', content: 'Acompanhe a evolução diária e compare receitas vs. despesas nos gráficos.' },
              { title: 'Marmitas', content: 'Na aba Alimentação, registre marmitas para acompanhar seus gastos no período.' },
            ]}
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        {/* Filtros */}
          <div className="flex items-center gap-2">
              <select
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
                aria-label="Selecionar mês"
              >
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
              </select>
            
              <select
                value={filtroAno}
                onChange={(e) => setFiltroAno(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
                aria-label="Selecionar ano"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(ano => (
                <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>

          {/* Toggle Ocultar Valores - apenas para aba financeiro */}
          {abaAtiva === 'financeiro' && (
            <button
              onClick={() => setOcultarValores(!ocultarValores)}
              className="flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              {ocultarValores ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="text-sm">{ocultarValores ? 'Mostrar' : 'Ocultar'} Valores</span>
            </button>
          )}
          </div>
        </div>

      {/* Sistema de Abas */}
      <div className="flex space-x-1 bg-muted/30 p-1 rounded-lg overflow-x-auto">
        <button
          onClick={() => setAbaAtiva('financeiro')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            abaAtiva === 'financeiro'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calculator size={16} />
          Financeiro
        </button>
        <button
          onClick={() => setAbaAtiva('alimentacao')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            abaAtiva === 'alimentacao'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ChefHat size={16} />
          Alimentação
        </button>
                </div>

      {/* Conteúdo da Aba Financeiro */}
      {abaAtiva === 'financeiro' && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6"
        >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
            <ArrowUpRight className="w-4 h-4 text-green-600" />
            </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Receitas</h3>
          <p className="text-2xl font-bold text-foreground">
            {ocultarValores ? '***' : formatCurrency(receitasDespesas?.receitas || 0)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6"
        >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <ArrowDownRight className="w-4 h-4 text-red-600" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Despesas</h3>
          <p className="text-2xl font-bold text-foreground">
            {ocultarValores ? '***' : formatCurrency(receitasDespesas?.despesas || 0)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6"
        >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Saldo</h3>
          <p className={`text-2xl font-bold ${(saldo?.saldo || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {ocultarValores ? '***' : formatCurrency(saldo?.saldo || 0)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-6"
        >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <PiggyBank className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Economia</h3>
          <p className="text-2xl font-bold text-foreground">
            {ocultarValores ? '***' : formatCurrency(Math.max(0, saldo?.saldo || 0))}
          </p>
        </motion.div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Evolução */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Evolução Financeira</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={dadosGraficoEvolucao}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Area type="monotone" dataKey="receitas" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              <Area type="monotone" dataKey="despesas" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
              <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gráfico de Pizza */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Receitas vs Despesas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={dadosGraficoReceitasDespesas}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
              >
                {dadosGraficoReceitasDespesas.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Dicas Financeiras */}
      {dicasFinanceiras.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Dicas Financeiras</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dicasFinanceiras.map((dica, index) => {
              const Icon = dica.icone
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    dica.tipo === 'warning' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
                    dica.tipo === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' :
                    'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 ${
                      dica.tipo === 'warning' ? 'text-red-600' :
                      dica.tipo === 'success' ? 'text-green-600' :
                      'text-blue-600'
                    }`} />
            <div>
                      <h4 className="font-medium text-foreground mb-1">{dica.titulo}</h4>
                      <p className="text-sm text-muted-foreground">{dica.mensagem}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Seção de Receitas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Receitas</h3>
        
        {/* Formulário de Adição */}
        <div className="flex gap-2 sm:gap-4 mb-6 flex-wrap">
          <input
            type="text"
            placeholder="Nome da receita"
            value={inputNomeReceita}
            onChange={(e) => setInputNomeReceita(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg"
          />
              <input
                type="number"
            placeholder="Valor"
            value={inputValorReceita}
            onChange={(e) => setInputValorReceita(e.target.value)}
            className="w-32 px-3 py-2 bg-background border border-border rounded-lg"
          />
            <button
              onClick={handleAdicionarReceita}
              disabled={adicionarReceitaMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
            {adicionarReceitaMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </button>
        </div>

        {/* Lista de Receitas */}
          <div className="space-y-2">
          {loadingReceitas ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando receitas...</p>
              </div>
          ) : receitas && receitas.length > 0 ? (
            receitas.map((receita) => (
              <div
                key={receita.id}
                className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
              >
                {editandoReceita === receita.id ? (
                  // Modo de edição
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editNomeReceita}
                      onChange={(e) => setEditNomeReceita(e.target.value)}
                      className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm"
                      placeholder="Nome da receita"
                      aria-label="Nome da receita"
                    />
                    <input
                      type="number"
                      value={editValorReceita}
                      onChange={(e) => setEditValorReceita(e.target.value)}
                      className="w-24 px-2 py-1 bg-background border border-border rounded text-sm"
                      placeholder="Valor"
                      aria-label="Valor da receita"
                    />
              </div>
                ) : (
                  // Modo de visualização
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{receita.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(receita.data).toLocaleDateString('pt-BR')}
                    </p>
              </div>
                )}
                <div className="flex items-center gap-2">
                  {editandoReceita === receita.id ? (
                    // Botões de edição
                    <>
                      <button
                        onClick={salvarEdicaoReceita}
                        className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                        title="Salvar alterações"
                        aria-label="Salvar alterações"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={cancelarEdicaoReceita}
                        className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-900/20 rounded"
                        title="Cancelar edição"
                        aria-label="Cancelar edição"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    // Botões normais
                    <>
                      <span className="font-semibold text-green-600">
                        {ocultarValores ? '***' : formatCurrency(receita.valor)}
                      </span>
                      <button
                        onClick={() => iniciarEdicaoReceita(receita)}
                        className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                        title="Editar receita"
                        aria-label="Editar receita"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoverReceita(receita.id)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                        title="Remover receita"
                        aria-label="Remover receita"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
            )}
          </div>
        </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma receita encontrada para o período selecionado.
      </div>
          )}
        </div>
      </motion.div>

      {/* Seção de Cartões */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Cartões de Crédito</h3>
        
        {/* Formulário de Adição */}
        <div className="flex gap-2 sm:gap-4 mb-6 flex-wrap">
          <input
            type="text"
            placeholder="Nome do cartão"
            value={inputNomeCartao}
            onChange={(e) => setInputNomeCartao(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg"
          />
          <input
            type="number"
            placeholder="Valor"
            value={inputValorCartao}
            onChange={(e) => setInputValorCartao(e.target.value)}
            className="w-32 px-3 py-2 bg-background border border-border rounded-lg"
          />
          <select
            value={inputPagoCartao}
            onChange={(e) => setInputPagoCartao(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg"
            aria-label="Status de pagamento"
          >
            <option value="Sim">Pago</option>
            <option value="Não">Não Pago</option>
          </select>
          <button
            onClick={handleAdicionarCartao}
            disabled={adicionarCartaoMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {adicionarCartaoMutation.isPending ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>

        {/* Lista de Cartões */}
        <div className="space-y-2">
          {loadingCartoes ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando cartões...</p>
          </div>
          ) : cartoes && cartoes.length > 0 ? (
            cartoes.map((cartao) => (
              <div
                key={cartao.id}
                className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
              >
                {editandoCartao === cartao.id ? (
                  // Modo de edição
                  <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                      value={editNomeCartao}
                      onChange={(e) => setEditNomeCartao(e.target.value)}
                      className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm"
                      placeholder="Nome do cartão"
                        aria-label="Nome do cartão"
                      />
                      <input
                        type="number"
                      value={editValorCartao}
                      onChange={(e) => setEditValorCartao(e.target.value)}
                      className="w-24 px-2 py-1 bg-background border border-border rounded text-sm"
                      placeholder="Valor"
                        aria-label="Valor do cartão"
                      />
                      <select
                      value={editPagoCartao}
                      onChange={(e) => setEditPagoCartao(e.target.value)}
                      className="px-2 py-1 bg-background border border-border rounded text-sm"
                        aria-label="Status de pagamento"
                      >
                      <option value="Sim">Pago</option>
                      <option value="Não">Não Pago</option>
                      </select>
                  </div>
                ) : (
                  // Modo de visualização
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{cartao.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(cartao.data).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {editandoCartao === cartao.id ? (
                    // Botões de edição
                    <>
                      <button
                        onClick={salvarEdicaoCartao}
                        className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                        title="Salvar alterações"
                        aria-label="Salvar alterações"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={cancelarEdicaoCartao}
                        className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-900/20 rounded"
                        title="Cancelar edição"
                        aria-label="Cancelar edição"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    // Botões normais
                    <>
                      <span className={`font-semibold ${cartao.pago === 'Sim' ? 'text-green-600' : 'text-red-600'}`}>
                        {ocultarValores ? '***' : formatCurrency(cartao.valor)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        cartao.pago === 'Sim' 
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                          : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      }`}>
                        {cartao.pago}
                      </span>
                      <button
                        onClick={() => iniciarEdicaoCartao(cartao)}
                        className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                        title="Editar cartão"
                        aria-label="Editar cartão"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoverCartao(cartao.id)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                        title="Remover cartão"
                        aria-label="Remover cartão"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
          </div>
              </div>
            ))
        ) : (
            <div className="text-center py-8 text-muted-foreground">
            Nenhum cartão encontrado para o período selecionado.
          </div>
        )}
      </div>
      </motion.div>

      {/* Seção de Outros Gastos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Outros Gastos</h3>
        
        {/* Formulário de Adição */}
        <div className="flex gap-2 sm:gap-4 mb-6 flex-wrap">
          <input
            type="text"
            placeholder="Nome do gasto"
            value={inputNomeOutro}
            onChange={(e) => setInputNomeOutro(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg"
          />
          <input
            type="number"
            placeholder="Valor"
            value={inputValorOutro}
            onChange={(e) => setInputValorOutro(e.target.value)}
            className="w-32 px-3 py-2 bg-background border border-border rounded-lg"
          />
          <button
            onClick={handleAdicionarOutro}
            disabled={adicionarOutroMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {adicionarOutroMutation.isPending ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>

        {/* Lista de Outros Gastos */}
        <div className="space-y-2">
          {loadingOutros ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando gastos...</p>
          </div>
          ) : outros && outros.length > 0 ? (
            outros.map((outro) => (
              <div
                key={outro.id}
                className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
              >
                {editandoOutro === outro.id ? (
                  // Modo de edição
                  <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                      value={editNomeOutro}
                      onChange={(e) => setEditNomeOutro(e.target.value)}
                      className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm"
                      placeholder="Nome do gasto"
                        aria-label="Nome do gasto"
                      />
                      <input
                        type="number"
                      value={editValorOutro}
                      onChange={(e) => setEditValorOutro(e.target.value)}
                      className="w-24 px-2 py-1 bg-background border border-border rounded text-sm"
                      placeholder="Valor"
                        aria-label="Valor do gasto"
                      />
          </div>
        ) : (
                  // Modo de visualização
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{outro.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(outro.data).toLocaleDateString('pt-BR')}
                    </p>
          </div>
        )}
                <div className="flex items-center gap-2">
                  {editandoOutro === outro.id ? (
                    // Botões de edição
                    <>
                      <button
                        onClick={salvarEdicaoOutro}
                        className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                        title="Salvar alterações"
                        aria-label="Salvar alterações"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={cancelarEdicaoOutro}
                        className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-900/20 rounded"
                        title="Cancelar edição"
                        aria-label="Cancelar edição"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    // Botões normais
                    <>
                      <span className="font-semibold text-red-600">
                        {ocultarValores ? '***' : formatCurrency(outro.valor)}
                      </span>
                      <button
                        onClick={() => iniciarEdicaoOutro(outro)}
                        className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                        title="Editar gasto"
                        aria-label="Editar gasto"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleRemoverOutro(outro.id)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                        title="Remover gasto"
                        aria-label="Remover gasto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
          )}
        </div>
      </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum gasto encontrado para o período selecionado.
          </div>
        )}
      </div>
      </motion.div>
        </>
      )}

      {/* Conteúdo da Aba Alimentação */}
      {abaAtiva === 'alimentacao' && (
        <>
          {/* Formulário de Adição */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-lg p-6"
          >
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
                  onClick={handleAdicionarMarmita}
                  disabled={adicionarMarmitaMutation.isPending}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {adicionarMarmitaMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Filtros para Marmitas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </motion.div>

          {/* Cards de Resumo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
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
          </motion.div>

          {/* Conteúdo Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tabela de Marmitas */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border rounded-lg p-6"
            >
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
                              onClick={() => handleRemoverMarmita(marmita.id)}
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
            </motion.div>

            {/* Gráfico e Estatísticas */}
            <div className="space-y-6">
              {/* Gráfico de Gastos Mensais */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card border border-border rounded-lg p-6"
              >
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
              </motion.div>

              {/* Estatísticas do Gráfico */}
              {gastosMensais && gastosMensais.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
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
                </motion.div>
        )}
      </div>
          </div>
        </>
      )}
    </div>
  )
} 