import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  BarChart3,
  DollarSign,
  Zap,
  RefreshCw,
  Calculator,
  BarChart,
  PieChart
} from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { AtivoCarteira } from '../../types'
import { simuladorService } from '../../services/api'

interface CarteiraSimuladorTabProps {
  carteira: AtivoCarteira[]
}

interface ChoquesIndexadores {
  cdi: number
  ipca: number
  selic: number
}

interface CenarioPredefinido {
  nome: string
  descricao: string
  choques: ChoquesIndexadores
  cor: string
}

interface MonteCarloConfig {
  nSimulacoes: number
  periodoAnos: number
  confianca: number
}


const CENARIOS_PREDEFINIDOS: CenarioPredefinido[] = [
  {
    nome: 'Otimista',
    descricao: 'Economia em crescimento',
    choques: { cdi: 2, ipca: -1, selic: 2 },
    cor: 'text-green-600'
  },
  {
    nome: 'Pessimista',
    descricao: 'Crise econômica',
    choques: { cdi: -3, ipca: 3, selic: -3 },
    cor: 'text-red-600'
  },
  {
    nome: 'Crise',
    descricao: 'Crise severa',
    choques: { cdi: -5, ipca: 5, selic: -5 },
    cor: 'text-red-800'
  },
  {
    nome: 'Inflação Alta',
    descricao: 'Inflação descontrolada',
    choques: { cdi: 1, ipca: 4, selic: 1 },
    cor: 'text-orange-600'
  }
]

