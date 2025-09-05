import { useMemo, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ativoService } from '../services/api'
import { formatNumber, formatPercentage } from '../utils/formatters'
import { ExternalLink, TrendingUp,  BarChart3, BookOpen, Target, AlertCircle, PieChart, Building2, Globe, MapPin, ArrowUpRight, Shield, Calculator } from 'lucide-react'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,  Legend } from 'recharts'

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

const RENDA_VARIAVEL_DETAILS = {
  conceitos: [
    {
      title: 'O que é Renda Variável',
      content: 'Ativos cujo retorno não é previsível, variando conforme o desempenho da empresa, setor ou mercado. O investidor assume riscos em troca de potencial de retorno superior.',
      googleQuery: 'renda variável investimento conceito'
    },
    {
      title: 'Volatilidade',
      content: 'Medida da variação do preço de um ativo ao longo do tempo. Maior volatilidade significa maior risco, mas também maior potencial de retorno.',
      googleQuery: 'volatilidade renda variável conceito'
    },
    {
      title: 'Liquidez',
      content: 'Facilidade de comprar ou vender um ativo sem causar impacto significativo no preço. Blue chips geralmente têm alta liquidez.',
      googleQuery: 'liquidez ações mercado brasileiro'
    },
    {
      title: 'Correlação',
      content: 'Medida de como dois ativos se movem em relação um ao outro. Baixa correlação entre ativos melhora a diversificação.',
      googleQuery: 'correlação ativos diversificação'
    }
  ],
  tipos: [
    {
      name: 'Ações Ordinárias (ON)',
      description: 'Conferem direito a voto nas assembleias e participação nos lucros via dividendos.',
      pros: ['Direito a voto', 'Potencial de valorização', 'Participação nos lucros'],
      cons: ['Maior risco', 'Volatilidade alta', 'Subordinação em caso de falência'],
      googleQuery: 'ações ordinárias diferença preferenciais'
    },
    {
      name: 'Ações Preferenciais (PN)',
      description: 'Prioridade no recebimento de dividendos, mas geralmente sem direito a voto.',
      pros: ['Prioridade em dividendos', 'Menor volatilidade', 'Proteção em caso de falência'],
      cons: ['Sem direito a voto', 'Potencial de valorização limitado'],
      googleQuery: 'ações preferenciais características'
    },
    {
      name: 'Fundos Imobiliários (FIIs)',
      description: 'Fundos que investem em imóveis ou títulos imobiliários, distribuindo rendimentos mensais.',
      pros: ['Renda recorrente', 'Diversificação imobiliária', 'Gestão profissional'],
      cons: ['Vacância/risco de inquilinos', 'Sensibilidade à taxa de juros'],
      googleQuery: 'FIIs fundos imobiliários investimento'
    },
    {
      name: 'ETFs (Fundos de Índice)',
      description: 'Fundos que replicam índices de mercado, oferecendo diversificação instantânea.',
      pros: ['Diversificação', 'Baixo custo', 'Liquidez'],
      cons: ['Risco de mercado do índice', 'Menor potencial de superar índice'],
      googleQuery: 'ETFs fundos índice investimento'
    },
    {
      name: 'BDRs (Brazilian Depositary Receipts)',
      description: 'Certificados que representam ações de empresas estrangeiras negociadas no Brasil.',
      pros: ['Acesso a empresas globais', 'Negociação em reais', 'Diversificação geográfica'],
      cons: ['Risco cambial', 'Liquidez limitada', 'Horários específicos'],
      googleQuery: 'BDRs certificados empresas estrangeiras'
    },
    {
      name: 'Small Caps',
      description: 'Ações de empresas menores, com potencial de crescimento superior mas maior risco.',
      pros: ['Alto potencial de crescimento', 'Menor cobertura analítica', 'Oportunidades de descoberta'],
      cons: ['Maior risco', 'Baixa liquidez', 'Volatilidade extrema'],
      googleQuery: 'small caps ações empresas menores'
    },
    {
      name: 'REITs (Real Estate Investment Trusts)',
      description: 'Fundos imobiliários estrangeiros, similares aos FIIs brasileiros.',
      pros: ['Diversificação internacional', 'Renda recorrente', 'Acesso a mercados maduros'],
      cons: ['Risco cambial', 'Tributação específica', 'Complexidade regulatória'],
      googleQuery: 'REITs fundos imobiliários internacionais'
    }
  ],
  estrategias: [
    {
      name: 'Value Investing',
      description: 'Compra de empresas negociando abaixo do valor intrínseco com margem de segurança.',
      pros: ['Assimetria positiva', 'Proteção em quedas', 'Baseado em fundamentos'],
      cons: ['Pode demorar a destravar', 'Erros de valuation impactam retorno'],
      googleQuery: 'value investing estratégia valor'
    },
    {
      name: 'Growth Investing',
      description: 'Foco em empresas com alto potencial de crescimento, mesmo com valuation elevado.',
      pros: ['Alto potencial de retorno', 'Captura de tendências', 'Crescimento acelerado'],
      cons: ['Valuation elevado', 'Maior risco', 'Dependência de crescimento'],
      googleQuery: 'growth investing estratégia crescimento'
    },
    {
      name: 'Dividend Investing',
      description: 'Foco em empresas que pagam dividendos consistentes e crescentes.',
      pros: ['Renda recorrente', 'Menor volatilidade', 'Reinvestimento acelera composto'],
      cons: ['Risco de corte de dividendos', 'Empresas maduras podem crescer menos'],
      googleQuery: 'dividend investing estratégia dividendos'
    },
    {
      name: 'Momentum Investing',
      description: 'Compra de ativos em tendência de alta, vendendo quando a tendência se inverte.',
      pros: ['Capta grandes movimentos', 'Regras claras com stops'],
      cons: ['Mais trades e custos', 'Falsos sinais em lateralidade'],
      googleQuery: 'momentum investing estratégia tendência'
    },
    {
      name: 'Sector Rotation',
      description: 'Rotação entre setores baseada em ciclos econômicos e tendências de mercado.',
      pros: ['Aproveita ciclos setoriais', 'Reduz risco concentrado', 'Flexibilidade'],
      cons: ['Timing difícil', 'Custos de transação', 'Análise complexa'],
      googleQuery: 'sector rotation rotação setorial'
    }
  ],
  setores: [
    {
      name: 'Financeiro',
      description: 'Bancos, seguradoras e outras instituições financeiras.',
      caracteristicas: ['Sensível à taxa de juros', 'Alto ROE', 'Dividendos consistentes'],
      exemplos: ['ITUB4', 'BBDC4', 'BBAS3'],
      googleQuery: 'setor financeiro ações bancos'
    },
    {
      name: 'Varejo',
      description: 'Empresas de comércio varejista e e-commerce.',
      caracteristicas: ['Sensível ao consumo', 'Ciclos sazonais', 'Crescimento variável'],
      exemplos: ['MGLU3', 'LREN3', 'VVAR3'],
      googleQuery: 'setor varejo ações consumo'
    },
    {
      name: 'Commodities',
      description: 'Empresas de mineração, petróleo e agricultura.',
      caracteristicas: ['Sensível a preços internacionais', 'Ciclos longos', 'Alta volatilidade'],
      exemplos: ['VALE3', 'PETR4', 'SUZB3'],
      googleQuery: 'setor commodities mineração petróleo'
    },
    {
      name: 'Tecnologia',
      description: 'Empresas de software, hardware e serviços digitais.',
      caracteristicas: ['Alto crescimento', 'Margens elevadas', 'Inovação constante'],
      exemplos: ['ALLD3', 'LWSA3', 'CASH3'],
      googleQuery: 'setor tecnologia ações software'
    },
    {
      name: 'Saúde',
      description: 'Hospitais, laboratórios e empresas de saúde.',
      caracteristicas: ['Defensivo', 'Crescimento estável', 'Regulação forte'],
      exemplos: ['HAPV3', 'QUAL3', 'RDOR3'],
      googleQuery: 'setor saúde ações hospitais'
    },
    {
      name: 'Imobiliário',
      description: 'Construtoras, incorporadoras e empresas imobiliárias.',
      caracteristicas: ['Cíclico', 'Alavancagem alta', 'Sensível à taxa de juros'],
      exemplos: ['SYNE3', 'MRVE3', 'TEND3'],
      googleQuery: 'setor imobiliário ações construção'
    }
  ],
  riscos: [
    {
      name: 'Risco de Mercado',
      description: 'Variações no preço dos ativos devido a movimentos gerais do mercado.',
      mitigacao: 'Diversificação, alocação por classes, horizonte longo',
      googleQuery: 'risco mercado ações volatilidade'
    },
    {
      name: 'Risco Específico',
      description: 'Risco relacionado a uma empresa específica ou setor.',
      mitigacao: 'Diversificação setorial, análise fundamentalista',
      googleQuery: 'risco específico empresa setor'
    },
    {
      name: 'Risco de Liquidez',
      description: 'Dificuldade de vender um ativo sem perda significativa.',
      mitigacao: 'Foco em ativos líquidos, posicionamento adequado',
      googleQuery: 'risco liquidez ações mercado'
    },
    {
      name: 'Risco Cambial',
      description: 'Variações na taxa de câmbio que afetam ativos internacionais.',
      mitigacao: 'Hedge cambial, diversificação geográfica',
      googleQuery: 'risco cambial investimentos internacionais'
    },
    {
      name: 'Risco Regulatório',
      description: 'Mudanças em regulamentações que afetam negócios.',
      mitigacao: 'Diversificação setorial, acompanhamento regulatório',
      googleQuery: 'risco regulatório mudanças legislação'
    }
  ]
}

