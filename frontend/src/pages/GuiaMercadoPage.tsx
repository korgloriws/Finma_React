import { useMemo, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ativoService } from '../services/api'
import { formatNumber, formatPercentage } from '../utils/formatters'

type Strategy = {
  key: string
  name: string
  description: string
  pros: string[]
  cons: string[]
  kpis: string[]
  horizon: string
  risk: string
  liquidity: string
  idealProfile: string
  mainRisks: string[]
  recommended: string[]
}

const STRATEGIES: Strategy[] = [
  {
    key: 'buyhold',
    name: 'Buy & Hold',
    description:
      'Compra de bons ativos e manutenção no longo prazo, focando em qualidade e crescimento composto.',
    pros: ['Custos e impostos menores', 'Aproveita juros compostos', 'Menos tempo operacional'],
    cons: ['Exige disciplina em quedas', 'Resultados mais lentos no curto prazo'],
    kpis: ['ROE', 'Margem Líquida', 'Crescimento de Lucros', 'Endividamento'],
    horizon: 'Longo prazo (5+ anos)',
    risk: 'Médio',
    liquidity: 'Média',
    idealProfile: 'Paciente, foco em qualidade e visão de longo prazo',
    mainRisks: ['Mudança estrutural da empresa', 'Ciclos setoriais prolongados'],
    recommended: ['acoes', 'etfs', 'stocks', 'fiis']
  },
  {
    key: 'value',
    name: 'Value Investing',
    description:
      'Compra de empresas negociando abaixo do valor intrínseco com margem de segurança.',
    pros: ['Assimetria positiva', 'Proteção em quedas', 'Baseado em fundamentos'],
    cons: ['Pode demorar a destravar', 'Erros de valuation impactam retorno'],
    kpis: ['EV/EBIT', 'P/L', 'P/VP', 'FCF Yield'],
    horizon: 'Médio a longo prazo (3-7 anos)',
    risk: 'Médio',
    liquidity: 'Média',
    idealProfile: 'Analítico, confortável com paciência e contrarianismo',
    mainRisks: ['Value trap', 'Mudanças estruturais mal avaliadas'],
    recommended: ['acoes', 'fiis']
  },
  {
    key: 'dividends',
    name: 'Dividendos',
    description:
      'Foco em geração de renda via proventos estáveis e crescentes.',
    pros: ['Renda recorrente', 'Menor volatilidade', 'Reinvestimento acelera composto'],
    cons: ['Risco de corte de dividendos', 'Empresas maduras podem crescer menos'],
    kpis: ['DY', 'Payout', 'Crescimento dos Dividendos', 'Cobertura (FCF/Dividendo)'],
    horizon: 'Longo prazo',
    risk: 'Baixo a médio',
    liquidity: 'Média',
    idealProfile: 'Busca renda e estabilidade',
    mainRisks: ['Queda estrutural do lucro', 'Endividamento alto em ciclos de juros'],
    recommended: ['fiis', 'acoes']
  },
  {
    key: 'momentum',
    name: 'Momentum/Tendência',
    description:
      'Segue tendências de preço/resultado, comprando força relativa e cortando perdas.',
    pros: ['Capta grandes movimentos', 'Regras claras com stops'],
    cons: ['Mais trades e custos', 'Falsos sinais em lateralidade'],
    kpis: ['Força Relativa', 'Médias Móveis', 'Breakouts', 'Volume'],
    horizon: 'Curto a médio prazo',
    risk: 'Médio a alto',
    liquidity: 'Alta',
    idealProfile: 'Disciplinado com gestão de risco ativa',
    mainRisks: ['Whipsaws', 'Aumentos de custo com giro'],
    recommended: ['acoes', 'etfs', 'stocks']
  },
  {
    key: 'allocation',
    name: 'Alocação por Classes (Balanceamento)',
    description:
      'Define pesos por classe (Ações, FIIs, Renda Fixa, Exterior) e rebalanceia periodicamente.',
    pros: ['Controle de risco', 'Disciplina contra ciclos', 'Simplicidade operacional'],
    cons: ['Pode reduzir retornos extremos', 'Requer acompanhamento periódico'],
    kpis: ['Desvio da alocação alvo', 'Volatilidade', 'Sharpe', 'Correlação'],
    horizon: 'Médio a longo prazo',
    risk: 'Variável (ajustável pelo mix)',
    liquidity: 'Média',
    idealProfile: 'Busca consistência e controle de risco',
    mainRisks: ['Subalocação em bull markets fortes', 'Excesso de rebalanceamentos'],
    recommended: ['acoes', 'fiis', 'renda-fixa', 'etfs', 'stocks', 'fundos']
  }
]

