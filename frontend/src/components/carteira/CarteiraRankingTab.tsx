import { 
  Trophy, 
  TrendingUp, 
  BarChart3, 
  PieChart 
} from 'lucide-react'
import { formatDividendYield } from '../../utils/formatters'
import TickerWithLogo from '../TickerWithLogo'

interface CarteiraRankingTabProps {
  carteira: any[]
}

export default function CarteiraRankingTab({
  carteira
}: CarteiraRankingTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">🏆 Rankings da Carteira</h2>
      
      {carteira && carteira.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top ROE */}
          <div className="bg-muted/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-blue-500" />
              Top ROE
            </h3>
            <div className="space-y-2">
              {carteira
                .filter(ativo => ativo?.roe && ativo.roe > 0)
                .sort((a, b) => (b?.roe || 0) - (a?.roe || 0))
                .slice(0, 7)
                .map((ativo) => (
                  <div key={ativo?.id} className="flex justify-between items-center p-2 bg-background rounded">
                    <div className="min-w-[120px]"><TickerWithLogo ticker={ativo?.ticker || ''} size="sm" /></div>
                    <span className="text-blue-600 font-bold">
                      {(ativo?.roe || 0).toFixed(2)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Dividend Yield */}
          <div className="bg-muted/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Top Dividend Yield
            </h3>
            <div className="space-y-2">
              {carteira
                .filter(ativo => ativo?.dy && ativo.dy > 0)
                .sort((a, b) => (b?.dy || 0) - (a?.dy || 0))
                .slice(0, 7)
                .map((ativo) => (
                  <div key={ativo?.id} className="flex justify-between items-center p-2 bg-background rounded">
                    <div className="min-w-[120px]"><TickerWithLogo ticker={ativo?.ticker || ''} size="sm" /></div>
                    <span className="text-green-600 font-bold">
                      {formatDividendYield(ativo?.dy)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Top P/L (Menor) */}
          <div className="bg-muted/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-yellow-500" />
              Top P/L (Menor)
            </h3>
            <div className="space-y-2">
              {carteira
                .filter(ativo => ativo?.pl && ativo.pl > 0)
                .sort((a, b) => (a?.pl || 0) - (b?.pl || 0))
                .slice(0, 7)
                .map((ativo) => (
                  <div key={ativo?.id} className="flex justify-between items-center p-2 bg-background rounded">
                    <div className="min-w-[120px]"><TickerWithLogo ticker={ativo?.ticker || ''} size="sm" /></div>
                    <span className="text-yellow-600 font-bold">
                      {(ativo?.pl || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Top P/VP (Menor) */}
          <div className="bg-muted/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-orange-500" />
              Top P/VP (Menor)
            </h3>
            <div className="space-y-2">
              {carteira
                .filter(ativo => ativo?.pvp && ativo.pvp > 0)
                .sort((a, b) => (a?.pvp || 0) - (b?.pvp || 0))
                .slice(0, 7)
                .map((ativo) => (
                  <div key={ativo?.id} className="flex justify-between items-center p-2 bg-background rounded">
                    <div className="min-w-[120px]"><TickerWithLogo ticker={ativo?.ticker || ''} size="sm" /></div>
                    <span className="text-orange-600 font-bold">
                      {(ativo?.pvp || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          Adicione ativos à sua carteira para ver os rankings.
        </div>
      )}
    </div>
  )
}
