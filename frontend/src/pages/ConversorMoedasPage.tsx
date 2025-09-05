import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 

  TrendingUp, 
  TrendingDown, 
  Calculator,
  RefreshCw,
  ArrowRight,
  Globe,
  BarChart3,

} from 'lucide-react'
import { ativoService, carteiraService } from '../services/api'
import { formatCurrency, formatPercentage } from '../utils/formatters'
import { normalizeTicker, getDisplayTicker } from '../utils/tickerUtils'
import TickerWithLogo from '../components/TickerWithLogo'


const CURRENCY_PAIRS = [
  { from: 'BRL', to: 'USD', name: 'Real → Dólar', symbol: 'BRLUSD=X' },
  { from: 'USD', to: 'BRL', name: 'Dólar → Real', symbol: 'USDBRL=X' },
  { from: 'EUR', to: 'BRL', name: 'Euro → Real', symbol: 'EURBRL=X' },
  { from: 'BRL', to: 'EUR', name: 'Real → Euro', symbol: 'BRLEUR=X' },
  { from: 'GBP', to: 'BRL', name: 'Libra → Real', symbol: 'GBPBRL=X' },
  { from: 'BRL', to: 'GBP', name: 'Real → Libra', symbol: 'BRLGBP=X' },
  { from: 'USD', to: 'EUR', name: 'Dólar → Euro', symbol: 'USDEUR=X' },
  { from: 'EUR', to: 'USD', name: 'Euro → Dólar', symbol: 'EURUSD=X' },
  { from: 'USD', to: 'GBP', name: 'Dólar → Libra', symbol: 'USDGBP=X' },
  { from: 'GBP', to: 'USD', name: 'Libra → Dólar', symbol: 'GBPUSD=X' },
  { from: 'JPY', to: 'USD', name: 'Iene → Dólar', symbol: 'JPYUSD=X' },
  { from: 'USD', to: 'JPY', name: 'Dólar → Iene', symbol: 'USDJPY=X' },
  { from: 'CNY', to: 'USD', name: 'Yuan → Dólar', symbol: 'CNYUSD=X' },
  { from: 'USD', to: 'CNY', name: 'Dólar → Yuan', symbol: 'USDCNY=X' },
]


const CURRENCIES = [
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$' },
  { code: 'USD', name: 'Dólar Americano', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£' },
  { code: 'JPY', name: 'Iene Japonês', symbol: '¥' },
  { code: 'CNY', name: 'Yuan Chinês', symbol: '¥' },
  { code: 'CAD', name: 'Dólar Canadense', symbol: 'C$' },
  { code: 'AUD', name: 'Dólar Australiano', symbol: 'A$' },
  { code: 'CHF', name: 'Franco Suíço', symbol: 'CHF' },
  { code: 'SEK', name: 'Coroa Sueca', symbol: 'kr' },
  { code: 'NOK', name: 'Coroa Norueguesa', symbol: 'kr' },
  { code: 'DKK', name: 'Coroa Dinamarquesa', symbol: 'kr' },
  { code: 'PLN', name: 'Złoty Polonês', symbol: 'zł' },
  { code: 'CZK', name: 'Coroa Tcheca', symbol: 'Kč' },
  { code: 'HUF', name: 'Forint Húngaro', symbol: 'Ft' },
  { code: 'RUB', name: 'Rublo Russo', symbol: '₽' },
  { code: 'INR', name: 'Rúpia Indiana', symbol: '₹' },
  { code: 'KRW', name: 'Won Sul-Coreano', symbol: '₩' },
  { code: 'SGD', name: 'Dólar de Singapura', symbol: 'S$' },
  { code: 'HKD', name: 'Dólar de Hong Kong', symbol: 'HK$' },
  { code: 'NZD', name: 'Dólar Neozelandês', symbol: 'NZ$' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$' },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$' },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$' },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/' },
  { code: 'UYU', name: 'Peso Uruguaio', symbol: '$' },
  { code: 'PYG', name: 'Guarani Paraguaio', symbol: '₲' },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs' },
  { code: 'VEF', name: 'Bolívar Venezuelano', symbol: 'Bs' },
]

