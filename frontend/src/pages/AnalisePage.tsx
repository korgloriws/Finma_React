import { useState } from 'react'
import { motion } from 'framer-motion'
import HelpTips from '../components/HelpTips'
import { useQuery } from '@tanstack/react-query'
import { List, BarChart, Loader2 } from 'lucide-react'
import { carteiraService } from '../services/api'
import { AnaliseProvider, useAnalise } from '../contexts/AnaliseContext'
import AnaliseListaTab from '../components/analise/AnaliseListaTab'
import AnaliseGraficosTab from '../components/analise/AnaliseGraficosTab'


function AnalisePageContent() {
  const [activeTab, setActiveTab] = useState<'lista' | 'graficos'>('lista')
  const { ativosAcoes, ativosBdrs, ativosFiis } = useAnalise()


  // Carregamento sob demanda - só carrega carteira quando necessário
  const { isLoading: loadingCarteira } = useQuery({
    queryKey: ['carteira'],
    queryFn: carteiraService.getCarteira,
    retry: 3,
    refetchOnWindowFocus: false,
    enabled: activeTab === 'graficos', // Só carrega na aba gráficos
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
      >
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Análise de Oportunidades</h1>
          <HelpTips
            title="Como usar a Análise"
            tips={[
              { title: 'Tabs', content: 'Use Lista ou Gráficos conforme a necessidade.' },
              { title: 'Tipos', content: 'Selecione Ações, BDRs ou FIIs para filtrar o universo.' },
              { title: 'Filtros', content: 'Ajuste ROE, DY, P/L, P/VP e liquidez para refinar os resultados.' },
              { title: 'Carteira', content: 'Itens marcados como "Na carteira" já existem na sua carteira.' },
            ]}
          />
        </div>
        {loadingCarteira && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
            <span className="hidden xs:inline">Carregando carteira...</span>
            <span className="xs:hidden">Carregando...</span>
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
          <div className="flex overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('lista')}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'lista'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <List className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Lista</span>
                <span className="xs:hidden">Lista</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('graficos')}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'graficos'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <BarChart className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Gráficos</span>
                <span className="xs:hidden">Gráficos</span>
              </div>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'lista' ? (
            <AnaliseListaTab />
          ) : (
            <AnaliseGraficosTab 
              ativosAcoes={ativosAcoes} 
              ativosBdrs={ativosBdrs} 
              ativosFiis={ativosFiis} 
            />
          )}
        </div>
      </motion.div>
    </div>
  )
}

// Componente principal com provider
export default function AnalisePage() {
  return (
    <AnaliseProvider>
      <AnalisePageContent />
    </AnaliseProvider>
  )
}