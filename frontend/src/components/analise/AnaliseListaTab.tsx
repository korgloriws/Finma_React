import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { analiseService, carteiraService } from '../../services/api'
import { AtivoAnalise, FiltrosAnalise } from '../../types'
import { useAnalise } from '../../contexts/AnaliseContext'
import TickerWithLogo from '../TickerWithLogo'
import { formatNumber, formatCurrency } from '../../utils/formatters'

// Componente para filtros de ações
function FiltrosAcoes({ 
  filtros, 
  onFiltroChange, 
  onBuscar, 
  loading, 
  autoSearch, 
  onAutoSearchChange 
}: {
  filtros: FiltrosAnalise
  onFiltroChange: (key: keyof FiltrosAnalise, value: number) => void
  onBuscar: () => void
  loading: boolean
  autoSearch: boolean
  onAutoSearchChange: (value: boolean) => void
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Filtros para Ações</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoSearch}
              onChange={(e) => onAutoSearchChange(e.target.checked)}
              className="rounded"
            />
            Busca automática
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">ROE Mínimo (%)</label>
          <input
            type="number"
            value={filtros.roe_min || ''}
            onChange={(e) => onFiltroChange('roe_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="15"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">DY Mínimo (%)</label>
          <input
            type="number"
            value={filtros.dy_min || ''}
            onChange={(e) => onFiltroChange('dy_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="12"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">P/L Mínimo</label>
          <input
            type="number"
            value={filtros.pl_min || ''}
            onChange={(e) => onFiltroChange('pl_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="1"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">P/L Máximo</label>
          <input
            type="number"
            value={filtros.pl_max || ''}
            onChange={(e) => onFiltroChange('pl_max', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="10"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">P/VP Máximo</label>
          <input
            type="number"
            value={filtros.pvp_max || ''}
            onChange={(e) => onFiltroChange('pvp_max', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="2"
          />
        </div>
      </div>
      
      <div className="mt-4">
        <button
          onClick={onBuscar}
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Buscando...
            </>
          ) : (
            'Buscar Ações'
          )}
        </button>
      </div>
    </div>
  )
}


function FiltrosBdrs({ 
  filtros, 
  onFiltroChange, 
  onBuscar, 
  loading, 
  autoSearch, 
  onAutoSearchChange 
}: {
  filtros: FiltrosAnalise
  onFiltroChange: (key: keyof FiltrosAnalise, value: number) => void
  onBuscar: () => void
  loading: boolean
  autoSearch: boolean
  onAutoSearchChange: (value: boolean) => void
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Filtros para BDRs</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoSearch}
              onChange={(e) => onAutoSearchChange(e.target.checked)}
              className="rounded"
            />
            Busca automática
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">ROE Mínimo (%)</label>
          <input
            type="number"
            value={filtros.roe_min || ''}
            onChange={(e) => onFiltroChange('roe_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="15"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">DY Mínimo (%)</label>
          <input
            type="number"
            value={filtros.dy_min || ''}
            onChange={(e) => onFiltroChange('dy_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="3"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">P/L Mínimo</label>
          <input
            type="number"
            value={filtros.pl_min || ''}
            onChange={(e) => onFiltroChange('pl_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="1"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">P/L Máximo</label>
          <input
            type="number"
            value={filtros.pl_max || ''}
            onChange={(e) => onFiltroChange('pl_max', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="15"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">P/VP Máximo</label>
          <input
            type="number"
            value={filtros.pvp_max || ''}
            onChange={(e) => onFiltroChange('pvp_max', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="2"
          />
        </div>
      </div>
      
      <div className="mt-4">
        <button
          onClick={onBuscar}
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Buscando...
            </>
          ) : (
            'Buscar BDRs'
          )}
        </button>
      </div>
    </div>
  )
}

// Componente para filtros de FIIs
function FiltrosFiis({ 
  filtros, 
  onFiltroChange, 
  onBuscar, 
  loading, 
  autoSearch, 
  onAutoSearchChange 
}: {
  filtros: FiltrosAnalise
  onFiltroChange: (key: keyof FiltrosAnalise, value: number) => void
  onBuscar: () => void
  loading: boolean
  autoSearch: boolean
  onAutoSearchChange: (value: boolean) => void
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Filtros para FIIs</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoSearch}
              onChange={(e) => onAutoSearchChange(e.target.checked)}
              className="rounded"
            />
            Busca automática
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">DY Mínimo (%)</label>
          <input
            type="number"
            value={filtros.dy_min || ''}
            onChange={(e) => onFiltroChange('dy_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="12"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">DY Máximo (%)</label>
          <input
            type="number"
            value={filtros.dy_max || ''}
            onChange={(e) => onFiltroChange('dy_max', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="15"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Liquidez Mínima (R$)</label>
          <input
            type="number"
            value={filtros.liq_min || ''}
            onChange={(e) => onFiltroChange('liq_min', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="1000000"
          />
        </div>
      </div>
      
      <div className="mt-4">
        <button
          onClick={onBuscar}
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Buscando...
            </>
          ) : (
            'Buscar FIIs'
          )}
        </button>
      </div>
    </div>
  )
}

// Componente para tabela de ativos
function TabelaAtivos({ 
  ativos, 
  loading, 
  error, 
  tipo,
  isAtivoNaCarteira
}: {
  ativos: AtivoAnalise[]
  loading: boolean
  error: string | null
  tipo: string
  isAtivoNaCarteira: (ticker: string) => boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando {tipo}...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (ativos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum {tipo} encontrado com os filtros aplicados.</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Ticker</th>
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="px-4 py-3 text-left font-medium">Tipo</th>
              <th className="px-4 py-3 text-left font-medium">Preço</th>
              <th className="px-4 py-3 text-left font-medium">DY</th>
              <th className="px-4 py-3 text-left font-medium">P/L</th>
              <th className="px-4 py-3 text-left font-medium">P/VP</th>
              <th className="px-4 py-3 text-left font-medium">ROE</th>
              <th className="px-4 py-3 text-left font-medium">Indústria</th>
              <th className="px-4 py-3 text-left font-medium">País</th>
              <th className="px-4 py-3 text-left font-medium">Liquidez</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {ativos.map((ativo) => (
              <tr key={ativo.ticker} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3">
                  <TickerWithLogo ticker={ativo.ticker} />
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{ativo.nome_completo}</p>
                    <p className="text-sm text-muted-foreground">{ativo.industria}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    ativo.tipo === 'Ação' ? 'bg-blue-100 text-blue-800' : 
                    ativo.tipo === 'FII' ? 'bg-green-100 text-green-800' : 
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {ativo.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">
                  R$ {ativo.preco_atual.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    ativo.dividend_yield >= 12 ? 'bg-green-100 text-green-800' : 
                    ativo.dividend_yield >= 6 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {ativo.dividend_yield.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    ativo.pl <= 10 ? 'bg-green-100 text-green-800' : 
                    ativo.pl <= 20 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {ativo.pl.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    ativo.pvp <= 1.5 ? 'bg-green-100 text-green-800' : 
                    ativo.pvp <= 3 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {ativo.pvp.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    ativo.roe >= 15 ? 'bg-green-100 text-green-800' : 
                    ativo.roe >= 10 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {ativo.roe.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {ativo.industria || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {ativo.pais || 'N/A'}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm">
                    <div className="font-medium">
                      {formatCurrency(ativo.liquidez_diaria || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Vol: {formatNumber(ativo.volume_medio || 0)}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {isAtivoNaCarteira(ativo.ticker) ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      Na Carteira
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                      Disponível
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Componente principal da aba Lista
export default function AnaliseListaTab() {
  const [activeSubTab, setActiveSubTab] = useState<'acoes' | 'bdrs' | 'fiis'>('acoes')
  
  // Usar o contexto para gerenciar os dados
  const { 
    ativosAcoes, 
    ativosBdrs, 
    ativosFiis, 
    setAtivosAcoes, 
    setAtivosBdrs, 
    setAtivosFiis 
  } = useAnalise()
  
  // Estados para filtros
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

  // Estados para loading
  const [loadingAcoes, setLoadingAcoes] = useState(false)
  const [loadingBdrs, setLoadingBdrs] = useState(false)
  const [loadingFiis, setLoadingFiis] = useState(false)

  // Estados para erros
  const [errorAcoes, setErrorAcoes] = useState<string | null>(null)
  const [errorBdrs, setErrorBdrs] = useState<string | null>(null)
  const [errorFiis, setErrorFiis] = useState<string | null>(null)

  // Estados para busca automática
  const [autoSearchAcoes, setAutoSearchAcoes] = useState(false)
  const [autoSearchBdrs, setAutoSearchBdrs] = useState(false)
  const [autoSearchFiis, setAutoSearchFiis] = useState(false)

  // Query para buscar carteira (para verificar se ativo está na carteira)
  const { data: carteira } = useQuery({
    queryKey: ['carteira'],
    queryFn: carteiraService.getCarteira,
    retry: 3,
    refetchOnWindowFocus: false
  })

  // Função para verificar se ativo está na carteira
  const tickersNaCarteira = new Set(carteira?.map(ativo => ativo.ticker.toUpperCase()) || [])
  const isAtivoNaCarteira = (ticker: string) => {
    return tickersNaCarteira.has(ticker.toUpperCase())
  }

  // Handlers para filtros
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

  // Handlers para busca
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

  return (
    <div>
      {/* Sub-tabs para tipos de ativos */}
      <div className="border-b border-border mb-4 sm:mb-6">
        <div className="flex overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveSubTab('acoes')}
            className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              activeSubTab === 'acoes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ações
          </button>
          <button
            onClick={() => setActiveSubTab('bdrs')}
            className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              activeSubTab === 'bdrs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            BDRs
          </button>
          <button
            onClick={() => setActiveSubTab('fiis')}
            className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              activeSubTab === 'fiis'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            FIIs
          </button>
        </div>
      </div>

      {/* Conteúdo das sub-tabs */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'acoes' && (
          <motion.div
            key="acoes"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <FiltrosAcoes 
              filtros={filtrosAcoes}
              onFiltroChange={handleFiltroAcoesChange}
              onBuscar={handleBuscarAcoes}
              loading={loadingAcoes}
              autoSearch={autoSearchAcoes}
              onAutoSearchChange={setAutoSearchAcoes}
            />
            <TabelaAtivos 
              ativos={ativosAcoes} 
              loading={loadingAcoes} 
              error={errorAcoes} 
              tipo="Ações"
              isAtivoNaCarteira={isAtivoNaCarteira}
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
            <FiltrosBdrs 
              filtros={filtrosBdrs}
              onFiltroChange={handleFiltroBdrsChange}
              onBuscar={handleBuscarBdrs}
              loading={loadingBdrs}
              autoSearch={autoSearchBdrs}
              onAutoSearchChange={setAutoSearchBdrs}
            />
            <TabelaAtivos 
              ativos={ativosBdrs} 
              loading={loadingBdrs} 
              error={errorBdrs} 
              tipo="BDRs"
              isAtivoNaCarteira={isAtivoNaCarteira}
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
            <FiltrosFiis 
              filtros={filtrosFiis}
              onFiltroChange={handleFiltroFiisChange}
              onBuscar={handleBuscarFiis}
              loading={loadingFiis}
              autoSearch={autoSearchFiis}
              onAutoSearchChange={setAutoSearchFiis}
            />
            <TabelaAtivos 
              ativos={ativosFiis} 
              loading={loadingFiis} 
              error={errorFiis} 
              tipo="FIIs"
              isAtivoNaCarteira={isAtivoNaCarteira}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
