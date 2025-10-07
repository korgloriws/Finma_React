import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { carteiraService, ativoService, listasService, rfCatalogService } from '../../services/api'
import { normalizeTicker } from '../../utils/tickerUtils'
import { X, ChevronLeft, ChevronRight, ShieldCheck, Calendar, Percent, DollarSign, Layers, Edit, Plus, Building2 } from 'lucide-react'
import RendaFixaFormModal from './RendaFixaFormModal'

interface AddAtivoModalProps {
  open: boolean
  onClose: () => void
}

export default function AddAtivoModal({ open, onClose }: AddAtivoModalProps) {
  const [step, setStep] = useState(1)
  const [nome, setNome] = useState('')
  const [ticker, setTicker] = useState('')
  const [tipo, setTipo] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [preco, setPreco] = useState('')
  const [indexador, setIndexador] = useState<'' | 'CDI' | 'IPCA' | 'SELIC' | 'PREFIXADO' | 'CDI+' | 'IPCA+'>('')
  const [indexadorPct, setIndexadorPct] = useState('')
  const [dataAplicacao, setDataAplicacao] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [isentoIr, setIsentoIr] = useState(false)
  const [liquidezDiaria, setLiquidezDiaria] = useState(false)
  const [filtroLista, setFiltroLista] = useState('')
  const [rfFormOpen, setRfFormOpen] = useState(false)
  const [editingRfItem, setEditingRfItem] = useState<any>(null)
  
  // Novos estados para preço
  const [tipoPreco, setTipoPreco] = useState<'atual' | 'historico' | 'manual'>('atual')
  const [dataCompra, setDataCompra] = useState('')
  const [precoAtual, setPrecoAtual] = useState<{preco: number, data: string, ticker: string} | null>(null)
  const [precoHistorico, setPrecoHistorico] = useState<{preco: number, data_historico: string, data_solicitada: string, ticker: string} | null>(null)
  const [erroPrecoHistorico, setErroPrecoHistorico] = useState('')
  const [carregandoPreco, setCarregandoPreco] = useState(false)

  const queryClient = useQueryClient()

  // Dados auxiliares
  const { data: tiposApi } = useQuery({
    queryKey: ['tipos-ativos-modal'],
    queryFn: carteiraService.getTipos,
    staleTime: 60_000,
    enabled: open,
  })
  const tiposDisponiveis = useMemo(() => Array.from(new Set([...(tiposApi || []) as string[], 'Ação', 'FII', 'BDR', 'Criptomoeda', 'Renda Fixa Pública', 'Renda Fixa'])), [tiposApi])

  const { data: tesouroData } = useQuery({
    queryKey: ['tesouro-titulos-modal'],
    queryFn: carteiraService.getTesouroTitulos,
    staleTime: 60_000,
    enabled: open,
  })

  const normalize = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const tipoNorm = useMemo(() => normalize(tipo.trim()), [tipo])
  const isAcoes = useMemo(() => {
    return tipoNorm.includes('acao') || tipoNorm.includes('acoes')
  }, [tipoNorm])
  const isFiis = useMemo(() => {
    return tipoNorm.includes('fii') || tipoNorm.includes('fiis')
  }, [tipoNorm])
  const isBdrs = useMemo(() => {
    return tipoNorm.includes('bdr') || tipoNorm.includes('bdrs')
  }, [tipoNorm])
  const isTesouro = useMemo(() => {
    return tipoNorm.includes('renda fixa') || tipoNorm.includes('tesouro') || tipoNorm.includes('publica')
  }, [tipoNorm])

  const { data: rfCatalog, refetch: refetchRfCatalog, error: rfCatalogError } = useQuery({
    queryKey: ['rf-catalog-modal'],
    queryFn: rfCatalogService.list,
    enabled: open && (tipoNorm.includes('renda fixa') || tipoNorm.includes('tesouro') || tipoNorm.includes('publica')),
    staleTime: 0, // Sempre refetch para garantir dados atualizados
    refetchOnWindowFocus: true,
  })

  // Debug logs
  useEffect(() => {
    if (rfCatalog) {
      console.log('DEBUG: rfCatalog carregado:', rfCatalog)
    }
    if (rfCatalogError) {
      console.error('DEBUG: Erro ao carregar rfCatalog:', rfCatalogError)
    }
  }, [rfCatalog, rfCatalogError])

  const { data: sugestoes } = useQuery({
    queryKey: ['ativos-sugestoes-modal'],
    queryFn: ativoService.getSugestoes,
    staleTime: 60_000,
    enabled: open,
  })

  

  const { data: acoesList } = useQuery({
    queryKey: ['listas-ativos', 'acoes'],
    queryFn: () => listasService.getTickersPorTipo('acoes'),
    enabled: open && isAcoes,
    staleTime: 60_000,
  })
  const { data: fiisList } = useQuery({
    queryKey: ['listas-ativos', 'fiis'],
    queryFn: () => listasService.getTickersPorTipo('fiis'),
    enabled: open && isFiis,
    staleTime: 60_000,
  })
  const { data: bdrsList } = useQuery({
    queryKey: ['listas-ativos', 'bdrs'],
    queryFn: () => listasService.getTickersPorTipo('bdrs'),
    enabled: open && isBdrs,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!open) {
      setStep(1)
      setNome('')
      setTicker('')
      setTipo('')
      setQuantidade('')
      setPreco('')
      setIndexador('')
      setIndexadorPct('')
      setDataAplicacao('')
      setVencimento('')
      setIsentoIr(false)
      setLiquidezDiaria(false)
    }
  }, [open])

  // Prefetch listas por tipo para deixar pronto ao selecionar
  useEffect(() => {
    if (open) {
      queryClient.prefetchQuery({ queryKey: ['listas-ativos','acoes'], queryFn: () => listasService.getTickersPorTipo('acoes') })
      queryClient.prefetchQuery({ queryKey: ['listas-ativos','fiis'], queryFn: () => listasService.getTickersPorTipo('fiis') })
      queryClient.prefetchQuery({ queryKey: ['listas-ativos','bdrs'], queryFn: () => listasService.getTickersPorTipo('bdrs') })
      queryClient.prefetchQuery({ queryKey: ['tesouro-titulos-modal'], queryFn: carteiraService.getTesouroTitulos })
    }
  }, [open, queryClient])

  // Cache local de logos em lote
  const [logosCache, setLogosCache] = useState<Record<string, string | null>>({})
  const [selectedLogoUrl, setSelectedLogoUrl] = useState<string | null>(null)
  useEffect(() => {
    const loadBatch = async () => {
      let batch: string[] = []
      if (isAcoes && (acoesList as any)?.tickers?.length) batch = (acoesList as any).tickers.slice(0, 100)
      else if (isFiis && (fiisList as any)?.tickers?.length) batch = (fiisList as any).tickers.slice(0, 100)
      else if (isBdrs && (bdrsList as any)?.tickers?.length) batch = (bdrsList as any).tickers.slice(0, 100)
      if (batch.length === 0) return
      const normalized = batch.map((t) => normalizeTicker(t))
      const res = await ativoService.getLogosBatch(normalized)
      setLogosCache((prev) => ({ ...prev, ...res }))
    }
    if (open) loadBatch()
  }, [open, isAcoes, isFiis, isBdrs, acoesList, fiisList, bdrsList])

  
  useEffect(() => {
    let cancelled = false
    const loadLogo = async () => {
      if (!open) return
      const t = (ticker || '').trim()
      if (!t || !(isAcoes || isFiis || isBdrs)) {
        setSelectedLogoUrl(null)
        return
      }
      const key = normalizeTicker(t)
      if (logosCache.hasOwnProperty(key)) {
        setSelectedLogoUrl(logosCache[key] || null)
        return
      }
      try {
        const url = await ativoService.getLogoUrl(key)
        if (!cancelled) setSelectedLogoUrl(url)
      } catch {
        if (!cancelled) setSelectedLogoUrl(null)
      }
    }
    loadLogo()
    return () => {
      cancelled = true
    }
  }, [open, ticker, isAcoes, isFiis, isBdrs, logosCache])

  const LogoBadge = ({ ticker }: { ticker: string }) => {
    const key = normalizeTicker(ticker)
    const logoUrl = logosCache[key]
    if (!logoUrl) {
      return <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">{(ticker || '?').charAt(0).toUpperCase()}</div>
    }
    return <img src={logoUrl} alt={`Logo ${ticker}`} title={ticker} className="w-5 h-5 rounded object-contain" />
  }

  // Buscar preço atual quando necessário
  useEffect(() => {
    if (step === 4 && tipoPreco === 'atual' && ticker && !precoAtual) {
      const buscarPrecoAtual = async () => {
        try {
          setCarregandoPreco(true)
          const resultado = await ativoService.getPrecoAtual(ticker)
          setPrecoAtual(resultado)
        } catch (error) {
          console.error('Erro ao buscar preço atual:', error)
        } finally {
          setCarregandoPreco(false)
        }
      }
      buscarPrecoAtual()
    }
  }, [step, tipoPreco, ticker])

  // Buscar preço histórico quando data for alterada
  useEffect(() => {
    if (step === 4 && tipoPreco === 'historico' && ticker && dataCompra) {
      const buscarPrecoHistorico = async () => {
        try {
          setCarregandoPreco(true)
          setErroPrecoHistorico('')
          const resultado = await ativoService.getPrecoHistorico(ticker, dataCompra)
          setPrecoHistorico(resultado)
        } catch (error: any) {
          setErroPrecoHistorico(error.response?.data?.error || 'Erro ao buscar preço histórico')
          setPrecoHistorico(null)
        } finally {
          setCarregandoPreco(false)
        }
      }
      buscarPrecoHistorico()
    }
  }, [step, tipoPreco, ticker, dataCompra])

  const adicionarMutation = useMutation({
    mutationFn: async () => {
      const q = parseFloat((quantidade || '').replace(',', '.'))
      
      // Determinar preço e data baseado na opção selecionada
      let precoFinal: number | undefined
      let dataCompraFinal: string | undefined
      
      if (tipoPreco === 'atual' && precoAtual) {
        precoFinal = precoAtual.preco
        dataCompraFinal = undefined // Não usar data_aplicacao para preço atual
      } else if (tipoPreco === 'historico' && precoHistorico) {
        precoFinal = precoHistorico.preco
        dataCompraFinal = dataCompra // Usar data da compra para preço histórico
      } else if (tipoPreco === 'manual' && preco) {
        precoFinal = parseFloat(preco.replace(',', '.'))
        dataCompraFinal = undefined // Não usar data_aplicacao para preço manual
      }
      
      const idxPct = indexadorPct ? parseFloat(indexadorPct.replace(',', '.')) : undefined
      
      return carteiraService.adicionarAtivo(
        ticker || nome,
        isNaN(q) ? 0 : q,
        tipo || '',
        precoFinal,
        nome || undefined,
        indexador || undefined,
        idxPct,
        dataCompraFinal,
        vencimento || undefined,
        isentoIr || undefined,
        liquidezDiaria || undefined,
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carteira'] })
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] })
      queryClient.invalidateQueries({ queryKey: ['carteira-insights'] })
      onClose()
    }
  })

  const canNext = () => {
    if (step === 1) return !!tipo
    if (step === 2) return (nome && nome.trim().length > 0) || (ticker && ticker.trim().length > 0)
    if (step === 3) return !!quantidade
    if (step === 4) {
      // Validação específica para preço
      if (tipoPreco === 'atual') return precoAtual !== null
      if (tipoPreco === 'historico') return precoHistorico !== null && !erroPrecoHistorico
      if (tipoPreco === 'manual') return !!preco && parseFloat(preco.replace(',', '.')) > 0
      return false
    }
    if (step === 5) return true // Só aparece para renda fixa
    if (step === 6) return true
    if (step === 7) return true
    return true
  }

  const getNextStep = () => {
    if (step === 4 && !isTesouro) {
      // Pular step 5 (indexador) para ativos do yfinance
      return 6
    }
    return step + 1
  }

  const pickTesouro = (item: any) => {
    const idxNorm = (item?.indexador_normalizado || item?.indexador || '').toUpperCase()
    const ano = item?.vencimento ? String(item.vencimento).slice(0,4) : 'NA'
    const simb = `TD-${idxNorm || 'X'}-${ano}`
    setTipo('Renda Fixa Pública')
    setTicker(simb)
    setNome(item?.nome || simb)
    if (idxNorm === 'PREFIXADO') {
      setIndexador('PREFIXADO')
      setIndexadorPct(typeof item?.taxa_compra_aa === 'number' ? String(item.taxa_compra_aa) : '')
    } else if (idxNorm === 'IPCA') {
      setIndexador('IPCA')
      setIndexadorPct('')
    } else if (idxNorm === 'SELIC') {
      setIndexador('SELIC')
      setIndexadorPct('100')
    }
    const today = new Date()
    setDataAplicacao(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`)
    if (item?.vencimento) setVencimento(String(item.vencimento).slice(0,10))
  }

  const pickTickerFromList = async (rawTicker: string) => {
    try {
      const details = await ativoService.getDetalhes(rawTicker)
      const info = (details as any)?.info || {}
      const nomeDet = info.longName || info.shortName || rawTicker
      const tickerDet = normalizeTicker(rawTicker)
      setTicker(tickerDet)
      setNome(String(nomeDet))
    } catch (e) {
      setTicker(rawTicker.toUpperCase())
      setNome(rawTicker.toUpperCase())
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center pt-10 px-4">
        <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="font-semibold">Adicionar Ativo</div>
            <button onClick={onClose} className="p-2 rounded hover:bg-accent" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Step indicator */}
            <div className="text-xs text-muted-foreground">Etapa {step} de 7</div>

            {step === 1 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium">Tipo</label>
                <input
                  list="tipos-modal"
                  value={tipo}
                  onChange={(e)=>setTipo(e.target.value)}
                  placeholder="Ex.: Ação, FII, BDR, Renda Fixa Pública"
                  className="w-full px-3 py-2 bg-background border border-border rounded"
                />
                <datalist id="tipos-modal">
                  {tiposDisponiveis.map((t)=> (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-4 items-start">
                  <div>
                    <label className="block text-sm font-medium">Nome do ativo</label>
                    <input
                      type="text"
                      placeholder="Ex.: Petrobras PN"
                      value={nome}
                      onChange={(e)=>setNome(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded"
                    />
                    <label className="block text-sm font-medium mt-3">Ticker (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex.: PETR4, ITUB4, VISC11"
                      value={ticker}
                      onChange={(e)=>setTicker(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded"
                    />

                    {/* Filtro de lista */}
                    {(isTesouro || isAcoes || isFiis || isBdrs) && (
                      <div className="mt-3">
                        <label className="block text-xs text-muted-foreground mb-1">Filtrar lista</label>
                        <input
                          type="text"
                          title="Filtrar lista de ativos"
                          placeholder="Digite para filtrar..."
                          value={filtroLista}
                          onChange={(e)=>setFiltroLista(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded"
                        />
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <div className="border border-border rounded bg-muted/30 p-2">
                      <div className="w-full aspect-square rounded bg-background border border-border flex items-center justify-center">
                        {(() => {
                          const key = normalizeTicker(ticker || '')
                          const cacheUrl = logosCache[key]
                          const url = cacheUrl ?? selectedLogoUrl
                          if (url) {
                            return <img src={url} alt={`Logo ${ticker || nome || ''}`} title={ticker || nome || ''} className="w-full h-full object-contain p-2" />
                          }
                          const letter = (ticker || nome || '?').trim().charAt(0).toUpperCase()
                          return <div className="text-3xl font-semibold text-muted-foreground">{letter || '?'}</div>
                        })()}
                      </div>
                      <div className="mt-2 text-center text-sm truncate" title={(ticker || nome || '').toString()}>
                        {(ticker || nome || '').toString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Listas por tipo selecionado */}
                {isTesouro ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Tesouro Direto</div>
                    {(tesouroData as any)?.titulos?.length ? (
                      <div className="max-h-48 overflow-auto border border-border rounded">
                        {(tesouroData as any).titulos.filter((t:any)=>{
                          const q = (filtroLista || '').toLowerCase()
                          if (!q) return true
                          const label = `${t?.nome || ''} ${(t?.indexador_normalizado||t?.indexador||'')}`.toLowerCase()
                          return label.includes(q)
                        }).map((t:any, i:number)=> (
                          <button key={i} onClick={()=>pickTesouro(t)} className="w-full text-left px-3 py-2 hover:bg-accent border-b border-border last:border-b-0">
                            <div className="flex items-center justify-between">
                              <div className="text-sm">
                                {(t.indexador_normalizado || t.indexador) || '—'} {t.vencimento ? `• ${String(t.vencimento).slice(0,10)}`:''}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1"><Percent size={14}/> {t.taxa_compra_aa ?? t.taxaCompra ?? '—'} a.a</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Nenhum título do Tesouro disponível agora.</div>
                    )}

                    {/* Catálogo local de RF */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium text-foreground">Renda Fixa (Catálogo Local)</div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setEditingRfItem(null)
                              setRfFormOpen(true)
                            }}
                            className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Novo
                          </button>
                        </div>
                      </div>
                      {(rfCatalog as any)?.items?.length ? (
                        <div className="max-h-64 overflow-auto border border-border rounded-xl">
                          {(rfCatalog as any).items.filter((it:any)=>{
                            const q = (filtroLista||'').toLowerCase()
                            if (!q) return true
                            const label = `${it?.nome||''} ${it?.emissor||''} ${it?.tipo||''} ${it?.indexador||''}`.toLowerCase()
                            return label.includes(q)
                          }).map((it:any)=> (
                            <div key={it.id} className="group border-b border-border last:border-b-0">
                              <div className="flex items-center justify-between p-3">
                                <button 
                                  onClick={()=>{
                                    // Preencher todos os campos do formulário principal
                                    setTipo('Renda Fixa')
                                    setNome(it.nome)
                                    setTicker(it.nome.toUpperCase())
                                    setQuantidade(it.quantidade ? String(it.quantidade) : '')
                                    setPreco(it.preco ? String(it.preco) : '')
                                    setIndexador((it.indexador || '') as any)
                                    setIndexadorPct(it.taxa_percentual != null ? String(it.taxa_percentual) : '')
                                    setVencimento(it.vencimento || '')
                                    setLiquidezDiaria(!!it.liquidez_diaria)
                                    setIsentoIr(!!it.isento_ir)
                                    setDataAplicacao(it.data_inicio || '')
                                    
                                
                                    setStep(7)
                                  }} 
                                  className="flex-1 text-left hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <div className="text-sm font-medium text-foreground">{it.nome}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {it.emissor} • {it.tipo} • {it.indexador}
                                        {it.taxa_percentual ? ` • ${it.taxa_percentual}%` : ''}
                                        {it.taxa_fixa ? ` + ${it.taxa_fixa}% a.a.` : ''}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Qtd: {it.quantidade || 'N/A'} • Preço: R$ {it.preco ? it.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'N/A'}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingRfItem(it)
                                    setRfFormOpen(true)
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-muted rounded-lg transition-all"
                                  title="Editar produto"
                                >
                                  <Edit className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <div className="text-sm">Nenhum produto cadastrado ainda</div>
                          <div className="text-xs">Clique em "Novo" para adicionar o primeiro</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : isAcoes && (acoesList as any)?.tickers?.length ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Ações</div>
                    <div className="max-h-80 overflow-auto border border-border rounded">
                      {(acoesList as any).tickers.filter((t:string)=> t.toUpperCase().includes((filtroLista||'').toUpperCase())).map((t:string, i:number)=> (
                        <button key={i} onClick={()=> pickTickerFromList(t)} className="w-full text-left px-3 py-2 hover:bg-accent border-b border-border last:border-b-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <LogoBadge ticker={t} />
                              <div className="text-sm truncate">{t.toUpperCase()}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">&nbsp;</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : isFiis && (fiisList as any)?.tickers?.length ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">FIIs</div>
                    <div className="max-h-80 overflow-auto border border-border rounded">
                      {(fiisList as any).tickers.filter((t:string)=> t.toUpperCase().includes((filtroLista||'').toUpperCase())).map((t:string, i:number)=> (
                        <button key={i} onClick={()=> pickTickerFromList(t)} className="w-full text-left px-3 py-2 hover:bg-accent border-b border-border last:border-b-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <LogoBadge ticker={t} />
                              <div className="text-sm truncate">{t.toUpperCase()}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">&nbsp;</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : isBdrs && (bdrsList as any)?.tickers?.length ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">BDRs</div>
                    <div className="max-h-80 overflow-auto border border-border rounded">
                      {(bdrsList as any).tickers.filter((t:string)=> t.toUpperCase().includes((filtroLista||'').toUpperCase())).map((t:string, i:number)=> (
                        <button key={i} onClick={()=> pickTickerFromList(t)} className="w-full text-left px-3 py-2 hover:bg-accent border-b border-border last:border-b-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <LogoBadge ticker={t} />
                              <div className="text-sm truncate">{t.toUpperCase()}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">&nbsp;</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (sugestoes as any[])?.length ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Sugestões</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(sugestoes as any[]).slice(0,6).map((s:any, i:number)=> (
                        <button key={i} onClick={()=>{ setTicker(s.value); setNome(s.label.split(' - ')[1] || s.value) }} className="text-left px-3 py-2 border border-border rounded hover:bg-accent">
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium">Quantidade</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex.: 100"
                  value={quantidade}
                  onChange={(e)=>setQuantidade(e.target.value)}
                  aria-label="Quantidade"
                  className="w-full px-3 py-2 bg-background border border-border rounded"
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <label className="block text-sm font-medium flex items-center gap-2">
                  <DollarSign size={14}/> Preço
                </label>
                
                {/* Opções de preço */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="preco-atual"
                      name="tipo-preco"
                      value="atual"
                      checked={tipoPreco === 'atual'}
                      onChange={() => setTipoPreco('atual')}
                      aria-label="Preço atual"
                      className="text-primary"
                    />
                    <label htmlFor="preco-atual" className="text-sm">
                      Preço atual (recomendado)
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="preco-historico"
                      name="tipo-preco"
                      value="historico"
                      checked={tipoPreco === 'historico'}
                      onChange={() => setTipoPreco('historico')}
                      aria-label="Preço histórico"
                      className="text-primary"
                    />
                    <label htmlFor="preco-historico" className="text-sm">
                      Preço histórico
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="preco-manual"
                      name="tipo-preco"
                      value="manual"
                      checked={tipoPreco === 'manual'}
                      onChange={() => setTipoPreco('manual')}
                      aria-label="Preço manual"
                      className="text-primary"
                    />
                    <label htmlFor="preco-manual" className="text-sm">
                      Preço manual
                    </label>
                  </div>
                </div>

                {/* Data para preço histórico */}
                {tipoPreco === 'historico' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Data da compra</label>
                    <input
                      type="date"
                      value={dataCompra}
                      onChange={(e) => setDataCompra(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      aria-label="Data da compra"
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
                      value={preco}
                      onChange={(e) => setPreco(e.target.value)}
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
            )}

            {step === 5 && isTesouro && (
              <div className="space-y-3">
                <label className="block text-sm font-medium flex items-center gap-2"><Layers size={14}/> Indexador (opcional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select title="Selecionar indexador" value={indexador} onChange={(e)=>setIndexador(e.target.value as any)} className="px-3 py-2 bg-background border border-border rounded">
                    <option value="">Sem indexador</option>
                    <option value="CDI">CDI</option>
                    <option value="CDI+">CDI+ (CDI + taxa fixa)</option>
                    <option value="IPCA">IPCA</option>
                    <option value="IPCA+">IPCA+ (IPCA + taxa fixa)</option>
                    <option value="SELIC">SELIC</option>
                    <option value="PREFIXADO">PREFIXADO</option>
                  </select>
                  <input
                    type="text"
                    inputMode="decimal"
                    title="Valor do indexador"
                    placeholder={
                      indexador === 'PREFIXADO' ? 'Taxa a.a. (%)' : 
                      indexador === 'CDI+' || indexador === 'IPCA+' ? 'Taxa fixa a.a. (%)' :
                      'Percentual (ex.: 110)'
                    }
                    value={indexadorPct}
                    onChange={(e)=>setIndexadorPct(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded"
                  />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium flex items-center gap-2"><Calendar size={14}/> Data da compra</label>
                <input type="date" title="Data da compra" placeholder="YYYY-MM-DD" value={dataAplicacao} onChange={(e)=>setDataAplicacao(e.target.value)} className="px-3 py-2 bg-background border border-border rounded"/>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium">Vencimento (se houver)</label>
                <input type="date" title="Data de vencimento" placeholder="YYYY-MM-DD" value={vencimento} onChange={(e)=>setVencimento(e.target.value)} className="px-3 py-2 bg-background border border-border rounded"/>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={liquidezDiaria} onChange={(e)=>setLiquidezDiaria(e.target.checked)}/> Liquidez diária</label>
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={isentoIr} onChange={(e)=>setIsentoIr(e.target.checked)}/> Isento de IR</label>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck size={14}/> Configure conforme o produto contratado (ex.: LCI/LCA isentos).</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <button onClick={()=> setStep(Math.max(1, step-1))} disabled={step===1} className="px-3 py-2 rounded bg-muted text-foreground disabled:opacity-50 flex items-center gap-1">
              <ChevronLeft size={16}/> Voltar
            </button>
            {step < 7 ? (
              <button onClick={()=> canNext() && setStep(getNextStep())} disabled={!canNext()} className="px-3 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-1">
                Avançar <ChevronRight size={16}/>
              </button>
            ) : (
              <button onClick={()=> adicionarMutation.mutate()} disabled={adicionarMutation.isPending} className="px-3 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50">
                {adicionarMutation.isPending ? 'Adicionando...' : 'Adicionar ativo'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Formulário de Renda Fixa */}
      <RendaFixaFormModal
        open={rfFormOpen}
        onClose={() => {
          setRfFormOpen(false)
          setEditingRfItem(null)
        }}
        onSuccess={() => {
          console.log('DEBUG: RendaFixaFormModal onSuccess chamado, refetching rfCatalog...')
          refetchRfCatalog()
        }}
        editingItem={editingRfItem}
      />
    </div>
  )
}


