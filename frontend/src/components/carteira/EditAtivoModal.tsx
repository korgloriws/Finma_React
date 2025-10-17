import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { carteiraService, ativoService } from '../../services/api'

interface EditAtivoModalProps {
  open: boolean
  onClose: () => void
  ativo: {
    id: number
    ticker: string
    nome_completo: string
    quantidade: number
    preco_atual: number
    valor_total: number
  } | null
}

export default function EditAtivoModal({ open, onClose, ativo }: EditAtivoModalProps) {
  const [novaQuantidade, setNovaQuantidade] = useState('')
  const [tipoOperacao, setTipoOperacao] = useState<'comprar' | 'vender' | 'ajustar'>('ajustar')
  const [venderTudo, setVenderTudo] = useState(false)
  const [precoOperacao, setPrecoOperacao] = useState('')
  const [tipoPreco, setTipoPreco] = useState<'atual' | 'historico' | 'manual'>('atual')
  const [dataOperacao, setDataOperacao] = useState('')
  const [precoAtual, setPrecoAtual] = useState<{preco: number, data: string, ticker: string} | null>(null)
  const [precoHistorico, setPrecoHistorico] = useState<{preco: number, data_historico: string, data_solicitada: string, ticker: string} | null>(null)
  const [erroPrecoHistorico, setErroPrecoHistorico] = useState('')
  const [carregandoPreco, setCarregandoPreco] = useState(false)

  const queryClient = useQueryClient()


  useEffect(() => {
    if (open && ativo) {
      setNovaQuantidade(ativo.quantidade.toString())
      setTipoOperacao('ajustar')
      setVenderTudo(false)
      setPrecoOperacao('')
      setTipoPreco('atual')
      setDataOperacao('')
      setPrecoAtual(null)
      setPrecoHistorico(null)
      setErroPrecoHistorico('')
    }
  }, [open, ativo])


  useEffect(() => {
    if (open && ativo && tipoPreco === 'atual' && !precoAtual) {
      const buscarPrecoAtual = async () => {
        try {
          setCarregandoPreco(true)
          
          // Verificar se é renda fixa - não buscar preço via yfinance
          const ticker = ativo.ticker.toUpperCase()
          const isRendaFixa = ticker.includes('TD-') || ticker.includes('CDB') || ticker.includes('LCI') || ticker.includes('LCA') || 
                             ticker.includes('DEB') || ticker.includes('TESOURO') || ativo.ticker.includes('renda fixa')
          
          if (isRendaFixa) {
            // Para renda fixa, usar preço atual do ativo como fallback
            setPrecoAtual({
              preco: ativo.preco_atual,
              data: new Date().toISOString().split('T')[0],
              ticker: ativo.ticker
            })
          } else {
            const resultado = await ativoService.getPrecoAtual(ativo.ticker)
            setPrecoAtual(resultado)
          }
        } catch (error) {
          console.error('Erro ao buscar preço atual:', error)
          // Fallback: usar preço atual do ativo
          setPrecoAtual({
            preco: ativo.preco_atual,
            data: new Date().toISOString().split('T')[0],
            ticker: ativo.ticker
          })
        } finally {
          setCarregandoPreco(false)
        }
      }
      buscarPrecoAtual()
    }
  }, [open, ativo, tipoPreco])

  // Buscar preço histórico quando data for alterada
  useEffect(() => {
    if (open && ativo && tipoPreco === 'historico' && dataOperacao) {
      const buscarPrecoHistorico = async () => {
        try {
          setCarregandoPreco(true)
          setErroPrecoHistorico('')
          
          // Verificar se é renda fixa - não buscar preço via yfinance
          const ticker = ativo.ticker.toUpperCase()
          const isRendaFixa = ticker.includes('TD-') || ticker.includes('CDB') || ticker.includes('LCI') || ticker.includes('LCA') || 
                             ticker.includes('DEB') || ticker.includes('TESOURO') || ativo.ticker.includes('renda fixa')
          
          if (isRendaFixa) {
            // Para renda fixa, usar preço atual do ativo como fallback
            setPrecoHistorico({
              preco: ativo.preco_atual,
              data_historico: dataOperacao,
              data_solicitada: dataOperacao,
              ticker: ativo.ticker
            })
          } else {
            const resultado = await ativoService.getPrecoHistorico(ativo.ticker, dataOperacao)
            setPrecoHistorico(resultado)
          }
        } catch (error: any) {
          setErroPrecoHistorico(error.response?.data?.error || 'Erro ao buscar preço histórico')
          setPrecoHistorico(null)
        } finally {
          setCarregandoPreco(false)
        }
      }
      buscarPrecoHistorico()
    }
  }, [open, ativo, tipoPreco, dataOperacao])

  const atualizarMutation = useMutation({
    mutationFn: async () => {
      if (!ativo) return

      let quantidadeNova: number
      
      if (tipoOperacao === 'vender' && venderTudo) {
        // Vender tudo = quantidade 0
        quantidadeNova = 0
      } else {
        quantidadeNova = parseFloat(novaQuantidade.replace(',', '.'))
      }

      let precoCompraFinal: number | undefined
      
      if (tipoPreco === 'atual' && precoAtual) {
        precoCompraFinal = precoAtual.preco
      } else if (tipoPreco === 'historico' && precoHistorico) {
        precoCompraFinal = precoHistorico.preco
      } else if (tipoPreco === 'manual' && precoOperacao) {
        precoCompraFinal = parseFloat(precoOperacao.replace(',', '.'))
      }
      
      return carteiraService.atualizarAtivo(ativo.id, { 
        quantidade: quantidadeNova,
        preco_compra: precoCompraFinal
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carteira'] })
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] })
      queryClient.invalidateQueries({ queryKey: ['carteira-insights'] })
      onClose()
    }
  })

  const calcularResultado = () => {
    if (!ativo) return null

    const quantidadeAtual = ativo.quantidade
    let quantidadeNova: number
    
    if (tipoOperacao === 'vender' && venderTudo) {
      quantidadeNova = 0
    } else {
      quantidadeNova = parseFloat(novaQuantidade.replace(',', '.'))
    }
    
    const diferenca = quantidadeNova - quantidadeAtual

    let precoOperacaoFinal = 0
    if (tipoPreco === 'atual' && precoAtual) {
      precoOperacaoFinal = precoAtual.preco
    } else if (tipoPreco === 'historico' && precoHistorico) {
      precoOperacaoFinal = precoHistorico.preco
    } else if (tipoPreco === 'manual' && precoOperacao) {
      precoOperacaoFinal = parseFloat(precoOperacao.replace(',', '.'))
    }

    return {
      diferenca,
      precoOperacao: precoOperacaoFinal,
      valorOperacao: Math.abs(diferenca) * precoOperacaoFinal,
      tipoOperacao: diferenca > 0 ? 'compra' : diferenca < 0 ? 'venda' : 'ajuste'
    }
  }

  const resultado = calcularResultado()

  if (!open || !ativo) return null

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="font-semibold">Editar Ativo - {ativo.ticker}</div>
            <button onClick={onClose} className="p-2 rounded hover:bg-accent" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Informações do ativo */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Ativo atual</div>
              <div className="font-medium">{ativo.nome_completo}</div>
              <div className="text-sm text-muted-foreground">
                {ativo.quantidade} ações × R$ {ativo.preco_atual.toFixed(2)} = R$ {ativo.valor_total.toFixed(2)}
              </div>
            </div>

            {/* Nova quantidade */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Nova quantidade</label>
              <input
                type="text"
                value={novaQuantidade}
                onChange={(e) => setNovaQuantidade(e.target.value)}
                placeholder="Ex.: 100"
                aria-label="Nova quantidade"
                className="w-full px-3 py-2 bg-background border border-border rounded"
                disabled={tipoOperacao === 'vender' && venderTudo}
              />
              
              {/* Opção "Vender tudo" */}
              {tipoOperacao === 'vender' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="venderTudo"
                    checked={venderTudo}
                    onChange={(e) => {
                      setVenderTudo(e.target.checked)
                      if (e.target.checked) {
                        setNovaQuantidade('0')
                      } else {
                        setNovaQuantidade(ativo.quantidade.toString())
                      }
                    }}
                    className="rounded"
                  />
                  <label htmlFor="venderTudo" className="text-sm font-medium text-red-600">
                    Vender tudo (quantidade = 0)
                  </label>
                </div>
              )}
            </div>

            {/* Tipo de operação */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">Tipo de operação</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoOperacao('comprar')}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    tipoOperacao === 'comprar'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 mx-auto mb-1" />
                  Comprar mais
                </button>
                <button
                  type="button"
                  onClick={() => setTipoOperacao('vender')}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    tipoOperacao === 'vender'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 mx-auto mb-1" />
                  Vender
                </button>
                <button
                  type="button"
                  onClick={() => setTipoOperacao('ajustar')}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    tipoOperacao === 'ajustar'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <DollarSign className="w-4 h-4 mx-auto mb-1" />
                  Ajustar
                </button>
              </div>
            </div>

            {/* Preço da operação */}
            <div className="space-y-4">
              <label className="block text-sm font-medium flex items-center gap-2">
                <DollarSign size={14}/> Preço da operação
              </label>
              
              {/* Opções de preço */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="preco-atual-edit"
                    name="tipo-preco-edit"
                    value="atual"
                    checked={tipoPreco === 'atual'}
                    onChange={() => setTipoPreco('atual')}
                    className="text-primary"
                  />
                  <label htmlFor="preco-atual-edit" className="text-sm">
                    Preço atual
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="preco-historico-edit"
                    name="tipo-preco-edit"
                    value="historico"
                    checked={tipoPreco === 'historico'}
                    onChange={() => setTipoPreco('historico')}
                    className="text-primary"
                  />
                  <label htmlFor="preco-historico-edit" className="text-sm">
                    Preço histórico
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="preco-manual-edit"
                    name="tipo-preco-edit"
                    value="manual"
                    checked={tipoPreco === 'manual'}
                    onChange={() => setTipoPreco('manual')}
                    className="text-primary"
                  />
                  <label htmlFor="preco-manual-edit" className="text-sm">
                    Preço manual
                  </label>
                </div>
              </div>

              {/* Data para preço histórico */}
              {tipoPreco === 'historico' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Data da operação</label>
                  <input
                    type="date"
                    value={dataOperacao}
                    onChange={(e) => setDataOperacao(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    aria-label="Data da operação"
                    className="w-full px-3 py-2 bg-background border border-border rounded"
                  />
                  {precoHistorico && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="text-sm text-green-800 dark:text-green-200">
                        <strong>Preço encontrado:</strong> R$ {precoHistorico.preco.toFixed(2)}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Data: {new Date(precoHistorico.data_historico).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  )}
                  {erroPrecoHistorico && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="text-sm text-red-800 dark:text-red-200">
                        {erroPrecoHistorico}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preço manual */}
              {tipoPreco === 'manual' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Preço por ação</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex.: 10,50"
                    value={precoOperacao}
                    onChange={(e) => setPrecoOperacao(e.target.value)}
                    aria-label="Preço por ação"
                    className="w-full px-3 py-2 bg-background border border-border rounded"
                  />
                </div>
              )}

              {/* Preço atual */}
              {tipoPreco === 'atual' && (
                <div>
                  {carregandoPreco && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                        Buscando preço atual...
                      </div>
                    </div>
                  )}
                  {precoAtual && !carregandoPreco && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Preço atual:</strong> R$ {precoAtual.preco.toFixed(2)}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Data: {new Date(precoAtual.data).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resultado da operação */}
            {resultado && resultado.precoOperacao > 0 && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Resultado da operação</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Quantidade atual:</span>
                    <span>{ativo.quantidade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nova quantidade:</span>
                    <span>{novaQuantidade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diferença:</span>
                    <span className={resultado.diferenca > 0 ? 'text-green-600' : resultado.diferenca < 0 ? 'text-red-600' : ''}>
                      {resultado.diferenca > 0 ? '+' : ''}{resultado.diferenca}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Preço da operação:</span>
                    <span>R$ {resultado.precoOperacao.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Valor da operação:</span>
                    <span className={resultado.tipoOperacao === 'compra' ? 'text-green-600' : resultado.tipoOperacao === 'venda' ? 'text-red-600' : ''}>
                      {resultado.tipoOperacao === 'compra' ? '+' : resultado.tipoOperacao === 'venda' ? '-' : ''}R$ {resultado.valorOperacao.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => atualizarMutation.mutate()}
                disabled={atualizarMutation.isPending || !resultado || resultado.precoOperacao <= 0}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {atualizarMutation.isPending ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
