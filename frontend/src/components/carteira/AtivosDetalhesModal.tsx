import { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown, Building2, FileText, DollarSign } from 'lucide-react'
import { formatCurrency, formatNumber } from '../../utils/formatters'
import { getDisplayTicker } from '../../utils/tickerUtils'
import TickerWithLogo from '../TickerWithLogo'

interface AtivoDetalhes {
  ticker: string
  nome_completo: string
  valor_total: number
  quantidade: number
  preco_atual: number
  tipo: string
  dy?: number | null
  roe?: number | null
  pl?: number | null
  pvp?: number | null
  indexador?: string | null
  indexador_pct?: number | null
  vencimento?: string | null
  segmento_fii?: string | null
  tipo_fii?: string | null
}

interface AtivosDetalhesModalProps {
  isOpen: boolean
  onClose: () => void
  titulo: string
  ativos: AtivoDetalhes[]
  tipoFiltro: 'tipo' | 'ativo' | 'top'
}

export default function AtivosDetalhesModal({
  isOpen,
  onClose,
  titulo,
  ativos,
  tipoFiltro
}: AtivosDetalhesModalProps) {
  const [ativosOrdenados, setAtivosOrdenados] = useState<AtivoDetalhes[]>([])
  const [ordenacao, setOrdenacao] = useState<'valor' | 'dy' | 'roe' | 'pl' | 'pvp'>('valor')
  const [ordem, setOrdem] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (ativos.length === 0) {
      setAtivosOrdenados([])
      return
    }

    const ordenados = [...ativos].sort((a, b) => {
      let valorA: number, valorB: number

      switch (ordenacao) {
        case 'valor':
          valorA = a.valor_total || 0
          valorB = b.valor_total || 0
          break
        case 'dy':
          valorA = a.dy || 0
          valorB = b.dy || 0
          break
        case 'roe':
          valorA = a.roe || 0
          valorB = b.roe || 0
          break
        case 'pl':
          valorA = a.pl || 0
          valorB = b.pl || 0
          break
        case 'pvp':
          valorA = a.pvp || 0
          valorB = b.pvp || 0
          break
        default:
          valorA = a.valor_total || 0
          valorB = b.valor_total || 0
      }

      return ordem === 'asc' ? valorA - valorB : valorB - valorA
    })

    setAtivosOrdenados(ordenados)
  }, [ativos, ordenacao, ordem])

  const handleOrdenacao = (campo: 'valor' | 'dy' | 'roe' | 'pl' | 'pvp') => {
    if (ordenacao === campo) {
      setOrdem(ordem === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenacao(campo)
      setOrdem('desc')
    }
  }

  const getIconeTipo = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'ação':
      case 'acoes':
        return <TrendingUp className="w-4 h-4 text-blue-500" />
      case 'fii':
      case 'fiis':
        return <Building2 className="w-4 h-4 text-green-500" />
      case 'bdr':
      case 'bdrs':
        return <FileText className="w-4 h-4 text-purple-500" />
      case 'renda fixa':
      case 'tesouro':
        return <DollarSign className="w-4 h-4 text-yellow-500" />
      default:
        return <TrendingDown className="w-4 h-4 text-gray-500" />
    }
  }

  const getInformacoesEspecificas = (ativo: AtivoDetalhes) => {
    const info: Array<{ label: string; value: string | number; cor?: string }> = []

    // Informações comuns
    if (ativo.dy !== null && ativo.dy !== undefined) {
      info.push({
        label: 'DY',
        value: `${ativo.dy.toFixed(2)}%`,
        cor: ativo.dy > 0 ? 'text-green-600' : 'text-gray-600'
      })
    }

    if (ativo.roe !== null && ativo.roe !== undefined) {
      info.push({
        label: 'ROE',
        value: `${ativo.roe.toFixed(2)}%`,
        cor: ativo.roe > 0 ? 'text-green-600' : 'text-red-600'
      })
    }

    if (ativo.pl !== null && ativo.pl !== undefined && ativo.pl > 0) {
      info.push({
        label: 'P/L',
        value: ativo.pl.toFixed(2),
        cor: ativo.pl < 15 ? 'text-green-600' : ativo.pl < 25 ? 'text-yellow-600' : 'text-red-600'
      })
    }

    if (ativo.pvp !== null && ativo.pvp !== undefined && ativo.pvp > 0) {
      info.push({
        label: 'P/VP',
        value: ativo.pvp.toFixed(2),
        cor: ativo.pvp < 1 ? 'text-green-600' : ativo.pvp < 2 ? 'text-yellow-600' : 'text-red-600'
      })
    }

    // Informações específicas por tipo
    if (ativo.tipo.toLowerCase().includes('fii')) {
      if (ativo.tipo_fii) {
        info.push({
          label: 'Tipo FII',
          value: ativo.tipo_fii,
          cor: 'text-blue-600'
        })
      }
      if (ativo.segmento_fii) {
        info.push({
          label: 'Segmento',
          value: ativo.segmento_fii,
          cor: 'text-purple-600'
        })
      }
    }

    if (ativo.tipo.toLowerCase().includes('renda fixa') || ativo.tipo.toLowerCase().includes('tesouro')) {
      if (ativo.indexador) {
        info.push({
          label: 'Indexador',
          value: ativo.indexador,
          cor: 'text-orange-600'
        })
      }
      if (ativo.indexador_pct !== null && ativo.indexador_pct !== undefined) {
        info.push({
          label: 'Taxa',
          value: `${ativo.indexador_pct.toFixed(2)}%`,
          cor: 'text-green-600'
        })
      }
      if (ativo.vencimento) {
        info.push({
          label: 'Vencimento',
          value: ativo.vencimento,
          cor: 'text-gray-600'
        })
      }
    }

    return info
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">{titulo}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {ativos.length} {ativos.length === 1 ? 'ativo' : 'ativos'} encontrados
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Fechar modal"
            title="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controles de Ordenação */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-foreground mr-2">Ordenar por:</span>
            {[
              { key: 'valor', label: 'Valor Total' },
              { key: 'dy', label: 'DY' },
              { key: 'roe', label: 'ROE' },
              { key: 'pl', label: 'P/L' },
              { key: 'pvp', label: 'P/VP' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleOrdenacao(key as any)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  ordenacao === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }`}
              >
                {label}
                {ordenacao === key && (
                  <span className="ml-1">
                    {ordem === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Ativos */}
        <div className="overflow-y-auto max-h-96">
          {ativosOrdenados.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum ativo encontrado
            </div>
          ) : (
            <div className="divide-y divide-border">
              {ativosOrdenados.map((ativo, index) => {
                const informacoes = getInformacoesEspecificas(ativo)
                
                return (
                  <div key={`${ativo.ticker}-${index}`} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0">
                          {getIconeTipo(ativo.tipo)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <TickerWithLogo ticker={ativo.ticker} />
                            <span className="text-sm text-muted-foreground">
                              {ativo.tipo}
                            </span>
                          </div>
                          <h3 className="font-semibold text-foreground truncate">
                            {ativo.nome_completo}
                          </h3>
                          <div className="text-sm text-muted-foreground mt-1">
                            {formatNumber(ativo.quantidade)} × {formatCurrency(ativo.preco_atual)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-foreground">
                          {formatCurrency(ativo.valor_total)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {((ativo.valor_total / ativos.reduce((sum, a) => sum + a.valor_total, 0)) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Informações Específicas */}
                    {informacoes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {informacoes.map((info, infoIndex) => (
                          <div
                            key={infoIndex}
                            className={`px-2 py-1 rounded-md text-xs font-medium bg-muted ${info.cor || 'text-foreground'}`}
                          >
                            {info.label}: {info.value}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div>
              Total: {formatCurrency(ativos.reduce((sum, ativo) => sum + ativo.valor_total, 0))}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
