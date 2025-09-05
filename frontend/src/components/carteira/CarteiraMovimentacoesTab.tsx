import { History } from 'lucide-react'
import TickerWithLogo from '../TickerWithLogo'
import { formatCurrency } from '../../utils/formatters'

interface CarteiraMovimentacoesTabProps {
  filtroMes: number
  setFiltroMes: (value: number) => void
  filtroAno: number
  setFiltroAno: (value: number) => void
  loadingMovimentacoes: boolean
  movimentacoes: any[]
}

export default function CarteiraMovimentacoesTab({
  filtroMes,
  setFiltroMes,
  filtroAno,
  setFiltroAno,
  loadingMovimentacoes,
  movimentacoes
}: CarteiraMovimentacoesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">🔄 Movimentações</h2>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mês</label>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(parseInt(e.target.value))}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              aria-label="Selecionar mês"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                <option key={mes} value={mes}>
                  {new Date(2024, mes - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Ano</label>
            <select
              value={filtroAno}
              onChange={(e) => setFiltroAno(parseInt(e.target.value))}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              aria-label="Selecionar ano"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Loading State */}
      {loadingMovimentacoes ? (
        <div className="text-center text-muted-foreground py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando movimentações...</p>
        </div>
      ) : (
        <>
          {/* Resumo das Movimentações */}
          {movimentacoes && movimentacoes.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Resumo do Período</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {movimentacoes.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total de Movimentações</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {movimentacoes.filter(m => m?.tipo === 'compra').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Compras</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {movimentacoes.filter(m => m?.tipo === 'venda').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Vendas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(movimentacoes.reduce((total, m) => {
                      const valor = (m?.quantidade || 0) * (m?.preco || 0)
                      return m?.tipo === 'compra' ? total + valor : total - valor
                    }, 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Fluxo de Caixa</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Lista de Movimentações */}
          {movimentacoes && movimentacoes.length > 0 ? (
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Histórico de Movimentações</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Data</th>
                      <th className="px-4 py-3 text-left font-medium">Ticker</th>
                      <th className="px-4 py-3 text-left font-medium">Nome</th>
                      <th className="px-4 py-3 text-left font-medium">Quantidade</th>
                      <th className="px-4 py-3 text-left font-medium">Preço</th>
                      <th className="px-4 py-3 text-left font-medium">Valor Total</th>
                      <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentacoes.map((mov) => (
                      <tr key={mov?.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          {new Date(mov?.data || '').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <TickerWithLogo ticker={mov?.ticker || ''} size="sm" />
                        </td>
                        <td className="px-4 py-3">{mov?.nome_completo}</td>
                        <td className="px-4 py-3">{mov?.quantidade}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(mov?.preco)}</td>
                        <td className="px-4 py-3 font-semibold">
                          {formatCurrency((mov?.quantidade || 0) * (mov?.preco || 0))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            mov?.tipo === 'compra' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {mov?.tipo === 'compra' ? 'Compra' : 'Venda'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma movimentação encontrada para o período selecionado.</p>
              <p className="text-sm mt-2">
                As movimentações aparecem aqui quando você adiciona, remove ou atualiza ativos na carteira.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