const RENDA_VARIAVEL_INTERNACIONAL_DETAILS = {
  conceitos: [
    {
      title: 'Investimento Internacional',
      content: 'Exposição a ativos de mercados estrangeiros, oferecendo diversificação geográfica e acesso a empresas globais não disponíveis no Brasil.',
      googleQuery: 'investimento internacional diversificação geográfica'
    },
    {
      title: 'Risco Cambial',
      content: 'Variações na taxa de câmbio que podem amplificar ou reduzir retornos. Dólar forte beneficia investimentos em moeda estrangeira.',
      googleQuery: 'risco cambial investimentos internacionais'
    },
    {
      title: 'Correlação com Mercado Local',
      content: 'Mercados desenvolvidos geralmente têm baixa correlação com o Brasil, melhorando a diversificação da carteira.',
      googleQuery: 'correlação mercados desenvolvidos emergentes'
    },
    {
      title: 'Horários de Negociação',
      content: 'Diferentes fusos horários afetam liquidez e timing de operações. Mercados asiáticos, europeus e americanos têm horários distintos.',
      googleQuery: 'horários negociação mercados internacionais'
    }
  ],
  tipos: [
    {
      name: 'Stocks (Ações Diretas)',
      description: 'Ações de empresas estrangeiras negociadas diretamente em bolsas internacionais.',
      pros: ['Exposição direta', 'Maior liquidez', 'Acesso a empresas globais'],
      cons: ['Risco cambial', 'Tributação complexa', 'Custos de corretagem'],
      googleQuery: 'stocks ações diretas mercado internacional'
    },
    {
      name: 'ADRs (American Depositary Receipts)',
      description: 'Certificados que representam ações de empresas estrangeiras negociadas nos EUA.',
      pros: ['Negociação em dólar', 'Liquidez alta', 'Regulação americana'],
      cons: ['Taxa de custódia', 'Risco cambial', 'Horários limitados'],
      googleQuery: 'ADRs certificados ações estrangeiras'
    },
    {
      name: 'BDRs (Brazilian Depositary Receipts)',
      description: 'Certificados de empresas estrangeiras negociados na B3 em reais.',
      pros: ['Negociação em reais', 'Horário brasileiro', 'Facilidade operacional'],
      cons: ['Liquidez limitada', 'Poucos ativos', 'Spread alto'],
      googleQuery: 'BDRs certificados empresas estrangeiras Brasil'
    },
    {
      name: 'ETFs Internacionais',
      description: 'Fundos que replicam índices de mercados estrangeiros ou setores globais.',
      pros: ['Diversificação instantânea', 'Baixo custo', 'Liquidez'],
      cons: ['Risco cambial', 'Tracking error', 'Exposição indireta'],
      googleQuery: 'ETFs internacionais fundos índice globais'
    },
    {
      name: 'Fundos de Investimento',
      description: 'Fundos brasileiros que investem em ativos internacionais com gestão profissional.',
      pros: ['Gestão profissional', 'Diversificação', 'Facilidade tributária'],
      cons: ['Taxas de administração', 'Menor transparência', 'Dependência do gestor'],
      googleQuery: 'fundos investimento internacional Brasil'
    },
    {
      name: 'REITs (Real Estate Investment Trusts)',
      description: 'Fundos imobiliários estrangeiros, similares aos FIIs brasileiros.',
      pros: ['Diversificação imobiliária', 'Renda recorrente', 'Mercados maduros'],
      cons: ['Risco cambial', 'Tributação específica', 'Regulação estrangeira'],
      googleQuery: 'REITs fundos imobiliários internacionais'
    },
    {
      name: 'Criptomoedas',
      description: 'Ativos digitais que podem ser considerados investimento internacional descentralizado.',
      pros: ['24/7 negociação', 'Alto potencial', 'Independência geográfica'],
      cons: ['Alta volatilidade', 'Risco regulatório', 'Complexidade técnica'],
      googleQuery: 'criptomoedas investimento internacional'
    }
  ],
  mercados: [
    {
      name: 'Estados Unidos (S&P 500)',
      description: 'Maior mercado de capitais do mundo, com empresas de tecnologia e inovação.',
      caracteristicas: ['Alta liquidez', 'Empresas globais', 'Regulação forte'],
      exemplos: ['AAPL', 'MSFT', 'GOOGL', 'AMZN'],
      googleQuery: 'mercado americano S&P 500 ações'
    },
    {
      name: 'Europa (STOXX 600)',
      description: 'Mercado europeu com empresas maduras e dividendos consistentes.',
      caracteristicas: ['Dividendos altos', 'Empresas maduras', 'Regulação rigorosa'],
      exemplos: ['NOVO', 'ASML', 'NESTLE', 'SAP'],
      googleQuery: 'mercado europeu STOXX 600 ações'
    },
    {
      name: 'Japão (Nikkei 225)',
      description: 'Mercado japonês com empresas de tecnologia e manufatura avançada.',
      caracteristicas: ['Tecnologia avançada', 'Qualidade', 'Estabilidade'],
      exemplos: ['TOYOTA', 'SONY', 'NINTENDO', 'SOFTBANK'],
      googleQuery: 'mercado japonês Nikkei 225 ações'
    },
    {
      name: 'China (CSI 300)',
      description: 'Mercado chinês com alto crescimento e empresas de tecnologia.',
      caracteristicas: ['Alto crescimento', 'Tecnologia', 'Volatilidade'],
      exemplos: ['BABA', 'TCEHY', 'JD', 'NIO'],
      googleQuery: 'mercado chinês CSI 300 ações'
    },
    {
      name: 'Mercados Emergentes (MSCI EM)',
      description: 'Índice de mercados emergentes incluindo Brasil, China, Índia e outros.',
      caracteristicas: ['Alto crescimento', 'Maior risco', 'Baixa correlação'],
      exemplos: ['VALE', 'TATA', 'SAMSUNG', 'TSMC'],
      googleQuery: 'mercados emergentes MSCI EM'
    }
  ],
  estrategias: [
    {
      name: 'Diversificação Geográfica',
      description: 'Distribuir investimentos entre diferentes países e regiões para reduzir risco.',
      pros: ['Reduz risco concentrado', 'Aproveita oportunidades globais', 'Proteção cambial'],
      cons: ['Complexidade operacional', 'Custos adicionais', 'Análise mais complexa'],
      googleQuery: 'diversificação geográfica investimento internacional'
    },
    {
      name: 'Hedge Cambial',
      description: 'Estratégias para proteger contra movimentos desfavoráveis da moeda.',
      pros: ['Proteção cambial', 'Previsibilidade', 'Gestão de risco'],
      cons: ['Custos de hedge', 'Complexidade', 'Timing difícil'],
      googleQuery: 'hedge cambial proteção moeda'
    },
    {
      name: 'Sector Rotation Global',
      description: 'Rotação entre setores baseada em ciclos econômicos globais.',
      pros: ['Aproveita ciclos globais', 'Diversificação setorial', 'Flexibilidade'],
      cons: ['Análise complexa', 'Timing crítico', 'Custos de transação'],
      googleQuery: 'sector rotation global estratégia'
    },
    {
      name: 'Value Investing Global',
      description: 'Busca por empresas negociando abaixo do valor intrínseco em mercados globais.',
      pros: ['Oportunidades globais', 'Diversificação', 'Margem de segurança'],
      cons: ['Análise complexa', 'Risco cambial', 'Liquidez variável'],
      googleQuery: 'value investing global estratégia'
    },
    {
      name: 'Dividend Investing Global',
      description: 'Foco em empresas que pagam dividendos consistentes em mercados desenvolvidos.',
      pros: ['Renda em moeda forte', 'Estabilidade', 'Empresas maduras'],
      cons: ['Risco cambial', 'Tributação', 'Custos de conversão'],
      googleQuery: 'dividend investing global estratégia'
    }
  ],
  comoInvestir: [
    {
      name: 'Corretoras Internacionais',
      description: 'Abertura de conta em corretoras estrangeiras para acesso direto.',
      vantagens: ['Acesso direto', 'Maior liquidez', 'Menos intermediários'],
      desvantagens: ['Complexidade tributária', 'Custos de transferência', 'Regulação estrangeira'],
      exemplos: ['Interactive Brokers', 'TD Ameritrade', 'Charles Schwab'],
      googleQuery: 'corretoras internacionais investimento Brasil'
    },
    {
      name: 'Corretoras Locais com Câmbio',
      description: 'Uso de corretoras brasileiras que oferecem acesso a mercados internacionais.',
      vantagens: ['Facilidade operacional', 'Suporte em português', 'Tributação simplificada'],
      desvantagens: ['Custos mais altos', 'Produtos limitados', 'Spread cambial'],
      exemplos: ['XP Investimentos', 'BTG Pactual', 'Itaú BBA'],
      googleQuery: 'corretoras brasileiras mercado internacional'
    },
    {
      name: 'Fundos de Investimento',
      description: 'Investimento via fundos brasileiros especializados em ativos internacionais.',
      vantagens: ['Gestão profissional', 'Diversificação', 'Facilidade tributária'],
      desvantagens: ['Taxas de administração', 'Menor controle', 'Dependência do gestor'],
      exemplos: ['Fundos de ações internacionais', 'Fundos multimercado', 'Fundos cambiais'],
      googleQuery: 'fundos investimento internacional Brasil'
    },
    {
      name: 'ETFs Listados no Brasil',
      description: 'ETFs que investem em ativos internacionais mas são negociados na B3.',
      vantagens: ['Negociação em reais', 'Horário brasileiro', 'Facilidade operacional'],
      desvantagens: ['Produtos limitados', 'Liquidez variável', 'Tracking error'],
      exemplos: ['IVVB11', 'SPXI11', 'HASH11'],
      googleQuery: 'ETFs internacionais B3 Brasil'
    }
  ],
  riscos: [
    {
      name: 'Risco Cambial',
      description: 'Variações na taxa de câmbio que podem amplificar perdas ou reduzir ganhos.',
      mitigacao: 'Hedge cambial, diversificação de moedas, horizonte longo',
      googleQuery: 'risco cambial investimentos internacionais'
    },
    {
      name: 'Risco Político/Regulatório',
      description: 'Mudanças em políticas governamentais ou regulamentações que afetam investimentos.',
      mitigacao: 'Diversificação geográfica, análise política, acompanhamento regulatório',
      googleQuery: 'risco político regulatório investimentos internacionais'
    },
    {
      name: 'Risco de Liquidez',
      description: 'Dificuldade de vender ativos em mercados menos líquidos ou em horários específicos.',
      mitigacao: 'Foco em ativos líquidos, diversificação de mercados, planejamento de horários',
      googleQuery: 'risco liquidez mercados internacionais'
    },
    {
      name: 'Risco de Custódia',
      description: 'Risco relacionado à guarda de ativos em jurisdições estrangeiras.',
      mitigacao: 'Corretoras reguladas, diversificação de custódia, análise de risco',
      googleQuery: 'risco custódia ativos internacionais'
    },
    {
      name: 'Risco de Informação',
      description: 'Dificuldade de acesso a informações em idiomas estrangeiros ou regulamentações locais.',
      mitigacao: 'Fontes confiáveis, análise local, consultoria especializada',
      googleQuery: 'risco informação investimentos internacionais'
    }
  ]
}