const SECTION_ORDER = [
  { id: 'analise-ativo', title: 'Análise por Ativo e Enquadramento' },
  { id: 'indicadores', title: 'Indicadores: definições e fórmulas' },
  { id: 'tipos-ativos-detalhado', title: 'Tipos de Ativos: explicação, prós e contras' },
  { id: 'estrategias', title: 'Principais Estratégias' },
  { id: 'comparador', title: 'Comparador de Estratégias' },
  { id: 'risco', title: 'Risco, Diversificação e Correlação' },
  { id: 'impostos', title: 'Impostos no Brasil (visão geral)' },
  { id: 'glossario', title: 'Glossário Essencial' }
]

type Indicator = {
  id: string
  name: string
  formula: string
  technical: string[]
  notes: string[]
}

const INDICATORS: Indicator[] = [
  {
    id: 'ev_ebit',
    name: 'EV/EBIT',
    formula: 'EV/EBIT = (Valor da Empresa) / EBIT',
    technical: [
      'Mede o preço do negócio em relação ao lucro operacional.',
      'EV = Valor de mercado do patrimônio + Dívida líquida (dívida bruta - caixa).',
      'Menor pode indicar mais barato, mas comparar com pares/setor e ciclo.',
    ],
    notes: [
      'Negócios cíclicos podem parecer baratos em pico de ciclo (armadilha).',
      'Ajustes contábeis e IFRS podem distorcer EBIT em alguns setores.',
    ],
  },
  {
    id: 'pl',
    name: 'P/L',
    formula: 'P/L = Preço por Ação / Lucro por Ação (LPA)',
    technical: [
      'Preço pago por unidade de lucro líquido.',
      'Útil para negócios estáveis; comparar intra-setor.',
    ],
    notes: [
      'Empresas em crescimento justificam P/L maior; lucros deprimidos distorcem P/L.',
    ],
  },
  {
    id: 'pvp',
    name: 'P/VP',
    formula: 'P/VP = Preço / Valor Patrimonial por Ação',
    technical: [
      'Compara preço com patrimônio líquido contábil.',
      'Mais relevante em bancos/seguros e ativos intensivos em capital.',
    ],
    notes: [
      'Patrimônio pode não refletir valor econômico (intangíveis, marca).',
    ],
  },
  {
    id: 'roe',
    name: 'ROE',
    formula: 'ROE = Lucro Líquido / Patrimônio Líquido',
    technical: [
      'Mede a rentabilidade do capital do acionista.',
      'Consistência ao longo de ciclos é mais importante que um pico isolado.',
    ],
    notes: [
      'Alavancagem pode inflar ROE; observar Dívida Líquida/EBITDA em conjunto.',
    ],
  },
  {
    id: 'roic',
    name: 'ROIC',
    formula: 'ROIC = NOPAT / Capital Investido',
    technical: [
      'Rentabilidade do capital total investido (dívida + patrimônio).',
      'Comparar com custo de capital (WACC). ROIC > WACC cria valor.',
    ],
    notes: [
      'Cálculo de NOPAT pode variar; ser consistente entre empresas comparadas.',
    ],
  },
  {
    id: 'margens',
    name: 'Margens (Bruta/EBITDA/Líquida)',
    formula: 'Margem = Resultado / Receita Líquida',
    technical: [
      'Avaliam eficiência operacional e poder de precificação.',
      'Comparar com histórico e concorrentes; olhar tendência.',
    ],
    notes: [
      'Setores diferentes têm margens naturalmente distintas; não compará-los diretamente.',
    ],
  },
  {
    id: 'fcf_yield',
    name: 'FCF Yield',
    formula: 'FCF Yield = Fluxo de Caixa Livre / Valor de Mercado',
    technical: [
      'Geração de caixa livre em relação ao preço do equity.',
      'Útil para avaliar capacidade de dividendos e recompra.',
    ],
    notes: [
      'Capex cíclico pode distorcer; considerar média multi-ano.',
    ],
  },
  {
    id: 'div_liq_ebitda',
    name: 'Dívida Líquida/EBITDA',
    formula: 'DL/EBITDA = (Dívida Bruta - Caixa) / EBITDA',
    technical: [
      'Alavancagem operacional; múltiplos altos elevam risco.',
      'Setores com receita previsível toleram mais alavancagem.',
    ],
    notes: [
      'EBITDA ajustado pode variar por empresa; padronizar comparações.',
    ],
  },
  {
    id: 'cobertura_juros',
    name: 'Cobertura de Juros',
    formula: 'Cobertura = EBIT / Despesa de Juros',
    technical: [
      'Capacidade de honrar juros com lucro operacional.',
      'Valores mais altos indicam conforto financeiro.',
    ],
    notes: [
      'Taxas de juros variáveis podem alterar rapidamente a cobertura.',
    ],
  },
  {
    id: 'peg',
    name: 'PEG',
    formula: 'PEG = (P/L) / Crescimento de Lucros (%)',
    technical: [
      'Relaciona preço ao crescimento esperado.',
      'Valores próximos de 1 sugerem equilíbrio preço/crescimento.',
    ],
    notes: [
      'Projeções de crescimento são incertas; usar cenários.',
    ],
  },
  {
    id: 'dy',
    name: 'Dividend Yield (DY)',
    formula: 'DY = Proventos por Ação (12m) / Preço por Ação',
    technical: [
      'Renda distribuída em relação ao preço.',
      'Avaliar sustentabilidade via payout e cobertura por FCF/lucro.',
    ],
    notes: [
      'DY alto pode refletir preço deprimido por problemas reais.',
    ],
  },
]