// Limitar as opções às moedas realmente suportadas pelos pares definidos
const SUPPORTED_CODES = Array.from(new Set(CURRENCY_PAIRS.flatMap(p => [p.from, p.to])))
const SUPPORTED_CURRENCIES = CURRENCIES.filter(c => SUPPORTED_CODES.includes(c.code))

export default function ConversorMoedasPage() {
  const [amount, setAmount] = useState<string>('1')
  const [fromCurrency, setFromCurrency] = useState('BRL')
  const [toCurrency, setToCurrency] = useState('USD')
  const [searchTicker, setSearchTicker] = useState('')
  const [selectedTicker, setSelectedTicker] = useState('')
  const [activeTab, setActiveTab] = useState<'conversor' | 'ativos' | 'carteira'>('conversor')


  const getExchangeRate = useCallback(async (from: string, to: string) => {
    if (from === to) return 1
    
 
    const directPair = CURRENCY_PAIRS.find(p => p.from === from && p.to === to)
    if (directPair) {
      try {
        const data = await ativoService.getExchangeRate(directPair.symbol)
        return data.rate || 0
      } catch (error) {
        console.error(`Erro ao buscar taxa para ${directPair.symbol}:`, error)
        return 0
      }
    }
    

    const fromToUSD = CURRENCY_PAIRS.find(p => p.from === from && p.to === 'USD')
    const usdToTo = CURRENCY_PAIRS.find(p => p.from === 'USD' && p.to === to)
    
    if (fromToUSD && usdToTo) {
      try {
        const fromData = await ativoService.getExchangeRate(fromToUSD.symbol)
        const toData = await ativoService.getExchangeRate(usdToTo.symbol)
        const fromRate = fromData.rate || 0
        const toRate = toData.rate || 0
        return fromRate * toRate
      } catch (error) {
        console.error('Erro ao buscar taxas intermediárias:', error)
        return 0
      }
    }
    
    return 0
  }, [])

  // Buscar taxa de câmbio principal
  const exchangeRateQuery = useQuery({
    queryKey: ['exchange-rate', fromCurrency, toCurrency],
    queryFn: () => getExchangeRate(fromCurrency, toCurrency),
    enabled: fromCurrency !== toCurrency,
    staleTime: 60_000, // 1 minuto
  })

  // Buscar informações do ativo
  const ativoQuery = useQuery({
    queryKey: ['ativo-info', selectedTicker],
    queryFn: () => ativoService.getDetalhes(selectedTicker),
    enabled: !!selectedTicker,
  })

  // Buscar logo do ativo
  const logoQuery = useQuery({
    queryKey: ['logo', selectedTicker],
    queryFn: () => ativoService.getLogoUrl(selectedTicker),
    enabled: !!selectedTicker,
  })

  // Calcular conversão
  const convertedAmount = useMemo(() => {
    const numAmount = parseFloat(amount) || 0
    const rate = fromCurrency === toCurrency ? 1 : (exchangeRateQuery.data || 0)
    return numAmount * rate
  }, [amount, exchangeRateQuery.data, fromCurrency, toCurrency])

  // Carteira real do sistema – declarado antes do uso em carteiraRatesQuery
  const carteiraQuery = useQuery({
    queryKey: ['carteira'],
    queryFn: async () => {
      const data = await carteiraService.getCarteira()
      // Mapear para estrutura com moeda inferida
      return data.map((a: any) => ({
        ticker: a.ticker,
        quantidade: a.quantidade ?? 0,
        preco_atual: a.preco_atual ?? 0,
        valor_total: a.valor_total ?? ((a.preco_atual || 0) * (a.quantidade || 0)),
        moeda: typeof a.ticker === 'string' && a.ticker.endsWith('.SA') ? 'BRL' : 'USD',
      }))
    },
    staleTime: 60_000,
  })


  const carteiraRatesQuery = useQuery({
    queryKey: ['carteira-rates', toCurrency, (carteiraQuery.data || []).map(a => `${a.ticker}:${a.moeda}`)],
    queryFn: async () => {
      if (!carteiraQuery.data) return {} as Record<string, number>
      const entries = await Promise.all(
        carteiraQuery.data.map(async (a) => {
          const rate = a.moeda === toCurrency ? 1 : await getExchangeRate(a.moeda, toCurrency)
          return [a.ticker, rate] as const
        })
      )
      return Object.fromEntries(entries) as Record<string, number>
    },
    enabled: !!carteiraQuery.data && carteiraQuery.data.length > 0,
    staleTime: 60_000,
  })


  const searchResults = useMemo(() => {
    if (!searchTicker.trim()) return []
    
    const normalized = normalizeTicker(searchTicker.trim())
    const results: string[] = []
    

    const suggestions = [
      'PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA', 'ABEV3.SA',
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA',
      'BOVA11.SA', 'SMAL11.SA', 'IVVB11.SA', 'HASH11.SA',
      'VISC11.SA', 'XPML11.SA', 'HGLG11.SA', 'HGRE11.SA'
    ]
    
    suggestions.forEach(suggestion => {
      if (suggestion.toLowerCase().includes(normalized.toLowerCase())) {
        results.push(suggestion)
      }
    })
    
    return results.slice(0, 10)
  }, [searchTicker])

  

  const handleSearch = useCallback(() => {
    if (searchTicker.trim()) {
      const normalized = normalizeTicker(searchTicker.trim())
      setSelectedTicker(getDisplayTicker(normalized))
    }
  }, [searchTicker])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.symbol || code
  }

  // getCurrencyName não utilizado, removido para evitar warning

  const formatCurrencyByCode = (value: number, code: string) => {
    const symbol = getCurrencySymbol(code)
    return `${symbol}${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Componente para linha da carteira
  const CarteiraRow = ({ 
    ativo, 
    toCurrency, 
    getExchangeRate, 
    index 
  }: { 
    ativo: { ticker: string; quantidade: number; preco_atual: number; valor_total: number; moeda: string }
    toCurrency: string
    getExchangeRate: (from: string, to: string) => Promise<number>
    index: number
  }) => {
    const [rate, setRate] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const fetchRate = async () => {
        setLoading(true)
        try {
          if (ativo.moeda === toCurrency) {
            setRate(1)
          } else {
            const exchangeRate = await getExchangeRate(ativo.moeda, toCurrency)
            setRate(exchangeRate)
          }
        } catch (error) {
          console.error('Erro ao buscar taxa:', error)
          setRate(0)
        } finally {
          setLoading(false)
        }
      }

      fetchRate()
    }, [ativo.moeda, toCurrency, getExchangeRate])

    const valorConvertido = ativo.valor_total * (rate || 0)
    const variacao = ((valorConvertido - ativo.valor_total) / ativo.valor_total) * 100

    return (
      <motion.tr 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="border-b border-border hover:bg-muted/20 transition-colors"
      >
        <td className="px-4 py-3">
          <TickerWithLogo ticker={ativo.ticker} size="sm" />
        </td>
        <td className="px-4 py-3">{ativo.quantidade}</td>
        <td className="px-4 py-3">
          {formatCurrencyByCode(ativo.preco_atual, ativo.moeda)}
        </td>
        <td className="px-4 py-3">
          {formatCurrencyByCode(ativo.valor_total, ativo.moeda)}
        </td>
        <td className="px-4 py-3 font-semibold">
          {loading ? (
            <div className="animate-pulse h-4 bg-muted rounded w-16"></div>
          ) : (
            formatCurrencyByCode(valorConvertido, toCurrency)
          )}
        </td>
        <td className="px-4 py-3">
          {loading ? (
            <div className="animate-pulse h-4 bg-muted rounded w-12"></div>
          ) : (
            <span className={`flex items-center gap-1 ${
              variacao > 0 ? 'text-green-600' : variacao < 0 ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              {variacao > 0 ? <TrendingUp className="w-4 h-4" /> : variacao < 0 ? <TrendingDown className="w-4 h-4" /> : null}
              {formatPercentage(variacao)}
            </span>
          )}
        </td>
      </motion.tr>
    )
  }

 
  const AssetProjection = ({ 
    fromCurrency, 
    toCurrency, 
    price, 
    getExchangeRate 
  }: { 
    fromCurrency: string
    toCurrency: string
    price: number
    getExchangeRate: (from: string, to: string) => Promise<number>
  }) => {
    const [rate, setRate] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const fetchRate = async () => {
        setLoading(true)
        try {
          const exchangeRate = await getExchangeRate(fromCurrency, toCurrency)
          setRate(exchangeRate)
        } catch (error) {
          console.error('Erro ao buscar taxa:', error)
          setRate(0)
        } finally {
          setLoading(false)
        }
      }

      fetchRate()
    }, [fromCurrency, toCurrency, getExchangeRate])

    const convertedPrice = price * (rate || 0)

    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">{toCurrency}</span>
          <Globe className="w-4 h-4 text-muted-foreground" />
        </div>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-20 mb-1"></div>
            <div className="h-3 bg-muted rounded w-32"></div>
          </div>
        ) : (
          <>
            <p className="text-lg font-bold text-primary">
              {formatCurrencyByCode(convertedPrice, toCurrency)}
            </p>
            <p className="text-xs text-muted-foreground">
              Taxa: 1 {fromCurrency} = {formatCurrencyByCode(rate || 0, toCurrency)}
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Conversor de Moedas</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => exchangeRateQuery.refetch()}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden xs:inline">Atualizar</span>
          <span className="xs:hidden">Atualizar</span>
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-lg">
        <div className="border-b border-border">
          <div className="flex overflow-x-auto scrollbar-hide">
            {[
              { id: 'conversor', label: 'Conversor', icon: Calculator, shortLabel: 'Conversor' },
              { id: 'ativos', label: 'Projeção de Ativos', icon: TrendingUp, shortLabel: 'Ativos' },
              { id: 'carteira', label: 'Carteira', icon: BarChart3, shortLabel: 'Carteira' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden xs:inline">{tab.label}</span>
                <span className="xs:hidden">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'conversor' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Conversor Principal */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Valor de Entrada */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Valor</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>

                {/* Moeda de Origem */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">De</label>
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Selecionar moeda de origem"
                  >
                    {SUPPORTED_CURRENCIES.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Moeda de Destino */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Para</label>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Selecionar moeda de destino"
                  >
                    {SUPPORTED_CURRENCIES.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resultado */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Taxa de Câmbio</p>
                    <p className="text-2xl font-bold text-foreground">
                      {exchangeRateQuery.isLoading ? (
                        <div className="animate-pulse">Carregando...</div>
                      ) : (
                        `1 ${fromCurrency} = ${formatCurrencyByCode((fromCurrency === toCurrency ? 1 : (exchangeRateQuery.data || 0)), toCurrency)}`
                      )}
                    </p>
                  </div>
                  <ArrowRight className="w-8 h-8 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Resultado</p>
                    <p className="text-2xl font-bold text-primary">
                      {exchangeRateQuery.isLoading ? (
                        <div className="animate-pulse">Carregando...</div>
                      ) : (
                        formatCurrencyByCode(convertedAmount, toCurrency)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pares Populares */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pares Populares</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CURRENCY_PAIRS.slice(0, 6).map((pair) => (
                    <motion.button
                      key={pair.symbol}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setFromCurrency(pair.from)
                        setToCurrency(pair.to)
                      }}
                      className={`p-4 border rounded-lg transition-colors ${
                        fromCurrency === pair.from && toCurrency === pair.to
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{pair.name}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ativos' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Busca de Ativo */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchTicker}
                      onChange={(e) => setSearchTicker(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite o ticker (ex: PETR4, AAPL, MSFT)..."
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSearch}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    Buscar
                  </motion.button>
                </div>

                {/* Sugestões */}
                {searchResults.length > 0 && !selectedTicker && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {searchResults.map((ticker) => (
                      <motion.button
                        key={ticker}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedTicker(ticker)}
                        className="p-2 text-sm border border-border rounded hover:border-primary/50 transition-colors"
                      >
                        {ticker}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Informações do Ativo */}
              {selectedTicker && ativoQuery.data && (
                <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                  {/* Header do Ativo */}
                  <div className="flex items-center gap-4">
                    {logoQuery.data ? (
                      <img 
                        src={logoQuery.data} 
                        alt={selectedTicker} 
                        className="w-12 h-12 rounded-lg object-contain border border-border bg-white p-1"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {selectedTicker.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold">{ativoQuery.data.info?.longName || selectedTicker}</h3>
                      <p className="text-muted-foreground">{selectedTicker}</p>
                    </div>
                  </div>

                  {/* Métricas Principais */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Preço Atual</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(ativoQuery.data.info?.currentPrice)}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Moeda</p>
                      <p className="text-xl font-bold">
                        {ativoQuery.data.info?.currency || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Market Cap</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(ativoQuery.data.info?.marketCap)}
                      </p>
                    </div>
                  </div>

                  {/* Projeções em Diferentes Moedas */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Projeções em Diferentes Moedas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'CNY'].map((currency) => {
                        if (currency === ativoQuery.data.info?.currency) return null
                        
                        return (
                          <AssetProjection 
                            key={currency}
                            fromCurrency={ativoQuery.data.info?.currency || 'USD'}
                            toCurrency={currency}
                            price={ativoQuery.data.info?.currentPrice || 0}
                            getExchangeRate={getExchangeRate}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {selectedTicker && ativoQuery.isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Carregando dados do ativo...</p>
                  </div>
                </div>
              )}

              {selectedTicker && ativoQuery.error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-destructive font-medium">Erro ao carregar dados do ativo.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verifique se o ticker está correto e tente novamente.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'carteira' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Seletor de Moeda de Referência */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <label className="text-sm font-medium whitespace-nowrap">Moeda de Referência:</label>
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Selecionar moeda de referência"
                >
                  {SUPPORTED_CURRENCIES.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tabela da Carteira */}
              {carteiraQuery.data && (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Ativo</th>
                          <th className="px-4 py-3 text-left font-medium">Quantidade</th>
                          <th className="px-4 py-3 text-left font-medium">Preço Original</th>
                          <th className="px-4 py-3 text-left font-medium">Valor Original</th>
                          <th className="px-4 py-3 text-left font-medium">Valor em {toCurrency}</th>
                          <th className="px-4 py-3 text-left font-medium">Variação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {carteiraQuery.data.map((ativo, index) => (
                          <CarteiraRow 
                            key={ativo.ticker}
                            ativo={ativo}
                            toCurrency={toCurrency}
                            getExchangeRate={getExchangeRate}
                            index={index}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Resumo */}
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-4">Resumo da Carteira</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Total Original</p>
                        <p className="text-xl font-bold">
                          {formatCurrencyByCode(
                            carteiraQuery.data.reduce((sum, ativo) => sum + ativo.valor_total, 0),
                            'BRL'
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Total em {toCurrency}</p>
                        {carteiraRatesQuery.isLoading ? (
                          <div className="animate-pulse h-6 bg-muted rounded w-32" />
                        ) : (
                          <p className="text-xl font-bold text-primary">
                            {formatCurrencyByCode(
                              carteiraQuery.data.reduce((sum, ativo) => {
                                const taxa = carteiraRatesQuery.data?.[ativo.ticker] ?? 0
                                return sum + (ativo.valor_total * taxa)
                              }, 0),
                              toCurrency
                            )}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Variação Total</p>
                        {carteiraRatesQuery.isLoading ? (
                          <div className="animate-pulse h-6 bg-muted rounded w-24" />
                        ) : (
                          <p className="text-xl font-bold text-green-600">
                            {(() => {
                              const originalTotal = carteiraQuery.data.reduce((sum, a) => sum + a.valor_total, 0)
                              const convertidoTotal = carteiraQuery.data.reduce((sum, a) => {
                                const taxa = carteiraRatesQuery.data?.[a.ticker] ?? 0
                                return sum + (a.valor_total * taxa)
                              }, 0)
                              const variacao = originalTotal > 0 ? ((convertidoTotal - originalTotal) / originalTotal) * 100 : 0
                              return formatPercentage(variacao)
                            })()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {carteiraQuery.isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Carregando carteira...</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