const RENDA_FIXA_INTERNACIONAL_DETAILS = {
  conceitos: [
    {
      title: 'Renda Fixa Internacional',
      content: 'Títulos de dívida emitidos por governos e empresas estrangeiras, oferecendo exposição a diferentes moedas e taxas de juros globais.',
      googleQuery: 'renda fixa internacional títulos dívida estrangeira'
    },
    {
      title: 'Duration e Sensibilidade',
      content: 'Medida de sensibilidade do preço do título às mudanças na taxa de juros. Títulos internacionais podem ter duration diferente dos locais.',
      googleQuery: 'duration renda fixa internacional sensibilidade juros'
    },
    {
      title: 'Curva de Juros Global',
      content: 'Diferentes países têm curvas de juros distintas, criando oportunidades de arbitragem e diversificação de risco.',
      googleQuery: 'curva juros global países diferentes'
    },
    {
      title: 'Rating de Crédito',
      content: 'Classificação de risco de crédito que varia entre países e emissores, afetando spreads e retornos.',
      googleQuery: 'rating crédito títulos internacionais'
    }
  ],
  tipos: [
    {
      name: 'Treasury Bonds (EUA)',
      description: 'Títulos do Tesouro americano, considerados o ativo livre de risco por excelência.',
      pros: ['Maior liquidez global', 'Considerado livre de risco', 'Benchmark mundial'],
      cons: ['Risco cambial', 'Taxas baixas', 'Exposição ao dólar'],
      googleQuery: 'Treasury bonds títulos tesouro americano'
    },
    {
      name: 'Eurobonds',
      description: 'Títulos emitidos em euros por governos e empresas da zona do euro.',
      pros: ['Diversificação cambial', 'Estabilidade do euro', 'Mercado maduro'],
      cons: ['Taxas negativas', 'Risco político europeu', 'Complexidade regulatória'],
      googleQuery: 'Eurobonds títulos euro zona europeia'
    },
    {
      name: 'Corporate Bonds Internacionais',
      description: 'Títulos de dívida corporativa emitidos por empresas globais em diferentes moedas.',
      pros: ['Maior retorno', 'Diversificação setorial', 'Acesso a empresas globais'],
      cons: ['Maior risco', 'Liquidez variável', 'Análise complexa'],
      googleQuery: 'corporate bonds internacionais empresas globais'
    },
    {
      name: 'Emerging Market Bonds',
      description: 'Títulos de mercados emergentes com maior risco e potencial de retorno.',
      pros: ['Maior retorno', 'Diversificação geográfica', 'Crescimento econômico'],
      cons: ['Maior risco', 'Volatilidade alta', 'Risco político'],
      googleQuery: 'emerging market bonds títulos emergentes'
    },
    {
      name: 'Supranational Bonds',
      description: 'Títulos emitidos por organizações internacionais como Banco Mundial e FMI.',
      pros: ['Alto rating', 'Diversificação institucional', 'Liquidez moderada'],
      cons: ['Retornos menores', 'Exposição limitada', 'Complexidade'],
      googleQuery: 'supranational bonds organizações internacionais'
    },
    {
      name: 'Municipal Bonds (EUA)',
      description: 'Títulos emitidos por governos locais americanos, com benefícios fiscais.',
      pros: ['Benefícios fiscais', 'Baixo risco', 'Diversificação'],
      cons: ['Risco cambial', 'Liquidez limitada', 'Complexidade tributária'],
      googleQuery: 'municipal bonds títulos locais EUA'
    },
    {
      name: 'Inflation-Linked Bonds',
      description: 'Títulos indexados à inflação, como TIPS americanos e linkers europeus.',
      pros: ['Proteção inflacionária', 'Diversificação', 'Estabilidade real'],
      cons: ['Risco cambial', 'Liquidez variável', 'Complexidade'],
      googleQuery: 'inflation linked bonds proteção inflação'
    }
  ],
  mercados: [
    {
      name: 'Estados Unidos',
      description: 'Maior mercado de renda fixa do mundo, com alta liquidez e diversidade.',
      caracteristicas: ['Alta liquidez', 'Diversidade de emissores', 'Regulação forte'],
      exemplos: ['US10Y', 'US30Y', 'TIPS', 'Muni Bonds'],
      googleQuery: 'mercado renda fixa Estados Unidos'
    },
    {
      name: 'Europa',
      description: 'Mercado europeu com títulos em euros e outras moedas locais.',
      caracteristicas: ['Estabilidade cambial', 'Taxas baixas', 'Regulação rigorosa'],
      exemplos: ['Bund alemão', 'OAT francês', 'BTP italiano'],
      googleQuery: 'mercado renda fixa Europa euro'
    },
    {
      name: 'Japão',
      description: 'Mercado japonês com taxas muito baixas e alta liquidez.',
      caracteristicas: ['Taxas muito baixas', 'Alta liquidez', 'Estabilidade'],
      exemplos: ['JGB 10Y', 'JGB 30Y', 'Corporate bonds'],
      googleQuery: 'mercado renda fixa Japão JGB'
    },
    {
      name: 'Mercados Emergentes',
      description: 'Mercados emergentes com maior risco e potencial de retorno.',
      caracteristicas: ['Maior retorno', 'Maior risco', 'Volatilidade'],
      exemplos: ['Brazil 10Y', 'Mexico 10Y', 'South Africa 10Y'],
      googleQuery: 'mercado renda fixa emergentes'
    },
    {
      name: 'Reino Unido',
      description: 'Mercado britânico com gilts e títulos corporativos.',
      caracteristicas: ['Estabilidade', 'Liquidez moderada', 'Regulação forte'],
      exemplos: ['UK 10Y', 'UK 30Y', 'Corporate gilts'],
      googleQuery: 'mercado renda fixa Reino Unido gilts'
    }
  ],
  estrategias: [
    {
      name: 'Ladder de Vencimentos',
      description: 'Distribuir investimentos em diferentes prazos para aproveitar a curva de juros.',
      pros: ['Aproveita curva de juros', 'Liquidez escalonada', 'Reduz risco de reinvestimento'],
      cons: ['Complexidade de gestão', 'Pode perder oportunidades pontuais'],
      googleQuery: 'ladder vencimentos renda fixa internacional'
    },
    {
      name: 'Barbell Strategy',
      description: 'Concentrar em títulos de curto prazo (liquidez) e longo prazo (retorno).',
      pros: ['Liquidez e retorno', 'Flexibilidade', 'Proteção contra mudanças de juros'],
      cons: ['Gestão mais ativa', 'Custos de transação'],
      googleQuery: 'barbell strategy renda fixa internacional'
    },
    {
      name: 'Duration Matching',
      description: 'Alinhar a duration da carteira com o horizonte de investimento.',
      pros: ['Reduz risco de taxa', 'Objetivo claro', 'Disciplina'],
      cons: ['Menor flexibilidade', 'Pode perder oportunidades'],
      googleQuery: 'duration matching estratégia internacional'
    },
    {
      name: 'Currency Hedging',
      description: 'Estratégias para proteger contra movimentos desfavoráveis da moeda.',
      pros: ['Proteção cambial', 'Previsibilidade', 'Gestão de risco'],
      cons: ['Custos de hedge', 'Complexidade', 'Timing difícil'],
      googleQuery: 'currency hedging renda fixa internacional'
    },
    {
      name: 'Credit Spread Strategy',
      description: 'Investir em títulos corporativos aproveitando spreads de crédito.',
      pros: ['Maior retorno', 'Diversificação', 'Oportunidades de arbitragem'],
      cons: ['Maior risco', 'Análise complexa', 'Volatilidade'],
      googleQuery: 'credit spread strategy renda fixa'
    }
  ],
  comoInvestir: [
    {
      name: 'Fundos de Investimento',
      description: 'Fundos brasileiros especializados em renda fixa internacional.',
      vantagens: ['Gestão profissional', 'Diversificação', 'Facilidade tributária'],
      desvantagens: ['Taxas de administração', 'Menor controle', 'Dependência do gestor'],
      exemplos: ['Fundos de renda fixa internacional', 'Fundos multimercado', 'Fundos cambiais'],
      googleQuery: 'fundos renda fixa internacional Brasil'
    },
    {
      name: 'ETFs Internacionais',
      description: 'ETFs que replicam índices de renda fixa internacional.',
      vantagens: ['Baixo custo', 'Diversificação', 'Liquidez'],
      desvantagens: ['Risco cambial', 'Tracking error', 'Exposição indireta'],
      exemplos: ['BNDX', 'IGOV', 'EMB', 'LQD'],
      googleQuery: 'ETFs renda fixa internacional'
    },
    {
      name: 'Corretoras Internacionais',
      description: 'Acesso direto via corretoras estrangeiras.',
      vantagens: ['Acesso direto', 'Maior liquidez', 'Menos intermediários'],
      desvantagens: ['Complexidade tributária', 'Custos de transferência', 'Regulação estrangeira'],
      exemplos: ['Interactive Brokers', 'TD Ameritrade', 'Charles Schwab'],
      googleQuery: 'corretoras internacionais renda fixa'
    },
    {
      name: 'BDRs de Renda Fixa',
      description: 'Certificados de títulos estrangeiros negociados na B3.',
      vantagens: ['Negociação em reais', 'Horário brasileiro', 'Facilidade operacional'],
      desvantagens: ['Produtos limitados', 'Liquidez baixa', 'Spread alto'],
      exemplos: ['BDRs de títulos corporativos', 'BDRs de ETFs'],
      googleQuery: 'BDRs renda fixa Brasil'
    }
  ],
  riscos: [
    {
      name: 'Risco Cambial',
      description: 'Variações na taxa de câmbio que podem amplificar perdas ou reduzir ganhos.',
      mitigacao: 'Hedge cambial, diversificação de moedas, horizonte longo',
      googleQuery: 'risco cambial renda fixa internacional'
    },
    {
      name: 'Risco de Taxa de Juros',
      description: 'Mudanças nas taxas de juros que afetam o preço dos títulos.',
      mitigacao: 'Duration matching, diversificação de prazos, análise de curva',
      googleQuery: 'risco taxa juros renda fixa internacional'
    },
    {
      name: 'Risco de Crédito',
      description: 'Possibilidade de default do emissor do título.',
      mitigacao: 'Diversificação de emissores, análise de rating, fundos especializados',
      googleQuery: 'risco crédito renda fixa internacional'
    },
    {
      name: 'Risco de Liquidez',
      description: 'Dificuldade de vender o título sem perda significativa.',
      mitigacao: 'Foco em títulos líquidos, diversificação de mercados, planejamento',
      googleQuery: 'risco liquidez renda fixa internacional'
    },
    {
      name: 'Risco Político/Regulatório',
      description: 'Mudanças em políticas governamentais que afetam títulos.',
      mitigacao: 'Diversificação geográfica, análise política, acompanhamento regulatório',
      googleQuery: 'risco político renda fixa internacional'
    }
  ]
}