type AssetSubtype = { name: string; technical: string[] }
type AssetTypeInfo = {
  id: string
  name: string
  technical: string[]
  pros: string[]
  cons: string[]
  subtypes?: AssetSubtype[]
  notes?: string[]
}

const ASSET_TYPES: AssetTypeInfo[] = [
  {
    id: 'acoes',
    name: 'Ações',
    technical: [
      'Títulos que representam participação societária em empresas.',
      'Retorno via valorização e/ou distribuição de proventos.',
    ],
    pros: ['Potencial de crescimento', 'Proteção contra inflação no longo prazo', 'Alta liquidez (blue chips)'],
    cons: ['Alta volatilidade', 'Risco de execução e setorial'],
    notes: ['Ciclos econômicos e de juros afetam valuation e margens.'],
  },
  {
    id: 'etfs',
    name: 'ETFs',
    technical: [
      'Fundos listados que replicam índices (ex.: IBOV, S&P 500).',
      'Diversificação instantânea com custo menor que gestão ativa média.',
    ],
    pros: ['Diversificação', 'Baixo custo', 'Liquidez'],
    cons: ['Risco de mercado do índice', 'Menor potencial de superar índice'],
  },
  {
    id: 'fiis',
    name: 'FIIs (Fundos Imobiliários)',
    technical: [
      'Fundos que investem em imóveis ou títulos imobiliários.',
      'Retorno via rendimentos periódicos e valorização das cotas.',
    ],
    pros: ['Renda recorrente', 'Diversificação imobiliária', 'Gestão profissional'],
    cons: ['Vacância/risco de inquilinos', 'Sensibilidade à taxa de juros'],
    notes: ['Segmentos: Tijolo (shoppings, lajes) x Papel (CRI).'],
  },
  {
    id: 'stocks',
    name: 'Ações Internacionais (Stocks/ADRs/BDRs)',
    technical: [
      'Exposição a empresas globais via bolsa externa ou BDRs locais.',
      'Risco cambial impacta retorno em reais.',
    ],
    pros: ['Acesso a setores globais', 'Diversificação geográfica'],
    cons: ['Risco cambial', 'Horários/tributação específicos'],
  },
  {
    id: 'fundos',
    name: 'Fundos de Investimento',
    technical: [
      'Veículos com gestão profissional (renda fixa, multimercado, ações, cambial).',
      'Cota reflete valor dos ativos na carteira (cota patrimonial).',
    ],
    pros: ['Acesso a estratégias complexas', 'Curva de aprendizado menor'],
    cons: ['Taxas (administração/performance)', 'Transparência variável'],
  },
  {
    id: 'renda-fixa',
    name: 'Renda Fixa',
    technical: [
      'Títulos de dívida com fluxo definido por indexadores (CDI, IPCA, prefixado).',
      'Marcação a mercado altera preço antes do vencimento.',
    ],
    pros: ['Previsibilidade de fluxo', 'Menor volatilidade que ações'],
    cons: ['Risco de crédito/emissor', 'Perda de valor com alta de juros (marcação)'],
    subtypes: [
      { name: 'Tesouro Selic', technical: ['Indexado à Selic; baixa volatilidade; indicado para reserva.'] },
      { name: 'Tesouro IPCA+', technical: ['Proteção contra inflação; volatilidade maior no curto prazo.'] },
      { name: 'Tesouro Prefixado', technical: ['Taxa fixa; perde valor se juros subirem.'] },
      { name: 'CDB/LC/LCI/LCA', technical: ['Bancários; podem ter FGC; taxas atreladas ao CDI/IPCA.'] },
      { name: 'Debêntures (incentivadas)', technical: ['Isentas PF; risco de crédito da empresa emissora.'] },
      { name: 'CRI/CRA', technical: ['Securitização; risco do lastro; menor liquidez.'] },
    ],
  },
]

