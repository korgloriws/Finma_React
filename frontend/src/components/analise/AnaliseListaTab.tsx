import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { analiseService, carteiraService } from '../../services/api'
import { AtivoAnalise, FiltrosAnalise } from '../../types'
import { useAnalise } from '../../contexts/AnaliseContext'
import TickerWithLogo from '../TickerWithLogo'
import { formatNumber, formatCurrency } from '../../utils/formatters'


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
    <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-foreground">Filtros para Ações</h3>
          <p className="text-muted-foreground text-sm">Configure os critérios de análise</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={autoSearch}
              onChange={(e) => onAutoSearchChange(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring focus:ring-offset-0"
              aria-label="Ativar busca automática"
            />
            Busca automática
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">ROE Mínimo (%)</label>
          <input
            type="number"
            value={filtros.roe_min || ''}
            onChange={(e) => onFiltroChange('roe_min', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="15"
            aria-label="ROE mínimo em percentual"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">DY Mínimo (%)</label>
          <input
            type="number"
            value={filtros.dy_min || ''}
            onChange={(e) => onFiltroChange('dy_min', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="12"
            aria-label="Dividend yield mínimo em percentual"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">P/L Mínimo</label>
          <input
            type="number"
            value={filtros.pl_min || ''}
            onChange={(e) => onFiltroChange('pl_min', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="1"
            aria-label="Preço sobre lucro mínimo"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">P/L Máximo</label>
          <input
            type="number"
            value={filtros.pl_max || ''}
            onChange={(e) => onFiltroChange('pl_max', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="10"
            aria-label="Preço sobre lucro máximo"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">P/VP Máximo</label>
          <input
            type="number"
            value={filtros.pvp_max || ''}
            onChange={(e) => onFiltroChange('pvp_max', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="2"
            aria-label="Preço sobre valor patrimonial máximo"
          />
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <button
          onClick={onBuscar}
          disabled={loading}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar Ações
            </>
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
    <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-foreground">Filtros para BDRs</h3>
          <p className="text-muted-foreground text-sm">Configure os critérios de análise</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={autoSearch}
              onChange={(e) => onAutoSearchChange(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring focus:ring-offset-0"
              aria-label="Ativar busca automática"
            />
            Busca automática
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">ROE Mínimo (%)</label>
          <input
            type="number"
            value={filtros.roe_min || ''}
            onChange={(e) => onFiltroChange('roe_min', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="15"
            aria-label="ROE mínimo em percentual"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">DY Mínimo (%)</label>
          <input
            type="number"
            value={filtros.dy_min || ''}
            onChange={(e) => onFiltroChange('dy_min', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="3"
            aria-label="Dividend yield mínimo em percentual"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">P/L Mínimo</label>
          <input
            type="number"
            value={filtros.pl_min || ''}
            onChange={(e) => onFiltroChange('pl_min', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="1"
            aria-label="Preço sobre lucro mínimo"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">P/L Máximo</label>
          <input
            type="number"
            value={filtros.pl_max || ''}
            onChange={(e) => onFiltroChange('pl_max', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="15"
            aria-label="Preço sobre lucro máximo"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">P/VP Máximo</label>
          <input
            type="number"
            value={filtros.pvp_max || ''}
            onChange={(e) => onFiltroChange('pvp_max', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="2"
            aria-label="Preço sobre valor patrimonial máximo"
          />
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <button
          onClick={onBuscar}
          disabled={loading}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar BDRs
            </>
          )}
        </button>
      </div>
    </div>
  )
}


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
    <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-foreground">Filtros para FIIs</h3>
          <p className="text-muted-foreground text-sm">Configure os critérios de análise</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={autoSearch}
              onChange={(e) => onAutoSearchChange(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring focus:ring-offset-0"
              aria-label="Ativar busca automática"
            />
            Busca automática
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">DY Mínimo (%)</label>
          <input
            type="number"
            value={filtros.dy_min || ''}
            onChange={(e) => onFiltroChange('dy_min', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="12"
            aria-label="Dividend yield mínimo em percentual"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">DY Máximo (%)</label>
          <input
            type="number"
            value={filtros.dy_max || ''}
            onChange={(e) => onFiltroChange('dy_max', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="15"
            aria-label="Dividend yield máximo em percentual"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">Liquidez Mínima (R$)</label>
          <input
            type="number"
            value={filtros.liq_min || ''}
            onChange={(e) => onFiltroChange('liq_min', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            placeholder="1000000"
            aria-label="Liquidez mínima em reais"
          />
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <button
          onClick={onBuscar}
          disabled={loading}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar FIIs
            </>
          )}
        </button>
      </div>
    </div>
  )
}


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
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">Carregando {tipo}...</p>
            <p className="text-sm text-muted-foreground">Analisando dados do mercado</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-red-800 dark:text-red-300">Erro ao carregar {tipo}</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (ativos.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">Nenhum {tipo} encontrado</p>
          <p className="text-muted-foreground">Tente ajustar os filtros de busca</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Ticker</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Nome</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Tipo</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Preço</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">DY</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">P/L</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">P/VP</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">ROE</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Indústria</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">País</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Liquidez</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ativos.map((ativo) => (
              <tr key={ativo.ticker} className="hover:bg-muted/30 transition-colors duration-200">
                <td className="px-6 py-4">
                  <TickerWithLogo ticker={ativo.ticker} />
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground text-sm">{ativo.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">{ativo.industria}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    ativo.tipo === 'Ação' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' : 
                    ativo.tipo === 'FII' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 
                    'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                  }`}>
                    {ativo.tipo}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-bold text-foreground text-sm">
                    {formatCurrency(Number.isFinite(Number(ativo.preco_atual)) ? Number(ativo.preco_atual) : 0)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    ativo.dividend_yield >= 12 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 
                    ativo.dividend_yield >= 6 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' : 
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}>
                    {Number.isFinite(Number(ativo.dividend_yield)) ? Number(ativo.dividend_yield).toFixed(2) : '0.00'}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    ativo.pl <= 10 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 
                    ativo.pl <= 20 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' : 
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}>
                    {Number.isFinite(Number(ativo.pl)) ? Number(ativo.pl).toFixed(2) : '-'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    ativo.pvp <= 1.5 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 
                    ativo.pvp <= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' : 
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}>
                    {Number.isFinite(Number(ativo.pvp)) ? Number(ativo.pvp).toFixed(2) : '-'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    ativo.roe >= 15 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 
                    ativo.roe >= 10 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' : 
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}>
                    {Number.isFinite(Number(ativo.roe)) ? Number(ativo.roe).toFixed(2) : '0.00'}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-muted-foreground">
                    {ativo.industria || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-muted-foreground">
                    {ativo.pais || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-foreground">
                      {formatCurrency(ativo.liquidez_diaria || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Vol: {formatNumber(ativo.volume_medio || 0)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {isAtivoNaCarteira(ativo.ticker) ? (
                    <span className="px-3 py-1.5 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 rounded-full text-xs font-semibold">
                      Na Carteira
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 rounded-full text-xs font-semibold">
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


export default function AnaliseListaTab() {
  const [activeSubTab, setActiveSubTab] = useState<'acoes' | 'bdrs' | 'fiis'>('acoes')
  

  const { 
    ativosAcoes, 
    ativosBdrs, 
    ativosFiis, 
    setAtivosAcoes, 
    setAtivosBdrs, 
    setAtivosFiis 
  } = useAnalise()
  

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

 
  const [loadingAcoes, setLoadingAcoes] = useState(false)
  const [loadingBdrs, setLoadingBdrs] = useState(false)
  const [loadingFiis, setLoadingFiis] = useState(false)

 
  const [errorAcoes, setErrorAcoes] = useState<string | null>(null)
  const [errorBdrs, setErrorBdrs] = useState<string | null>(null)
  const [errorFiis, setErrorFiis] = useState<string | null>(null)


  const [autoSearchAcoes, setAutoSearchAcoes] = useState(false)
  const [autoSearchBdrs, setAutoSearchBdrs] = useState(false)
  const [autoSearchFiis, setAutoSearchFiis] = useState(false)


  const { data: carteira } = useQuery({
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

  return (
    <div>
      {/* Sub-tabs para tipos de ativos */}
      <div className="bg-card border border-border rounded-2xl p-2 mb-6 shadow-sm">
        <div className="flex overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveSubTab('acoes')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 rounded-xl ${
              activeSubTab === 'acoes'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Ações
            </div>
          </button>
          <button
            onClick={() => setActiveSubTab('bdrs')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 rounded-xl ${
              activeSubTab === 'bdrs'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              BDRs
            </div>
          </button>
          <button
            onClick={() => setActiveSubTab('fiis')}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 rounded-xl ${
              activeSubTab === 'fiis'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              FIIs
            </div>
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