// Função para processar dados dos índices
const processIndexData = (data: any[], baseValue: number = 100): Array<{date: string, value: number}> => {
  if (!data || !Array.isArray(data) || data.length === 0) return []
  
  const processed: Array<{date: string, value: number}> = []
  
  data.forEach((item, index) => {
    if (!item) return
    
    const close = Number(item?.Close ?? item?.close ?? item?.price ?? 0)
    if (index === 0) {
      processed.push({ date: item.Date || item.date || new Date().toISOString(), value: baseValue })
      return
    }
    
    const prevClose = Number(data[index - 1]?.Close ?? data[index - 1]?.close ?? data[index - 1]?.price ?? 0)
    if (prevClose === 0) {
      processed.push({ date: item.Date || item.date || new Date().toISOString(), value: baseValue })
      return
    }
    
    const growth = (close - prevClose) / prevClose
    const newValue = processed[index - 1]?.value ? processed[index - 1].value * (1 + growth) : baseValue
    
    processed.push({
      date: item.Date || item.date || new Date().toISOString(),
      value: newValue
    })
  })
  
  return processed
}


const INDEX_CONFIGS = {
  'renda-fixa': [
    { ticker: '^BVSP', name: 'IBOV (Referência)', color: '#3b82f6' },
    { ticker: 'BOVA11.SA', name: 'BOVA11', color: '#8b5cf6' },
    { ticker: 'SMAL11.SA', name: 'SMAL11', color: '#06b6d4' }
  ],
  'renda-variavel': [
    { ticker: '^BVSP', name: 'IBOV', color: '#3b82f6' },
    { ticker: 'SMAL11.SA', name: 'SMAL11', color: '#8b5cf6' },
    { ticker: 'BOVA11.SA', name: 'BOVA11', color: '#06b6d4' }
  ],
  'renda-variavel-internacional': [
    { ticker: '^GSPC', name: 'S&P 500', color: '#3b82f6' },
    { ticker: '^IXIC', name: 'NASDAQ', color: '#8b5cf6' },
    { ticker: '^DJI', name: 'Dow Jones', color: '#06b6d4' },
    { ticker: 'IVVB11.SA', name: 'IVVB11', color: '#f59e0b' }
  ],
  'renda-fixa-internacional': [
    { ticker: '^TNX', name: 'US 10Y', color: '#3b82f6' },
    { ticker: '^TYX', name: 'US 30Y', color: '#8b5cf6' },
    { ticker: '^IRX', name: 'US 13W', color: '#06b6d4' }
  ]
}

