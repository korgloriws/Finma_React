// Tipos para o sistema Finma

export interface AtivoInfo {
  ticker: string
  nome: string
  preco_atual: number | null
  pl: number | null
  pvp: number | null
  dy: number | null
  roe: number | null
  setor: string
  pais: string
}

export interface AtivoDetalhes {
  info: Record<string, any>
  historico: Array<Record<string, any>>
  dividends: Record<string, any>
}

export interface TickerSugestao {
  label: string
  value: string
}

export interface HistoricoData {
  Date: string
  Open: number
  High: number
  Low: number
  Close: number
  Volume: number
  Dividends?: number
  Stock_Splits?: number
}

export interface DividendYieldData {
  Date: string
  DividendYield: number
  Close: number
}


export interface AtivoCarteira {
  id: number
  ticker: string
  nome_completo: string
  quantidade: number
  preco_atual: number
  valor_total: number
  data_adicao: string
  tipo: string
  dy: number | null
  pl: number | null
  pvp: number | null
  roe: number | null
  indexador?: 'CDI' | 'IPCA' | 'SELIC' | null
  indexador_pct?: number | null
}

export interface Movimentacao {
  id: number
  data: string
  ticker: string
  nome_completo: string
  quantidade: number
  preco: number
  tipo: 'compra' | 'venda'
}

export interface Marmita {
  id: number
  data: string
  valor: number
  comprou: boolean
}

export interface GastoMensal {
  mes: string
  valor: number
}

export interface Receita {
  id: number
  nome: string
  valor: number
  data: string
  categoria?: string
  tipo?: string // 'fixo' | 'variavel' | outro
  recorrencia?: string // 'mensal' | 'semanal' | 'anual' | 'nenhuma'
  parcelas_total?: number
  parcela_atual?: number
  grupo_parcela?: string
  observacao?: string
}

export interface Cartao {
  id: number
  nome: string
  valor: number
  pago: string
  data: string
  categoria?: string
  tipo?: string
  recorrencia?: string
  parcelas_total?: number
  parcela_atual?: number
  grupo_parcela?: string
  observacao?: string
}

export interface OutroGasto {
  id: number
  nome: string
  valor: number
  data: string
  categoria?: string
  tipo?: string
  recorrencia?: string
  parcelas_total?: number
  parcela_atual?: number
  grupo_parcela?: string
  observacao?: string
}

export interface FluxoCaixaItem {
  id?: number
  fonte: 'receita' | 'cartao' | 'outro'
  nome: string
  valor: number
  data: string
  categoria?: string
  tipo?: string
  recorrencia?: string
  parcelas_total?: number
  parcela_atual?: number
  grupo_parcela?: string
  observacao?: string
  projetado?: boolean
}

export interface FluxoCaixaDiaResumo {
  data: string
  receitas: number
  despesas: number
  saldo_dia: number
  saldo_acumulado: number
}

export interface EvolucaoFinanceira {
  data: string
  receitas: number
  despesas: number
  saldo_dia: number
  saldo_acumulado: number
}

export interface TotalPorPessoa {
  quem_usou: string
  valor: number
}

export interface ReceitasDespesas {
  receitas: number
  despesas: number
}

// Análise
export interface AtivoAnalise {
  ticker: string
  nome_completo: string
  setor: string
  industria: string
  website: string
  preco_atual: number
  roe: number
  dividend_yield: number
  pl: number
  pvp: number
  pais: string
  tipo: string
  liquidez_diaria: number
  volume_medio: number
}

export interface ResumoAnalise {
  total_ativos: number
  media_dy: number
  media_pl: number
  media_roe: number
  maior_dy: number
  menor_pl: number
  melhor_roe: number
  ativo_maior_dy: string
  ativo_menor_pl: string
  ativo_melhor_roe: string
}

export interface FiltrosAnalise {
  roe_min?: number
  dy_min?: number
  dy_max?: number
  pl_min?: number
  pl_max?: number
  pvp_max?: number
  liq_min?: number
} 

 