import { useState, useCallback,  } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import HelpTips from '../components/HelpTips'
import { useQuery } from '@tanstack/react-query'

import {
  Filter,
  List,
  BarChart,
  Loader2,
  CheckCircle,
  Search,

} from 'lucide-react'
import { analiseService, carteiraService } from '../services/api'
import { formatCurrency, formatPercentage } from '../utils/formatters'
import TickerWithLogo from '../components/TickerWithLogo'
import {
  AtivoAnalise,
  FiltrosAnalise,

} from '../types'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  ScatterChart,
  Scatter,
} from 'recharts'

export default function AnalisePage() {
  const [activeTab, setActiveTab] = useState<'lista' | 'graficos'>('lista')
  const [activeSubTab, setActiveSubTab] = useState<'acoes' | 'bdrs' | 'fiis'>('acoes')
  

  const [filtrosAcoes, setFiltrosAcoes] = useState<FiltrosAnalise>({
    roe_min: 15,
    dy_min: 12,
    pl_min: 1,
    pl_max: 10,
    pvp_max: 2
  })
  
  const [filtrosBdrs, setFiltrosBdrs] = useState<FiltrosAnalise>({
    roe_min: 15,
    dy_min: 3,
    pl_min: 1,
    pl_max: 15,
    pvp_max: 2
  })

  const [filtrosFiis, setFiltrosFiis] = useState<FiltrosAnalise>({
    dy_min: 12,
    dy_max: 15,
    liq_min: 1000000
  })

  const [ativosAcoes, setAtivosAcoes] = useState<AtivoAnalise[]>([])
  const [ativosBdrs, setAtivosBdrs] = useState<AtivoAnalise[]>([])
  const [ativosFiis, setAtivosFiis] = useState<AtivoAnalise[]>([])

  const [loadingAcoes, setLoadingAcoes] = useState(false)
  const [loadingBdrs, setLoadingBdrs] = useState(false)
  const [loadingFiis, setLoadingFiis] = useState(false)

  const [errorAcoes, setErrorAcoes] = useState<string | null>(null)
  const [errorBdrs, setErrorBdrs] = useState<string | null>(null)
  const [errorFiis, setErrorFiis] = useState<string | null>(null)

  const [autoSearchAcoes, setAutoSearchAcoes] = useState(false)
  const [autoSearchBdrs, setAutoSearchBdrs] = useState(false)
  const [autoSearchFiis, setAutoSearchFiis] = useState(false)


  const { data: carteira, isLoading: loadingCarteira } = useQuery({
    queryKey: ['carteira'],
    queryFn: carteiraService.getCarteira,
    retry: 3,
    refetchOnWindowFocus: false
  })


  const tickersNaCarteira = new Set(carteira?.map(ativo => ativo.ticker.toUpperCase()) || [])


  const isAtivoNaCarteira = (ticker: string) => {
    return tickersNaCarteira.has(ticker.toUpperCase())
  }


  const handleFiltroAcoesChange = useCallback((key: keyof FiltrosAnalise, value: number) => {
    setFiltrosAcoes(prev => ({ ...prev, [key]: value }))
    if (autoSearchAcoes) {

      setTimeout(() => handleBuscarAcoes(), 500)
    }
  }, [autoSearchAcoes])

  const handleFiltroBdrsChange = useCallback((key: keyof FiltrosAnalise, value: number) => {
    setFiltrosBdrs(prev => ({ ...prev, [key]: value }))
    if (autoSearchBdrs) {
      setTimeout(() => handleBuscarBdrs(), 500)
    }
  }, [autoSearchBdrs])

  const handleFiltroFiisChange = useCallback((key: keyof FiltrosAnalise, value: number) => {
    setFiltrosFiis(prev => ({ ...prev, [key]: value }))
    if (autoSearchFiis) {
      setTimeout(() => handleBuscarFiis(), 500)
    }
  }, [autoSearchFiis])

  const handleBuscarAcoes = useCallback(async () => {
    setLoadingAcoes(true)
    setErrorAcoes(null)
    try {
      const data = await analiseService.getAtivos('acoes', filtrosAcoes)
      setAtivosAcoes(data)
    } catch (error) {
      setErrorAcoes(error instanceof Error ? error.message : 'Erro ao buscar ações')
    } finally {
      setLoadingAcoes(false)
    }
  }, [filtrosAcoes])

  const handleBuscarBdrs = useCallback(async () => {
    setLoadingBdrs(true)
    setErrorBdrs(null)
    try {
      const data = await analiseService.getAtivos('bdrs', filtrosBdrs)
      setAtivosBdrs(data)
    } catch (error) {
      setErrorBdrs(error instanceof Error ? error.message : 'Erro ao buscar BDRs')
    } finally {
      setLoadingBdrs(false)
    }
  }, [filtrosBdrs])

  const handleBuscarFiis = useCallback(async () => {
    setLoadingFiis(true)
    setErrorFiis(null)
    try {
      const data = await analiseService.getAtivos('fiis', filtrosFiis)
      setAtivosFiis(data)
    } catch (error) {
      setErrorFiis(error instanceof Error ? error.message : 'Erro ao buscar FIIs')
    } finally {
      setLoadingFiis(false)
    }
  }, [filtrosFiis])

  const LoadingSpinner = ({ text }: { text: string }) => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 space-y-4"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
      />
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-foreground">{text}</p>
        <p className="text-sm text-muted-foreground">
          Isso pode demorar alguns minutos devido ao processamento dos dados
        </p>
      </div>
    </motion.div>
  )

  // Componente para filtros de ações
  const FiltrosAcoes = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-6 mb-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-500" />
          Filtros para Ações
        </h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoSearchAcoes}
              onChange={(e) => setAutoSearchAcoes(e.target.checked)}
              className="rounded border-border"
            />
            Busca automática
          </label>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBuscarAcoes}
            disabled={loadingAcoes}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loadingAcoes ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Buscar Ações
              </>
            )}
          </motion.button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">ROE Mínimo (%)</label>
          <input
            type="number"
            value={filtrosAcoes.roe_min || ''}
            onChange={(e) => handleFiltroAcoesChange('roe_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="ROE mínimo para ações"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Dividend Yield Mínimo (%)</label>
          <input
            type="number"
            value={filtrosAcoes.dy_min || ''}
            onChange={(e) => handleFiltroAcoesChange('dy_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Dividend Yield mínimo para ações"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">P/L Mínimo</label>
          <input
            type="number"
            value={filtrosAcoes.pl_min || ''}
            onChange={(e) => handleFiltroAcoesChange('pl_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="P/L mínimo para ações"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">P/L Máximo</label>
          <input
            type="number"
            value={filtrosAcoes.pl_max || ''}
            onChange={(e) => handleFiltroAcoesChange('pl_max', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="P/L máximo para ações"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">P/VP Máximo</label>
          <input
            type="number"
            value={filtrosAcoes.pvp_max || ''}
            onChange={(e) => handleFiltroAcoesChange('pvp_max', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="P/VP máximo para ações"
          />
        </div>
      </div>
    </motion.div>
  )

  // Componente para filtros de BDRs
  const FiltrosBdrs = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-6 mb-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="w-5 h-5 text-green-500" />
          Filtros para BDRs
        </h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoSearchBdrs}
              onChange={(e) => setAutoSearchBdrs(e.target.checked)}
              className="rounded border-border"
            />
            Busca automática
          </label>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBuscarBdrs}
            disabled={loadingBdrs}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loadingBdrs ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Buscar BDRs
              </>
            )}
          </motion.button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">ROE Mínimo (%)</label>
          <input
            type="number"
            value={filtrosBdrs.roe_min || ''}
            onChange={(e) => handleFiltroBdrsChange('roe_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="ROE mínimo para BDRs"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Dividend Yield Mínimo (%)</label>
          <input
            type="number"
            value={filtrosBdrs.dy_min || ''}
            onChange={(e) => handleFiltroBdrsChange('dy_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Dividend Yield mínimo para BDRs"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">P/L Mínimo</label>
          <input
            type="number"
            value={filtrosBdrs.pl_min || ''}
            onChange={(e) => handleFiltroBdrsChange('pl_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="P/L mínimo para BDRs"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">P/L Máximo</label>
          <input
            type="number"
            value={filtrosBdrs.pl_max || ''}
            onChange={(e) => handleFiltroBdrsChange('pl_max', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="P/L máximo para BDRs"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">P/VP Máximo</label>
          <input
            type="number"
            value={filtrosBdrs.pvp_max || ''}
            onChange={(e) => handleFiltroBdrsChange('pvp_max', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="P/VP máximo para BDRs"
          />
        </div>
      </div>
    </motion.div>
  )

  // Componente para filtros de FIIs
  const FiltrosFiis = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-6 mb-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="w-5 h-5 text-purple-500" />
          Filtros para FIIs
        </h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoSearchFiis}
              onChange={(e) => setAutoSearchFiis(e.target.checked)}
              className="rounded border-border"
            />
            Busca automática
          </label>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBuscarFiis}
            disabled={loadingFiis}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loadingFiis ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Buscar FIIs
              </>
            )}
          </motion.button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Dividend Yield Mínimo (%)</label>
          <input
            type="number"
            value={filtrosFiis.dy_min || ''}
            onChange={(e) => handleFiltroFiisChange('dy_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Dividend Yield mínimo para FIIs"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Dividend Yield Máximo (%)</label>
          <input
            type="number"
            value={filtrosFiis.dy_max || ''}
            onChange={(e) => handleFiltroFiisChange('dy_max', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Dividend Yield máximo para FIIs"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Liquidez Mínima</label>
          <input
            type="number"
            value={filtrosFiis.liq_min || ''}
            onChange={(e) => handleFiltroFiisChange('liq_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Liquidez mínima para FIIs"
          />
        </div>
      </div>
    </motion.div>
  )


  const TabelaAtivos = ({ ativos, loading, error, tipo }: { 
    ativos: AtivoAnalise[], 
    loading: boolean, 
    error: string | null, 
    tipo: string 
  }) => {
    if (loading) {
      return <LoadingSpinner text={`Carregando ${tipo}...`} />
    }

    if (error) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-red-500 py-8"
        >
          Erro ao carregar {tipo}: {error}
        </motion.div>
      )
    }

    if (!ativos || ativos.length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-muted-foreground py-8"
        >
          Nenhum {tipo} encontrado para os filtros selecionados.
        </motion.div>
      )
    }

    // Garantir que ativos seja um array
    if (!Array.isArray(ativos)) {
      console.error('Ativos não é um array:', ativos)
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-red-500 py-8"
        >
          Erro: Dados recebidos não são um array válido.
        </motion.div>
      )
    }

    try {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-x-auto"
        >
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Ticker</th>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Setor</th>
                <th className="px-4 py-3 text-left font-medium">País</th>
                <th className="px-4 py-3 text-left font-medium">Preço</th>
                <th className="px-4 py-3 text-left font-medium">DY</th>
                <th className="px-4 py-3 text-left font-medium">P/L</th>
                <th className="px-4 py-3 text-left font-medium">ROE</th>
                <th className="px-4 py-3 text-left font-medium">P/VP</th>
                <th className="px-4 py-3 text-left font-medium">Carteira</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {ativos.map((ativo, index) => {
                  try {
                    return (
                      <motion.tr 
                        key={ativo.ticker || index} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <TickerWithLogo ticker={ativo.ticker || ''} size="md" />
                        </td>
                        <td className="px-4 py-3">{ativo.nome_completo || '-'}</td>
                        <td className="px-4 py-3">{ativo.setor || '-'}</td>
                        <td className="px-4 py-3">{ativo.pais || '-'}</td>
                        <td className="px-4 py-3">{formatCurrency(ativo.preco_atual || 0)}</td>
                        <td className={`px-4 py-3 font-medium ${(ativo.dividend_yield || 0) > 8 ? 'text-green-600' : ''}`}>
                          {formatPercentage(ativo.dividend_yield || 0)}
                        </td>
                        <td className={`px-4 py-3 font-medium ${(ativo.pl || 0) < 0 ? 'text-red-600' : ''}`}>
                          {(ativo.pl || 0)?.toFixed(2) || '-'}
                        </td>
                        <td className={`px-4 py-3 font-medium ${(ativo.roe || 0) > 15 ? 'text-blue-600' : ''}`}>
                          {formatPercentage(ativo.roe || 0)}
                        </td>
                        <td className="px-4 py-3">{(ativo.pvp || 0)?.toFixed(2) || '-'}</td>
                        <td className="px-4 py-3">
                          {isAtivoNaCarteira(ativo.ticker || '') && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex items-center gap-1 text-green-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs">Na carteira</span>
                            </motion.div>
                          )}
                        </td>
                      </motion.tr>
                    )
                  } catch (rowError) {
                    console.error('Erro ao renderizar linha:', rowError, 'Dados:', ativo)
                    return null
                  }
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )
    } catch (tableError) {
      console.error('Erro ao renderizar tabela:', tableError)
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-red-500 py-8"
        >
          Erro ao renderizar tabela de {tipo}: {tableError instanceof Error ? tableError.message : 'Erro desconhecido'}
        </motion.div>
      )
    }
  }

  // Componente para gráficos
  const GraficosComponent = () => {
    // Combinar todos os ativos para os gráficos
    const todosAtivos = [
      ...ativosAcoes,
      ...ativosBdrs,
      ...ativosFiis
    ]

    if (todosAtivos.length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-muted-foreground py-8"
        >
          Aplique filtros para ver os gráficos.
        </motion.div>
      )
    }

    // Preparar dados para gráficos
    const topDy = todosAtivos
      .sort((a, b) => (b.dividend_yield || 0) - (a.dividend_yield || 0))
      .slice(0, 5)
      .map(ativo => ({
        ticker: ativo.ticker,
        valor: ativo.dividend_yield || 0
      }))

    const topRoe = todosAtivos
      .sort((a, b) => (b.roe || 0) - (a.roe || 0))
      .slice(0, 5)
      .map(ativo => ({
        ticker: ativo.ticker,
        valor: ativo.roe || 0
      }))

    const menorPl = todosAtivos
      .filter(ativo => ativo.pl && ativo.pl > 0)
      .sort((a, b) => (a.pl || 0) - (b.pl || 0))
      .slice(0, 5)
      .map(ativo => ({
        ticker: ativo.ticker,
        valor: ativo.pl || 0
      }))

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* P/L vs Dividend Yield */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">P/L vs Dividend Yield</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={todosAtivos}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="pl" name="P/L" stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="dividend_yield" name="Dividend Yield (%)" stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: any, name: string) => [value, name]} 
              />
              <Scatter dataKey="dividend_yield" fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 5 Dividend Yield */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Top 5 Dividend Yield</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={topDy}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="ticker" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))', 
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: any) => [formatPercentage(value), 'DY']} 
                />
                <Bar dataKey="valor" fill="#10b981" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 5 ROE */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Top 5 ROE</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={topRoe}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="ticker" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))', 
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: any) => [formatPercentage(value), 'ROE']} 
                />
                <Bar dataKey="valor" fill="#3b82f6" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>

          {/* Menor P/L */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Menor P/L</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={menorPl}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="ticker" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))', 
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: any) => [value.toFixed(2), 'P/L']} 
                />
                <Bar dataKey="valor" fill="#f59e0b" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold text-foreground">Análise de Oportunidades</h1>
          <HelpTips
            title="Como usar a Análise"
            tips={[
              { title: 'Tabs', content: 'Use Lista ou Gráficos conforme a necessidade.' },
              { title: 'Tipos', content: 'Selecione Ações, BDRs ou FIIs para filtrar o universo.' },
              { title: 'Filtros', content: 'Ajuste ROE, DY, P/L, P/VP e liquidez para refinar os resultados.' },
              { title: 'Carteira', content: 'Itens marcados como “Na carteira” já existem na sua carteira.' },
            ]}
          />
        </div>
        {loadingCarteira && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando carteira...
          </div>
        )}
      </motion.div>

      {/* Tabs Principais */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg"
      >
        <div className="border-b border-border">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('lista')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'lista'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <List className="w-4 h-4" />
                Lista
              </div>
            </button>
            <button
              onClick={() => setActiveTab('graficos')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'graficos'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart className="w-4 h-4" />
                Gráficos
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'lista' ? (
            <div>
              {/* Sub-tabs para tipos de ativos */}
              <div className="border-b border-border mb-6">
                <div className="flex overflow-x-auto">
                  <button
                    onClick={() => setActiveSubTab('acoes')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeSubTab === 'acoes'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Ações
                  </button>
                  <button
                    onClick={() => setActiveSubTab('bdrs')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeSubTab === 'bdrs'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    BDRs
                  </button>
                  <button
                    onClick={() => setActiveSubTab('fiis')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeSubTab === 'fiis'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    FIIs
                  </button>
                </div>
              </div>

              {/* Conteúdo baseado na sub-tab */}
              <AnimatePresence mode="wait">
                {activeSubTab === 'acoes' && (
                  <motion.div
                    key="acoes"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FiltrosAcoes />
                    <TabelaAtivos 
                      ativos={ativosAcoes} 
                      loading={loadingAcoes} 
                      error={errorAcoes} 
                      tipo="ações" 
                    />
                  </motion.div>
                )}

                {activeSubTab === 'bdrs' && (
                  <motion.div
                    key="bdrs"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FiltrosBdrs />
                    <TabelaAtivos 
                      ativos={ativosBdrs} 
                      loading={loadingBdrs} 
                      error={errorBdrs} 
                      tipo="BDRs" 
                    />
                  </motion.div>
                )}

                {activeSubTab === 'fiis' && (
                  <motion.div
                    key="fiis"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FiltrosFiis />
                    <TabelaAtivos 
                      ativos={ativosFiis} 
                      loading={loadingFiis} 
                      error={errorFiis} 
                      tipo="FIIs" 
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <GraficosComponent />
          )}
        </div>
      </motion.div>
    </div>
  )
} 