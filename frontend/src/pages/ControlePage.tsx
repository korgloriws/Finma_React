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

  // Lançamento unificado (receita/despesa)
  const [lanTipo, setLanTipo] = useState<'receita' | 'despesa'>('despesa')
  const [lanNome, setLanNome] = useState('')
  const [lanValor, setLanValor] = useState('')
  const [lanData, setLanData] = useState('')
  const [lanCategoria, setLanCategoria] = useState<string>(() => {
    try { return localStorage.getItem('controle_last_categoria') || '' } catch { return '' }
  })
  const [lanNatureza, setLanNatureza] = useState('') 
  const [lanRecorrencia, setLanRecorrencia] = useState('')
  const [lanParcelado, setLanParcelado] = useState(false)
  const [lanParcelas, setLanParcelas] = useState('')
  const [lanGerarParcelas, setLanGerarParcelas] = useState(false)
  const [lanJurosMensal, setLanJurosMensal] = useState('')
  const [lanObservacao, setLanObservacao] = useState('')
  const [lanForma, setLanForma] = useState<'outro' | 'cartao'>('outro')
  const [lanPago, setLanPago] = useState('Não')
  const CATEGORIAS_PRESETS = [
    'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer',
    'Educação', 'Impostos', 'Investimentos', 'Serviços', 'Assinaturas', 'Outros'
  ]
  useEffect(() => {
    try { if (lanCategoria) localStorage.setItem('controle_last_categoria', lanCategoria) } catch {}
  }, [lanCategoria])



  const [showAdvancedReceita] = useState(false)
  const [inputDataReceita, setInputDataReceita] = useState('')
  const [inputCategoriaReceita, setInputCategoriaReceita] = useState('')
  const [inputTipoReceita, setInputTipoReceita] = useState('')
  const [inputRecorrenciaReceita, setInputRecorrenciaReceita] = useState('')
  const [inputParceladoReceita, setInputParceladoReceita] = useState(false)
  const [inputParcelasTotalReceita, setInputParcelasTotalReceita] = useState('')
  const [inputGerarParcelasReceita, setInputGerarParcelasReceita] = useState(false)
  const [inputObservacaoReceita, setInputObservacaoReceita] = useState('')

  

  const [showAdvancedOutro] = useState(false)
  const [inputDataOutro, setInputDataOutro] = useState('')
  const [inputCategoriaOutro, setInputCategoriaOutro] = useState('')
  const [inputTipoOutro, setInputTipoOutro] = useState('')
  const [inputRecorrenciaOutro, setInputRecorrenciaOutro] = useState('')
  const [inputParceladoOutro, setInputParceladoOutro] = useState(false)
  const [inputParcelasTotalOutro, setInputParcelasTotalOutro] = useState('')
  const [inputGerarParcelasOutro, setInputGerarParcelasOutro] = useState(false)
  const [inputObservacaoOutro, setInputObservacaoOutro] = useState('')
  const [inputJurosMensalOutro, setInputJurosMensalOutro] = useState('')


  const [editandoReceita, setEditandoReceita] = useState<number | null>(null)
  const [editandoCartao, setEditandoCartao] = useState<number | null>(null)
  const [editandoOutro, setEditandoOutro] = useState<number | null>(null)
  

  const [editNomeReceita, setEditNomeReceita] = useState('')
  const [editValorReceita, setEditValorReceita] = useState('')
  const [editDataReceita, setEditDataReceita] = useState('')
  const [editCategoriaReceita, setEditCategoriaReceita] = useState('')
  const [editTipoReceita, setEditTipoReceita] = useState('')
  const [editRecorrenciaReceita, setEditRecorrenciaReceita] = useState('')
  const [editParcelasTotalReceita, setEditParcelasTotalReceita] = useState('')
  const [editParcelaAtualReceita, setEditParcelaAtualReceita] = useState('')
  const [editObservacaoReceita, setEditObservacaoReceita] = useState('')
  const [editNomeCartao, setEditNomeCartao] = useState('')
  const [editValorCartao, setEditValorCartao] = useState('')
  const [editPagoCartao, setEditPagoCartao] = useState('Sim')
  const [editDataCartao, setEditDataCartao] = useState('')
  const [editCategoriaCartao, setEditCategoriaCartao] = useState('')
  const [editTipoCartao, setEditTipoCartao] = useState('')
  const [editRecorrenciaCartao, setEditRecorrenciaCartao] = useState('')
  const [editParcelasTotalCartao, setEditParcelasTotalCartao] = useState('')
  const [editParcelaAtualCartao, setEditParcelaAtualCartao] = useState('')
  const [editObservacaoCartao, setEditObservacaoCartao] = useState('')
  const [editNomeOutro, setEditNomeOutro] = useState('')
  const [editValorOutro, setEditValorOutro] = useState('')
  const [editDataOutro, setEditDataOutro] = useState('')
  const [editCategoriaOutro, setEditCategoriaOutro] = useState('')
  const [editTipoOutro, setEditTipoOutro] = useState('')
  const [editRecorrenciaOutro, setEditRecorrenciaOutro] = useState('')
  const [editParcelasTotalOutro, setEditParcelasTotalOutro] = useState('')
  const [editParcelaAtualOutro, setEditParcelaAtualOutro] = useState('')
  const [editObservacaoOutro, setEditObservacaoOutro] = useState('')

  const queryClient = useQueryClient()


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

  // Estado de carregamento unificado de lançamento (setado após declarações)
  let adicionandoLancamento = false

  // Mutations
  const adicionarReceitaMutation = useMutation({
    mutationFn: ({ nome, valor, opts }: { nome: string; valor: number; opts?: any }) =>
      controleService.adicionarReceita(nome, valor, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receitas'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
      setLanNome('')
      setLanValor('')
      setLanData('')
      setLanCategoria('')
      setLanNatureza('')
      setLanRecorrencia('')
      setLanParcelado(false)
      setLanParcelas('')
      setLanGerarParcelas(false)
      setLanJurosMensal('')
      setLanObservacao('')
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
    mutationFn: ({ nome, valor, pago, opts }: { nome: string; valor: number; pago: string; opts?: any }) =>
      controleService.adicionarCartao(nome, valor, pago, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartoes'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
      setLanNome('')
      setLanValor('')
      setLanPago('Não')
      setLanData('')
      setLanCategoria('')
      setLanNatureza('')
      setLanRecorrencia('')
      setLanParcelado(false)
      setLanParcelas('')
      setLanGerarParcelas(false)
      setLanJurosMensal('')
      setLanObservacao('')
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
    mutationFn: ({ nome, valor, opts }: { nome: string; valor: number; opts?: any }) =>
      controleService.adicionarOutro(nome, valor, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outros'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
      setLanNome('')
      setLanValor('')
      setLanData('')
      setLanCategoria('')
      setLanNatureza('')
      setLanRecorrencia('')
      setLanParcelado(false)
      setLanParcelas('')
      setLanGerarParcelas(false)
      setLanJurosMensal('')
      setLanObservacao('')
    },
  })

  // Agora podemos calcular o estado de carregamento unificado
  adicionandoLancamento = adicionarReceitaMutation.isPending || adicionarCartaoMutation.isPending || adicionarOutroMutation.isPending


  const removerOutroMutation = useMutation({
    mutationFn: (id: number) => controleService.removerOutro(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outros'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
    },
  })

  // Atualizações são chamadas diretamente nos salvarEdicao* com opts e invalidates

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
  const handleAdicionarLancamento = useCallback(() => {
    if (!lanNome || !lanValor) return
    const valor = parseFloat(lanValor.replace(',', '.'))
    if (!isFinite(valor) || valor <= 0) return
    const optsBase: any = {
      data: lanData || undefined,
      categoria: lanCategoria || undefined,
      tipo: lanNatureza || undefined,
      recorrencia: lanRecorrencia || undefined,
      observacao: lanObservacao || undefined,
    }
    const parcelas = lanParcelado ? Math.max(1, parseInt(lanParcelas || '1')) : 1
    const jurosPct = parseFloat((lanJurosMensal || '').replace(',', '.'))
    const taxa = isFinite(jurosPct) && jurosPct > 0 ? (jurosPct / 100) : 0
    const parcelaValor = (lanTipo === 'despesa' && parcelas > 1) ? (taxa > 0 ? (valor * taxa) / (1 - Math.pow(1 + taxa, -parcelas)) : valor / parcelas) : valor

    if (lanTipo === 'receita') {
      // receitas não parcelam por padrão, mas permitimos caso usem "parcelado"
      if (lanParcelado && lanGerarParcelas && parcelas > 1) {
        const grupo = Math.random().toString(36).slice(2, 10)
        const baseDate = lanData ? new Date(lanData) : new Date()
        for (let i = 1; i <= parcelas; i++) {
          const d = new Date(baseDate)
          d.setMonth(d.getMonth() + (i - 1))
    adicionarReceitaMutation.mutate({
            nome: lanNome,
            valor: parcelaValor,
            opts: { ...optsBase, data: d.toISOString().slice(0, 10), parcelas_total: parcelas, parcela_atual: i, grupo_parcela: grupo }
          })
        }
      } else {
        adicionarReceitaMutation.mutate({ nome: lanNome, valor, opts: { ...optsBase, parcelas_total: lanParcelado ? parcelas : undefined, parcela_atual: lanParcelado ? 1 : undefined } })
      }
      return
    }

    // Despesa: decidir forma (cartao/outro) e pago
    if (lanForma === 'cartao') {
      if (lanParcelado && lanGerarParcelas && parcelas > 1) {
        const grupo = Math.random().toString(36).slice(2, 10)
        const baseDate = lanData ? new Date(lanData) : new Date()
        for (let i = 1; i <= parcelas; i++) {
          const d = new Date(baseDate)
          d.setMonth(d.getMonth() + (i - 1))
          adicionarCartaoMutation.mutate({
            nome: lanNome,
            valor: parcelaValor,
            pago: lanPago,
            opts: { ...optsBase, data: d.toISOString().slice(0, 10), parcelas_total: parcelas, parcela_atual: i, grupo_parcela: grupo }
          })
        }
      } else {
        adicionarCartaoMutation.mutate({ nome: lanNome, valor: parcelaValor, pago: lanPago, opts: { ...optsBase, parcelas_total: lanParcelado ? parcelas : undefined, parcela_atual: lanParcelado ? 1 : undefined } })
      }
    } else {
      if (lanParcelado && lanGerarParcelas && parcelas > 1) {
        const grupo = Math.random().toString(36).slice(2, 10)
        const baseDate = lanData ? new Date(lanData) : new Date()
        for (let i = 1; i <= parcelas; i++) {
          const d = new Date(baseDate)
          d.setMonth(d.getMonth() + (i - 1))
          adicionarOutroMutation.mutate({
            nome: lanNome,
            valor: parcelaValor,
            opts: { ...optsBase, data: d.toISOString().slice(0, 10), parcelas_total: parcelas, parcela_atual: i, grupo_parcela: grupo }
          })
        }
      } else {
        adicionarOutroMutation.mutate({ nome: lanNome, valor: parcelaValor, opts: { ...optsBase, parcelas_total: lanParcelado ? parcelas : undefined, parcela_atual: lanParcelado ? 1 : undefined } })
      }
    }
  }, [lanNome, lanValor, lanTipo, lanData, lanCategoria, lanNatureza, lanRecorrencia, lanObservacao, lanParcelado, lanParcelas, lanGerarParcelas, lanForma, lanPago, lanJurosMensal, adicionarReceitaMutation, adicionarCartaoMutation, adicionarOutroMutation])


  const handleRemoverReceita = useCallback((id: number) => {
    removerReceitaMutation.mutate(id)
  }, [removerReceitaMutation])

  // REMOVIDO: handleAdicionarCartao (usar handleAdicionarLancamento)


  const handleRemoverCartao = useCallback((id: number) => {
      removerCartaoMutation.mutate(id)
  }, [removerCartaoMutation])

  // REMOVIDO: handleAdicionarOutro (usar handleAdicionarLancamento)


  const handleRemoverOutro = useCallback((id: number) => {
      removerOutroMutation.mutate(id)
  }, [removerOutroMutation])

  // Handlers para atualização
  // removidos handlers diretos; edição usa salvarEdicao* com opts


  const iniciarEdicaoReceita = useCallback((receita: Receita) => {
    setEditandoReceita(receita.id)
    setEditNomeReceita(receita.nome)
    setEditValorReceita(receita.valor.toString())
    setEditDataReceita(receita.data || '')
    setEditCategoriaReceita(receita.categoria || '')
    setEditTipoReceita((receita.tipo || '').toLowerCase())
    setEditRecorrenciaReceita(receita.recorrencia || '')
    setEditParcelasTotalReceita(receita.parcelas_total ? String(receita.parcelas_total) : '')
    setEditParcelaAtualReceita(receita.parcela_atual ? String(receita.parcela_atual) : '')
    setEditObservacaoReceita(receita.observacao || '')
  }, [])

  const iniciarEdicaoCartao = useCallback((cartao: Cartao) => {
    setEditandoCartao(cartao.id)
    setEditNomeCartao(cartao.nome)
    setEditValorCartao(cartao.valor.toString())
    setEditPagoCartao(cartao.pago)
    setEditDataCartao(cartao.data || '')
    setEditCategoriaCartao(cartao.categoria || '')
    setEditTipoCartao((cartao.tipo || '').toLowerCase())
    setEditRecorrenciaCartao(cartao.recorrencia || '')
    setEditParcelasTotalCartao(cartao.parcelas_total ? String(cartao.parcelas_total) : '')
    setEditParcelaAtualCartao(cartao.parcela_atual ? String(cartao.parcela_atual) : '')
    setEditObservacaoCartao(cartao.observacao || '')
  }, [])

  const iniciarEdicaoOutro = useCallback((outro: OutroGasto) => {
    setEditandoOutro(outro.id)
    setEditNomeOutro(outro.nome)
    setEditValorOutro(outro.valor.toString())
    setEditDataOutro(outro.data || '')
    setEditCategoriaOutro(outro.categoria || '')
    setEditTipoOutro((outro.tipo || '').toLowerCase())
    setEditRecorrenciaOutro(outro.recorrencia || '')
    setEditParcelasTotalOutro(outro.parcelas_total ? String(outro.parcelas_total) : '')
    setEditParcelaAtualOutro(outro.parcela_atual ? String(outro.parcela_atual) : '')
    setEditObservacaoOutro(outro.observacao || '')
  }, [])


  const cancelarEdicaoReceita = useCallback(() => {
    setEditandoReceita(null)
    setEditNomeReceita('')
    setEditValorReceita('')
    setEditDataReceita('')
    setEditCategoriaReceita('')
    setEditTipoReceita('')
    setEditRecorrenciaReceita('')
    setEditParcelasTotalReceita('')
    setEditParcelaAtualReceita('')
    setEditObservacaoReceita('')
  }, [])

  const cancelarEdicaoCartao = useCallback(() => {
    setEditandoCartao(null)
    setEditNomeCartao('')
    setEditValorCartao('')
    setEditPagoCartao('Sim')
    setEditDataCartao('')
    setEditCategoriaCartao('')
    setEditTipoCartao('')
    setEditRecorrenciaCartao('')
    setEditParcelasTotalCartao('')
    setEditParcelaAtualCartao('')
    setEditObservacaoCartao('')
  }, [])

  const cancelarEdicaoOutro = useCallback(() => {
    setEditandoOutro(null)
    setEditNomeOutro('')
    setEditValorOutro('')
    setEditDataOutro('')
    setEditCategoriaOutro('')
    setEditTipoOutro('')
    setEditRecorrenciaOutro('')
    setEditParcelasTotalOutro('')
    setEditParcelaAtualOutro('')
    setEditObservacaoOutro('')
  }, [])


  const salvarEdicaoReceita = useCallback(() => {
    if (editandoReceita && editNomeReceita && editValorReceita) {
      const valor = parseFloat(editValorReceita)
      const opts: any = {
        data: editDataReceita || undefined,
        categoria: editCategoriaReceita || undefined,
        tipo: editTipoReceita || undefined,
        recorrencia: editRecorrenciaReceita || undefined,
        parcelas_total: editParcelasTotalReceita ? parseInt(editParcelasTotalReceita) : undefined,
        parcela_atual: editParcelaAtualReceita ? parseInt(editParcelaAtualReceita) : undefined,
        observacao: editObservacaoReceita || undefined,
      }
      controleService.atualizarReceita(editandoReceita, editNomeReceita, valor, opts).then(() => {
        queryClient.invalidateQueries({ queryKey: ['receitas'] })
        queryClient.invalidateQueries({ queryKey: ['saldo'] })
        queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
        queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
      cancelarEdicaoReceita()
      })
    }
  }, [editandoReceita, editNomeReceita, editValorReceita, editDataReceita, editCategoriaReceita, editTipoReceita, editRecorrenciaReceita, editParcelasTotalReceita, editParcelaAtualReceita, editObservacaoReceita, queryClient, cancelarEdicaoReceita])

  const salvarEdicaoCartao = useCallback(() => {
    if (editandoCartao && editNomeCartao && editValorCartao) {
      const valor = parseFloat(editValorCartao)
      const opts: any = {
        data: editDataCartao || undefined,
        categoria: editCategoriaCartao || undefined,
        tipo: editTipoCartao || undefined,
        recorrencia: editRecorrenciaCartao || undefined,
        parcelas_total: editParcelasTotalCartao ? parseInt(editParcelasTotalCartao) : undefined,
        parcela_atual: editParcelaAtualCartao ? parseInt(editParcelaAtualCartao) : undefined,
        observacao: editObservacaoCartao || undefined,
      }
      controleService.atualizarCartao(editandoCartao, editNomeCartao, valor, editPagoCartao, opts).then(() => {
        queryClient.invalidateQueries({ queryKey: ['cartoes'] })
        queryClient.invalidateQueries({ queryKey: ['saldo'] })
        queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
        queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
      cancelarEdicaoCartao()
      })
    }
  }, [editandoCartao, editNomeCartao, editValorCartao, editPagoCartao, editDataCartao, editCategoriaCartao, editTipoCartao, editRecorrenciaCartao, editParcelasTotalCartao, editParcelaAtualCartao, editObservacaoCartao, queryClient, cancelarEdicaoCartao])

  const salvarEdicaoOutro = useCallback(() => {
    if (editandoOutro && editNomeOutro && editValorOutro) {
      const valor = parseFloat(editValorOutro)
      const opts: any = {
        data: editDataOutro || undefined,
        categoria: editCategoriaOutro || undefined,
        tipo: editTipoOutro || undefined,
        recorrencia: editRecorrenciaOutro || undefined,
        parcelas_total: editParcelasTotalOutro ? parseInt(editParcelasTotalOutro) : undefined,
        parcela_atual: editParcelaAtualOutro ? parseInt(editParcelaAtualOutro) : undefined,
        observacao: editObservacaoOutro || undefined,
      }
      controleService.atualizarOutro(editandoOutro, editNomeOutro, valor, opts).then(() => {
        queryClient.invalidateQueries({ queryKey: ['outros'] })
        queryClient.invalidateQueries({ queryKey: ['saldo'] })
        queryClient.invalidateQueries({ queryKey: ['evolucao-financeira'] })
        queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
      cancelarEdicaoOutro()
      })
    }
  }, [editandoOutro, editNomeOutro, editValorOutro, editDataOutro, editCategoriaOutro, editTipoOutro, editRecorrenciaOutro, editParcelasTotalOutro, editParcelaAtualOutro, editObservacaoOutro, queryClient, cancelarEdicaoOutro])


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

  // Despesas unificadas (cartões + outros) com metadados
  const despesasUnificadas = useMemo(() => {
    const parse = (arr: any[] | undefined, fonte: 'cartao' | 'outro') =>
      (arr || []).map((item: any) => ({
        id: item.id,
        nome: item.nome,
        valor: Number(item.valor) || 0,
        data: item.data,
        categoria: item.categoria || 'Sem categoria',
        tipo: (item.tipo || 'variavel').toLowerCase(),
        pago: fonte === 'cartao' ? item.pago : undefined,
        parcela_atual: item.parcela_atual || undefined,
        parcelas_total: item.parcelas_total || undefined,
        grupo_parcela: item.grupo_parcela || undefined,
        fonte,
      }))
    return [...parse(cartoes, 'cartao'), ...parse(outros, 'outro')]
  }, [cartoes, outros])

  // Totais por categoria (somente despesas)
  const totaisPorCategoria = useMemo(() => {
    const acc: Record<string, number> = {}
    despesasUnificadas.forEach((d) => {
      acc[d.categoria] = (acc[d.categoria] || 0) + (d.valor || 0)
    })
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [despesasUnificadas])

  // Totais por tipo (fixo/variável)
  const totaisPorTipo = useMemo(() => {
    const result = { fixo: 0, variavel: 0 }
    despesasUnificadas.forEach((d) => {
      const key = (String(d.tipo) === 'fixo') ? 'fixo' : 'variavel'
      result[key as 'fixo' | 'variavel'] += d.valor || 0
    })
    return [
      { name: 'Fixos', value: result.fixo, fill: '#6366F1' },
      { name: 'Variáveis', value: result.variavel, fill: '#F59E0B' },
    ]
  }, [despesasUnificadas])

  // Série diária: receitas vs despesas fixas vs variáveis + saldo acumulado
  const dadosStackedDia = useMemo(() => {
    const byDate: Record<string, { data: string; receitas: number; despesas_fixo: number; despesas_variavel: number; saldo_acumulado?: number }> = {}
    const toKey = (s: string) => new Date(s).toISOString().slice(0, 10)
    ;(receitas || []).forEach((r) => {
      const k = toKey(r.data)
      byDate[k] = byDate[k] || { data: k, receitas: 0, despesas_fixo: 0, despesas_variavel: 0 }
      byDate[k].receitas += Number(r.valor) || 0
    })
    despesasUnificadas.forEach((d) => {
      const k = toKey(d.data)
      byDate[k] = byDate[k] || { data: k, receitas: 0, despesas_fixo: 0, despesas_variavel: 0 }
      if (String(d.tipo) === 'fixo') byDate[k].despesas_fixo += d.valor || 0
      else byDate[k].despesas_variavel += d.valor || 0
    })
    const dias = Object.values(byDate).sort((a, b) => a.data.localeCompare(b.data))
    let saldo = 0
    dias.forEach((row) => {
      const delta = (row.receitas || 0) - ((row.despesas_fixo || 0) + (row.despesas_variavel || 0))
      saldo += delta
      row.saldo_acumulado = saldo
    })
    return dias
  }, [receitas, despesasUnificadas])

  // Metas por categoria (persistência local)
  const [metasCategoria, setMetasCategoria] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('controle_metas') || '{}') || {} } catch { return {} }
  })
  const salvarMetas = useCallback((m: Record<string, number>) => {
    setMetasCategoria(m)
    try { localStorage.setItem('controle_metas', JSON.stringify(m)) } catch {}
  }, [])
  // statusOrcamento pode ser renderizado futuramente em alertas dedicados

  // Resumo de parcelas estimado (antes de salvar)
  

  const resumoParcelasOutro = useMemo(() => {
    const principal = parseFloat((lanValor || '').replace(',', '.'))
    const n = Math.max(1, parseInt(inputParcelasTotalOutro || '1'))
    const j = parseFloat((inputJurosMensalOutro || '').replace(',', '.')) / 100 || 0
    if (!inputParceladoOutro || !isFinite(principal) || principal <= 0 || !n) return null
    const parcela = j > 0 ? (principal * j) / (1 - Math.pow(1 + j, -n)) : principal / n
    const total = parcela * n
    const jurosTotais = total - principal
    return { parcela, n, total, jurosTotais }
  }, [lanValor, inputParceladoOutro, inputParcelasTotalOutro, inputJurosMensalOutro])

  // Lembretes: próximos 60 dias (busca meses seguintes e lista)
  const { data: proximosVencimentos } = useQuery<any>({
    queryKey: ['proximos-vencimentos', filtroMes, filtroAno],
    queryFn: async () => {
      const base = new Date(parseInt(filtroAno), parseInt(filtroMes) - 1, 1)
      const meses = [1, 2]
      const datasets = await Promise.all(
        meses.map(async (offset) => {
          const d = new Date(base)
          d.setMonth(d.getMonth() + offset)
          const mesStr = String(d.getMonth() + 1).padStart(2, '0')
          const anoStr = String(d.getFullYear())
          const [c, o] = await Promise.all([
            controleService.getCartoes(mesStr, anoStr),
            controleService.getOutros(mesStr, anoStr),
          ])
          return { mes: mesStr, ano: anoStr, cartoes: c, outros: o }
        })
      )
      return datasets
    },
    staleTime: 60000,
  })
  const lembretes = useMemo(() => {
    const items: any[] = []
    ;(proximosVencimentos || []).forEach((m: any) => {
      ;(m.cartoes || []).forEach((it: any) => items.push({ ...it, fonte: 'cartao' }))
      ;(m.outros || []).forEach((it: any) => items.push({ ...it, fonte: 'outro' }))
    })
    const now = new Date()
    items.forEach((it) => (it._d = new Date(it.data)))
    const futuros = items.filter((it) => it._d > now && it._d.getTime() - now.getTime() <= 1000 * 60 * 60 * 24 * 60)
    futuros.sort((a, b) => a._d.getTime() - b._d.getTime())
    return futuros.slice(0, 8)
  }, [proximosVencimentos])

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

      {/* Gráficos por Categoria e por Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Despesas por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie data={totaisPorCategoria} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${formatCurrency(value)}`}>
                {totaisPorCategoria.map((_, index) => (
                  <Cell key={`cat-${index}`} fill={["#3b82f6","#ef4444","#10b981","#f59e0b","#8b5cf6","#06b6d4"][index % 6]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Despesas Fixas vs Variáveis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie data={totaisPorTipo} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${formatCurrency(value)}`}>
                {totaisPorTipo.map((entry, index) => (
                  <Cell key={`tipo-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Stacked diário e saldo acumulado */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Receitas x Fixos x Variáveis (Diário)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={dadosStackedDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data" />
            <YAxis />
            <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
            <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
            <Bar dataKey="despesas_fixo" fill="#6366F1" name="Fixos" />
            <Bar dataKey="despesas_variavel" fill="#F59E0B" name="Variáveis" />
            <Line type="monotone" dataKey="saldo_acumulado" stroke="#3b82f6" strokeWidth={2} name="Saldo Acumulado" />
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Novo Lançamento (Receita/Despesa) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Novo Lançamento</h3>
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
          <select value={lanTipo} onChange={(e) => setLanTipo(e.target.value as any)} className="px-3 py-2 bg-background border border-border rounded-lg" aria-label="Tipo de lançamento" title="Tipo de lançamento">
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
          <input type="text" value={lanNome} onChange={(e) => setLanNome(e.target.value)} placeholder="Descrição" className="flex-1 px-3 py-2 bg-background border border-border rounded-lg" aria-label="Descrição do lançamento" title="Descrição do lançamento" />
          <input type="text" value={lanValor} onChange={(e) => setLanValor(e.target.value)} placeholder="Valor" className="w-32 px-3 py-2 bg-background border border-border rounded-lg" aria-label="Valor do lançamento" title="Valor do lançamento" />
          <button onClick={handleAdicionarLancamento} disabled={adicionandoLancamento} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">{adicionandoLancamento ? 'Adicionando...' : 'Adicionar'}</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <input type="date" value={lanData} onChange={(e) => setLanData(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Data do lançamento" title="Data do lançamento" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select value={lanCategoria} onChange={(e) => setLanCategoria(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Categoria" title="Categoria">
                <option value="">—</option>
                {CATEGORIAS_PRESETS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select value={lanNatureza} onChange={(e) => setLanNatureza(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Tipo do gasto" title="Tipo do gasto">
                <option value="">—</option>
                <option value="fixo">Fixo</option>
                <option value="variavel">Variável</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recorrência</label>
              <select value={lanRecorrencia} onChange={(e) => setLanRecorrencia(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Recorrência" title="Recorrência">
                <option value="">Nenhuma</option>
                <option value="mensal">Mensal</option>
                <option value="semanal">Semanal</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            {lanTipo === 'despesa' && (
              <div>
                <label className="block text-sm font-medium mb-1">Forma</label>
                <select value={lanForma} onChange={(e) => setLanForma(e.target.value as any)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Forma de pagamento" title="Forma de pagamento">
                  <option value="outro">Dinheiro/PIX/Outros</option>
                  <option value="cartao">Cartão de crédito</option>
                </select>
              </div>
            )}
            {lanTipo === 'despesa' && lanForma === 'cartao' && (
              <div>
                <label className="block text-sm font-medium mb-1">Pago</label>
                <select value={lanPago} onChange={(e) => setLanPago(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Pago" title="Pago">
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input id="lan-parc" type="checkbox" checked={lanParcelado} onChange={(e) => setLanParcelado(e.target.checked)} className="h-4 w-4" aria-label="Parcelado" title="Parcelado" />
              <label htmlFor="lan-parc" className="text-sm">Parcelado</label>
            </div>
            {lanParcelado && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Parcelas</label>
                  <input type="number" min="1" value={lanParcelas} onChange={(e) => setLanParcelas(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Quantidade de parcelas" title="Quantidade de parcelas" />
                </div>
                {lanTipo === 'despesa' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Juros mensal (%)</label>
                    <input type="text" value={lanJurosMensal} onChange={(e) => setLanJurosMensal(e.target.value)} placeholder="Ex: 1,99" className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Juros mensal" title="Juros mensal" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input id="lan-gerar" type="checkbox" checked={lanGerarParcelas} onChange={(e) => setLanGerarParcelas(e.target.checked)} className="h-4 w-4" aria-label="Gerar parcelas automaticamente" title="Gerar parcelas automaticamente" />
                  <label htmlFor="lan-gerar" className="text-sm">Gerar parcelas automaticamente</label>
                </div>
              </>
            )}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Observação</label>
              <input type="text" value={lanObservacao} onChange={(e) => setLanObservacao(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Observação" title="Observação" />
            </div>
          </div>
      </motion.div>

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

      {/* Metas por Categoria (Orçamento) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Metas por Categoria</h3>
        <div className="space-y-2">
          {totaisPorCategoria.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem dados de despesas no período.</div>
          ) : (
            totaisPorCategoria.map(({ name, value }) => (
              <div key={name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{name}</span>
                    <span className="text-sm text-muted-foreground">Gasto: {formatCurrency(value)}</span>
                  </div>
                </div>
                <input
                  type="number"
                  placeholder="Meta R$"
                  className="w-28 px-2 py-1 bg-background border border-border rounded"
                  value={metasCategoria[name] ?? ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    const next = { ...metasCategoria, [name]: isFinite(v) ? v : 0 }
                    salvarMetas(next)
                  }}
                />
                <div className={`text-sm font-medium ${value > (metasCategoria[name] || Infinity) ? 'text-red-600' : 'text-green-600'}`}>
                  {metasCategoria[name] ? (value > metasCategoria[name] ? 'Acima' : 'Dentro') : '—'}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Lembretes de Próximos Vencimentos */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Próximos Vencimentos (60 dias)</h3>
        {(!lembretes || lembretes.length === 0) ? (
          <div className="text-sm text-muted-foreground">Sem vencimentos próximos.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lembretes.map((it: any, idx: number) => (
              <div key={idx} className="p-3 rounded border border-border bg-background">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.nome}</div>
                    <div className="text-xs text-muted-foreground">{new Date(it.data).toLocaleDateString('pt-BR')} • {it.categoria || 'Sem categoria'} • {it.tipo || 'variável'}</div>
                  </div>
                  <div className="font-semibold text-red-600">{formatCurrency(it.valor)}</div>
                </div>
                {(it.parcelas_total && it.parcela_atual) ? (
                  <div className="text-xs text-muted-foreground mt-1">Parcela {it.parcela_atual}/{it.parcelas_total}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Seção de Receitas (LEGADO) - manter listagem, remover formulário em favor do unificado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Receitas</h3>
        
        <div className="flex gap-2 sm:gap-4 mb-6 flex-wrap text-sm text-muted-foreground">Use o formulário unificado acima.</div>
        {showAdvancedReceita && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <input type="date" value={inputDataReceita} onChange={(e) => setInputDataReceita(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Data da receita" title="Selecionar data da receita" />
        </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <input type="text" value={inputCategoriaReceita} onChange={(e) => setInputCategoriaReceita(e.target.value)} placeholder="Ex: Salário, Bônus" className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Categoria da receita" title="Categoria da receita" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select value={inputTipoReceita} onChange={(e) => setInputTipoReceita(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Tipo da receita" title="Tipo da receita">
                <option value="">—</option>
                <option value="fixo">Fixo</option>
                <option value="variavel">Variável</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recorrência</label>
              <select value={inputRecorrenciaReceita} onChange={(e) => setInputRecorrenciaReceita(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Recorrência da receita" title="Recorrência da receita">
                <option value="">Nenhuma</option>
                <option value="mensal">Mensal</option>
                <option value="semanal">Semanal</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input id="rec-parc-r" type="checkbox" checked={inputParceladoReceita} onChange={(e) => setInputParceladoReceita(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="rec-parc-r" className="text-sm">Parcelado</label>
            </div>
            {inputParceladoReceita && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Parcelas</label>
                  <input type="number" min="1" value={inputParcelasTotalReceita} onChange={(e) => setInputParcelasTotalReceita(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Quantidade de parcelas" title="Quantidade de parcelas" />
                </div>
                <div className="flex items-center gap-2">
                  <input id="rec-gerar-r" type="checkbox" checked={inputGerarParcelasReceita} onChange={(e) => setInputGerarParcelasReceita(e.target.checked)} className="h-4 w-4" />
                  <label htmlFor="rec-gerar-r" className="text-sm">Gerar parcelas automaticamente (meses)</label>
                </div>
              </>
            )}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Observação</label>
              <input type="text" value={inputObservacaoReceita} onChange={(e) => setInputObservacaoReceita(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Observação da receita" title="Observação da receita" />
            </div>
          </div>
        )}

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
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-2">
                    <input type="text" value={editNomeReceita} onChange={(e) => setEditNomeReceita(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm md:col-span-2" placeholder="Nome da receita" aria-label="Nome da receita" />
                    <input type="number" value={editValorReceita} onChange={(e) => setEditValorReceita(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" placeholder="Valor" aria-label="Valor da receita" />
                    <input type="date" value={editDataReceita} onChange={(e) => setEditDataReceita(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Data" />
                    <select value={editCategoriaReceita} onChange={(e) => setEditCategoriaReceita(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Categoria" title="Categoria">
                      <option value="">—</option>
                      {CATEGORIAS_PRESETS.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                    <select value={editTipoReceita} onChange={(e) => setEditTipoReceita(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Tipo" title="Tipo">
                      <option value="">—</option>
                      <option value="fixo">Fixo</option>
                      <option value="variavel">Variável</option>
                    </select>
                    <select value={editRecorrenciaReceita} onChange={(e) => setEditRecorrenciaReceita(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Recorrência" title="Recorrência">
                      <option value="">Nenhuma</option>
                      <option value="mensal">Mensal</option>
                      <option value="semanal">Semanal</option>
                      <option value="anual">Anual</option>
                    </select>
                    <input type="number" value={editParcelasTotalReceita} onChange={(e) => setEditParcelasTotalReceita(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" placeholder="Parcelas" aria-label="Parcelas" />
                    <input type="number" value={editParcelaAtualReceita} onChange={(e) => setEditParcelaAtualReceita(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" placeholder="Parcela atual" aria-label="Parcela atual" />
                    <input type="text" value={editObservacaoReceita} onChange={(e) => setEditObservacaoReceita(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm md:col-span-2" placeholder="Observação" aria-label="Observação" />
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

      {/* Seção de Despesas (Unificada) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Despesas</h3>
        
        {/* Formulário de Adição */}
        <div className="flex gap-2 sm:gap-4 mb-6 flex-wrap">
          <div className="text-sm text-muted-foreground">Use o formulário unificado acima.</div>
        </div>
        {showAdvancedOutro && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <input type="date" value={inputDataOutro} onChange={(e) => setInputDataOutro(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Data do gasto" title="Selecionar data do gasto" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <input type="text" value={inputCategoriaOutro} onChange={(e) => setInputCategoriaOutro(e.target.value)} placeholder="Ex: Aluguel, Internet" className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Categoria do gasto" title="Categoria do gasto" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select value={inputTipoOutro} onChange={(e) => setInputTipoOutro(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Tipo do gasto" title="Tipo do gasto">
                <option value="">—</option>
                <option value="fixo">Fixo</option>
                <option value="variavel">Variável</option>
          </select>
        </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recorrência</label>
              <select value={inputRecorrenciaOutro} onChange={(e) => setInputRecorrenciaOutro(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Recorrência do gasto" title="Recorrência do gasto">
                <option value="">Nenhuma</option>
                <option value="mensal">Mensal</option>
                <option value="semanal">Semanal</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input id="rec-parc-o" type="checkbox" checked={inputParceladoOutro} onChange={(e) => setInputParceladoOutro(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="rec-parc-o" className="text-sm">Parcelado</label>
            </div>
            {inputParceladoOutro && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Parcelas</label>
                  <input type="number" min="1" value={inputParcelasTotalOutro} onChange={(e) => setInputParcelasTotalOutro(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Quantidade de parcelas do gasto" title="Quantidade de parcelas do gasto" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Juros mensal (%)</label>
                  <input type="text" value={inputJurosMensalOutro} onChange={(e) => setInputJurosMensalOutro(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Juros mensal" title="Taxa de juros mensal" placeholder="Ex: 1,99" />
                </div>
                <div className="flex items-center gap-2">
                  <input id="rec-gerar-o" type="checkbox" checked={inputGerarParcelasOutro} onChange={(e) => setInputGerarParcelasOutro(e.target.checked)} className="h-4 w-4" />
                  <label htmlFor="rec-gerar-o" className="text-sm">Gerar parcelas automaticamente (meses)</label>
                </div>
                {resumoParcelasOutro && (
                  <div className="text-xs text-muted-foreground">Parcela: {formatCurrency(resumoParcelasOutro.parcela)} • Total: {formatCurrency(resumoParcelasOutro.total)} • Juros: {formatCurrency(resumoParcelasOutro.jurosTotais)}</div>
                )}
              </>
            )}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Observação</label>
              <input type="text" value={inputObservacaoOutro} onChange={(e) => setInputObservacaoOutro(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg" aria-label="Observação do gasto" title="Observação do gasto" />
            </div>
          </div>
        )}
        {/* Lista de Despesas Unificadas (Cartões + Outros) */}
        <div className="space-y-2">
          {loadingOutros || loadingCartoes ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando despesas...</p>
          </div>
          ) : despesasUnificadas && despesasUnificadas.length > 0 ? (
            despesasUnificadas.map((despesa) => (
              <div
                key={despesa.id + '-' + despesa.fonte}
                className="flex items-center justify-between p-3 bg-accent/50 rounded-lg"
              >
                {despesa.fonte === 'cartao' && editandoCartao === despesa.id ? (
                  // Modo de edição (Cartão)
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-2">
                    <input type="text" value={editNomeCartao} onChange={(e) => setEditNomeCartao(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm md:col-span-2" placeholder="Nome da despesa" aria-label="Nome da despesa" />
                    <input type="number" value={editValorCartao} onChange={(e) => setEditValorCartao(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" placeholder="Valor" aria-label="Valor da despesa" />
                    <input type="date" value={editDataCartao} onChange={(e) => setEditDataCartao(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Data" />
                    <select value={editCategoriaCartao} onChange={(e) => setEditCategoriaCartao(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Categoria" title="Categoria">
                      <option value="">—</option>
                      {CATEGORIAS_PRESETS.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                    <select value={editTipoCartao} onChange={(e) => setEditTipoCartao(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Tipo" title="Tipo">
                      <option value="">—</option>
                      <option value="fixo">Fixo</option>
                      <option value="variavel">Variável</option>
                    </select>
                    <select value={editRecorrenciaCartao} onChange={(e) => setEditRecorrenciaCartao(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Recorrência" title="Recorrência">
                      <option value="">Nenhuma</option>
                      <option value="mensal">Mensal</option>
                      <option value="semanal">Semanal</option>
                      <option value="anual">Anual</option>
                    </select>
                    <input type="number" value={editParcelasTotalCartao} onChange={(e) => setEditParcelasTotalCartao(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" placeholder="Parcelas" aria-label="Parcelas" />
                    <input type="number" value={editParcelaAtualCartao} onChange={(e) => setEditParcelaAtualCartao(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" placeholder="Parcela atual" aria-label="Parcela atual" />
                    <select value={editPagoCartao} onChange={(e) => setEditPagoCartao(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Status de pagamento" title="Status de pagamento">
                      <option value="Sim">Pago</option>
                      <option value="Não">Não Pago</option>
                      </select>
                    <input type="text" value={editObservacaoCartao} onChange={(e) => setEditObservacaoCartao(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm md:col-span-2" placeholder="Observação" aria-label="Observação" />
                  </div>
                ) : despesa.fonte === 'outro' && editandoOutro === despesa.id ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-2">
                    <input type="text" value={editNomeOutro} onChange={(e) => setEditNomeOutro(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm md:col-span-2" placeholder="Nome da despesa" aria-label="Nome da despesa" />
                    <input type="number" value={editValorOutro} onChange={(e) => setEditValorOutro(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" placeholder="Valor" aria-label="Valor da despesa" />
                    <input type="date" value={editDataOutro} onChange={(e) => setEditDataOutro(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Data" />
                    <select value={editCategoriaOutro} onChange={(e) => setEditCategoriaOutro(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Categoria" title="Categoria">
                      <option value="">—</option>
                      {CATEGORIAS_PRESETS.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                    <select value={editTipoOutro} onChange={(e) => setEditTipoOutro(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Tipo" title="Tipo">
                      <option value="">—</option>
                      <option value="fixo">Fixo</option>
                      <option value="variavel">Variável</option>
                    </select>
                    <select value={editRecorrenciaOutro} onChange={(e) => setEditRecorrenciaOutro(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" aria-label="Recorrência" title="Recorrência">
                      <option value="">Nenhuma</option>
                      <option value="mensal">Mensal</option>
                      <option value="semanal">Semanal</option>
                      <option value="anual">Anual</option>
                    </select>
                    <input type="number" value={editParcelasTotalOutro} onChange={(e) => setEditParcelasTotalOutro(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" placeholder="Parcelas" aria-label="Parcelas" />
                    <input type="number" value={editParcelaAtualOutro} onChange={(e) => setEditParcelaAtualOutro(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm" placeholder="Parcela atual" aria-label="Parcela atual" />
                    <input type="text" value={editObservacaoOutro} onChange={(e) => setEditObservacaoOutro(e.target.value)} className="px-2 py-1 bg-background border border-border rounded text-sm md:col-span-2" placeholder="Observação" aria-label="Observação" />
                  </div>
                ) : (
                  // Modo de visualização
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{despesa.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(despesa.data).toLocaleDateString('pt-BR')} • {despesa.categoria} • {despesa.tipo}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {despesa.fonte === 'cartao' && editandoCartao === despesa.id ? (
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
                  ) : despesa.fonte === 'outro' && editandoOutro === despesa.id ? (
                    <>
                      <button onClick={salvarEdicaoOutro} className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded" title="Salvar alterações" aria-label="Salvar alterações"><Save size={16} /></button>
                      <button onClick={cancelarEdicaoOutro} className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-900/20 rounded" title="Cancelar edição" aria-label="Cancelar edição"><X size={16} /></button>
                    </>
                  ) : (
                    // Botões normais
                    <>
                      <span className={`font-semibold ${despesa.fonte === 'cartao' && despesa.pago === 'Sim' ? 'text-green-600' : 'text-red-600'}`}>
                        {ocultarValores ? '***' : formatCurrency(despesa.valor)}
                      </span>
                      {despesa.fonte === 'cartao' && (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                          despesa.pago === 'Sim'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                          : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      }`}>
                          {despesa.pago}
                      </span>
                      )}
                      {despesa.fonte === 'cartao' ? (
                        <>
                          <button onClick={() => iniciarEdicaoCartao(despesa as any)} className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded" title="Editar despesa" aria-label="Editar despesa"><Edit size={16} /></button>
                          <button onClick={() => handleRemoverCartao(despesa.id)} className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded" title="Remover despesa" aria-label="Remover despesa"><Trash2 size={16} /></button>
                    </>
                  ) : (
                        <>
                          <button onClick={() => iniciarEdicaoOutro(despesa as any)} className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded" title="Editar despesa" aria-label="Editar despesa"><Edit size={16} /></button>
                          <button onClick={() => handleRemoverOutro(despesa.id)} className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded" title="Remover despesa" aria-label="Remover despesa"><Trash2 size={16} /></button>
                        </>
                      )}
                    </>
          )}
        </div>
      </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma despesa encontrada para o período selecionado.
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