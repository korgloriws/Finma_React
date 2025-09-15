import { 
  Plus, 
  BarChart3, 
  Target, 
  ChevronUp, 
  ChevronDown, 
  Settings, 
  Edit, 
  Trash2 
} from 'lucide-react'
import { formatCurrency, formatDividendYield, formatPercentage, formatNumber } from '../../utils/formatters'
import TickerWithLogo from '../TickerWithLogo'


// Componente para tabela de ativos por tipo
function TabelaAtivosPorTipo({ 
  tipo, 
  carteira, 
  valorTotal, 
  expandedTipos, 
  setExpandedTipos, 
  movimentacoesAll, 
  indicadores, 
  editingId, 
  editQuantidade, 
  setEditQuantidade, 
  handleEditar, 
  handleSalvarEdicao, 
  handleCancelarEdicao, 
  handleRemover, 
  setManageTipoOpen, 
  setRenameTipoValue 
}: {
  tipo: string
  carteira: any[]
  valorTotal: number
  expandedTipos: Record<string, boolean>
  setExpandedTipos: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  movimentacoesAll: any[]
  indicadores: any
  editingId: number | null
  editQuantidade: string
  setEditQuantidade: (value: string) => void
  handleEditar: (id: number, quantidade: number) => void
  handleSalvarEdicao: () => void
  handleCancelarEdicao: () => void
  handleRemover: (id: number) => void
  setManageTipoOpen: (value: { open: boolean; tipo?: string }) => void
  setRenameTipoValue: (value: string) => void
}) {
  const ativosDoTipo = carteira?.filter(ativo => ativo?.tipo === tipo) || []
  const totalTipo = ativosDoTipo.reduce((total, ativo) => total + (ativo?.valor_total || 0), 0)
  const porcentagemTipo = valorTotal > 0 ? (totalTipo / valorTotal * 100).toFixed(1) : '0.0'
  const isExpanded = expandedTipos[tipo] || false
  const podeRemoverTipo = ativosDoTipo.length === 0

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-lg mb-6">
      <div 
        className="bg-gradient-to-r from-primary/10 to-primary/5 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-border cursor-pointer hover:bg-primary/20 transition-colors"
        onClick={() => setExpandedTipos(prev => ({ ...prev, [tipo]: !prev[tipo] }))}
      >
        <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button className="p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0">
              {isExpanded ? <ChevronUp size={18} className="sm:w-5 sm:h-5" /> : <ChevronDown size={18} className="sm:w-5 sm:h-5" />}
            </button>
            <Target className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold truncate">{tipo}</h3>
              <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <span>{ativosDoTipo.length} ativo{ativosDoTipo.length !== 1 ? 's' : ''}</span>
                <span className="hidden xs:inline">•</span>
                <span>{porcentagemTipo}% da carteira</span>
                <span className="hidden xs:inline">•</span>
                <span className="text-xs">Média DY: {ativosDoTipo.length > 0 ? 
                  formatDividendYield(ativosDoTipo.reduce((sum, ativo) => sum + (ativo?.dy || 0), 0) / ativosDoTipo.length) : 
                  'N/A'
                }</span>
              </div>
            </div>
          </div>
          <div className="text-right flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            <div className="text-xs sm:text-sm md:text-lg font-bold">{formatCurrency(totalTipo)}</div>
            {(() => {
              const movs = movimentacoesAll || []
              let somaValoresAtuais = 0
              let somaValoresInvestidos = 0
              for (const a of ativosDoTipo) {
                const mlist = movs
                  .filter(m => m.ticker?.toUpperCase?.() === (a?.ticker || '').toUpperCase())
                  .sort((x, y) => String(x.data).localeCompare(String(y.data)))
                type Lot = { qty: number; price: number; date: string }
                const lots: Lot[] = []
                for (const m of mlist) {
                  const q = Number(m.quantidade || 0)
                  const p = Number(m.preco || 0)
                  if (m.tipo === 'compra') {
                    lots.push({ qty: q, price: p, date: m.data })
                  } else if (m.tipo === 'venda') {
                    let remaining = q
                    while (remaining > 0 && lots.length > 0) {
                      const lot = lots[0]
                      const consume = Math.min(lot.qty, remaining)
                      lot.qty -= consume
                      remaining -= consume
                      if (lot.qty <= 0) lots.shift()
                    }
                  }
                }
                const qtd = lots.reduce((s, l) => s + l.qty, 0)
                const val = lots.reduce((s, l) => s + l.qty * l.price, 0)
                const precoMed = qtd > 0 ? (val / qtd) : null
                if (precoMed != null) {
                  somaValoresInvestidos += precoMed * (a?.quantidade || 0)
                  somaValoresAtuais += (a?.preco_atual || 0) * (a?.quantidade || 0)
                }
              }
              const rendTipo = (somaValoresInvestidos > 0) ? ((somaValoresAtuais - somaValoresInvestidos) / somaValoresInvestidos) * 100 : null
              return (
                <div className={`text-xs font-medium ${rendTipo != null ? (rendTipo >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                  {rendTipo != null ? `${rendTipo.toFixed(1).replace('.', ',')}%` : '-'}
                </div>
              )
            })()}
            <div className="hidden sm:block text-xs sm:text-sm text-muted-foreground">{porcentagemTipo}% do total</div>
            <button
              onClick={(e)=>{ e.stopPropagation(); setManageTipoOpen({open: true, tipo}); setRenameTipoValue(tipo) }}
              className="p-1 sm:p-2 rounded hover:bg-white/20 flex-shrink-0"
              title="Gerenciar tipo"
            >
              <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
            {podeRemoverTipo && (
              <button
                onClick={(e)=>{
                  e.stopPropagation()
                 
                  setExpandedTipos(prev => {
                    const copy = { ...prev }
                    delete copy[tipo]
                    return copy
                  })
                }}
                className="px-1 sm:px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 flex-shrink-0"
                title="Remover seção (somente tipos sem ativos)"
              >
                <span className="hidden sm:inline">Remover seção</span>
                <span className="sm:hidden">Remover</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <>
          {ativosDoTipo.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-sm">Ticker</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">Nome</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">Quantidade</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">Preço Atual</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">Valor Total</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">Indexado</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">Rentab. Estimada (anual)</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">Preço Médio</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">Valorização</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">Rendimento</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">% Carteira</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">DY</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">ROE</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">P/L</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">P/VP</th>
                    <th className="px-3 py-2 text-left font-medium text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ativosDoTipo.map((ativo) => {
                    const movsDoTicker = (movimentacoesAll || [])
                      .filter(m => m.ticker?.toUpperCase?.() === (ativo?.ticker || '').toUpperCase())
                      .sort((a, b) => String(a.data).localeCompare(String(b.data)))

                    type Lot = { qty: number; price: number; date: string }
                    const lots: Lot[] = []
                    for (const m of movsDoTicker) {
                      const qty = Number(m.quantidade || 0)
                      const price = Number(m.preco || 0)
                      if (m.tipo === 'compra') {
                        lots.push({ qty, price, date: m.data })
                      } else if (m.tipo === 'venda') {
                        let remaining = qty
                        while (remaining > 0 && lots.length > 0) {
                          const lot = lots[0]
                          const consume = Math.min(lot.qty, remaining)
                          lot.qty -= consume
                          remaining -= consume
                          if (lot.qty <= 0) lots.shift()
                        }
                        // Se vendeu mais do que possuía, ignorar excedente (sem posição short)
                      }
                    }
                    const totalQtd = lots.reduce((s, l) => s + l.qty, 0)
                    const totalValor = lots.reduce((s, l) => s + l.qty * l.price, 0)
                    const precoMedio = totalQtd > 0 ? (totalValor / totalQtd) : null
                    const rendimentoPct = (precoMedio != null && ativo?.preco_atual)
                      ? ((ativo.preco_atual - precoMedio) / precoMedio) * 100
                      : null
                    const valorizacaoAbs = (precoMedio != null && ativo?.preco_atual && totalQtd > 0)
                      ? (ativo.preco_atual - precoMedio) * totalQtd
                      : null
                    const porcentagemAtivo = valorTotal > 0 ? ((ativo?.valor_total || 0) / valorTotal * 100).toFixed(1) : '0.0'
                    return (
                      <tr key={ativo?.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-2 min-w-[140px]">
                          <TickerWithLogo ticker={ativo?.ticker || ''} nome={ativo?.nome_completo || ''} />
                        </td>
                        <td className="px-3 py-2 text-sm max-w-[200px] truncate" title={ativo?.nome_completo}>{ativo?.nome_completo}</td>
                        <td className="px-3 py-2 text-sm">
                          {editingId === ativo?.id ? (
                            <input
                              type="text"
                              value={editQuantidade}
                              onChange={(e) => setEditQuantidade(e.target.value)}
                              className="w-16 px-2 py-1 text-sm border border-border rounded bg-background text-foreground"
                              aria-label="Editar quantidade"
                              placeholder="Qtd"
                            />
                          ) : (
                            ativo?.quantidade
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm font-semibold">{formatCurrency(ativo?.preco_atual)}</td>
                        <td className="px-3 py-2 text-sm font-semibold">{formatCurrency(ativo?.valor_total)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {ativo?.indexador ? `${ativo.indexador} ${ativo.indexador_pct ? `${ativo.indexador_pct}%` : ''}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {(() => {
                            const pct = (ativo?.indexador_pct || 0)
                            const idx = (ativo?.indexador || '') as 'CDI'|'IPCA'|'SELIC'|''
                            const getVal = (d:any) => {
                              if (!d) return null
                              const v = parseFloat(String(d.valor))
                              return isFinite(v) ? v : null
                            }
                            const raw = idx === 'CDI' ? getVal(indicadores?.cdi)
                              : idx === 'IPCA' ? getVal(indicadores?.ipca)
                              : idx === 'SELIC' ? getVal(indicadores?.selic)
                              : null
                            if (!idx || raw == null || !pct) return '-'
            
                            const baseAnual = raw <= 2 ? ((Math.pow(1 + (raw/100), 12) - 1) * 100) : raw
                            const anual = (pct/100) * baseAnual
                            return `${anual.toFixed(1)}% a.a.`
                          })()}
                        </td>
                        <td className="px-3 py-2 text-sm">{precoMedio != null ? formatCurrency(precoMedio) : '-'}</td>
                        <td className={`px-3 py-2 text-sm font-medium ${valorizacaoAbs != null ? (valorizacaoAbs >= 0 ? 'text-emerald-600' : 'text-red-600') : ''}`}>
                          {valorizacaoAbs != null ? formatCurrency(valorizacaoAbs) : '-'}
                        </td>
                        <td className={`px-3 py-2 text-sm font-medium ${rendimentoPct != null ? (rendimentoPct >= 0 ? 'text-emerald-600' : 'text-red-600') : ''}`}>
                          {rendimentoPct != null ? `${rendimentoPct.toFixed(1).replace('.', ',')}%` : '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{porcentagemAtivo}%</td>
                        <td className="px-3 py-2 text-green-600 font-medium text-sm">
                          {formatDividendYield(ativo?.dy)}
                        </td>
                        <td className={`px-3 py-2 font-medium text-sm ${ativo?.roe && ativo.roe > 15 ? 'text-blue-600' : ''}`}>
                          {formatPercentage(ativo?.roe ? ativo.roe * 100 : null)}
                        </td>
                        <td className="px-3 py-2 text-sm">{formatNumber(ativo?.pl)}</td>
                        <td className="px-3 py-2 text-sm">{formatNumber(ativo?.pvp)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            {editingId === ativo?.id ? (
                              <>
                                <button
                                  onClick={handleSalvarEdicao}
                                  className="p-1 text-green-600 hover:text-green-700"
                                  title="Salvar"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={handleCancelarEdicao}
                                  className="p-1 text-gray-600 hover:text-gray-700"
                                  title="Cancelar"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditar(ativo?.id || 0, ativo?.quantidade || 0)}
                                  className="p-1 text-blue-600 hover:text-blue-700"
                                  title="Editar"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleRemover(ativo?.id || 0)}
                                  className="p-1 text-red-600 hover:text-red-700"
                                  title="Remover"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3 p-3 sm:p-4">
                {ativosDoTipo.map((ativo) => {
                  const movsDoTicker = (movimentacoesAll || [])
                    .filter(m => m.ticker?.toUpperCase?.() === (ativo?.ticker || '').toUpperCase())
                    .sort((a, b) => String(a.data).localeCompare(String(b.data)))

                  type Lot = { qty: number; price: number; date: string }
                  const lots: Lot[] = []
                  for (const m of movsDoTicker) {
                    const qty = Number(m.quantidade || 0)
                    const price = Number(m.preco || 0)
                    if (m.tipo === 'compra') {
                      lots.push({ qty, price, date: m.data })
                    } else if (m.tipo === 'venda') {
                      let remaining = qty
                      while (remaining > 0 && lots.length > 0) {
                        const lot = lots[0]
                        const consume = Math.min(lot.qty, remaining)
                        lot.qty -= consume
                        remaining -= consume
                        if (lot.qty <= 0) lots.shift()
                      }
                    }
                  }
                  const totalQtd = lots.reduce((s, l) => s + l.qty, 0)
                  const totalValor = lots.reduce((s, l) => s + l.qty * l.price, 0)
                  const precoMedio = totalQtd > 0 ? (totalValor / totalQtd) : null
                  const rendimentoPct = (precoMedio != null && ativo?.preco_atual)
                    ? ((ativo.preco_atual - precoMedio) / precoMedio) * 100
                    : null
                  const valorizacaoAbs = (precoMedio != null && ativo?.preco_atual && totalQtd > 0)
                    ? (ativo.preco_atual - precoMedio) * totalQtd
                    : null
                  const porcentagemAtivo = valorTotal > 0 ? ((ativo?.valor_total || 0) / valorTotal * 100).toFixed(1) : '0.0'
                  
                  return (
                    <div key={ativo?.id} className="bg-background border border-border rounded-lg p-3 sm:p-4 space-y-3">
                      {/* Header com Ticker e Ações */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <TickerWithLogo ticker={ativo?.ticker || ''} nome={ativo?.nome_completo || ''} />
                        </div>
                        <div className="flex gap-1 sm:gap-2 ml-2">
                          {editingId === ativo?.id ? (
                            <>
                              <button
                                onClick={handleSalvarEdicao}
                                className="p-1.5 sm:p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                                title="Salvar"
                              >
                                ✓
                              </button>
                              <button
                                onClick={handleCancelarEdicao}
                                className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded"
                                title="Cancelar"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditar(ativo?.id || 0, ativo?.quantidade || 0)}
                                className="p-1.5 sm:p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                title="Editar"
                              >
                                <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
                              </button>
                              <button
                                onClick={() => handleRemover(ativo?.id || 0)}
                                className="p-1.5 sm:p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Remover"
                              >
                                <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Nome do Ativo */}
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {ativo?.nome_completo}
                      </div>

                      {/* Grid de Informações Principais */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Quantidade</span>
                            {editingId === ativo?.id ? (
                              <input
                                type="text"
                                value={editQuantidade}
                                onChange={(e) => setEditQuantidade(e.target.value)}
                                className="w-16 sm:w-20 px-2 py-1 text-xs sm:text-sm border border-border rounded bg-background text-foreground"
                                aria-label="Editar quantidade"
                                placeholder="Qtd"
                              />
                            ) : (
                              <span className="text-xs sm:text-sm font-medium">{ativo?.quantidade}</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Preço Atual</span>
                            <span className="text-xs sm:text-sm font-semibold">{formatCurrency(ativo?.preco_atual)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Valor Total</span>
                            <span className="text-xs sm:text-sm font-semibold text-primary">{formatCurrency(ativo?.valor_total)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">% Carteira</span>
                            <span className="text-xs sm:text-sm text-muted-foreground">{porcentagemAtivo}%</span>
                          </div>
                        </div>
                        
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">DY</span>
                            <span className="text-xs sm:text-sm text-green-600 font-medium">
                              {formatDividendYield(ativo?.dy)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">P/L</span>
                            <span className="text-xs sm:text-sm">{formatNumber(ativo?.pl)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">P/VP</span>
                            <span className="text-xs sm:text-sm">{formatNumber(ativo?.pvp)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">ROE</span>
                            <span className={`text-xs sm:text-sm font-medium ${ativo?.roe && ativo.roe > 15 ? 'text-blue-600' : ''}`}>
                              {formatPercentage(ativo?.roe ? ativo.roe * 100 : null)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Informações Adicionais (se houver) */}
                      {(ativo?.indexador || precoMedio != null || valorizacaoAbs != null || rendimentoPct != null) && (
                        <div className="pt-2 sm:pt-3 border-t border-border">
                          <div className="grid grid-cols-1 gap-1.5 sm:gap-2 text-xs">
                            {ativo?.indexador && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Indexado</span>
                                <span className="text-xs">{ativo.indexador} {ativo.indexador_pct ? `${ativo.indexador_pct}%` : ''}</span>
                              </div>
                            )}
                            {precoMedio != null && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Preço Médio</span>
                                <span className="text-xs">{formatCurrency(precoMedio)}</span>
                              </div>
                            )}
                            {valorizacaoAbs != null && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Valorização</span>
                                <span className={`text-xs font-medium ${valorizacaoAbs >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {formatCurrency(valorizacaoAbs)}
                                </span>
                              </div>
                            )}
                            {rendimentoPct != null && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Rendimento</span>
                                <span className={`text-xs font-medium ${rendimentoPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {rendimentoPct.toFixed(1).replace('.', ',')}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              Nenhum ativo do tipo {tipo} na carteira.
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface CarteiraAtivosTabProps {
  // Formulário de adição
  inputTicker: string
  setInputTicker: (value: string) => void
  inputQuantidade: string
  setInputQuantidade: (value: string) => void
  inputTipo: string
  setInputTipo: (value: string) => void
  inputPreco: string
  setInputPreco: (value: string) => void
  inputIndexador: string
  setInputIndexador: (value: string) => void
  inputIndexadorPct: string
  setInputIndexadorPct: (value: string) => void
  handleAdicionar: () => void
  adicionarMutation: any
  
  // Dados da carteira
  carteira: any[]
  loadingCarteira: boolean
  ativosPorTipo: Record<string, any[]>
  valorTotal: number
  topAtivos: any[]
  
  // Estados de edição
  editingId: number | null
  editQuantidade: string
  setEditQuantidade: (value: string) => void
  handleEditar: (id: number, quantidade: number) => void
  handleSalvarEdicao: () => void
  handleCancelarEdicao: () => void
  handleRemover: (id: number) => void
  
  // Estados de tipos
  expandedTipos: Record<string, boolean>
  setExpandedTipos: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  setManageTipoOpen: (value: { open: boolean; tipo?: string }) => void
  setRenameTipoValue: (value: string) => void
  
  // Dados adicionais
  movimentacoesAll: any[]
  indicadores: any
  tiposDisponiveisComputed: string[]
}

export default function CarteiraAtivosTab({
  inputTicker,
  setInputTicker,
  inputQuantidade,
  setInputQuantidade,
  inputTipo,
  setInputTipo,
  inputPreco,
  setInputPreco,
  inputIndexador,
  setInputIndexador,
  inputIndexadorPct,
  setInputIndexadorPct,
  handleAdicionar,
  adicionarMutation,
  carteira,
  loadingCarteira,
  ativosPorTipo,
  valorTotal,
  topAtivos,
  editingId,
  editQuantidade,
  setEditQuantidade,
  handleEditar,
  handleSalvarEdicao,
  handleCancelarEdicao,
  handleRemover,
  expandedTipos,
  setExpandedTipos,
  setManageTipoOpen,
  setRenameTipoValue,
  movimentacoesAll,
  indicadores,
  tiposDisponiveisComputed
}: CarteiraAtivosTabProps) {
  return (
    <div className="space-y-6">
      {/* Formulário de Adição */}
      <div className="bg-muted/30 rounded-lg p-3 sm:p-4 md:p-6">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          Adicionar Ativo
        </h2>
        
        <div className="space-y-3 sm:space-y-4">
          {/* Primeira linha - Ticker e Quantidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Ticker</label>
            <input
              type="text"
              value={inputTicker}
              onChange={(e) => setInputTicker(e.target.value)}
              placeholder="Ex: PETR4, AAPL, VISC11"
                className="w-full px-3 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Quantidade</label>
            <input
              type="text"
              value={inputQuantidade}
              onChange={(e) => setInputQuantidade(e.target.value)}
              placeholder="Ex: 100 ou 0,0012"
                className="w-full px-3 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            </div>
          </div>
          
          {/* Segunda linha - Tipo e Preço */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Tipo</label>
            <input
              list="tipos-ativos"
              value={inputTipo}
              onChange={(e) => setInputTipo(e.target.value)}
              placeholder="Ex.: Ação, FII, Criptomoeda, ..."
                className="w-full px-3 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Selecionar ou digitar tipo de ativo"
            />
            <datalist id="tipos-ativos">
              {(tiposDisponiveisComputed || []).map(t => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          
          <div>
              <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Preço (opcional)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 10,50 (se vazio tenta buscar)"
                className="w-full px-3 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={inputPreco}
              onChange={(e)=>setInputPreco(e.target.value)}
            />
          </div>
          </div>

          {/* Terceira linha - Indexador */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1 sm:mb-2">Indexador (opcional)</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <select
                value={inputIndexador}
                onChange={(e)=>setInputIndexador(e.target.value as any)}
                className="px-3 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground"
                aria-label="Selecionar indexador"
              >
                <option value="">Sem indexador</option>
                <option value="CDI">CDI</option>
                <option value="IPCA">IPCA</option>
                <option value="SELIC">SELIC</option>
              </select>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 110 (para 110%)"
                className="w-full px-3 py-2 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={inputIndexadorPct}
                onChange={(e)=>setInputIndexadorPct(e.target.value)}
              />
            <button
              onClick={handleAdicionar}
              disabled={adicionarMutation.isPending}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2"
            >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{adicionarMutation.isPending ? 'Adicionando...' : 'Adicionar'}</span>
                <span className="xs:hidden">{adicionarMutation.isPending ? '...' : '+'}</span>
            </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Use N% do CDI/IPCA/SELIC. Ex.: 110 = 110%.</p>
          </div>
        </div>
      </div>

      {/* Resumo da Carteira */}
      {!loadingCarteira && carteira && carteira.length > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-border rounded-lg p-3 sm:p-4 md:p-6 mb-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Resumo da Carteira
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            <div className="bg-card border border-border rounded-lg p-2 sm:p-3 md:p-4">
              <div className="text-xs sm:text-sm text-muted-foreground">Total de Ativos</div>
              <div className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-primary">{carteira.length}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-2 sm:p-3 md:p-4">
              <div className="text-xs sm:text-sm text-muted-foreground">Tipos de Ativos</div>
              <div className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-primary">{Object.keys(ativosPorTipo).length}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-2 sm:p-3 md:p-4">
              <div className="text-xs sm:text-sm text-muted-foreground">Média DY</div>
              <div className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-primary">
                {formatDividendYield(carteira.reduce((sum, ativo) => sum + (ativo?.dy || 0), 0) / carteira.length)}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-2 sm:p-3 md:p-4">
              <div className="text-xs sm:text-sm text-muted-foreground">Maior Posição</div>
              <div className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-primary">
                {topAtivos[0]?.ticker || 'N/A'}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                {formatCurrency(topAtivos[0]?.valor_total || 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabelas por Tipo */}
      {loadingCarteira ? (
        <div className="text-center text-muted-foreground py-8">
          Carregando carteira...
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(ativosPorTipo).sort().map(tipo => (
            <TabelaAtivosPorTipo 
              key={tipo} 
              tipo={tipo}
              carteira={carteira}
              valorTotal={valorTotal}
              expandedTipos={expandedTipos}
              setExpandedTipos={setExpandedTipos}
              movimentacoesAll={movimentacoesAll}
              indicadores={indicadores}
              editingId={editingId}
              editQuantidade={editQuantidade}
              setEditQuantidade={setEditQuantidade}
              handleEditar={handleEditar}
              handleSalvarEdicao={handleSalvarEdicao}
              handleCancelarEdicao={handleCancelarEdicao}
              handleRemover={handleRemover}
              setManageTipoOpen={setManageTipoOpen}
              setRenameTipoValue={setRenameTipoValue}
            />
          ))}
        </div>
      )}
    </div>
  )
}
