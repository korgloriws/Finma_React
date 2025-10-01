import { useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

type NumberInputEvent = React.ChangeEvent<HTMLInputElement>

export default function JurosCompostosPage() {
  const [valorInicial, setValorInicial] = useState<string>('1000')
  const [aporteMensal, setAporteMensal] = useState<string>('100')
  const [taxaAnualPct, setTaxaAnualPct] = useState<string>('12')
  const [anos, setAnos] = useState<string>('10')

  const parsed = useMemo(() => {
    const vi = parseFloat(valorInicial || '0') || 0
    const am = parseFloat(aporteMensal || '0') || 0
    const t = (parseFloat(taxaAnualPct || '0') || 0) / 100
    const n = Math.max(0, Math.floor(parseFloat(anos || '0') || 0))
    return { vi, am, t, n }
  }, [valorInicial, aporteMensal, taxaAnualPct, anos])

  const dados = useMemo(() => {
    const { vi, am, t, n } = parsed
    const resultados: { ano: number; semJuros: number; comJuros: number }[] = []

    let saldoSem = vi
    let saldoCom = vi

    for (let ano = 1; ano <= n; ano++) {
     
      saldoSem += am * 12


      let saldoComAno = saldoCom
      const taxaMensal = Math.pow(1 + t, 1 / 12) - 1
      for (let m = 0; m < 12; m++) {
        saldoComAno = saldoComAno * (1 + taxaMensal) + am
      }
      saldoCom = saldoComAno

      resultados.push({ ano, semJuros: saldoSem, comJuros: saldoCom })
    }
    return resultados
  }, [parsed])

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const handleNumber = (setter: (v: string) => void) => (e: NumberInputEvent) => setter(e.target.value.replace(/,/g, '.'))

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Calculadora de Juros Compostos</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <label htmlFor="valor-inicial" className="block text-sm text-muted-foreground mb-1">Valor inicial (opcional)</label>
          <input
            type="number"
            inputMode="decimal"
            className="w-full px-3 py-2 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
            value={valorInicial}
            onChange={handleNumber(setValorInicial)}
            min="0"
            id="valor-inicial"
            placeholder="Ex.: 1000"
          />
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <label htmlFor="aporte-mensal" className="block text-sm text-muted-foreground mb-1">Aporte mensal (opcional)</label>
          <input
            type="number"
            inputMode="decimal"
            className="w-full px-3 py-2 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
            value={aporteMensal}
            onChange={handleNumber(setAporteMensal)}
            min="0"
            id="aporte-mensal"
            placeholder="Ex.: 100"
          />
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <label htmlFor="taxa-anual" className="block text-sm text-muted-foreground mb-1">Taxa de juros a.a. (%)</label>
          <input
            type="number"
            inputMode="decimal"
            className="w-full px-3 py-2 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
            value={taxaAnualPct}
            onChange={handleNumber(setTaxaAnualPct)}
            min="0"
            step="0.01"
            id="taxa-anual"
            placeholder="Ex.: 12"
          />
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <label htmlFor="periodo-anos" className="block text-sm text-muted-foreground mb-1">Período (anos)</label>
          <input
            type="number"
            inputMode="numeric"
            className="w-full px-3 py-2 rounded-md bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
            value={anos}
            onChange={handleNumber(setAnos)}
            min="0"
            id="periodo-anos"
            placeholder="Ex.: 10"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados} margin={{ left: 16, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="ano" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => (v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`)} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} labelFormatter={(l) => `Ano ${l}`} />
              <Legend />
              <Line type="monotone" dataKey="semJuros" name="Sem Juros" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="comJuros" name="Com Juros" stroke="hsl(var(--primary))" strokeWidth={2.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total aportado</p>
          <p className="text-lg font-semibold">{formatCurrency(parsed.vi + parsed.am * 12 * parsed.n)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Montante sem juros</p>
          <p className="text-lg font-semibold">{formatCurrency(dados.length ? dados[dados.length - 1].semJuros : parsed.vi)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Montante com juros</p>
          <p className="text-lg font-semibold">{formatCurrency(dados.length ? dados[dados.length - 1].comJuros : parsed.vi)}</p>
        </div>
      </div>
    </div>
  )
}


