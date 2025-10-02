import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'

import { 
  DollarSign, TrendingDown, BarChart3, 
  Eye, EyeOff, TrendingUp, AlertTriangle, 
  ArrowUpRight, ArrowDownRight,
  ChefHat, CreditCard, Target, Calendar
} from 'lucide-react'
import { controleService } from '../services/api'
import HelpTips from '../components/HelpTips'
import ControleAlimentacaoTab from '../components/controle/ControleAlimentacaoTab'
import ControleReceitaTab from '../components/controle/ControleReceitaTab'
import ControleDespesaTab from '../components/controle/ControleDespesaTab'
import ControleCartaoTab from '../components/controle/ControleCartaoTab'
import { formatCurrency } from '../utils/formatters'
import { EvolucaoFinanceira, ReceitasDespesas } from '../types'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, PieChart as RechartsPieChart, Pie, Cell, Area, ComposedChart } from 'recharts'

export default function ControlePage() {
  
  const getNomeMes = (mes: number) => {
    return new Date(2024, mes - 1).toLocaleDateString('pt-BR', { month: 'long' })
  }

  const [filtroMes, setFiltroMes] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [filtroAno, setFiltroAno] = useState<string>(String(new Date().getFullYear()))
  const [ocultarValores, setOcultarValores] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [abrirMesPicker, setAbrirMesPicker] = useState(false)
  const [periodoEvolucao, setPeriodoEvolucao] = useState<'3m' | '6m' | '12m'>('6m')
  
  const [abaAtiva, setAbaAtiva] = useState<'financeiro' | 'receitas' | 'despesas' | 'alimentacao' | 'cartoes'>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      if (tab === 'alimentacao') return 'alimentacao'
      if (tab === 'receitas') return 'receitas'
      if (tab === 'cartoes') return 'cartoes'
      if (tab === 'despesas') return 'despesas'
      return 'financeiro'
    } catch {
      return 'financeiro'
    }
  })

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
      window.removeEventListener('unhandledrejection', () => {
        setHasError(true)
      })
    }
  }, [])


  const { data: receitasDespesas } = useQuery<ReceitasDespesas>({
    queryKey: ['receitas-despesas', filtroMes, filtroAno],
    queryFn: () => controleService.getReceitasDespesas(filtroMes, filtroAno),
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: saldo } = useQuery<{ saldo: number }>({
    queryKey: ['saldo', filtroMes, filtroAno],
    queryFn: () => controleService.getSaldo(filtroMes, filtroAno),
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: dadosGraficoEvolucao } = useQuery<EvolucaoFinanceira[]>({
    queryKey: ['evolucao-financeira', filtroMes, filtroAno, periodoEvolucao],
    queryFn: () => controleService.getEvolucaoFinanceira(filtroMes, filtroAno),
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Query para comparação com mês anterior (sempre ativa)
  const { data: dadosComparacao } = useQuery<EvolucaoFinanceira[]>({
    queryKey: ['evolucao-financeira-comparacao', filtroMes, filtroAno],
    queryFn: () => {
      const mesAnterior = parseInt(filtroMes) - 1
      const anoAnterior = mesAnterior === 0 ? parseInt(filtroAno) - 1 : parseInt(filtroAno)
      const mesAnteriorStr = mesAnterior === 0 ? '12' : mesAnterior.toString().padStart(2, '0')
      return controleService.getEvolucaoFinanceira(mesAnteriorStr, anoAnterior.toString())
    },
    retry: 1,
    refetchOnWindowFocus: false
  })


  // Cálculos para comparações
  const comparacaoMensal = useMemo(() => {
    if (!dadosGraficoEvolucao || !dadosComparacao) return null
    
    const totalReceitasAtual = dadosGraficoEvolucao.reduce((sum, item) => sum + item.receitas, 0)
    const totalDespesasAtual = dadosGraficoEvolucao.reduce((sum, item) => sum + item.despesas, 0)
    const saldoAtual = totalReceitasAtual - totalDespesasAtual
    
    const totalReceitasAnterior = dadosComparacao.reduce((sum, item) => sum + item.receitas, 0)
    const totalDespesasAnterior = dadosComparacao.reduce((sum, item) => sum + item.despesas, 0)
    const saldoAnterior = totalReceitasAnterior - totalDespesasAnterior
    
    return {
      receitas: {
        atual: totalReceitasAtual,
        anterior: totalReceitasAnterior,
        variacao: totalReceitasAnterior > 0 ? ((totalReceitasAtual - totalReceitasAnterior) / totalReceitasAnterior) * 100 : 0
      },
      despesas: {
        atual: totalDespesasAtual,
        anterior: totalDespesasAnterior,
        variacao: totalDespesasAnterior > 0 ? ((totalDespesasAtual - totalDespesasAnterior) / totalDespesasAnterior) * 100 : 0
      },
      saldo: {
        atual: saldoAtual,
        anterior: saldoAnterior,
        variacao: saldoAnterior !== 0 ? ((saldoAtual - saldoAnterior) / Math.abs(saldoAnterior)) * 100 : 0
      }
    }
  }, [dadosGraficoEvolucao, dadosComparacao])

  const dadosGraficoReceitasDespesas = useMemo(() => [
    { name: 'Receitas', value: receitasDespesas?.receitas || 0, fill: '#10b981' },
    { name: 'Despesas', value: receitasDespesas?.despesas || 0, fill: '#ef4444' }
  ], [receitasDespesas])

  const totaisPorCategoria = useMemo(() => {
   
    return [
      { name: 'Supermercado', value: 500 },
      { name: 'Farmácia', value: 200 },
      { name: 'Transporte', value: 300 }
    ]
  }, [receitasDespesas])

  const totaisPorTipo = useMemo(() => {
  
    return [
      { name: 'Fixo', value: 800, fill: '#3b82f6' },
      { name: 'Variável', value: 400, fill: '#f59e0b' }
    ]
  }, [receitasDespesas])

  if (hasError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Erro no Sistema</h1>
          <p className="text-muted-foreground mb-4">Ocorreu um erro inesperado. Tente recarregar a página.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Controle Financeiro</h1>
          <p className="text-muted-foreground">Gerencie suas receitas, despesas e acompanhe sua evolução financeira</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                aria-haspopup="dialog"
                onClick={() => setAbrirMesPicker(v => !v)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-card/60 backdrop-blur border border-border rounded-full text-sm hover:bg-card/80 transition shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline select-none">{getNomeMes(parseInt(filtroMes))} {filtroAno}</span>
              </button>
              {abrirMesPicker && (
                <div className="absolute left-0 mt-2 w-64 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-3 z-20">
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Selecionar mês"
                      value={filtroMes}
                      onChange={(e) => setFiltroMes(e.target.value)}
                      className="flex-1 px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = i + 1
                        return (
                          <option key={month} value={String(month).padStart(2, '0')}>
                            {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                          </option>
                        )
                      })}
                    </select>
                    <select
                      aria-label="Selecionar ano"
                      value={filtroAno}
                      onChange={(e) => setFiltroAno(e.target.value)}
                      className="w-[90px] px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - 2 + i
                        return (
                          <option key={year} value={String(year)}>
                            {year}
                          </option>
                        )
                      })}
                    </select>
                    <button
                      onClick={() => setAbrirMesPicker(false)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setOcultarValores(!ocultarValores)}
              className="flex items-center gap-2 px-3 py-1.5 bg-card/60 backdrop-blur border border-border rounded-full text-sm hover:bg-card/80 transition shadow-sm"
            >
              {ocultarValores ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">{ocultarValores ? 'Mostrar' : 'Ocultar'} Valores</span>
            </motion.button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setAbaAtiva('financeiro')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            abaAtiva === 'financeiro'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
            <BarChart3 size={16} />
          Financeiro
        </button>
          <button
            onClick={() => setAbaAtiva('receitas')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              abaAtiva === 'receitas'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <DollarSign size={16} />
            Receitas
          </button>
          <button
            onClick={() => setAbaAtiva('despesas')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              abaAtiva === 'despesas'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <TrendingDown size={16} />
            Despesas
          </button>
          <button
            onClick={() => setAbaAtiva('cartoes')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              abaAtiva === 'cartoes'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <CreditCard size={16} />
            Cartões
        </button>
        <button
          onClick={() => setAbaAtiva('alimentacao')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            abaAtiva === 'alimentacao'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <ChefHat size={16} />
          Alimentação
        </button>
                </div>

        {/* Conteúdo da Aba Financeiro - Dashboard de Síntese */}
      {abaAtiva === 'financeiro' && (
        <>
            {/* Cabeçalho do Dashboard */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard Financeiro</h2>
              <p className="text-muted-foreground">Visão geral e síntese do seu controle financeiro</p>
            </div>

            {/* Cards de Resumo Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                onClick={() => setAbaAtiva('receitas')}
        >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-primary" />
            </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Receitas</h3>
                <p className="text-2xl font-bold text-foreground mb-2">
            {ocultarValores ? '***' : formatCurrency(receitasDespesas?.receitas || 0)}
          </p>
                <p className="text-xs text-muted-foreground">Clique para gerenciar receitas</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                onClick={() => setAbaAtiva('despesas')}
        >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
                  <ArrowDownRight className="w-4 h-4 text-destructive" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Despesas</h3>
                <p className="text-2xl font-bold text-foreground mb-2">
            {ocultarValores ? '***' : formatCurrency(receitasDespesas?.despesas || 0)}
          </p>
                <p className="text-xs text-muted-foreground">Clique para gerenciar despesas</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                onClick={() => setAbaAtiva('cartoes')}
        >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CreditCard className="w-5 h-5 text-primary" />
            </div>
                  <ArrowUpRight className="w-4 h-4 text-primary" />
          </div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Cartões</h3>
                <p className="text-2xl font-bold text-foreground mb-2">
                  {ocultarValores ? '***' : formatCurrency(0)}
                </p>
                <p className="text-xs text-muted-foreground">Clique para gerenciar cartões</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                onClick={() => setAbaAtiva('alimentacao')}
        >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ChefHat className="w-5 h-5 text-primary" />
            </div>
                  <ArrowUpRight className="w-4 h-4 text-primary" />
          </div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Alimentação</h3>
                <p className="text-2xl font-bold text-foreground mb-2">
                  {ocultarValores ? '***' : formatCurrency(0)}
                </p>
                <p className="text-xs text-muted-foreground">Clique para gerenciar marmitas</p>
        </motion.div>
      </div>

            {/* Card de Saldo Principal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card border border-border rounded-2xl p-8 mb-8 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Saldo Total do Mês</h3>
                  <p className={`text-4xl font-bold ${(saldo?.saldo || 0) >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {ocultarValores ? '***' : formatCurrency(saldo?.saldo || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl ${(saldo?.saldo || 0) >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {(saldo?.saldo || 0) >= 0 ? '✓ Positivo' : '⚠ Negativo'}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {receitasDespesas?.receitas ? 
                      `${Math.round(((receitasDespesas.despesas || 0) / receitasDespesas.receitas) * 100)}% das receitas em despesas` : 
                      'Nenhuma receita registrada'
                    }
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Botões de Ação Rápida */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => setAbaAtiva('receitas')}
                className="bg-card border border-border rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-3 group"
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign size={24} className="text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Registrar Receita</div>
                  <div className="text-sm text-muted-foreground">Adicionar nova receita</div>
                </div>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={() => setAbaAtiva('despesas')}
                className="bg-card border border-border rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-3 group"
              >
                <div className="p-2 rounded-lg bg-destructive/10">
                  <TrendingDown size={24} className="text-destructive" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Registrar Despesa</div>
                  <div className="text-sm text-muted-foreground">Adicionar nova despesa</div>
                </div>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={() => setAbaAtiva('cartoes')}
                className="bg-card border border-border rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-3 group"
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <CreditCard size={24} className="text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Gerenciar Cartões</div>
                  <div className="text-sm text-muted-foreground">Ver e editar cartões</div>
                </div>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={() => setAbaAtiva('alimentacao')}
                className="bg-card border border-border rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-3 group"
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <ChefHat size={24} className="text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Controle Marmitas</div>
                  <div className="text-sm text-muted-foreground">Gerenciar alimentação</div>
                </div>
              </motion.button>
            </div>

            {/* Gráficos e Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Gráfico de Evolução */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Evolução Financeira</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={periodoEvolucao}
                      onChange={(e) => setPeriodoEvolucao(e.target.value as '3m' | '6m' | '12m')}
                      className="px-3 py-1 text-sm border border-border rounded bg-background text-foreground"
                      aria-label="Selecionar período"
                    >
                      <option value="3m">3 meses</option>
                      <option value="6m">6 meses</option>
                      <option value="12m">12 meses</option>
                    </select>
                  </div>
                </div>

                {/* Cards de Comparação com Mês Anterior */}
                {comparacaoMensal && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Comparação com Mês Anterior
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">Receitas</span>
                          <div className={`flex items-center gap-1 text-sm ${
                            comparacaoMensal.receitas.variacao >= 0 ? 'text-positive' : 'text-destructive'
                          }`}>
                            {comparacaoMensal.receitas.variacao >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            {Math.abs(comparacaoMensal.receitas.variacao).toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-lg font-bold text-foreground">
                          {ocultarValores ? '••••••' : formatCurrency(comparacaoMensal.receitas.atual)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          vs {ocultarValores ? '••••••' : formatCurrency(comparacaoMensal.receitas.anterior)} (mês anterior)
                        </div>
                      </div>

                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">Despesas</span>
                          <div className={`flex items-center gap-1 text-sm ${
                            comparacaoMensal.despesas.variacao <= 0 ? 'text-positive' : 'text-destructive'
                          }`}>
                            {comparacaoMensal.despesas.variacao <= 0 ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                            {Math.abs(comparacaoMensal.despesas.variacao).toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-lg font-bold text-foreground">
                          {ocultarValores ? '••••••' : formatCurrency(comparacaoMensal.despesas.atual)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          vs {ocultarValores ? '••••••' : formatCurrency(comparacaoMensal.despesas.anterior)} (mês anterior)
                        </div>
                      </div>

                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">Saldo</span>
                          <div className={`flex items-center gap-1 text-sm ${
                            comparacaoMensal.saldo.variacao >= 0 ? 'text-positive' : 'text-destructive'
                          }`}>
                            {comparacaoMensal.saldo.variacao >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            {Math.abs(comparacaoMensal.saldo.variacao).toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-lg font-bold text-foreground">
                          {ocultarValores ? '••••••' : formatCurrency(comparacaoMensal.saldo.atual)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          vs {ocultarValores ? '••••••' : formatCurrency(comparacaoMensal.saldo.anterior)} (mês anterior)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={dadosGraficoEvolucao || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="data" 
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return `${date.getDate()}/${date.getMonth() + 1}`
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        ocultarValores ? '••••••' : formatCurrency(Number(value)), 
                        name === 'receitas' ? 'Receitas' : 
                        name === 'despesas' ? 'Despesas' : 
                        name === 'saldo_acumulado' ? 'Saldo Acumulado' : name
                      ]}
                      labelFormatter={(value) => {
                        const date = new Date(value)
                        return date.toLocaleDateString('pt-BR')
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="receitas" 
                      stackId="1" 
                      stroke="hsl(var(--positive))" 
                      fill="hsl(var(--positive))" 
                      fillOpacity={0.3} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="despesas" 
                      stackId="1" 
                      stroke="hsl(var(--destructive))" 
                      fill="hsl(var(--destructive))" 
                      fillOpacity={0.3} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="saldo_acumulado" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3} 
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Gráfico de Pizza */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xl"
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

            {/* Insights e Métricas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Despesas por Categoria */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 1.1 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xl"
              >
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

              {/* Despesas Fixas vs Variáveis */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 1.2 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xl"
              >
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

            {/* Cards de Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Tendência</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {receitasDespesas?.receitas && receitasDespesas?.despesas ? 
                    (receitasDespesas.receitas > receitasDespesas.despesas ? 
                      'Suas receitas estão superando as despesas!' : 
                      'Suas despesas estão superando as receitas'
                    ) : 
                    'Adicione dados para ver tendências'
                  }
                </p>
                <div className="text-2xl font-bold text-foreground">
                  {receitasDespesas?.receitas && receitasDespesas?.despesas ? 
                    `${Math.round(((receitasDespesas.receitas - receitasDespesas.despesas) / receitasDespesas.receitas) * 100)}%` : 
                    '0%'
                  }
          </div>
      </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Meta de Economia</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {receitasDespesas?.receitas ? 
                    `Recomendado: ${formatCurrency(receitasDespesas.receitas * 0.2)}` : 
                    'Adicione receitas para calcular meta'
                  }
                </p>
                <div className="text-2xl font-bold text-foreground">
                  {receitasDespesas?.receitas ? 
                    `${Math.round(((saldo?.saldo || 0) / (receitasDespesas.receitas * 0.2)) * 100)}%` : 
                    '0%'
                  }
          </div>
        </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Categoria Top</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {totaisPorCategoria.length > 0 ? 
                    `Maior gasto: ${totaisPorCategoria[0]?.name}` : 
                    'Nenhuma despesa registrada'
                  }
                </p>
                <div className="text-2xl font-bold text-foreground">
                  {totaisPorCategoria.length > 0 ? 
                    formatCurrency(totaisPorCategoria[0]?.value || 0) : 
                    'R$ 0,00'
                  }
        </div>
      </motion.div>
        </div>
        </>
      )}

        {/* Conteúdo da Aba Receitas */}
        {abaAtiva === 'receitas' && (
          <ControleReceitaTab
            filtroMes={filtroMes}
            filtroAno={filtroAno}
            ocultarValores={ocultarValores}
            setOcultarValores={setOcultarValores}
          />
        )}

        {/* Conteúdo da Aba Despesas */}
        {abaAtiva === 'despesas' && (
          <ControleDespesaTab
            filtroMes={filtroMes}
            filtroAno={filtroAno}
            ocultarValores={ocultarValores}
            setOcultarValores={setOcultarValores}
          />
        )}

        {/* Conteúdo da Aba Cartões */}
        {abaAtiva === 'cartoes' && (
          <ControleCartaoTab
            filtroMes={filtroMes}
            filtroAno={filtroAno}
            ocultarValores={ocultarValores}
            setOcultarValores={setOcultarValores}
          />
        )}

        {/* Conteúdo da Aba Alimentação */}
        {abaAtiva === 'alimentacao' && (
          <ControleAlimentacaoTab
            filtroMes={filtroMes}
            filtroAno={filtroAno}
            ocultarValores={ocultarValores}
            setOcultarValores={setOcultarValores}
          />
        )}

        <HelpTips tips={[]} />
            </div>
    </div>
  )
} 
