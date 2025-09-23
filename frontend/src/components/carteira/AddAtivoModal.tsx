import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { carteiraService, ativoService, listasService } from '../../services/api'
import { normalizeTicker } from '../../utils/tickerUtils'
import { X, ChevronLeft, ChevronRight, ShieldCheck, Calendar, Percent, DollarSign, Layers } from 'lucide-react'

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
  const [indexador, setIndexador] = useState<'' | 'CDI' | 'IPCA' | 'SELIC' | 'PREFIXADO'>('')
  const [indexadorPct, setIndexadorPct] = useState('')
  const [dataAplicacao, setDataAplicacao] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [isentoIr, setIsentoIr] = useState(false)
  const [liquidezDiaria, setLiquidezDiaria] = useState(false)
  const [filtroLista, setFiltroLista] = useState('')

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

  const { data: sugestoes } = useQuery({
    queryKey: ['ativos-sugestoes-modal'],
    queryFn: ativoService.getSugestoes,
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

  const LogoBadge = ({ ticker }: { ticker: string }) => {
    const key = normalizeTicker(ticker)
    const logoUrl = logosCache[key]
    if (!logoUrl) {
      return <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">{(ticker || '?').charAt(0).toUpperCase()}</div>
    }
    return <img src={logoUrl} alt={`Logo ${ticker}`} title={ticker} className="w-5 h-5 rounded object-contain" />
  }

  const adicionarMutation = useMutation({
    mutationFn: async () => {
      const q = parseFloat((quantidade || '').replace(',', '.'))
      const p = preco ? parseFloat(preco.replace(',', '.')) : undefined
      const idxPct = indexadorPct ? parseFloat(indexadorPct.replace(',', '.')) : undefined
      return carteiraService.adicionarAtivo(
        ticker || nome,
        isNaN(q) ? 0 : q,
        tipo || '',
        p,
        nome || undefined,
        indexador || undefined,
        idxPct,
        dataAplicacao || undefined,
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
    if (step === 4) return true
    if (step === 5) return true
    if (step === 6) return true
    if (step === 7) return true
    return true
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
                <label className="block text-sm font-medium">Nome do ativo</label>
                <input
                  type="text"
                  placeholder="Ex.: Petrobras PN"
                  value={nome}
                  onChange={(e)=>setNome(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded"
                />
                <label className="block text-sm font-medium">Ticker (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex.: PETR4, ITUB4, VISC11"
                  value={ticker}
                  onChange={(e)=>setTicker(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded"
                />

                {/* Filtro de lista */}
                {(isTesouro || isAcoes || isFiis || isBdrs) && (
                  <div>
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

                {/* Listas por tipo selecionado */}
                {isTesouro && tesouroData?.titulos?.length ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Tesouro Direto</div>
                    <div className="max-h-48 overflow-auto border border-border rounded">
                      {tesouroData.titulos.filter((t:any)=>{
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
                  className="w-full px-3 py-2 bg-background border border-border rounded"
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium flex items-center gap-2"><DollarSign size={14}/> Preço (opcional)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex.: 10,50"
                  value={preco}
                  onChange={(e)=>setPreco(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded"
                />
                <div className="text-xs text-muted-foreground">Se deixar vazio, tentaremos buscar automaticamente quando aplicável.</div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium flex items-center gap-2"><Layers size={14}/> Indexador (opcional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select title="Selecionar indexador" value={indexador} onChange={(e)=>setIndexador(e.target.value as any)} className="px-3 py-2 bg-background border border-border rounded">
                    <option value="">Sem indexador</option>
                    <option value="CDI">CDI</option>
                    <option value="IPCA">IPCA</option>
                    <option value="SELIC">SELIC</option>
                    <option value="PREFIXADO">PREFIXADO</option>
                  </select>
                  <input
                    type="text"
                    inputMode="decimal"
                    title="Valor do indexador"
                    placeholder={indexador === 'PREFIXADO' ? 'Taxa a.a. (%)' : 'Percentual (ex.: 110)'}
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
              <button onClick={()=> canNext() && setStep(step+1)} disabled={!canNext()} className="px-3 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-1">
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
    </div>
  )
}