export default function CarteiraSimuladorTab({ carteira }: CarteiraSimuladorTabProps) {
  const [secaoAtiva, setSecaoAtiva] = useState<'choques' | 'monte-carlo'>('choques')
  
  const [choques, setChoques] = useState<ChoquesIndexadores>({
    cdi: 0,
    ipca: 0,
    selic: 0
  })

  const [cenarioAtivo, setCenarioAtivo] = useState<string | null>(null)

  // Estados para Monte Carlo
  const [monteCarloConfig, setMonteCarloConfig] = useState<MonteCarloConfig>({
    nSimulacoes: 10000,
    periodoAnos: 5,
    confianca: 95
  })

  // Query para simular choques
  const { data: simulacao } = useQuery({
    queryKey: ['simulacao-choques', choques.cdi, choques.ipca, choques.selic],
    queryFn: () => simuladorService.simularChoques(choques),
    enabled: carteira.length > 0,
    staleTime: 30000, // 30 segundos
    retry: 1
  })

  // Query para cenários pré-definidos
  const { data: cenariosData } = useQuery({
    queryKey: ['cenarios-predefinidos'],
    queryFn: simuladorService.obterCenarios,
    staleTime: 300000, // 5 minutos
    retry: 1
  })

  // Query para Monte Carlo
  const { data: monteCarloResultado, isLoading: loadingMonteCarlo } = useQuery({
    queryKey: ['monte-carlo', monteCarloConfig.nSimulacoes, monteCarloConfig.periodoAnos],
    queryFn: () => simuladorService.executarMonteCarlo(monteCarloConfig),
    enabled: carteira.length > 0 && secaoAtiva === 'monte-carlo',
    staleTime: 300000, // 5 minutos
    retry: 1
  })

  const cenariosPredefinidos = cenariosData?.cenarios || CENARIOS_PREDEFINIDOS

  // Usar dados da simulação ou calcular localmente
  const carteiraSimulada = simulacao?.carteira_simulada || []
  const totais = simulacao?.totais || {
    valor_atual: 0,
    valor_simulado: 0,
    variacao: 0,
    variacao_percentual: 0
  }

  const aplicarCenario = (cenario: CenarioPredefinido) => {
    setChoques(cenario.choques)
    setCenarioAtivo(cenario.nome)
  }

  const resetarChoques = () => {
    setChoques({ cdi: 0, ipca: 0, selic: 0 })
    setCenarioAtivo(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Simulador de Cenários
        </h2>
        <p className="text-muted-foreground">
          Simule diferentes cenários de investimento e veja o impacto na sua carteira
        </p>
      </div>

      {/* Navegação entre seções */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setSecaoAtiva('choques')}
          className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${
            secaoAtiva === 'choques'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          Choques em Indexadores
        </button>
        <button
          onClick={() => setSecaoAtiva('monte-carlo')}
          className={`px-6 py-3 rounded-lg flex items-center gap-2 transition-all ${
            secaoAtiva === 'monte-carlo'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <BarChart className="w-5 h-5" />
          Monte Carlo
        </button>
      </div>

      {/* Seção de Choques em Indexadores */}
      {secaoAtiva === 'choques' && (
        <>
          {/* Cenários Pré-definidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cenariosPredefinidos.map((cenario: CenarioPredefinido) => (
          <motion.button
            key={cenario.nome}
            onClick={() => aplicarCenario(cenario)}
            className={`p-4 rounded-lg border-2 transition-all ${
              cenarioAtivo === cenario.nome
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-center">
              <h3 className={`font-semibold ${cenario.cor}`}>{cenario.nome}</h3>
              <p className="text-sm text-muted-foreground mb-2">{cenario.descricao}</p>
              <div className="text-xs space-y-1">
                <div>CDI: {cenario.choques.cdi > 0 ? '+' : ''}{cenario.choques.cdi}%</div>
                <div>IPCA: {cenario.choques.ipca > 0 ? '+' : ''}{cenario.choques.ipca}%</div>
                <div>SELIC: {cenario.choques.selic > 0 ? '+' : ''}{cenario.choques.selic}%</div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Controles Manuais */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Controles Manuais
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CDI */}
          <div>
            <label className="block text-sm font-medium mb-2">CDI (%)</label>
            <div className="space-y-2">
              <input
                type="range"
                min="-10"
                max="10"
                step="0.5"
                value={choques.cdi}
                onChange={(e) => setChoques(prev => ({ ...prev, cdi: Number(e.target.value) }))}
                className="w-full"
                aria-label="Ajustar choque no CDI"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-10%</span>
                <span className="font-medium">{choques.cdi}%</span>
                <span>+10%</span>
              </div>
            </div>
          </div>

          {/* IPCA */}
          <div>
            <label className="block text-sm font-medium mb-2">IPCA (%)</label>
            <div className="space-y-2">
              <input
                type="range"
                min="-10"
                max="10"
                step="0.5"
                value={choques.ipca}
                onChange={(e) => setChoques(prev => ({ ...prev, ipca: Number(e.target.value) }))}
                className="w-full"
                aria-label="Ajustar choque no IPCA"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-10%</span>
                <span className="font-medium">{choques.ipca}%</span>
                <span>+10%</span>
              </div>
            </div>
          </div>

          {/* SELIC */}
          <div>
            <label className="block text-sm font-medium mb-2">SELIC (%)</label>
            <div className="space-y-2">
              <input
                type="range"
                min="-10"
                max="10"
                step="0.5"
                value={choques.selic}
                onChange={(e) => setChoques(prev => ({ ...prev, selic: Number(e.target.value) }))}
                className="w-full"
                aria-label="Ajustar choque na SELIC"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-10%</span>
                <span className="font-medium">{choques.selic}%</span>
                <span>+10%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <button
            onClick={resetarChoques}
            className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Resetar
          </button>
        </div>
      </div>

      {/* Resumo do Impacto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          className="bg-card border border-border rounded-lg p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Valor Atual</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(totais.valor_atual)}</div>
        </motion.div>

        <motion.div
          className="bg-card border border-border rounded-lg p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <span className="font-medium">Valor Simulado</span>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(totais.valor_simulado)}</div>
        </motion.div>

        <motion.div
          className={`bg-card border border-border rounded-lg p-4 ${
            totais.variacao >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-2">
            {totais.variacao >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium">Variação</span>
          </div>
          <div className={`text-2xl font-bold ${
            totais.variacao >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {totais.variacao >= 0 ? '+' : ''}{formatCurrency(totais.variacao)}
          </div>
          <div className={`text-sm ${
            totais.variacao >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {totais.variacao_percentual >= 0 ? '+' : ''}{totais.variacao_percentual.toFixed(2)}%
          </div>
        </motion.div>
      </div>

      {/* Tabela de Ativos Afetados */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Ativos Mais Afetados
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2">Ativo</th>
                <th className="text-right py-2">Valor Atual</th>
                <th className="text-right py-2">Valor Simulado</th>
                <th className="text-right py-2">Variação</th>
                <th className="text-right py-2">%</th>
              </tr>
            </thead>
            <tbody>
              {carteiraSimulada
                .filter((ativo: any) => ativo.variacao !== 0)
                .sort((a: any, b: any) => Math.abs(b.variacao) - Math.abs(a.variacao))
                .slice(0, 10)
                .map((ativo: any, index: number) => (
                  <motion.tr
                    key={ativo.id}
                    className="border-b border-border/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <td className="py-2">
                      <div>
                        <div className="font-medium">{ativo.ticker}</div>
                        <div className="text-sm text-muted-foreground">{ativo.nome_completo}</div>
                        {ativo.indexador && (
                          <div className="text-xs text-primary">{ativo.indexador}</div>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-2">{formatCurrency(ativo.valor_total)}</td>
                    <td className="text-right py-2">{formatCurrency(ativo.valor_total_simulado)}</td>
                    <td className={`text-right py-2 ${
                      ativo.variacao >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {ativo.variacao >= 0 ? '+' : ''}{formatCurrency(ativo.variacao)}
                    </td>
                    <td className={`text-right py-2 ${
                      ativo.variacao >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {ativo.variacao_percentual >= 0 ? '+' : ''}{ativo.variacao_percentual.toFixed(2)}%
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
         </div>
       </div>
        </>
      )}

      {/* Seção Monte Carlo */}
      {secaoAtiva === 'monte-carlo' && (
        <div className="space-y-6">
          {/* Configuração Monte Carlo */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Configuração Monte Carlo
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Número de Simulações */}
              <div>
                <label className="block text-sm font-medium mb-2">Número de Simulações</label>
                <select
                  value={monteCarloConfig.nSimulacoes}
                  onChange={(e) => setMonteCarloConfig(prev => ({ ...prev, nSimulacoes: Number(e.target.value) }))}
                  className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  aria-label="Selecionar número de simulações"
                >
                  <option value={1000}>1.000 simulações</option>
                  <option value={5000}>5.000 simulações</option>
                  <option value={10000}>10.000 simulações</option>
                  <option value={50000}>50.000 simulações</option>
                </select>
              </div>

              {/* Período */}
              <div>
                <label className="block text-sm font-medium mb-2">Período (anos)</label>
                <select
                  value={monteCarloConfig.periodoAnos}
                  onChange={(e) => setMonteCarloConfig(prev => ({ ...prev, periodoAnos: Number(e.target.value) }))}
                  className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  aria-label="Selecionar período em anos"
                >
                  <option value={1}>1 ano</option>
                  <option value={3}>3 anos</option>
                  <option value={5}>5 anos</option>
                  <option value={10}>10 anos</option>
                  <option value={20}>20 anos</option>
                </select>
              </div>

              {/* Nível de Confiança */}
              <div>
                <label className="block text-sm font-medium mb-2">Nível de Confiança</label>
                <select
                  value={monteCarloConfig.confianca}
                  onChange={(e) => setMonteCarloConfig(prev => ({ ...prev, confianca: Number(e.target.value) }))}
                  className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  aria-label="Selecionar nível de confiança"
                >
                  <option value={90}>90%</option>
                  <option value={95}>95%</option>
                  <option value={99}>99%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Resultados Monte Carlo */}
          {loadingMonteCarlo ? (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Executando simulação Monte Carlo...</span>
              </div>
            </div>
          ) : monteCarloResultado && monteCarloResultado.percentis ? (
            <>
              {/* Métricas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                  className="bg-card border border-border rounded-lg p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Valor Esperado</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(monteCarloResultado?.valorEsperado || 0)}
                  </div>
                </motion.div>

                <motion.div
                  className="bg-card border border-border rounded-lg p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Volatilidade</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {((monteCarloResultado?.volatilidade || 0) * 100).toFixed(1)}%
                  </div>
                </motion.div>

                <motion.div
                  className="bg-card border border-border rounded-lg p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">Sharpe Ratio</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {(monteCarloResultado?.sharpe || 0).toFixed(2)}
                  </div>
                </motion.div>

                <motion.div
                  className={`bg-card border border-border rounded-lg p-4 ${
                    (monteCarloResultado?.probabilidadePerda || 0) > 20 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="font-medium">Prob. de Perda</span>
                  </div>
                  <div className={`text-2xl font-bold ${
                    (monteCarloResultado?.probabilidadePerda || 0) > 20 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {(monteCarloResultado?.probabilidadePerda || 0).toFixed(1)}%
                  </div>
                </motion.div>
              </div>

              {/* Percentis de Distribuição */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Distribuição de Resultados
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Pior Cenário (P5)</div>
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(monteCarloResultado?.percentis?.p5 || 0)}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Pessimista (P25)</div>
                    <div className="text-lg font-bold text-orange-600">
                      {formatCurrency(monteCarloResultado?.percentis?.p25 || 0)}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 border border-primary rounded-lg bg-primary/5">
                    <div className="text-sm text-muted-foreground mb-1">Mediana (P50)</div>
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(monteCarloResultado?.percentis?.p50 || 0)}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Otimista (P75)</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(monteCarloResultado?.percentis?.p75 || 0)}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Melhor Cenário (P95)</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(monteCarloResultado?.percentis?.p95 || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráfico de Distribuição */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart className="w-5 h-5" />
                  Distribuição de Cenários
                </h3>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Gráfico de distribuição será implementado</p>
                    <p className="text-sm">Mostrará histograma dos {monteCarloConfig.nSimulacoes.toLocaleString()} cenários</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-center text-muted-foreground">
                <BarChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Configure os parâmetros acima e execute a simulação Monte Carlo</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
