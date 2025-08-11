import axios from 'axios'
import { AtivoInfo, AtivoDetalhes, TickerSugestao, AtivoCarteira, Movimentacao, Marmita, GastoMensal, Receita, Cartao, OutroGasto, EvolucaoFinanceira, TotalPorPessoa, ReceitasDespesas, AtivoAnalise, ResumoAnalise, FiltrosAnalise, } from '../types'
import { normalizeTicker } from '../utils/tickerUtils'

const API_BASE_URL = (typeof import.meta !== 'undefined' && (import.meta as ImportMeta & { env?: any })?.env?.VITE_API_BASE_URL)
  ? (import.meta as ImportMeta & { env?: any }).env.VITE_API_BASE_URL
  : '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 1200000,
  withCredentials: true,
})


api.interceptors.request.use(
  (config) => {
    // Não enviar usuário via header; autenticação deve ser feita via login
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)


api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const ativoService = {

  getDetalhes: async (ticker: string): Promise<AtivoDetalhes> => {
    const normalizedTicker = normalizeTicker(ticker)
    const response = await api.get(`/ativo/${normalizedTicker}`)
    return response.data
  },


  getHistorico: async (ticker: string, periodo: string = '1y'): Promise<Array<Record<string, any>>> => {
    const normalizedTicker = normalizeTicker(ticker)
    const response = await api.get(`/ativo/${normalizedTicker}/historico?periodo=${periodo}`)
    return response.data
  },


  comparar: async (tickers: string[]): Promise<AtivoInfo[]> => {
    const normalizedTickers = tickers.map(normalizeTicker)
    const response = await api.post('/comparar', { tickers: normalizedTickers })
    return response.data
  },


  getSugestoes: async (): Promise<TickerSugestao[]> => {
    const response = await api.get('/tickers/sugestoes')
    return response.data
  },


  startLoad: async (): Promise<void> => {
    await api.post('/start_load')
  },


  getData: async (): Promise<any[]> => {
    const response = await api.get('/get_data')
    return response.data
  },


  getLogoUrl: async (ticker: string): Promise<string | null> => {
    try {
      const normalizedTicker = normalizeTicker(ticker)
      const response = await api.get(`/logo/${normalizedTicker}`)
      return response.data.logo_url
    } catch (error) {
      return null
    }
  },
}

export const carteiraService = {

  getCarteira: async (): Promise<AtivoCarteira[]> => {
    const response = await api.get('/carteira')
    return response.data
  },


  adicionarAtivo: async (ticker: string, quantidade: number, tipo?: string): Promise<any> => {
    const normalizedTicker = normalizeTicker(ticker)
    const response = await api.post('/carteira/adicionar', {
      ticker: normalizedTicker,
      quantidade,
      tipo
    })
    return response.data
  },


  removerAtivo: async (id: number): Promise<any> => {
    const response = await api.delete(`/carteira/remover/${id}`)
    return response.data
  },


  atualizarAtivo: async (id: number, quantidade: number): Promise<any> => {
    const response = await api.put(`/carteira/atualizar/${id}`, {
      quantidade
    })
    return response.data
  },


  getMovimentacoes: async (mes?: number, ano?: number): Promise<Movimentacao[]> => {
    const params = new URLSearchParams()
    if (mes) params.append('mes', mes.toString())
    if (ano) params.append('ano', ano.toString())
    
    const response = await api.get(`/carteira/movimentacoes?${params.toString()}`)
    return response.data
  },

  getHistorico: async (periodo: string = 'mensal'): Promise<{
    datas: string[]
    carteira: (number|null)[]
    ibov: (number|null)[]
    ivvb11: (number|null)[]
    ifix: (number|null)[]
    ipca: (number|null)[]
    carteira_valor: number[]
  }> => {
    const response = await api.get(`/carteira/historico?periodo=${periodo}`)
    return response.data
  },

  getProventos: async (tickers: string[]): Promise<Array<{
    ticker: string
    nome: string
    proventos: Array<{
      data: string
      valor: number
      tipo: string
    }>
    erro?: string
  }>> => {
    try {
      const response = await api.post('/carteira/proventos', { tickers })
      return response.data
    } catch (error) {
      console.error('Erro ao buscar proventos:', error)
      return []
    }
  },

  getProventosComFiltro: async (tickers: string[], periodo: string = 'total'): Promise<Array<{
    ticker: string
    nome: string
    proventos: Array<{
      data: string
      valor: number
      tipo: string
    }>
    erro?: string
  }>> => {
    try {
      const response = await api.post('/carteira/proventos', { tickers, periodo })
      return response.data
    } catch (error) {
      console.error('Erro ao buscar proventos com filtro:', error)
      return []
    }
  },

  getProventosRecebidos: async (periodo: string = 'total'): Promise<Array<{
    ticker: string
    nome: string
    quantidade_carteira: number
    data_aquisicao?: string
    proventos_recebidos: Array<{
      data: string
      valor_unitario: number
      quantidade: number
      valor_recebido: number
      tipo: string
    }>
    total_recebido: number
  }>> => {
    try {
      const response = await api.get(`/carteira/proventos-recebidos?periodo=${periodo}`)
      return response.data
    } catch (error) {
      console.error('Erro ao buscar proventos recebidos:', error)
      return []
    }
  },
}

export const marmitasService = {
  getMarmitas: async (mes?: number, ano?: number): Promise<Marmita[]> => {
    const params = new URLSearchParams()
    if (mes) params.append('mes', mes.toString())
    if (ano) params.append('ano', ano.toString())
    
    const response = await api.get(`/marmitas?${params.toString()}`)
    return response.data
  },

  adicionarMarmita: async (data: string, valor: number, comprou: boolean): Promise<any> => {
    const response = await api.post('/marmitas', {
      data,
      valor,
      comprou
    })
    return response.data
  },

  removerMarmita: async (id: number): Promise<any> => {
    const response = await api.delete(`/marmitas/${id}`)
    return response.data
  },

  getGastosMensais: async (periodo: string = '6m'): Promise<GastoMensal[]> => {
    const response = await api.get(`/marmitas/gastos-mensais?periodo=${periodo}`)
    return response.data
  },
}

export const controleService = {

  getReceitas: async (mes?: string, ano?: string, pessoa?: string): Promise<Receita[]> => {
    const params = new URLSearchParams()
    if (mes) params.append('mes', mes)
    if (ano) params.append('ano', ano)
    if (pessoa) params.append('pessoa', pessoa)
    
    const response = await api.get(`/controle/receitas?${params.toString()}`)
    return response.data
  },

  adicionarReceita: async (nome: string, valor: number): Promise<any> => {
    const response = await api.post('/controle/receitas', { nome, valor })
    return response.data
  },

  atualizarReceita: async (id: number, nome: string, valor: number): Promise<any> => {
    const response = await api.put('/controle/receitas', { id, nome, valor })
    return response.data
  },

  removerReceita: async (id: number): Promise<any> => {
    const response = await api.delete(`/controle/receitas?id=${id}`)
    return response.data
  },


  getCartoes: async (mes?: string, ano?: string): Promise<Cartao[]> => {
    const params = new URLSearchParams()
    if (mes) params.append('mes', mes)
    if (ano) params.append('ano', ano)
    
    const response = await api.get(`/controle/cartoes?${params.toString()}`)
    return response.data
  },

  adicionarCartao: async (nome: string, valor: number, pago: string): Promise<any> => {
    const response = await api.post('/controle/cartoes', { nome, valor, pago })
    return response.data
  },

  atualizarCartao: async (id: number, nome: string, valor: number, pago: string): Promise<any> => {
    const response = await api.put('/controle/cartoes', { id, nome, valor, pago })
    return response.data
  },

  removerCartao: async (id: number): Promise<any> => {
    const response = await api.delete(`/controle/cartoes?id=${id}`)
    return response.data
  },


  getOutros: async (mes?: string, ano?: string): Promise<OutroGasto[]> => {
    const params = new URLSearchParams()
    if (mes) params.append('mes', mes)
    if (ano) params.append('ano', ano)
    
    const response = await api.get(`/controle/outros?${params.toString()}`)
    return response.data
  },

  adicionarOutro: async (nome: string, valor: number): Promise<any> => {
    const response = await api.post('/controle/outros', { nome, valor })
    return response.data
  },

  atualizarOutro: async (id: number, nome: string, valor: number): Promise<any> => {
    const response = await api.put('/controle/outros', { id, nome, valor })
    return response.data
  },

  removerOutro: async (id: number): Promise<any> => {
    const response = await api.delete(`/controle/outros?id=${id}`)
    return response.data
  },


  getSaldo: async (mes?: string, ano?: string, pessoa?: string): Promise<{ saldo: number }> => {
    const params = new URLSearchParams()
    if (mes) params.append('mes', mes)
    if (ano) params.append('ano', ano)
    if (pessoa) params.append('pessoa', pessoa)
    
    const response = await api.get(`/controle/saldo?${params.toString()}`)
    return response.data
  },


  getTotalPorPessoa: async (mes?: string, ano?: string): Promise<TotalPorPessoa[]> => {
    const params = new URLSearchParams()
    if (mes) params.append('mes', mes)
    if (ano) params.append('ano', ano)
    
    const response = await api.get(`/controle/total-por-pessoa?${params.toString()}`)
    return response.data
  },


  getEvolucaoFinanceira: async (mes?: string, ano?: string, pessoa?: string): Promise<EvolucaoFinanceira[]> => {
    const params = new URLSearchParams()
    if (mes) params.append('mes', mes)
    if (ano) params.append('ano', ano)
    if (pessoa) params.append('pessoa', pessoa)
    
    const response = await api.get(`/controle/evolucao-financeira?${params.toString()}`)
    return response.data
  },


  getReceitasDespesas: async (mes?: string, ano?: string, pessoa?: string): Promise<ReceitasDespesas> => {
    const params = new URLSearchParams()
    if (mes) params.append('mes', mes)
    if (ano) params.append('ano', ano)
    if (pessoa) params.append('pessoa', pessoa)
    
    const response = await api.get(`/controle/receitas-despesas?${params.toString()}`)
    return response.data
  },
}

export const analiseService = {

  getAtivos: async (tipo: string, filtros: FiltrosAnalise): Promise<AtivoAnalise[]> => {
    const response = await api.post('/analise/ativos', { tipo, filtros })
    return response.data
  },

  getResumo: async (): Promise<ResumoAnalise> => {
    const response = await api.get('/analise/resumo')
    return response.data
  },
}

export const homeService = {
  getResumo: async (mes: string, ano: string): Promise<any> => {
    const response = await api.get(`/home/resumo?mes=${mes}&ano=${ano}`)
    return response.data
  },
}



export default api 