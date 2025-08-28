import { useMemo, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ativoService } from '../services/api'
import { formatNumber, formatPercentage } from '../utils/formatters'
import { ExternalLink } from 'lucide-react'

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

export default function GuiaMercadoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputTicker, setInputTicker] = useState('')
  const ticker = searchParams.get('ticker') || ''
  const [leftKey, setLeftKey] = useState('buyhold')
  const [rightKey, setRightKey] = useState('dividends')
  const [showMarketNotes, setShowMarketNotes] = useState(true)
  const [activeTab, setActiveTab] = useState<'geral' | 'renda-fixa' | 'renda-variavel' | 'renda-variavel-internacional' | 'renda-fixa-internacional'>('geral')

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
              <li key={k}>
                <a
                  href={googleUrl(`${k} indicador financeiro`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  title={`Pesquisar ${k} no Google`}
                >
                  {k}
                </a>
              </li>
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

      <div className="space-y-8">
        <section className="space-y-8">
          {/* Sistema de Abas */}
          <div className="flex flex-wrap gap-2 mb-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('geral')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'geral'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    Guia Geral
                  </button>
                  <button
                    onClick={() => setActiveTab('renda-fixa')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'renda-fixa'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    Renda Fixa
                  </button>
                  <button
                    onClick={() => setActiveTab('renda-variavel')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'renda-variavel'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    Renda Variável
                  </button>
                  <button
                    onClick={() => setActiveTab('renda-variavel-internacional')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'renda-variavel-internacional'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    Renda Variável Internacional
                  </button>
                  <button
                    onClick={() => setActiveTab('renda-fixa-internacional')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'renda-fixa-internacional'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    Renda Fixa Internacional
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={showMarketNotes} onChange={(e) => setShowMarketNotes(e.target.checked)} />
                    Mostrar notas de mercado (não-técnicas)
                  </label>
                </div>
              </div>
            </div>

            {activeTab === 'geral' && (
              <>
                <div id="indicadores" className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-3">Indicadores: definições e fórmulas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {INDICATORS.map((it) => (
                      <div key={it.id} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-1 flex items-center gap-2">
                          {it.name}
                          <a
                            href={googleUrl(`${it.name} indicador financeiro`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${it.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
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
              </>
            )}

            {activeTab === 'renda-fixa' && (
              <div className="space-y-8">
                {/* Conceitos Fundamentais */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Conceitos Fundamentais
                    <a
                      href={googleUrl('renda fixa conceitos fundamentais')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar conceitos de renda fixa no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_FIXA_DETAILS.conceitos.map((conceito) => (
                      <div key={conceito.title} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {conceito.title}
                          <a
                            href={googleUrl(conceito.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${conceito.title} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground">{conceito.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tipos de Títulos */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Tipos de Títulos
                    <a
                      href={googleUrl('tipos títulos renda fixa brasil')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar tipos de títulos no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_FIXA_DETAILS.tipos.map((tipo) => (
                      <div key={tipo.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {tipo.name}
                          <a
                            href={googleUrl(tipo.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${tipo.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{tipo.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {tipo.pros.map((pro) => (
                                <li key={pro}>{pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {tipo.cons.map((con) => (
                                <li key={con}>{con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estratégias */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Estratégias de Renda Fixa
                    <a
                      href={googleUrl('estratégias renda fixa investimento')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar estratégias de renda fixa no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_FIXA_DETAILS.estrategias.map((estrategia) => (
                      <div key={estrategia.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {estrategia.name}
                          <a
                            href={googleUrl(estrategia.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${estrategia.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{estrategia.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {estrategia.pros.map((pro) => (
                                <li key={pro}>{pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {estrategia.cons.map((con) => (
                                <li key={con}>{con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Riscos */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Principais Riscos
                    <a
                      href={googleUrl('riscos renda fixa investimento')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar riscos de renda fixa no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_FIXA_DETAILS.riscos.map((risco) => (
                      <div key={risco.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {risco.name}
                          <a
                            href={googleUrl(risco.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${risco.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">{risco.description}</p>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Mitigação: {risco.mitigacao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'renda-variavel' && (
              <div className="space-y-8">
                {/* Conceitos Fundamentais */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Conceitos Fundamentais
                    <a
                      href={googleUrl('renda variável conceitos fundamentais')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar conceitos de renda variável no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_VARIAVEL_DETAILS.conceitos.map((conceito) => (
                      <div key={conceito.title} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {conceito.title}
                          <a
                            href={googleUrl(conceito.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${conceito.title} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground">{conceito.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tipos de Ativos */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Tipos de Ativos
                    <a
                      href={googleUrl('tipos ativos renda variável brasil')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar tipos de ativos no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_VARIAVEL_DETAILS.tipos.map((tipo) => (
                      <div key={tipo.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {tipo.name}
                          <a
                            href={googleUrl(tipo.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${tipo.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{tipo.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {tipo.pros.map((pro) => (
                                <li key={pro}>{pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {tipo.cons.map((con) => (
                                <li key={con}>{con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estratégias */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Estratégias de Renda Variável
                    <a
                      href={googleUrl('estratégias renda variável investimento')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar estratégias de renda variável no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_VARIAVEL_DETAILS.estrategias.map((estrategia) => (
                      <div key={estrategia.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {estrategia.name}
                          <a
                            href={googleUrl(estrategia.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${estrategia.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{estrategia.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {estrategia.pros.map((pro) => (
                                <li key={pro}>{pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {estrategia.cons.map((con) => (
                                <li key={con}>{con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Setores */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Principais Setores
                    <a
                      href={googleUrl('setores ações mercado brasileiro')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar setores do mercado no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_VARIAVEL_DETAILS.setores.map((setor) => (
                      <div key={setor.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {setor.name}
                          <a
                            href={googleUrl(setor.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${setor.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{setor.description}</p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-blue-600 dark:text-blue-400">Características</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {setor.caracteristicas.map((carac) => (
                                <li key={carac}>{carac}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-purple-600 dark:text-purple-400">Exemplos de Ativos</p>
                            <div className="flex flex-wrap gap-2">
                              {setor.exemplos.map((exemplo) => (
                                <button
                                  key={exemplo}
                                  onClick={() => setSearchParams({ ticker: exemplo })}
                                  className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 text-foreground"
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
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Principais Riscos
                    <a
                      href={googleUrl('riscos renda variável investimento')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar riscos de renda variável no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_VARIAVEL_DETAILS.riscos.map((risco) => (
                      <div key={risco.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {risco.name}
                          <a
                            href={googleUrl(risco.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${risco.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">{risco.description}</p>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Mitigação: {risco.mitigacao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'renda-variavel-internacional' && (
              <div className="space-y-8">
                {/* Conceitos Fundamentais */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Conceitos Fundamentais
                    <a
                      href={googleUrl('investimento internacional conceitos fundamentais')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar conceitos de investimento internacional no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_VARIAVEL_INTERNACIONAL_DETAILS.conceitos.map((conceito) => (
                      <div key={conceito.title} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {conceito.title}
                          <a
                            href={googleUrl(conceito.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${conceito.title} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground">{conceito.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tipos de Ativos */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Tipos de Ativos
                    <a
                      href={googleUrl('tipos ativos investimento internacional')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar tipos de ativos internacionais no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_VARIAVEL_INTERNACIONAL_DETAILS.tipos.map((tipo) => (
                      <div key={tipo.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {tipo.name}
                          <a
                            href={googleUrl(tipo.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${tipo.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{tipo.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {tipo.pros.map((pro) => (
                                <li key={pro}>{pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {tipo.cons.map((con) => (
                                <li key={con}>{con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mercados */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Principais Mercados
                    <a
                      href={googleUrl('mercados internacionais investimento')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar mercados internacionais no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_VARIAVEL_INTERNACIONAL_DETAILS.mercados.map((mercado) => (
                      <div key={mercado.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {mercado.name}
                          <a
                            href={googleUrl(mercado.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${mercado.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{mercado.description}</p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-blue-600 dark:text-blue-400">Características</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {mercado.caracteristicas.map((carac) => (
                                <li key={carac}>{carac}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-purple-600 dark:text-purple-400">Exemplos de Ativos</p>
                            <div className="flex flex-wrap gap-2">
                              {mercado.exemplos.map((exemplo) => (
                                <button
                                  key={exemplo}
                                  onClick={() => setSearchParams({ ticker: exemplo })}
                                  className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 text-foreground"
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
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Estratégias de Investimento Internacional
                    <a
                      href={googleUrl('estratégias investimento internacional')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar estratégias de investimento internacional no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_VARIAVEL_INTERNACIONAL_DETAILS.estrategias.map((estrategia) => (
                      <div key={estrategia.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {estrategia.name}
                          <a
                            href={googleUrl(estrategia.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${estrategia.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{estrategia.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {estrategia.pros.map((pro) => (
                                <li key={pro}>{pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {estrategia.cons.map((con) => (
                                <li key={con}>{con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Como Investir */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Como Investir do Brasil
                    <a
                      href={googleUrl('como investir internacional Brasil')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar como investir internacionalmente do Brasil no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_VARIAVEL_INTERNACIONAL_DETAILS.comoInvestir.map((metodo) => (
                      <div key={metodo.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {metodo.name}
                          <a
                            href={googleUrl(metodo.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${metodo.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{metodo.description}</p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {metodo.vantagens.map((vantagem) => (
                                <li key={vantagem}>{vantagem}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {metodo.desvantagens.map((desvantagem) => (
                                <li key={desvantagem}>{desvantagem}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-purple-600 dark:text-purple-400">Exemplos</p>
                            <div className="flex flex-wrap gap-2">
                              {metodo.exemplos.map((exemplo) => (
                                <span
                                  key={exemplo}
                                  className="text-xs px-2 py-1 rounded bg-accent text-foreground"
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
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Principais Riscos
                    <a
                      href={googleUrl('riscos investimento internacional')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar riscos de investimento internacional no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_VARIAVEL_INTERNACIONAL_DETAILS.riscos.map((risco) => (
                      <div key={risco.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {risco.name}
                          <a
                            href={googleUrl(risco.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${risco.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">{risco.description}</p>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Mitigação: {risco.mitigacao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'renda-fixa-internacional' && (
              <div className="space-y-8">
                {/* Conceitos Fundamentais */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Conceitos Fundamentais
                    <a
                      href={googleUrl('renda fixa internacional conceitos fundamentais')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar conceitos de renda fixa internacional no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_FIXA_INTERNACIONAL_DETAILS.conceitos.map((conceito) => (
                      <div key={conceito.title} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {conceito.title}
                          <a
                            href={googleUrl(conceito.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${conceito.title} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground">{conceito.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tipos de Ativos */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Tipos de Ativos
                    <a
                      href={googleUrl('tipos ativos renda fixa internacional')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar tipos de ativos de renda fixa internacional no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_FIXA_INTERNACIONAL_DETAILS.tipos.map((tipo) => (
                      <div key={tipo.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {tipo.name}
                          <a
                            href={googleUrl(tipo.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${tipo.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{tipo.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {tipo.pros.map((pro) => (
                                <li key={pro}>{pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {tipo.cons.map((con) => (
                                <li key={con}>{con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mercados */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Principais Mercados
                    <a
                      href={googleUrl('mercados renda fixa internacional')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar mercados de renda fixa internacional no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_FIXA_INTERNACIONAL_DETAILS.mercados.map((mercado) => (
                      <div key={mercado.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {mercado.name}
                          <a
                            href={googleUrl(mercado.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${mercado.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{mercado.description}</p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-blue-600 dark:text-blue-400">Características</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {mercado.caracteristicas.map((carac) => (
                                <li key={carac}>{carac}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-purple-600 dark:text-purple-400">Exemplos de Ativos</p>
                            <div className="flex flex-wrap gap-2">
                              {mercado.exemplos.map((exemplo) => (
                                <button
                                  key={exemplo}
                                  onClick={() => setSearchParams({ ticker: exemplo })}
                                  className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 text-foreground"
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
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Estratégias de Renda Fixa Internacional
                    <a
                      href={googleUrl('estratégias renda fixa internacional')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar estratégias de renda fixa internacional no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_FIXA_INTERNACIONAL_DETAILS.estrategias.map((estrategia) => (
                      <div key={estrategia.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {estrategia.name}
                          <a
                            href={googleUrl(estrategia.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${estrategia.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{estrategia.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {estrategia.pros.map((pro) => (
                                <li key={pro}>{pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {estrategia.cons.map((con) => (
                                <li key={con}>{con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Como Investir */}
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Como Investir do Brasil
                    <a
                      href={googleUrl('como investir renda fixa internacional Brasil')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar como investir em renda fixa internacional do Brasil no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_FIXA_INTERNACIONAL_DETAILS.comoInvestir.map((metodo) => (
                      <div key={metodo.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {metodo.name}
                          <a
                            href={googleUrl(metodo.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${metodo.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">{metodo.description}</p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {metodo.vantagens.map((vantagem) => (
                                <li key={vantagem}>{vantagem}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">Desvantagens</p>
                            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                              {metodo.desvantagens.map((desvantagem) => (
                                <li key={desvantagem}>{desvantagem}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-purple-600 dark:text-purple-400">Exemplos</p>
                            <div className="flex flex-wrap gap-2">
                              {metodo.exemplos.map((exemplo) => (
                                <span
                                  key={exemplo}
                                  className="text-xs px-2 py-1 rounded bg-accent text-foreground"
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
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Principais Riscos
                    <a
                      href={googleUrl('riscos renda fixa internacional')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline text-xs"
                      title="Pesquisar riscos de renda fixa internacional no Google"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Google
                    </a>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {RENDA_FIXA_INTERNACIONAL_DETAILS.riscos.map((risco) => (
                      <div key={risco.name} className="border border-border rounded-md p-3">
                        <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                          {risco.name}
                          <a
                            href={googleUrl(risco.googleQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                            title={`Pesquisar ${risco.name} no Google`}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Google
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">{risco.description}</p>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Mitigação: {risco.mitigacao}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    )
  }


