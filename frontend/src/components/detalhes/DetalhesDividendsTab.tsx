import { motion } from 'framer-motion'
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Award
} from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'

// Componente para seção de informações
function InfoSection({ 
  title, 
  icon: Icon, 
  color, 
  children 
}: {
  title: string
  icon: any
  color: string
  children: React.ReactNode
}) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${colorClasses[color as keyof typeof colorClasses]}`} />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}

interface DetalhesDividendsTabProps {
  periodoDividendos: string
  handlePeriodoDividendosChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  dividendData: Array<{ Date: string; Dividend: number }>
}

export default function DetalhesDividendsTab({
  periodoDividendos,
  handlePeriodoDividendosChange,
  dividendData
}: DetalhesDividendsTabProps) {
  return (
    <motion.div
      key="dividends"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Controles dos proventos */}
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <label className="font-medium flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-500" />
          Período dos Proventos:
        </label>
        <select
          value={periodoDividendos}
          onChange={handlePeriodoDividendosChange}
          className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
          aria-label="Selecionar período dos proventos"
        >
          <option value="1mo">1 mês</option>
          <option value="3mo">3 meses</option>
          <option value="6mo">6 meses</option>
          <option value="1y">1 ano</option>
          <option value="2y">2 anos</option>
          <option value="5y">5 anos</option>
          <option value="max">Máximo</option>
        </select>
      </div>

      {/* Tabela de Proventos */}
      <InfoSection title="Histórico de Proventos" icon={DollarSign} color="green">
        {dividendData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Valor do Dividendo</th>
                </tr>
              </thead>
              <tbody>
                {dividendData.map((item, index) => (
                  <motion.tr 
                    key={item.Date} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-muted/40 transition-colors`}
                  >
                    <td className="px-4 py-3 font-medium">
                      {new Date(item.Date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-600">
                      {formatCurrency(item.Dividend)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum provento encontrado para este período.</p>
          </div>
        )}
      </InfoSection>

      {/* Resumo dos Proventos */}
      {dividendData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoSection title="Total de Proventos" icon={DollarSign} color="green">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(dividendData.reduce((sum, item) => sum + item.Dividend, 0))}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Soma de todos os proventos
              </p>
            </div>
          </InfoSection>

          <InfoSection title="Média por Provento" icon={TrendingUp} color="blue">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(dividendData.reduce((sum, item) => sum + item.Dividend, 0) / dividendData.length)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Média do período
              </p>
            </div>
          </InfoSection>

          <InfoSection title="Maior Provento" icon={Award} color="purple">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(Math.max(...dividendData.map(item => item.Dividend)))}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Maior valor do período
              </p>
            </div>
          </InfoSection>
        </div>
      )}
    </motion.div>
  )
}