export default function GuiaMercadoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputTicker, setInputTicker] = useState('')
  const ticker = searchParams.get('ticker') || ''
  const [leftKey, setLeftKey] = useState('buyhold')
  const [rightKey, setRightKey] = useState('dividends')
  const [showMarketNotes, setShowMarketNotes] = useState(true)
  const [activeTab, setActiveTab] = useState<'geral' | 'renda-fixa' | 'renda-variavel' | 'renda-variavel-internacional' | 'renda-fixa-internacional'>('geral')
  const [chartPeriod, setChartPeriod] = useState<'6mo' | '1y' | '3y' | '5y'>('1y')

 
  const currentIndexConfig = INDEX_CONFIGS[activeTab as keyof typeof INDEX_CONFIGS] || []
  

  const bvspQuery = useQuery({
    queryKey: ['index-data', '^BVSP', chartPeriod],
    queryFn: () => ativoService.getHistorico('^BVSP', chartPeriod),
    enabled: currentIndexConfig.some(config => config.ticker === '^BVSP'),
    staleTime: 60_000,
  })
  
  const smal11Query = useQuery({
    queryKey: ['index-data', 'SMAL11.SA', chartPeriod],
    queryFn: () => ativoService.getHistorico('SMAL11.SA', chartPeriod),
    enabled: currentIndexConfig.some(config => config.ticker === 'SMAL11.SA'),
    staleTime: 60_000,
  })
  
  const bova11Query = useQuery({
    queryKey: ['index-data', 'BOVA11.SA', chartPeriod],
    queryFn: () => ativoService.getHistorico('BOVA11.SA', chartPeriod),
    enabled: currentIndexConfig.some(config => config.ticker === 'BOVA11.SA'),
    staleTime: 60_000,
  })
  
  const gspcQuery = useQuery({
    queryKey: ['index-data', '^GSPC', chartPeriod],
    queryFn: () => ativoService.getHistorico('^GSPC', chartPeriod),
    enabled: currentIndexConfig.some(config => config.ticker === '^GSPC'),
    staleTime: 60_000,
  })
  
  const ixicQuery = useQuery({
    queryKey: ['index-data', '^IXIC', chartPeriod],
    queryFn: () => ativoService.getHistorico('^IXIC', chartPeriod),
    enabled: currentIndexConfig.some(config => config.ticker === '^IXIC'),
    staleTime: 60_000,
  })
  
  const djiQuery = useQuery({
    queryKey: ['index-data', '^DJI', chartPeriod],
    queryFn: () => ativoService.getHistorico('^DJI', chartPeriod),
    enabled: currentIndexConfig.some(config => config.ticker === '^DJI'),
    staleTime: 60_000,
  })
  
  const ivvb11Query = useQuery({
    queryKey: ['index-data', 'IVVB11.SA', chartPeriod],
    queryFn: () => ativoService.getHistorico('IVVB11.SA', chartPeriod),
    enabled: currentIndexConfig.some(config => config.ticker === 'IVVB11.SA'),
    staleTime: 60_000,
  })
  
  const tnxQuery = useQuery({
    queryKey: ['index-data', '^TNX', chartPeriod],
    queryFn: () => ativoService.getHistorico('^TNX', chartPeriod),
    enabled: currentIndexConfig.some(config => config.ticker === '^TNX'),
    staleTime: 60_000,
  })
  
  const tyxQuery = useQuery({
    queryKey: ['index-data', '^TYX', chartPeriod],
    queryFn: () => ativoService.getHistorico('^TYX', chartPeriod),
    enabled: currentIndexConfig.some(config => config.ticker === '^TYX'),
    staleTime: 60_000,
  })
  
  const irxQuery = useQuery({
    queryKey: ['index-data', '^IRX', chartPeriod],
    queryFn: () => ativoService.getHistorico('^IRX', chartPeriod),
    enabled: currentIndexConfig.some(config => config.ticker === '^IRX'),
    staleTime: 60_000,
  })
  
 
  const getQueryForTicker = (ticker: string) => {
    switch (ticker) {
      case '^BVSP': return bvspQuery
      case 'SMAL11.SA': return smal11Query
      case 'BOVA11.SA': return bova11Query
      case '^GSPC': return gspcQuery
      case '^IXIC': return ixicQuery
      case '^DJI': return djiQuery
      case 'IVVB11.SA': return ivvb11Query
      case '^TNX': return tnxQuery
      case '^TYX': return tyxQuery
      case '^IRX': return irxQuery
      default: return null
    }
  }


  const chartData = useMemo(() => {
    if (!currentIndexConfig || !currentIndexConfig.length) return []
    
    const allData: Array<{date: string, [key: string]: any}> = []
    
    currentIndexConfig.forEach((config) => {
      const query = getQueryForTicker(config.ticker)
      if (!query?.data || !Array.isArray(query.data)) return
      
      const processedData = processIndexData(query.data)
      
      processedData.forEach((item, dataIndex) => {
        if (!allData[dataIndex]) {
          allData[dataIndex] = { date: item.date }
        }
        allData[dataIndex][config.name] = item.value
      })
    })
    
    return allData
  }, [currentIndexConfig, bvspQuery, smal11Query, bova11Query, gspcQuery, ixicQuery, djiQuery, ivvb11Query, tnxQuery, tyxQuery, irxQuery])


  const IndexChart = () => {
    if (!currentIndexConfig || !currentIndexConfig.length) return null
    
    const activeQueries = currentIndexConfig.map(config => getQueryForTicker(config.ticker)).filter(Boolean)
    const isLoading = activeQueries.some((query: any) => query?.isLoading)
    const hasError = activeQueries.some((query: any) => query?.error)
    
    if (isLoading) {
      return (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Carregando dados dos índices...</p>
            </div>
          </div>
        </div>
      )
    }
    
    if (hasError || !chartData || !chartData.length) {
      return (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Dados dos índices não disponíveis</p>
            </div>
          </div>
        </div>
      )
    }
    
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            Evolução dos Índices ({chartPeriod})
          </h3>
          <select
            value={chartPeriod}
            onChange={(e) => setChartPeriod(e.target.value as any)}
            className="px-4 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
            aria-label="Selecionar período do gráfico"
          >
            <option value="6mo">6 meses</option>
            <option value="1y">1 ano</option>
            <option value="3y">3 anos</option>
            <option value="5y">5 anos</option>
          </select>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Crescimento']}
                labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '12px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Legend />
              {currentIndexConfig.map((config) => (
                <Line 
                  key={config.name}
                  type="monotone" 
                  dataKey={config.name} 
                  stroke={config.color} 
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  const left = STRATEGIES.find((s) => s.key === leftKey)!
  const right = STRATEGIES.find((s) => s.key === rightKey)!

  const StrategyCard = (s: Strategy) => (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="space-y-4">
        {/* Header da estratégia */}
        <div className="text-center pb-4 border-b border-border">
          <h4 className="text-xl font-bold text-foreground mb-2">{s.name}</h4>
          <p className="text-muted-foreground leading-relaxed">{s.description}</p>
        </div>

        {/* Características principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Horizonte</p>
            <p className="font-semibold text-foreground">{s.horizon}</p>
        </div>
          <div className="text-center p-3 bg-muted/30 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Risco</p>
            <p className="font-semibold text-foreground">{s.risk}</p>
        </div>
          <div className="text-center p-3 bg-muted/30 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Liquidez</p>
            <p className="font-semibold text-foreground">{s.liquidity}</p>
        </div>
          <div className="text-center p-3 bg-muted/30 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Perfil ideal</p>
            <p className="font-semibold text-foreground text-sm leading-tight">{s.idealProfile}</p>
      </div>
        </div>

        {/* Ativos sugeridos */}
      {s.recommended?.length ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Tipos de ativos sugeridos</p>
          <div className="flex flex-wrap gap-2">
            {s.recommended.map((rid) => {
              const label = ASSET_TYPES.find((a) => a.id === rid)?.name || rid
              return (
                  <span
                  key={rid}
                    className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20"
                >
                  {label}
                  </span>
              )
            })}
          </div>
        </div>
      ) : null}

        {/* KPIs e Riscos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">KPIs Principais</p>
            <ul className="space-y-2">
            {s.kpis.map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                <a
                  href={googleUrl(`${k} indicador financeiro`)}
                  target="_blank"
                  rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline transition-colors"
                  title={`Pesquisar ${k} no Google`}
                >
                  {k}
                </a>
              </li>
            ))}
          </ul>
        </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Riscos Principais</p>
            <ul className="space-y-2">
            {s.mainRisks.map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">{k}</span>
                </li>
            ))}
          </ul>
        </div>
      </div>

        {/* Vantagens e Desvantagens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Vantagens</p>
            <ul className="space-y-2">
            {s.pros.map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">{k}</span>
                </li>
            ))}
          </ul>
        </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Desvantagens</p>
            <ul className="space-y-2">
            {s.cons.map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">{k}</span>
                </li>
            ))}
          </ul>
          </div>
        </div>
      </div>
    </div>
  )



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
    if (d == null) return null
    
   
    if (d > 1) {
      return d
    }
   
    return d * 100
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

  const googleUrl = useCallback((q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}` , [])

  const RENDA_FIXA_DETAILS = {
    conceitos: [
      {
        title: 'O que é Renda Fixa',
        content: 'Títulos de dívida onde o investidor empresta dinheiro e recebe juros em troca. O fluxo de pagamentos é previsível, mas o preço pode variar no mercado secundário.',
        googleQuery: 'renda fixa investimento conceito'
      },
      {
        title: 'Marcação a Mercado',
        content: 'Processo de reavaliação diária do preço dos títulos baseado na taxa de juros vigente. Quando os juros sobem, títulos antigos perdem valor.',
        googleQuery: 'marcação a mercado renda fixa'
      },
      {
        title: 'Duration',
        content: 'Medida de sensibilidade do preço do título às mudanças na taxa de juros. Quanto maior a duration, maior a volatilidade do preço.',
        googleQuery: 'duration renda fixa conceito'
      },
      {
        title: 'Curva de Juros',
        content: 'Gráfico que mostra as taxas de juros para diferentes prazos. Normalmente inclinada para cima (juros maiores para prazos maiores).',
        googleQuery: 'curva de juros brasil'
      }
    ],
    tipos: [
      {
        name: 'Tesouro Selic',
        description: 'Indexado à taxa Selic, baixa volatilidade, ideal para reserva de emergência.',
        pros: ['Baixa volatilidade', 'Liquidez diária', 'Isento de IR para PF'],
        cons: ['Rendimento limitado à Selic', 'Sensível a mudanças na política monetária'],
        googleQuery: 'tesouro selic investimento'
      },
      {
        name: 'Tesouro IPCA+',
        description: 'Proteção contra inflação com taxa real prefixada.',
        pros: ['Proteção inflacionária', 'Taxa real garantida', 'Isento de IR para PF'],
        cons: ['Maior volatilidade', 'Sensível a mudanças na inflação esperada'],
        googleQuery: 'tesouro ipca investimento'
      },
      {
        name: 'Tesouro Prefixado',
        description: 'Taxa fixa conhecida desde o início do investimento.',
        pros: ['Taxa conhecida', 'Simplicidade', 'Isento de IR para PF'],
        cons: ['Alta volatilidade', 'Risco de perda se juros subirem'],
        googleQuery: 'tesouro prefixado investimento'
      },
      {
        name: 'CDB (Certificado de Depósito Bancário)',
        description: 'Títulos emitidos por bancos, geralmente indexados ao CDI.',
        pros: ['Proteção FGC', 'Liquidez variável', 'Taxas competitivas'],
        cons: ['Risco de crédito do banco', 'Tributação de IR'],
        googleQuery: 'CDB investimento bancário'
      },
      {
        name: 'LCI/LCA (Letras de Crédito)',
        description: 'Títulos bancários isentos de IR para pessoa física.',
        pros: ['Isenção de IR', 'Proteção FGC', 'Diversificação'],
        cons: ['Liquidez limitada', 'Risco de crédito do banco'],
        googleQuery: 'LCI LCA investimento'
      },
      {
        name: 'Debêntures',
        description: 'Títulos de dívida corporativa, podem ser incentivadas (isentas de IR).',
        pros: ['Taxas atrativas', 'Isenção de IR (incentivadas)', 'Diversificação'],
        cons: ['Risco de crédito da empresa', 'Baixa liquidez'],
        googleQuery: 'debêntures investimento'
      },
      {
        name: 'CRI/CRA (Certificados de Recebíveis)',
        description: 'Securitização de recebíveis imobiliários ou do agronegócio.',
        pros: ['Isenção de IR', 'Diversificação setorial'],
        cons: ['Risco do lastro', 'Baixa liquidez', 'Complexidade'],
        googleQuery: 'CRI CRA securitização'
      }
    ],
    estrategias: [
      {
        name: 'Ladder de Vencimentos',
        description: 'Distribuir investimentos em diferentes prazos para aproveitar a curva de juros.',
        pros: ['Aproveita curva de juros', 'Liquidez escalonada', 'Reduz risco de reinvestimento'],
        cons: ['Complexidade de gestão', 'Pode perder oportunidades pontuais'],
        googleQuery: 'ladder vencimentos renda fixa'
      },
      {
        name: 'Barbell Strategy',
        description: 'Concentrar em títulos de curto prazo (liquidez) e longo prazo (retorno).',
        pros: ['Liquidez e retorno', 'Flexibilidade', 'Proteção contra mudanças de juros'],
        cons: ['Gestão mais ativa', 'Custos de transação'],
        googleQuery: 'barbell strategy renda fixa'
      },
      {
        name: 'Duration Matching',
        description: 'Alinhar a duration da carteira com o horizonte de investimento.',
        pros: ['Reduz risco de taxa', 'Objetivo claro', 'Disciplina'],
        cons: ['Menor flexibilidade', 'Pode perder oportunidades'],
        googleQuery: 'duration matching estratégia'
      }
    ],
    riscos: [
      {
        name: 'Risco de Taxa de Juros',
        description: 'Preço dos títulos cai quando os juros sobem.',
        mitigacao: 'Duration matching, diversificação de prazos',
        googleQuery: 'risco taxa juros renda fixa'
      },
      {
        name: 'Risco de Crédito',
        description: 'Possibilidade do emissor não honrar os pagamentos.',
        mitigacao: 'Diversificação de emissores, análise de rating',
        googleQuery: 'risco crédito renda fixa'
      },
      {
        name: 'Risco de Liquidez',
        description: 'Dificuldade de vender o título sem perda significativa.',
        mitigacao: 'Manter parcela em títulos líquidos, diversificação',
        googleQuery: 'risco liquidez renda fixa'
      },
      {
        name: 'Risco de Reinvestimento',
        description: 'Receber os valores em momento de taxas baixas.',
        mitigacao: 'Ladder de vencimentos, títulos com cupom',
        googleQuery: 'risco reinvestimento renda fixa'
      }
    ]
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 space-y-8">
        {/* Header com design moderno */}
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Guia do Mercado Financeiro
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              Conhecimento completo para investir com confiança. Estratégias, indicadores e análise de ativos.
            </p>
          </div>
        </div>

              {/* Sistema de Abas com Design Moderno */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="space-y-4 mb-6">
            {/* Menu de Navegação Responsivo */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2 sm:pb-0">
                <button
                  onClick={() => setActiveTab('geral')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'geral'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:shadow-md'
                  }`}
                >
                  Guia Geral
                </button>
                <button
                  onClick={() => setActiveTab('renda-fixa')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'renda-fixa'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:shadow-md'
                  }`}
                >
                  Renda Fixa
                </button>
                <button
                  onClick={() => setActiveTab('renda-variavel')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'renda-variavel'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:shadow-md'
                  }`}
                >
                  Renda Variável
                </button>
                <button
                  onClick={() => setActiveTab('renda-variavel-internacional')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'renda-variavel-internacional'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:shadow-md'
                  }`}
                >
                  <span className="hidden xs:inline">Renda Variável Internacional</span>
                  <span className="xs:hidden">RV Internacional</span>
                </button>
                <button
                  onClick={() => setActiveTab('renda-fixa-internacional')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'renda-fixa-internacional'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:shadow-md'
                  }`}
                >
                  <span className="hidden xs:inline">Renda Fixa Internacional</span>
                  <span className="xs:hidden">RF Internacional</span>
                </button>
              </div>
              
              {/* Checkbox de Notas de Mercado */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input 
                    type="checkbox" 
                    checked={showMarketNotes} 
                    onChange={(e) => setShowMarketNotes(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="hidden sm:inline">Mostrar notas de mercado (não-técnicas)</span>
                  <span className="sm:hidden">Notas de mercado</span>
                </label>
              </div>
            </div>
          </div>

                    {/* Conteúdo das Abas */}
          <div className="space-y-8">

            {activeTab === 'geral' && (
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
                    {it.technical.map((t) => (
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
                        {it.notes.map((n) => (
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
                                      {f.reasons.map((r) => (
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
                                      {f.cautions.map((r) => (
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
            )}

            {activeTab === 'renda-fixa' && (
              <div className="space-y-8">
                {/* Gráfico dos Índices */}
                <IndexChart />
                
                {/* Conceitos Fundamentais */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Conceitos Fundamentais</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_FIXA_DETAILS.conceitos.map((conceito) => (
                      <div 
                        key={conceito.title} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(conceito.googleQuery), '_blank')}
                            title={`Pesquisar ${conceito.title} no Google`}
                          >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{conceito.title}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{conceito.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tipos de Títulos */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Tipos de Títulos</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_FIXA_DETAILS.tipos.map((tipo) => (
                      <div 
                        key={tipo.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(tipo.googleQuery), '_blank')}
                            title={`Pesquisar ${tipo.name} no Google`}
                          >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{tipo.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{tipo.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="space-y-1">
                              {tipo.pros.map((pro) => (
                                <li key={pro} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="space-y-1">
                              {tipo.cons.map((con) => (
                                <li key={con} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estratégias */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Estratégias de Renda Fixa</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_FIXA_DETAILS.estrategias.map((estrategia) => (
                      <div 
                        key={estrategia.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(estrategia.googleQuery), '_blank')}
                            title={`Pesquisar ${estrategia.name} no Google`}
                          >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{estrategia.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{estrategia.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="space-y-1">
                              {estrategia.pros.map((pro) => (
                                <li key={pro} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="space-y-1">
                              {estrategia.cons.map((con) => (
                                <li key={con} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Riscos */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <AlertCircle className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Principais Riscos</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_FIXA_DETAILS.riscos.map((risco) => (
                      <div 
                        key={risco.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(risco.googleQuery), '_blank')}
                            title={`Pesquisar ${risco.name} no Google`}
                          >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{risco.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-3 leading-relaxed">{risco.description}</p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Mitigação</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{risco.mitigacao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'renda-variavel' && (
              <div className="space-y-8">
                {/* Gráfico dos Índices */}
                <IndexChart />
                
                {/* Conceitos Fundamentais */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="w-6 h-6 text-primary" />
          </div>
                    <h3 className="text-xl font-semibold text-foreground">Conceitos Fundamentais</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_VARIAVEL_DETAILS.conceitos.map((conceito) => (
                      <div 
                        key={conceito.title} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(conceito.googleQuery), '_blank')}
                        title={`Pesquisar ${conceito.title} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{conceito.title}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{conceito.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tipos de Ativos */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <PieChart className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Tipos de Ativos</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_VARIAVEL_DETAILS.tipos.map((tipo) => (
                      <div 
                        key={tipo.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(tipo.googleQuery), '_blank')}
                        title={`Pesquisar ${tipo.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{tipo.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{tipo.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="space-y-1">
                              {tipo.pros.map((pro) => (
                                <li key={pro} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="space-y-1">
                              {tipo.cons.map((con) => (
                                <li key={con} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estratégias */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Estratégias de Renda Variável</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_VARIAVEL_DETAILS.estrategias.map((estrategia) => (
                      <div 
                        key={estrategia.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(estrategia.googleQuery), '_blank')}
                        title={`Pesquisar ${estrategia.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{estrategia.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{estrategia.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="space-y-1">
                              {estrategia.pros.map((pro) => (
                                <li key={pro} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="space-y-1">
                              {estrategia.cons.map((con) => (
                                <li key={con} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Setores */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Principais Setores</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_VARIAVEL_DETAILS.setores.map((setor) => (
                      <div 
                        key={setor.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(setor.googleQuery), '_blank')}
                        title={`Pesquisar ${setor.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{setor.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{setor.description}</p>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-blue-600 dark:text-blue-400">Características</p>
                            <ul className="space-y-1">
                              {setor.caracteristicas.map((carac) => (
                                <li key={carac} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  {carac}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-purple-600 dark:text-purple-400">Exemplos de Ativos</p>
                            <div className="flex flex-wrap gap-2">
                              {setor.exemplos.map((exemplo) => (
                                <button
                                  key={exemplo}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchParams({ ticker: exemplo });
                                  }}
                                  className="text-xs px-3 py-1 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all duration-200"
                                  title={`Buscar ${exemplo}`}
                                >
                                  {exemplo}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Riscos */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <AlertCircle className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Principais Riscos</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_VARIAVEL_DETAILS.riscos.map((risco) => (
                      <div 
                        key={risco.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(risco.googleQuery), '_blank')}
                        title={`Pesquisar ${risco.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{risco.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-3 leading-relaxed">{risco.description}</p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Mitigação</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{risco.mitigacao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'renda-variavel-internacional' && (
              <div className="space-y-8">
                {/* Gráfico dos Índices */}
                <IndexChart />
                
                {/* Conceitos Fundamentais */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Conceitos Fundamentais</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_VARIAVEL_INTERNACIONAL_DETAILS.conceitos.map((conceito) => (
                      <div 
                        key={conceito.title} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(conceito.googleQuery), '_blank')}
                        title={`Pesquisar ${conceito.title} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{conceito.title}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{conceito.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tipos de Ativos */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <PieChart className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Tipos de Ativos</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_VARIAVEL_INTERNACIONAL_DETAILS.tipos.map((tipo) => (
                      <div 
                        key={tipo.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(tipo.googleQuery), '_blank')}
                        title={`Pesquisar ${tipo.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{tipo.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{tipo.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="space-y-1">
                              {tipo.pros.map((pro) => (
                                <li key={pro} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="space-y-1">
                              {tipo.cons.map((con) => (
                                <li key={con} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mercados */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Principais Mercados</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_VARIAVEL_INTERNACIONAL_DETAILS.mercados.map((mercado) => (
                      <div 
                        key={mercado.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(mercado.googleQuery), '_blank')}
                        title={`Pesquisar ${mercado.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{mercado.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{mercado.description}</p>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-blue-600 dark:text-blue-400">Características</p>
                            <ul className="space-y-1">
                              {mercado.caracteristicas.map((carac) => (
                                <li key={carac} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  {carac}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-purple-600 dark:text-purple-400">Exemplos de Ativos</p>
                            <div className="flex flex-wrap gap-2">
                              {mercado.exemplos.map((exemplo) => (
                                <button
                                  key={exemplo}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchParams({ ticker: exemplo });
                                  }}
                                  className="text-xs px-3 py-1 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all duration-200"
                                  title={`Buscar ${exemplo}`}
                                >
                                  {exemplo}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estratégias */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Estratégias de Investimento Internacional</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_VARIAVEL_INTERNACIONAL_DETAILS.estrategias.map((estrategia) => (
                      <div 
                        key={estrategia.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(estrategia.googleQuery), '_blank')}
                        title={`Pesquisar ${estrategia.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{estrategia.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{estrategia.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="space-y-1">
                              {estrategia.pros.map((pro) => (
                                <li key={pro} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="space-y-1">
                              {estrategia.cons.map((con) => (
                                <li key={con} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Como Investir */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ArrowUpRight className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Como Investir do Brasil</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_VARIAVEL_INTERNACIONAL_DETAILS.comoInvestir.map((metodo) => (
                      <div 
                        key={metodo.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(metodo.googleQuery), '_blank')}
                        title={`Pesquisar ${metodo.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{metodo.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{metodo.description}</p>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="space-y-1">
                              {metodo.vantagens.map((vantagem) => (
                                <li key={vantagem} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  {vantagem}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="space-y-1">
                              {metodo.desvantagens.map((desvantagem) => (
                                <li key={desvantagem} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  {desvantagem}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-purple-600 dark:text-purple-400">Exemplos</p>
                            <div className="flex flex-wrap gap-2">
                              {metodo.exemplos.map((exemplo) => (
                                <span
                                  key={exemplo}
                                  className="text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                >
                                  {exemplo}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Riscos */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <AlertCircle className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Principais Riscos</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_VARIAVEL_INTERNACIONAL_DETAILS.riscos.map((risco) => (
                      <div 
                        key={risco.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(risco.googleQuery), '_blank')}
                        title={`Pesquisar ${risco.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{risco.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-3 leading-relaxed">{risco.description}</p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Mitigação</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{risco.mitigacao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'renda-fixa-internacional' && (
              <div className="space-y-8">
                {/* Gráfico dos Índices */}
                <IndexChart />
                
                {/* Conceitos Fundamentais */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Conceitos Fundamentais</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_FIXA_INTERNACIONAL_DETAILS.conceitos.map((conceito) => (
                      <div 
                        key={conceito.title} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(conceito.googleQuery), '_blank')}
                        title={`Pesquisar ${conceito.title} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{conceito.title}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{conceito.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tipos de Ativos */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <PieChart className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Tipos de Ativos</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_FIXA_INTERNACIONAL_DETAILS.tipos.map((tipo) => (
                      <div 
                        key={tipo.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(tipo.googleQuery), '_blank')}
                        title={`Pesquisar ${tipo.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{tipo.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{tipo.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="space-y-1">
                              {tipo.pros.map((pro) => (
                                <li key={pro} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="space-y-1">
                              {tipo.cons.map((con) => (
                                <li key={con} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mercados */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Principais Mercados</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_FIXA_INTERNACIONAL_DETAILS.mercados.map((mercado) => (
                      <div 
                        key={mercado.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(mercado.googleQuery), '_blank')}
                        title={`Pesquisar ${mercado.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{mercado.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{mercado.description}</p>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-blue-600 dark:text-blue-400">Características</p>
                            <ul className="space-y-1">
                              {mercado.caracteristicas.map((carac) => (
                                <li key={carac} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  {carac}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-purple-600 dark:text-purple-400">Exemplos de Ativos</p>
                            <div className="flex flex-wrap gap-2">
                              {mercado.exemplos.map((exemplo) => (
                                <button
                                  key={exemplo}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchParams({ ticker: exemplo });
                                  }}
                                  className="text-xs px-3 py-1 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all duration-200"
                                  title={`Buscar ${exemplo}`}
                                >
                                  {exemplo}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estratégias */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Estratégias de Renda Fixa Internacional</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_FIXA_INTERNACIONAL_DETAILS.estrategias.map((estrategia) => (
                      <div 
                        key={estrategia.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(estrategia.googleQuery), '_blank')}
                        title={`Pesquisar ${estrategia.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{estrategia.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{estrategia.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="space-y-1">
                              {estrategia.pros.map((pro) => (
                                <li key={pro} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="space-y-1">
                              {estrategia.cons.map((con) => (
                                <li key={con} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Como Investir */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ArrowUpRight className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Como Investir do Brasil</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_FIXA_INTERNACIONAL_DETAILS.comoInvestir.map((metodo) => (
                      <div 
                        key={metodo.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(metodo.googleQuery), '_blank')}
                        title={`Pesquisar ${metodo.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{metodo.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-4 leading-relaxed">{metodo.description}</p>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="space-y-1">
                              {metodo.vantagens.map((vantagem) => (
                                <li key={vantagem} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                  {vantagem}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="space-y-1">
                              {metodo.desvantagens.map((desvantagem) => (
                                <li key={desvantagem} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  {desvantagem}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-semibold mb-2 text-purple-600 dark:text-purple-400">Exemplos</p>
                            <div className="flex flex-wrap gap-2">
                              {metodo.exemplos.map((exemplo) => (
                                <span
                                  key={exemplo}
                                  className="text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                >
                                  {exemplo}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Riscos */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <AlertCircle className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Principais Riscos</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RENDA_FIXA_INTERNACIONAL_DETAILS.riscos.map((risco) => (
                      <div 
                        key={risco.name} 
                        className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        onClick={() => window.open(googleUrl(risco.googleQuery), '_blank')}
                        title={`Pesquisar ${risco.name} no Google`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground text-lg">{risco.name}</h4>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-3 leading-relaxed">{risco.description}</p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Mitigação</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{risco.mitigacao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


