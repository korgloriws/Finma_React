import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  AlertTriangle,
  BarChart3,
  Target
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '../../utils/formatters'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CarteiraProjecaoTabProps {
  carteira: any[]
  historicoCarteira?: any
  proventosRecebidos?: any[]
}

interface ProjecaoData {
  mes: number
  valor: number
  valorComDividendos: number
  dividendosAcumulados: number
}

export default function CarteiraProjecaoTab({
  carteira,
  historicoCarteira,
  proventosRecebidos
}: CarteiraProjecaoTabProps) {
  const [anosProjecao, setAnosProjecao] = useState(5)
  const [considerarDividendos, setConsiderarDividendos] = useState(true)
  const [valorInicial, setValorInicial] = useState('')

  // Calcular valor atual da carteira
  const valorAtualCarteira = useMemo(() => {
    return carteira?.reduce((total, ativo) => total + (ativo.valor_total || 0), 0) || 0
  }, [carteira])

  // Calcular crescimento médio anual baseado no histórico
  const crescimentoMedioAnual = useMemo(() => {
    if (!historicoCarteira?.datas || historicoCarteira.datas.length < 2) {
      return 0.12 // 12% como padrão se não houver histórico
    }

    const datas = historicoCarteira.datas
    const valores = historicoCarteira.valores
    
    if (datas.length < 2) return 0.12

    // Pegar o primeiro e último valor do último ano
    const umAnoAtras = new Date()
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1)
    
    let valorInicialAno = null
    let valorFinalAno = null
    
    // Encontrar valores do último ano
    for (let i = datas.length - 1; i >= 0; i--) {
      const data = new Date(datas[i])
      if (data <= umAnoAtras && valorInicialAno === null) {
        valorInicialAno = valores[i]
      }
      if (i === datas.length - 1) {
        valorFinalAno = valores[i]
      }
    }

    if (valorInicialAno && valorFinalAno && valorInicialAno > 0) {
      const crescimento = (valorFinalAno - valorInicialAno) / valorInicialAno
      return Math.max(0, crescimento) // Não permitir crescimento negativo
    }

    return 0.12 // 12% como padrão
  }, [historicoCarteira])

  // Calcular dividendos médios mensais - APENAS dados históricos reais
  const dividendosMediosMensais = useMemo(() => {
    // Usar APENAS dados históricos de proventos reais (mesma fonte da aba de proventos)
    if (proventosRecebidos && proventosRecebidos.length > 0) {
      const agora = new Date()
      const umAnoAtras = new Date()
      umAnoAtras.setFullYear(agora.getFullYear() - 1)

      // Extrair todos os proventos individuais de todos os ativos
      const todosProventos = proventosRecebidos.flatMap(ativo => ativo.proventos_recebidos || [])
      
      const dividendosUltimoAno = todosProventos
        .filter(provento => {
          const dataProvento = new Date(provento.data)
          return dataProvento >= umAnoAtras && dataProvento <= agora
        })
        .reduce((total, provento) => total + (provento.valor_recebido || 0), 0)

      if (dividendosUltimoAno > 0) {
        return dividendosUltimoAno / 12 // Média mensal baseada em dados históricos
      }
    }

    // Se não há dados históricos, retornar 0 (não estimar)
    return 0
  }, [proventosRecebidos])


  // Calcular projeção
  const projecao = useMemo(() => {
    const valorInicialNum = parseFloat(valorInicial) || valorAtualCarteira
    const taxaMensal = crescimentoMedioAnual / 12
    const dividendosMensais = dividendosMediosMensais
    const meses = anosProjecao * 12

    const dados: ProjecaoData[] = []
    let valorAtual = valorInicialNum
    let valorComDividendosAtual = valorInicialNum
    let dividendosAcumulados = 0

    for (let mes = 0; mes <= meses; mes++) {
      dados.push({
        mes,
        valor: valorAtual,
        valorComDividendos: valorComDividendosAtual,
        dividendosAcumulados
      })

      if (mes < meses) {
        // Crescimento mensal
        const crescimento = valorAtual * taxaMensal
        valorAtual += crescimento

        if (considerarDividendos) {
          // Adicionar dividendos mensais
          const dividendosMes = dividendosMensais
          dividendosAcumulados += dividendosMes
          valorComDividendosAtual += crescimento + dividendosMes
        } else {
          valorComDividendosAtual = valorAtual
        }
      }
    }

    return dados
  }, [valorInicial, valorAtualCarteira, crescimentoMedioAnual, dividendosMediosMensais, anosProjecao, considerarDividendos])

  const valorFinal = projecao[projecao.length - 1]?.valor || 0
  const valorFinalComDividendos = projecao[projecao.length - 1]?.valorComDividendos || 0
  const totalDividendos = projecao[projecao.length - 1]?.dividendosAcumulados || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Calculadora de Projeção</h2>
      </div>

      {/* Avisos importantes */}
      <div className="space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">⚠️ Aviso Importante</p>
              <p>
                Esta projeção é baseada em dados históricos e médias calculadas. 
                <strong> O passado não é garantia de resultados futuros.</strong> 
                Use apenas como referência para planejamento financeiro.
              </p>
            </div>
          </div>
        </motion.div>

         {/* Aviso sobre dividendos */}
         {(!proventosRecebidos || proventosRecebidos.length === 0) && (
           <motion.div 
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-blue-50 border border-blue-200 rounded-lg p-4"
           >
             <div className="flex items-start gap-3">
               <DollarSign className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
               <div className="text-sm text-blue-800">
                 <p className="font-medium mb-1">💡 Sobre os Dividendos</p>
                 <p>
                   Como não há histórico de proventos recebidos, a projeção será baseada apenas no 
                   <strong> crescimento de capital</strong> (sem dividendos). 
                   Para incluir dividendos na projeção, é necessário ter dados históricos de proventos recebidos.
                 </p>
               </div>
             </div>
           </motion.div>
         )}
      </div>

      {/* Configurações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Configurações da Projeção
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Valor Inicial (R$)
              </label>
              <input
                type="number"
                value={valorInicial}
                onChange={(e) => setValorInicial(e.target.value)}
                placeholder={formatCurrency(valorAtualCarteira, '')}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para usar o valor atual da carteira: {formatCurrency(valorAtualCarteira)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Período de Projeção (anos)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={anosProjecao}
                onChange={(e) => setAnosProjecao(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                title="Período de projeção em anos"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="considerarDividendos"
                checked={considerarDividendos}
                onChange={(e) => setConsiderarDividendos(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="considerarDividendos" className="text-sm font-medium">
                Considerar reinvestimento de dividendos
              </label>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Dados Base
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Crescimento médio anual:</span>
              <span className="font-medium text-green-600">
                {formatPercentage(crescimentoMedioAnual)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dividendos médios mensais:</span>
              <span className="font-medium text-blue-600">
                {formatCurrency(dividendosMediosMensais)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor atual da carteira:</span>
              <span className="font-medium">
                {formatCurrency(valorAtualCarteira)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Período de análise:</span>
              <span className="font-medium">Últimos 12 meses</span>
            </div>
             <div className="flex justify-between">
               <span className="text-muted-foreground">Fonte dos dividendos:</span>
               <span className="font-medium text-xs">
                 {proventosRecebidos && proventosRecebidos.length > 0 ? 'Dados históricos' : 'Sem dados históricos'}
               </span>
             </div>
          </div>
        </motion.div>
      </div>

      {/* Resultados */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          Resultados da Projeção
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Valor Final</span>
            </div>
            <p className="text-xl font-bold text-blue-900">
              {formatCurrency(valorFinal)}
            </p>
            <p className="text-xs text-blue-700">
              Sem dividendos
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Com Dividendos</span>
            </div>
            <p className="text-xl font-bold text-green-900">
              {formatCurrency(valorFinalComDividendos)}
            </p>
            <p className="text-xs text-green-700">
              {considerarDividendos ? 'Reinvestidos' : 'Não considerados'}
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Dividendos Totais</span>
            </div>
            <p className="text-xl font-bold text-purple-900">
              {formatCurrency(totalDividendos)}
            </p>
            <p className="text-xs text-purple-700">
              Em {anosProjecao} anos
            </p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projecao}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="mes" 
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => `${Math.floor(value / 12)}a`}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => formatCurrency(value, '')}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: any, name: string) => [
                  formatCurrency(value), 
                  name === 'valor' ? 'Sem Dividendos' : 'Com Dividendos'
                ]}
                labelFormatter={(value) => `Mês ${value} (${Math.floor(Number(value) / 12)} anos)`}
              />
              <Line 
                type="monotone" 
                dataKey="valor" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
              />
              {considerarDividendos && (
                <Line 
                  type="monotone" 
                  dataKey="valorComDividendos" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Tabela de detalhes */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Projeção Detalhada (Anos)</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-2 text-left">Ano</th>
                <th className="px-4 py-2 text-left">Valor Sem Dividendos</th>
                <th className="px-4 py-2 text-left">Valor Com Dividendos</th>
                <th className="px-4 py-2 text-left">Dividendos Acumulados</th>
                <th className="px-4 py-2 text-left">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: anosProjecao }, (_, i) => {
                const mesIndex = (i + 1) * 12
                const dadosAno = projecao[mesIndex]
                if (!dadosAno) return null
                
                const diferenca = dadosAno.valorComDividendos - dadosAno.valor
                
                return (
                  <tr key={i} className="hover:bg-muted/40">
                    <td className="px-4 py-2 font-medium">{i + 1}</td>
                    <td className="px-4 py-2">{formatCurrency(dadosAno.valor)}</td>
                    <td className="px-4 py-2">{formatCurrency(dadosAno.valorComDividendos)}</td>
                    <td className="px-4 py-2">{formatCurrency(dadosAno.dividendosAcumulados)}</td>
                    <td className="px-4 py-2 text-green-600 font-medium">
                      +{formatCurrency(diferenca)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
