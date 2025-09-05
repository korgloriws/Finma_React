import React from 'react'
import { BarChart3, ExternalLink, Target, Shield, Calculator, BookOpen } from 'lucide-react'
import { formatNumber, formatPercentage } from '../../utils/formatters'

interface GuiaGeralTabProps {
  inputTicker: string
  setInputTicker: (value: string) => void
  handleSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleBuscar: () => void
  ticker: string | null
  pl: number | null
  pvp: number | null
  roePct: number | null
  dyPct: number | null
  evToEbit: number | null
  sma50: number | null
  sma200: number | null
  lastClose: number | null
  evaluateStrategies: () => any[]
  leftKey: string
  setLeftKey: (value: string) => void
  rightKey: string
  setRightKey: (value: string) => void
  left: any
  right: any
  showMarketNotes: boolean
  googleUrl: (query: string) => string
  INDICATORS: any[]
  STRATEGIES: any[]
  StrategyCard: (strategy: any) => JSX.Element
}

export default function GuiaGeralTab({
  inputTicker,
  setInputTicker,
  handleSearchKeyDown,
  handleBuscar,
  ticker,
  pl,
  pvp,
  roePct,
  dyPct,
  evToEbit,
  sma50,
  sma200,
  lastClose,
  evaluateStrategies,
  leftKey,
  setLeftKey,
  rightKey,
  setRightKey,
  left,
  right,
  showMarketNotes,
  googleUrl,
  INDICATORS,
  STRATEGIES,
  StrategyCard
}: GuiaGeralTabProps) {
  return (
    <>
      <div id="indicadores" className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Indicadores: Definições e Fórmulas</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {INDICATORS.map((it) => (
            <div 
              key={it.id} 
              className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => window.open(googleUrl(`${it.name} indicador financeiro`), '_blank')}
              title={`Pesquisar ${it.name} no Google`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground text-lg">{it.name}</h4>
                <div className="p-2 rounded-lg bg-primary/10">
                  <ExternalLink className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="bg-background/50 rounded-lg p-3 mb-3">
                <p className="text-sm text-muted-foreground font-mono">{it.formula}</p>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Conceito Técnico</p>
                  <ul className="space-y-2">
                    {it.technical.map((t: string) => (
                      <li key={t} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-muted-foreground">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {showMarketNotes && it.notes?.length ? (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Notas de Mercado</p>
                    <ul className="space-y-2">
                      {it.notes.map((n: string) => (
                        <li key={n} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-muted-foreground">{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="analise-ativo" className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Análise por Ativo e Enquadramento</h3>
        </div>
        
        {/* Input de busca integrado */}
        <div className="mb-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1">
                <label htmlFor="guia-ticker" className="sr-only">Buscar ativo</label>
                <input
                  id="guia-ticker"
                  type="text"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-foreground placeholder:text-muted-foreground"
                  placeholder="Digite o ticker (ex.: PETR4, VALE3, ITUB4)"
                  value={inputTicker}
                  onChange={(e) => setInputTicker(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
              <button
                onClick={handleBuscar}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>
        
        {!ticker ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg text-muted-foreground">Informe um ticker para avaliar enquadramento por estratégia</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Métricas principais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">P/L</p>
                <p className="text-lg font-bold text-foreground">{formatNumber(pl)}</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">P/VP</p>
                <p className="text-lg font-bold text-foreground">{formatNumber(pvp)}</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">ROE</p>
                <p className="text-lg font-bold text-foreground">{formatPercentage(roePct)}</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">DY</p>
                <p className="text-lg font-bold text-foreground">{formatPercentage(dyPct)}</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">EV/EBIT</p>
                <p className="text-lg font-bold text-foreground">{formatNumber(evToEbit)}</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">SMA50</p>
                <p className="text-lg font-bold text-foreground">{formatNumber(sma50)}</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">SMA200</p>
                <p className="text-lg font-bold text-foreground">{formatNumber(sma200)}</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Fechamento</p>
                <p className="text-lg font-bold text-foreground">{formatNumber(lastClose)}</p>
              </div>
            </div>
                  
            {/* Adequação às estratégias */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Adequação às Estratégias</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evaluateStrategies().map((f) => {
                  const s = STRATEGIES.find((x) => x.key === f.key)!
                  return (
                    <div key={f.key} className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-foreground">{s.name}</h5>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          f.score >= 3 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          f.score >= 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          Score: {f.score}
                        </span>
                      </div>
                      
                      {f.reasons.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2">Pontos a Favor</p>
                          <ul className="space-y-1">
                            {f.reasons.map((r: string) => (
                              <li key={r} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {f.cautions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">Atenções</p>
                          <ul className="space-y-1">
                            {f.cautions.map((r: string) => (
                              <li key={r} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center italic">Regras heurísticas e objetivas, sem recomendações. Use com julgamento e contexto setorial.</p>
            </div>
          </div>
        )}
      </div>

      <div id="estrategias" className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Principais Estratégias</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {STRATEGIES.map((s) => (
            <div key={s.key}>{StrategyCard(s)}</div>
          ))}
        </div>
      </div>

      <div id="comparador" className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Comparador de Estratégias</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="sel-left" className="block text-sm text-muted-foreground mb-2">Estratégia A</label>
            <select
              id="sel-left"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
              value={leftKey}
              onChange={(e) => setLeftKey(e.target.value)}
            >
              {STRATEGIES.map((s) => (
                <option key={s.key} value={s.key}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sel-right" className="block text-sm text-muted-foreground mb-2">Estratégia B</label>
            <select
              id="sel-right"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
              value={rightKey}
              onChange={(e) => setRightKey(e.target.value)}
            >
              {STRATEGIES.map((s) => (
                <option key={s.key} value={s.key}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div key={left.key}>{StrategyCard(left)}</div>
          <div key={right.key}>{StrategyCard(right)}</div>
        </div>
      </div>

      <div id="risco" className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Risco, Diversificação e Correlação</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <p className="font-semibold text-foreground mb-3">Gestão de risco</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Posicionamento por convicção e volatilidade
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Stops/processos para estratégias ativas
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Rebalanceamento periódico (já disponível na sua Carteira)
              </li>
            </ul>
          </div>
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <p className="font-semibold text-foreground mb-3">Diversificação prática</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Classes: Ações, FIIs, Renda Fixa, Exterior
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Setores e países para reduzir correlações
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div id="impostos" className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Impostos no Brasil (visão geral)</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <p className="font-semibold text-foreground mb-3">Ações e ETFs locais</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Day trade: 20% (com IRRF)
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Operações comuns: 15% (compensação de prejuízos)
              </li>
            </ul>
          </div>
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <p className="font-semibold text-foreground mb-3">FIIs</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Proventos: regra atual de isenção para pessoa física (verifique mudanças)
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Ganho de capital: 20%
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
            Esta é uma visão resumida e pode mudar. Consulte sempre fontes oficiais.
          </p>
        </div>
      </div>

      <div id="glossario" className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Glossário Essencial</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <p className="font-semibold text-foreground mb-3">Indicadores</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                EV/EBIT: valor da empresa sobre lucro operacional
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                DY: dividend yield (proventos/preço)
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                ROE/ROIC: rentabilidade sobre o capital
              </li>
            </ul>
          </div>
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <p className="font-semibold text-foreground mb-3">Renda Fixa</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Indexadores: CDI, IPCA, SELIC
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Marcação a mercado: oscilação de preço antes do vencimento
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
