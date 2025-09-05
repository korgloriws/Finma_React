import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { formatCurrency } from '../../utils/formatters'

interface CarteiraRelatoriosTabProps {
  carteira: any[]
  carteiraService: any
}

export default function CarteiraRelatoriosTab({
  carteira,
  carteiraService
}: CarteiraRelatoriosTabProps) {
  const [repMes, setRepMes] = useState('01')
  const [repAno, setRepAno] = useState(String(new Date().getFullYear()))
  const [repRendPeriodo, setRepRendPeriodo] = useState('mensal')
  const [previewMovs, setPreviewMovs] = useState<any[]>([])
  const [loadingPreviewMovs, setLoadingPreviewMovs] = useState(false)
  const [previewRend, setPreviewRend] = useState<{ datas: string[], carteira_valor: number[] }>({ datas: [], carteira_valor: [] })
  const [loadingPreviewRend, setLoadingPreviewRend] = useState(false)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">📄 Relatórios</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Movimentações */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Movimentações</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2">
              <select 
                aria-label="Selecione o mês" 
                className="px-3 py-2 border border-border rounded bg-background text-foreground" 
                value={repMes} 
                onChange={e=>setRepMes(e.target.value)}
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const v = String(i+1).padStart(2, '0')
                  return <option key={v} value={v}>{v}</option>
                })}
              </select>
              <select 
                aria-label="Selecione o ano" 
                className="px-3 py-2 border border-border rounded bg-background text-foreground" 
                value={repAno} 
                onChange={e=>setRepAno(e.target.value)}
              >
                {Array.from({ length: 10 }).map((_, i) => {
                  const y = new Date().getFullYear() - i
                  return <option key={y} value={String(y)}>{y}</option>
                })}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    const blob = await carteiraService.downloadMovimentacoesCSV({ mes: repMes, ano: repAno })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = 'movimentacoes.csv'
                    document.body.appendChild(a)
                    a.click()
                    a.remove(); URL.revokeObjectURL(url)
                  } catch (e: any) {
                    toast.error('Falha ao baixar CSV')
                  }
                }}
                className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
              >CSV</button>
              <button
                onClick={async () => {
                  try {
                    const blob = await carteiraService.downloadMovimentacoesPDF({ mes: repMes, ano: repAno })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = 'movimentacoes.pdf'
                    document.body.appendChild(a)
                    a.click()
                    a.remove(); URL.revokeObjectURL(url)
                  } catch (e: any) {
                    toast.error('Falha ao baixar PDF')
                  }
                }}
                className="px-3 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >PDF</button>
              <button
                onClick={async () => {
                  setLoadingPreviewMovs(true)
                  try {
                    const data = await carteiraService.getMovimentacoes(Number(repMes), Number(repAno))
                    setPreviewMovs(data)
                  } catch {
                    toast.error('Falha ao carregar prévia')
                    setPreviewMovs([])
                  } finally {
                    setLoadingPreviewMovs(false)
                  }
                }}
                className="px-3 py-2 rounded bg-muted text-foreground hover:bg-muted/80"
              >Prévia</button>
            </div>
          </div>
          {/* Prévia Movimentações */}
          <div className="mt-3">
            {loadingPreviewMovs ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : previewMovs && previewMovs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Ticker</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Quantidade</th>
                      <th className="px-3 py-2 text-left">Preço</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewMovs.slice(0, 50).map((m: any) => (
                      <tr key={m.id} className="border-b border-border">
                        <td className="px-3 py-2">{String(m.data).slice(0,10)}</td>
                        <td className="px-3 py-2">{m.ticker}</td>
                        <td className="px-3 py-2">{m.tipo}</td>
                        <td className="px-3 py-2">{m.quantidade}</td>
                        <td className="px-3 py-2">{formatCurrency(m.preco)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewMovs.length > 50 && (
                  <div className="text-xs text-muted-foreground mt-2">Mostrando 50 de {previewMovs.length} registros.</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Sem dados para o período.</div>
            )}
          </div>
        </div>

        {/* Posições atuais */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Posições (Atual)</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  const blob = await carteiraService.downloadPosicoesCSV()
                  const url = URL.createObjectURL(blob); const a = document.createElement('a')
                  a.href = url; a.download = 'posicoes.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
                } catch {
                  toast.error('Falha ao baixar CSV')
                }
              }}
              className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
            >CSV</button>
            <button
              onClick={async () => {
                try {
                  const blob = await carteiraService.downloadPosicoesPDF()
                  const url = URL.createObjectURL(blob); const a = document.createElement('a')
                  a.href = url; a.download = 'posicoes.pdf'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
                } catch {
                  toast.error('Falha ao baixar PDF')
                }
              }}
              className="px-3 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >PDF</button>
          </div>
          {/* Prévia Posições */}
          <div className="mt-3 overflow-x-auto">
            {carteira && carteira.length > 0 ? (
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left">Ticker</th>
                    <th className="px-3 py-2 text-left">Nome</th>
                    <th className="px-3 py-2 text-left">Quantidade</th>
                    <th className="px-3 py-2 text-left">Preço</th>
                    <th className="px-3 py-2 text-left">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {carteira.slice(0, 50).map((it: any) => (
                    <tr key={it.id} className="border-b border-border">
                      <td className="px-3 py-2">{it.ticker}</td>
                      <td className="px-3 py-2">{it.nome_completo}</td>
                      <td className="px-3 py-2">{it.quantidade}</td>
                      <td className="px-3 py-2">{formatCurrency(it.preco_atual)}</td>
                      <td className="px-3 py-2">{formatCurrency(it.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-muted-foreground">Sem posições.</div>
            )}
          </div>
        </div>

        {/* Rendimentos no período */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Rendimentos (Período)</h3>
          <div className="flex items-center gap-2">
            <select 
              aria-label="Período dos rendimentos" 
              title="Selecione o período dos rendimentos"
              className="px-3 py-2 border border-border rounded bg-background text-foreground" 
              value={repRendPeriodo} 
              onChange={e=>setRepRendPeriodo(e.target.value as any)}
            >
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
              <option value="maximo">Máximo</option>
            </select>
            <button
              onClick={async () => {
                try {
                  const blob = await carteiraService.downloadRendimentosCSV(repRendPeriodo)
                  const url = URL.createObjectURL(blob); const a = document.createElement('a')
                  a.href = url; a.download = 'rendimentos.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
                } catch {
                  toast.error('Falha ao baixar CSV')
                }
              }}
              className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
            >CSV</button>
            <button
              onClick={async () => {
                try {
                  const blob = await carteiraService.downloadRendimentosPDF(repRendPeriodo)
                  const url = URL.createObjectURL(blob); const a = document.createElement('a')
                  a.href = url; a.download = 'rendimentos.pdf'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
                } catch {
                  toast.error('Falha ao baixar PDF')
                }
              }}
              className="px-3 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >PDF</button>
            <button
              onClick={async () => {
                setLoadingPreviewRend(true)
                try {
                  const data = await carteiraService.getHistorico(repRendPeriodo)
                  setPreviewRend({ datas: data.datas || [], carteira_valor: data.carteira_valor || [] })
                } catch {
                  toast.error('Falha ao carregar prévia')
                  setPreviewRend({ datas: [], carteira_valor: [] })
                } finally {
                  setLoadingPreviewRend(false)
                }
              }}
              className="px-3 py-2 rounded bg-muted text-foreground hover:bg-muted/80"
            >Prévia</button>
          </div>
          {/* Prévia Rendimentos */}
          <div className="mt-3 overflow-x-auto">
            {loadingPreviewRend ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : previewRend && previewRend.datas.length > 0 ? (
              <table className="w-full min-w-[500px] text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left">Período</th>
                    <th className="px-3 py-2 text-left">Valor Carteira</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRend.datas.slice(-50).map((d: string, i: number) => (
                    <tr key={`${d}-${i}`} className="border-b border-border">
                      <td className="px-3 py-2">{d}</td>
                      <td className="px-3 py-2">{formatCurrency(previewRend.carteira_valor[Math.max(0, previewRend.carteira_valor.length - previewRend.datas.slice(-50).length + i)])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-muted-foreground">Sem dados para o período.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
