import { 
  BarChart3, 
  Target, 
  TrendingUp, 
  Activity, 
  Brain 
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '../../utils/formatters'

interface CarteiraInsightsTabProps {
  carteira: any[]
  loadingInsights: boolean
  insights: any
}

export default function CarteiraInsightsTab({
  carteira,
  loadingInsights,
  insights
}: CarteiraInsightsTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">🤖 Insights </h2>
      
      {carteira && carteira.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Insights Principais */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-800">Resumo</h3>
                </div>
                {loadingInsights ? (
                  <div className="text-blue-700">Calculando…</div>
                ) : insights ? (
                  <div className="text-blue-700 space-y-1 text-sm">
                    <div>Total investido: <strong>{formatCurrency(insights.resumo?.total_investido || 0)}</strong></div>
                    <div>Nº ativos: <strong>{insights.resumo?.num_ativos || 0}</strong></div>
                    <div>DY médio (pond.): <strong>{insights.resumo?.weighted_dy_pct != null ? formatPercentage(insights.resumo.weighted_dy_pct) : (insights.resumo?.weighted_dy != null ? formatPercentage((insights.resumo.weighted_dy || 0) * 100) : 'N/A')}</strong></div>
                    <div>PL médio: <strong>{insights.resumo?.avg_pl?.toFixed?.(2) ?? 'N/A'}</strong></div>
                    <div>P/VP médio: <strong>{insights.resumo?.avg_pvp?.toFixed?.(2) ?? 'N/A'}</strong></div>
                    <div>ROE médio: <strong>{insights.resumo?.avg_roe != null ? formatPercentage((insights.resumo.avg_roe || 0) * 100) : 'N/A'}</strong></div>
                  </div>
                ) : null}
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Target className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-semibold text-purple-800">Concentração</h3>
                </div>
                {loadingInsights ? (
                  <div className="text-purple-700">Calculando…</div>
                ) : insights ? (
                  <div className="text-purple-700 text-sm space-y-1">
                    {(insights.concentracao?.top_positions || []).map((p: any) => (
                      <div key={p.ticker} className="flex justify-between">
                        <span>{p.ticker}</span>
                        <span>{formatCurrency(p.valor_total)} • {((p.percentual || 0).toFixed?.(1) || '0.0')}%</span>
                      </div>
                    ))}
                    {(insights.concentracao?.alerts || []).length > 0 && (
                      <div className="text-xs text-red-600 mt-2">Alerta: posições acima de 25% detectadas.</div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">Renda (DY)</h3>
                </div>
                {loadingInsights ? (
                  <div className="text-green-700">Calculando…</div>
                ) : insights ? (
                  <div className="text-green-700 text-sm space-y-1">
                    <div>DY ponderado: <strong>{insights.renda?.weighted_dy_pct != null ? formatPercentage(insights.renda.weighted_dy_pct) : (insights.renda?.weighted_dy != null ? formatPercentage((insights.renda.weighted_dy || 0) * 100) : 'N/A')}</strong></div>
                    <div className="mt-2 font-medium">Top DY</div>
                    {(insights.renda?.top_dy || []).map((a: any) => (
                      <div key={a.ticker} className="flex justify-between">
                        <span>{a.ticker}</span>
                        <span>{formatPercentage(a.dy_pct ?? ((a.dy || 0) * 100))} • {((a.percentual_carteira || 0).toFixed?.(1) || '0.0')}%</span>
                      </div>
                    ))}
                    <div className="text-xs mt-2">Ativos sem DY: {insights.renda?.ativos_sem_dy || 0}</div>
                  </div>
                ) : null}
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Activity className="w-6 h-6 text-orange-600" />
                  <h3 className="text-lg font-semibold text-orange-800">Avaliação</h3>
                </div>
                {loadingInsights ? (
                  <div className="text-orange-700">Calculando…</div>
                ) : insights ? (
                  <div className="text-orange-700 text-sm space-y-1">
                    <div>
                      PL alto (&gt;25): <strong>{insights.avaliacao?.pl?.high_count || 0}</strong> • PL baixo (&le;10): <strong>{insights.avaliacao?.pl?.low_count || 0}</strong>
                    </div>
                    <div>
                      Undervalued (P/VP &le; 1): <strong>{insights.avaliacao?.pvp?.undervalued_count || 0}</strong> • Overpriced (P/VP &ge; 3): <strong>{insights.avaliacao?.pvp?.overpriced_count || 0}</strong>
                    </div>
                    <div>
                      ROE médio: <strong>{insights.resumo?.avg_roe != null ? formatPercentage((insights.resumo.avg_roe || 0) * 100) : 'N/A'}</strong> • ROE negativo: <strong>{insights.avaliacao?.roe?.negative_count || 0}</strong>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Insights Secundários */}
          <div className="bg-muted/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500" />
              Recomendações
            </h3>
            {loadingInsights ? (
              <div className="text-sm text-muted-foreground">Calculando…</div>
            ) : insights ? (
              <div className="space-y-3">
                {insights.avaliacao?.pvp?.undervalued_count > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-background rounded">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-muted-foreground">
                      Existem {insights.avaliacao.pvp.undervalued_count} ativos com P/VP ≤ 1, potenciais oportunidades de valor.
                    </p>
                  </div>
                )}
                {insights.avaliacao?.pl?.low_count > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-background rounded">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-muted-foreground">
                      {insights.avaliacao.pl.low_count} ativos com P/L ≤ 10 sugerem múltiplos atrativos.
                    </p>
                  </div>
                )}
                {insights.avaliacao?.roe?.negative_count > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-background rounded">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-muted-foreground">
                      {insights.avaliacao.roe.negative_count} ativos com ROE negativo: avaliação de manutenção/redução recomendada.
                    </p>
                  </div>
                )}
                {(insights.concentracao?.alerts || []).length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-background rounded">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-muted-foreground">
                      Concentração elevada detectada em {insights.concentracao.alerts.length} posição(ões). Considere rebalanceamento.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="bg-muted/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Alertas
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-background rounded">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">
                  {carteira?.filter(ativo => ativo?.pl && ativo.pl > 20).length || 0} ativos com P/L elevado.
                </p>
              </div>
              <div className="flex items-start gap-2 p-3 bg-background rounded">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-muted-foreground">
                  {carteira?.filter(ativo => ativo?.dy && ativo.dy < 0.02).length || 0} ativos com baixo dividend yield.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          Adicione ativos à sua carteira para receber insights personalizados.
        </div>
      )}
    </div>
  )
}