export default function GuiaMercadoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputTicker, setInputTicker] = useState('')
  const ticker = searchParams.get('ticker') || ''
  const [leftKey, setLeftKey] = useState('buyhold')
  const [rightKey, setRightKey] = useState('dividends')
  const [showMarketNotes, setShowMarketNotes] = useState(true)

  const filteredToc = SECTION_ORDER

  const left = STRATEGIES.find((s) => s.key === leftKey)!
  const right = STRATEGIES.find((s) => s.key === rightKey)!

  const StrategyCard = (s: Strategy) => (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <h4 className="text-base font-semibold text-foreground mb-1">{s.name}</h4>
      <p className="text-sm text-muted-foreground mb-3">{s.description}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground mb-1">Horizonte</p>
          <p className="font-medium">{s.horizon}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Risco</p>
          <p className="font-medium">{s.risk}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Liquidez</p>
          <p className="font-medium">{s.liquidity}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Perfil ideal</p>
          <p className="font-medium">{s.idealProfile}</p>
        </div>
      </div>
      {s.recommended?.length ? (
        <div className="mt-4">
          <p className="text-sm font-medium mb-1">Tipos de ativos sugeridos</p>
          <div className="flex flex-wrap gap-2">
            {s.recommended.map((rid) => {
              const label = ASSET_TYPES.find((a) => a.id === rid)?.name || rid
              return (
                <button
                  key={rid}
                  onClick={() => goTo(`asset-${rid}`)}
                  className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 text-foreground"
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <p className="text-sm font-medium mb-1">KPIs</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {s.kpis.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Riscos principais</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {s.mainRisks.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <p className="text-sm font-medium mb-1">Vantagens</p>
          <ul className="list-disc pl-5 text-sm text-emerald-600 dark:text-emerald-400 space-y-1">
            {s.pros.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Desvantagens</p>
          <ul className="list-disc pl-5 text-sm text-red-600 dark:text-red-400 space-y-1">
            {s.cons.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )

  const goTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    // Tenta rolar o ancestral com overflow
    let parent: HTMLElement | null = el.parentElement
    while (parent) {
      const style = window.getComputedStyle(parent)
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        const y = el.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop - 16
        parent.scrollTo({ top: y, behavior: 'smooth' })
        return
      }
      parent = parent.parentElement
    }
    // Fallback
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleBuscar = useCallback(() => {
    if (!inputTicker.trim()) return
    setSearchParams({ ticker: inputTicker.trim().toUpperCase() })
  }, [inputTicker, setSearchParams])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBuscar()
    }
  }, [handleBuscar])

  useEffect(() => {
    if (ticker && ticker !== inputTicker) setInputTicker(ticker)
  }, [ticker])

  const { data: detalhes } = useQuery<any>({
    queryKey: ['guia-ativo-detalhes', ticker],
    queryFn: () => ativoService.getDetalhes(ticker),
    enabled: !!ticker,
    staleTime: 60_000,
  })

  const { data: historico } = useQuery<Array<Record<string, any>>>({
    queryKey: ['guia-ativo-historico', ticker],
    queryFn: () => ativoService.getHistorico(ticker, '1y'),
    enabled: !!ticker,
    staleTime: 60_000,
  })

  const info: any = detalhes?.info || {}

  const roePct = useMemo(() => {
    const v = info?.returnOnEquity as number | undefined
    return v != null ? v * 100 : null
  }, [info])

  const dyPct = useMemo(() => {
    const d = info?.dividendYield as number | undefined
    return d != null ? d * 100 : null
  }, [info])

  const pl = info?.trailingPE ?? null
  const pvp = info?.priceToBook ?? null
  const enterpriseValue: number | null = info?.enterpriseValue ?? null
  const ebitComputed: number | null = useMemo(() => {
    const ebit = (info as any)?.ebit
    if (typeof ebit === 'number') return ebit
    const operatingIncome = (info as any)?.operatingIncome
    if (typeof operatingIncome === 'number') return operatingIncome
    const ebitda = (info as any)?.ebitda
    const da = (info as any)?.depreciationAndAmortization
    if (typeof ebitda === 'number' && typeof da === 'number') return ebitda - da
    return null
  }, [info])
  const evToEbit: number | null = useMemo(() => {
    if (enterpriseValue == null || ebitComputed == null) return null
    if (!isFinite(enterpriseValue) || !isFinite(ebitComputed) || ebitComputed === 0) return null
    return enterpriseValue / ebitComputed
  }, [enterpriseValue, ebitComputed])

  const closes: number[] = useMemo(() => {
    const series = Array.isArray(historico) ? historico : []
    return series.map((r) => Number(r?.Close ?? r?.close ?? r?.price)).filter((x) => isFinite(x))
  }, [historico])

  const sma = (arr: number[], win: number) => {
    if (arr.length < win) return null
    let sum = 0
    for (let i = arr.length - win; i < arr.length; i++) sum += arr[i]
    return sum / win
  }
  const sma50 = useMemo(() => sma(closes, 50), [closes])
  const sma200 = useMemo(() => sma(closes, 200), [closes])
  const lastClose = closes.length ? closes[closes.length - 1] : null
  const momentumUp = useMemo(() => {
    if (sma50 == null || sma200 == null || lastClose == null) return null
    return sma50 > sma200 && lastClose > sma200
  }, [sma50, sma200, lastClose])

  type StrategyFit = { key: string; score: number; reasons: string[]; cautions: string[] }
  const evaluateStrategies = (): StrategyFit[] => {
    const fits: StrategyFit[] = []
    // Value
    let valueScore = 0
    const valueReasons: string[] = []
    const valueCautions: string[] = []
    if (evToEbit != null) {
      if (evToEbit <= 6) { valueScore += 2; valueReasons.push(`EV/EBIT ${formatNumber(evToEbit)} baixo`) }
      else if (evToEbit <= 10) { valueScore += 1; valueReasons.push(`EV/EBIT ${formatNumber(evToEbit)} moderado`) }
      else { valueCautions.push(`EV/EBIT ${formatNumber(evToEbit)} elevado`) }
    }
    if (pl != null) {
      if (pl <= 12) { valueScore += 1; valueReasons.push(`P/L ${formatNumber(pl)} atrativo`) }
      else { valueCautions.push(`P/L ${formatNumber(pl)} alto`) }
    }
    if (pvp != null) {
      if (pvp <= 1.5) { valueScore += 1; valueReasons.push(`P/VP ${formatNumber(pvp)} dentro do critério`) }
      else { valueCautions.push(`P/VP ${formatNumber(pvp)} acima do alvo`) }
    }
    fits.push({ key: 'value', score: valueScore, reasons: valueReasons, cautions: valueCautions })

    // Dividendos
    let divScore = 0
    const divReasons: string[] = []
    const divCautions: string[] = []
    if (dyPct != null) {
      if (dyPct >= 8) { divScore += 2; divReasons.push(`DY ${formatPercentage(dyPct)}`) }
      else if (dyPct >= 4) { divScore += 1; divReasons.push(`DY ${formatPercentage(dyPct)}`) }
      else { divCautions.push(`DY ${formatPercentage(dyPct)} modesto`) }
      if (dyPct >= 15) divCautions.push('DY muito alto: verificar sustentabilidade')
    } else {
      divCautions.push('DY indisponível')
    }
    if (roePct != null && roePct >= 10) { divScore += 1; divReasons.push(`ROE ${formatPercentage(roePct)} saudável`) }
    fits.push({ key: 'dividends', score: divScore, reasons: divReasons, cautions: divCautions })

    // Buy & Hold
    let bhScore = 0
    const bhReasons: string[] = []
    const bhCautions: string[] = []
    if (roePct != null) {
      if (roePct >= 15) { bhScore += 2; bhReasons.push(`ROE ${formatPercentage(roePct)} elevado`) }
      else if (roePct >= 10) { bhScore += 1; bhReasons.push(`ROE ${formatPercentage(roePct)} bom`) }
      else { bhCautions.push(`ROE ${formatPercentage(roePct)} baixo`) }
    }
    const growth = (info?.earningsGrowth != null) ? Number(info.earningsGrowth) * 100 : null
    if (growth != null) {
      if (growth > 0) { bhScore += 1; bhReasons.push(`Crescimento de lucros ${formatPercentage(growth)}`) }
      else { bhCautions.push('Crescimento de lucros negativo') }
    }
    fits.push({ key: 'buyhold', score: bhScore, reasons: bhReasons, cautions: bhCautions })

    // Momentum
    let momScore = 0
    const momReasons: string[] = []
    const momCautions: string[] = []
    if (momentumUp != null) {
      if (momentumUp) { momScore += 2; momReasons.push('Tendência de alta: SMA50 > SMA200 e preço > SMA200') }
      else { momCautions.push('Sem confirmação de tendência de alta') }
    } else {
      momCautions.push('Histórico insuficiente para SMA50/200')
    }
    fits.push({ key: 'momentum', score: momScore, reasons: momReasons, cautions: momCautions })

    // Alocação (informativo)
    fits.push({ key: 'allocation', score: 1, reasons: ['Ajuste por classe na Carteira ideal'], cautions: [] })
    return fits.sort((a, b) => b.score - a.score)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h2 className="text-xl font-semibold">Guia do Mercado Financeiro</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <label htmlFor="guia-ticker" className="sr-only">Buscar ativo</label>
            <input
              id="guia-ticker"
              type="text"
              className="w-full px-3 py-2 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ticker (ex.: PETR4, VALE3, ITUB4)"
              value={inputTicker}
              onChange={(e) => setInputTicker(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          <button
            onClick={handleBuscar}
            className="px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
          >
            Buscar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1 bg-card border border-border rounded-lg p-3 h-max sticky top-4">
          <p className="text-sm font-medium mb-2">Conteúdo</p>
          <nav className="space-y-1">
            {filteredToc.map((s) => (
              <button
                key={s.id}
                className="block w-full text-left px-2 py-1 rounded hover:bg-accent text-sm text-muted-foreground"
                onClick={() => goTo(s.id)}
              >
                {s.title}
              </button>
            ))}
          </nav>
          <div className="mt-3">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={showMarketNotes} onChange={(e) => setShowMarketNotes(e.target.checked)} />
              Mostrar notas de mercado (não-técnicas)
            </label>
          </div>
        </aside>

        <section className="lg:col-span-3 space-y-8">
          <div id="indicadores" className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Indicadores: definições e fórmulas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {INDICATORS.map((it) => (
                <div key={it.id} className="border border-border rounded-md p-3">
                  <p className="font-medium text-foreground mb-1">{it.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{it.formula}</p>
                  <p className="text-xs font-semibold mb-1">Conceito técnico</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {it.technical.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  {showMarketNotes && it.notes?.length ? (
                    <>
                      <p className="text-xs font-semibold mt-3 mb-1">Notas de mercado (não-técnicas)</p>
                      <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                        {it.notes.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div id="tipos-ativos-detalhado" className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Tipos de Ativos: explicação, prós e contras</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ASSET_TYPES.map((a) => (
                <div key={a.id} id={`asset-${a.id}`} className="border border-border rounded-md p-3">
                  <p className="font-medium mb-1">{a.name}</p>
                  <p className="text-xs font-semibold mb-1">O que são (técnico)</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {a.technical.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  {a.subtypes?.length ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold mb-1">Tipos</p>
                      <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                        {a.subtypes.map((s) => (
                          <li key={s.name}><span className="font-medium text-foreground">{s.name}:</span> {s.technical.join(' ')}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-xs font-semibold mb-1">Vantagens</p>
                      <ul className="list-disc pl-5 text-sm text-emerald-600 dark:text-emerald-400 space-y-1">
                        {a.pros.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-1">Desvantagens</p>
                      <ul className="list-disc pl-5 text-sm text-red-600 dark:text-red-400 space-y-1">
                        {a.cons.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {showMarketNotes && a.notes?.length ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold mb-1">Notas de mercado (não-técnicas)</p>
                      <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                        {a.notes.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div id="analise-ativo" className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Análise por Ativo e Enquadramento</h3>
            {!ticker ? (
              <p className="text-sm text-muted-foreground">Informe um ticker para avaliar enquadramento por estratégia.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">P/L</p>
                    <p className="font-medium">{formatNumber(pl)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">P/VP</p>
                    <p className="font-medium">{formatNumber(pvp)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">ROE</p>
                    <p className="font-medium">{formatPercentage(roePct)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">DY</p>
                    <p className="font-medium">{formatPercentage(dyPct)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">EV/EBIT</p>
                    <p className="font-medium">{formatNumber(evToEbit)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">SMA50</p>
                    <p className="font-medium">{formatNumber(sma50)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">SMA200</p>
                    <p className="font-medium">{formatNumber(sma200)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Fechamento</p>
                    <p className="font-medium">{formatNumber(lastClose)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Adequação às estratégias</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {evaluateStrategies().map((f) => {
                      const s = STRATEGIES.find((x) => x.key === f.key)!
                      return (
                        <div key={f.key} className="border border-border rounded-md p-3">
                          <p className="font-medium mb-1">{s.name}</p>
                          <p className="text-xs text-muted-foreground mb-2">Score: {f.score}</p>
                          {f.reasons.length ? (
                            <div className="mb-2">
                              <p className="text-xs font-semibold">Pontos a favor</p>
                              <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                                {f.reasons.map((r) => <li key={r}>{r}</li>)}
                              </ul>
                            </div>
                          ) : null}
                          {f.cautions.length ? (
                            <div>
                              <p className="text-xs font-semibold">Atenções</p>
                              <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                                {f.cautions.map((r) => <li key={r}>{r}</li>)}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">Regras heurísticas e objetivas, sem recomendações. Use com julgamento e contexto setorial.</p>
                </div>
              </div>
            )}
          </div>

          <div id="estrategias" className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Principais Estratégias</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STRATEGIES.map((s) => (
                <div key={s.key}>{StrategyCard(s)}</div>
              ))}
            </div>
          </div>

          <div id="comparador" className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Comparador de Estratégias</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="sel-left" className="block text-sm text-muted-foreground mb-1">Estratégia A</label>
                <select
                  id="sel-left"
                  className="w-full px-3 py-2 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                  value={leftKey}
                  onChange={(e) => setLeftKey(e.target.value)}
                >
                  {STRATEGIES.map((s) => (
                    <option key={s.key} value={s.key}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sel-right" className="block text-sm text-muted-foreground mb-1">Estratégia B</label>
                <select
                  id="sel-right"
                  className="w-full px-3 py-2 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                  value={rightKey}
                  onChange={(e) => setRightKey(e.target.value)}
                >
                  {STRATEGIES.map((s) => (
                    <option key={s.key} value={s.key}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div key={left.key}>{StrategyCard(left)}</div>
              <div key={right.key}>{StrategyCard(right)}</div>
            </div>
          </div>

          <div id="risco" className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Risco, Diversificação e Correlação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Gestão de risco</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Posicionamento por convicção e volatilidade</li>
                  <li>Stops/processos para estratégias ativas</li>
                  <li>Rebalanceamento periódico (já disponível na sua Carteira)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Diversificação prática</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Classes: Ações, FIIs, Renda Fixa, Exterior</li>
                  <li>Setores e países para reduzir correlações</li>
                </ul>
              </div>
            </div>
          </div>

          <div id="impostos" className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Impostos no Brasil (visão geral)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Ações e ETFs locais</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Day trade: 20% (com IRRF)</li>
                  <li>Operações comuns: 15% (compensação de prejuízos)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">FIIs</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Proventos: regra atual de isenção para pessoa física (verifique mudanças)</li>
                  <li>Ganho de capital: 20%</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Esta é uma visão resumida e pode mudar. Consulte sempre fontes oficiais.</p>
          </div>

          <div id="glossario" className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Glossário Essencial</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Indicadores</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>EV/EBIT: valor da empresa sobre lucro operacional</li>
                  <li>DY: dividend yield (proventos/preço)</li>
                  <li>ROE/ROIC: rentabilidade sobre o capital</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Renda Fixa</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Indexadores: CDI, IPCA, SELIC</li>
                  <li>Marcação a mercado: oscilação de preço antes do vencimento</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}


