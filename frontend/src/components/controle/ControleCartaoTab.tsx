import { useState, useCallback, useMemo,  } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CreditCard, Plus, Edit, Trash2, 
  DollarSign, ShoppingCart, X, ChevronDown
} from 'lucide-react'
import { cartaoService } from '../../services/api'
import { formatCurrency } from '../../utils/formatters'
import { CartaoCadastrado, CompraCartao, BandeiraCartao, CategoriaCompra } from '../../types'

interface ControleCartaoTabProps {
  filtroMes: string
  filtroAno: string
  ocultarValores: boolean
}

const BANDEIRAS_CARTAO: BandeiraCartao[] = [
  { value: 'visa', label: 'Visa', cor: '#1A1F71', icone: '💳' },
  { value: 'mastercard', label: 'Mastercard', cor: '#EB001B', icone: '💳' },
  { value: 'american-express', label: 'American Express', cor: '#006FCF', icone: '💳' },
  { value: 'elo', label: 'Elo', cor: '#FFD700', icone: '💳' },
  { value: 'hipercard', label: 'Hipercard', cor: '#FF6B35', icone: '💳' },
  { value: 'diners', label: 'Diners Club', cor: '#004B87', icone: '💳' },
  { value: 'discover', label: 'Discover', cor: '#FF6000', icone: '💳' },
  { value: 'jcb', label: 'JCB', cor: '#000000', icone: '💳' },
  { value: 'outro', label: 'Outro', cor: '#6B7280', icone: '💳' }
]

const CATEGORIAS_COMPRA: CategoriaCompra[] = [
  { value: 'alimentacao', label: 'Alimentação', cor: '#F59E0B', icone: '🍽️' },
  { value: 'transporte', label: 'Transporte', cor: '#3B82F6', icone: '🚗' },
  { value: 'lazer', label: 'Lazer', cor: '#8B5CF6', icone: '🎮' },
  { value: 'saude', label: 'Saúde', cor: '#EF4444', icone: '❤️' },
  { value: 'educacao', label: 'Educação', cor: '#10B981', icone: '📚' },
  { value: 'vestuario', label: 'Vestuário', cor: '#F97316', icone: '👕' },
  { value: 'casa', label: 'Casa', cor: '#84CC16', icone: '🏠' },
  { value: 'servicos', label: 'Serviços', cor: '#06B6D4', icone: '🔧' },
  { value: 'outros', label: 'Outros', cor: '#6B7280', icone: '📦' }
]

const CORES_CARTAO = [
  '#1A1F71', '#EB001B', '#006FCF', '#FFD700', '#FF6B35', 
  '#004B87', '#FF6000', '#000000', '#6B7280', '#8B5CF6'
]

export default function ControleCartaoTab({ 
  filtroMes, 
  filtroAno, 
  ocultarValores
}: ControleCartaoTabProps) {
  
  const [inputNome, setInputNome] = useState('')
  const [inputBandeira, setInputBandeira] = useState('')
  const [inputLimite, setInputLimite] = useState('')
  const [inputVencimento, setInputVencimento] = useState('')
  const [inputCor, setInputCor] = useState('#1A1F71')


  const [inputCompraNome, setInputCompraNome] = useState('')
  const [inputCompraValor, setInputCompraValor] = useState('')
  const [inputCompraData, setInputCompraData] = useState('')
  const [inputCompraCategoria, setInputCompraCategoria] = useState('')
  const [inputCompraObservacao, setInputCompraObservacao] = useState('')


  const [cartaoSelecionado, setCartaoSelecionado] = useState<number | null>(null)
  const [mostrarFormularioCartao, setMostrarFormularioCartao] = useState(false)
  const [mostrarFormularioCompra, setMostrarFormularioCompra] = useState(false)
  const [modoValorTotal, setModoValorTotal] = useState(false)
  const [editingCartaoId, setEditingCartaoId] = useState<number | null>(null)
  const [editandoCartao, setEditandoCartao] = useState(false)
  const [mostrarModalPagamento, setMostrarModalPagamento] = useState(false)
  const [cartaoParaPagar, setCartaoParaPagar] = useState<CartaoCadastrado | null>(null)
  const [mesPagamento, setMesPagamento] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [anoPagamento, setAnoPagamento] = useState<string>(String(new Date().getFullYear()))

  const queryClient = useQueryClient()

  // Queries
  const { data: cartoes } = useQuery<CartaoCadastrado[]>({
    queryKey: ['cartoes-cadastrados'],
    queryFn: () => cartaoService.getCartoesCadastrados(),
    retry: 1,
    refetchOnWindowFocus: false,
  })


  const { data: compras } = useQuery<CompraCartao[]>({
    queryKey: ['compras-cartao', cartaoSelecionado, filtroMes, filtroAno],
    queryFn: () => cartaoService.getComprasCartao(cartaoSelecionado!, filtroMes, filtroAno),
    enabled: !!cartaoSelecionado,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: totalCompras } = useQuery<number>({
    queryKey: ['total-compras-cartao', cartaoSelecionado, filtroMes, filtroAno],
    queryFn: () => cartaoService.getTotalComprasCartao(cartaoSelecionado!, filtroMes, filtroAno),
    enabled: !!cartaoSelecionado,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Mutations
  const adicionarCartaoMutation = useMutation({
    mutationFn: cartaoService.adicionarCartaoCadastrado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartoes-cadastrados'] })
      limparFormularioCartao()
    },
  })

  const atualizarCartaoMutation = useMutation({
    mutationFn: cartaoService.atualizarCartaoCadastrado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartoes-cadastrados'] })
      setEditingCartaoId(null)
      setEditandoCartao(false)
      limparFormularioCartao()
    },
  })


  const removerCartaoMutation = useMutation({
    mutationFn: cartaoService.removerCartaoCadastrado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartoes-cadastrados'] })
      if (cartaoSelecionado === editingCartaoId) {
        setCartaoSelecionado(null)
      }
    },
  })

  const adicionarCompraMutation = useMutation({
    mutationFn: cartaoService.adicionarCompraCartao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras-cartao'] })
      queryClient.invalidateQueries({ queryKey: ['total-compras-cartao'] })
      limparFormularioCompra()
    },
  })


  const removerCompraMutation = useMutation({
    mutationFn: cartaoService.removerCompraCartao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras-cartao'] })
      queryClient.invalidateQueries({ queryKey: ['total-compras-cartao'] })
    },
  })

  const marcarCartaoPagoMutation = useMutation({
    mutationFn: ({ cartaoId, mesPagamento, anoPagamento }: { cartaoId: number, mesPagamento: number, anoPagamento: number }) =>
      cartaoService.marcarCartaoComoPago(cartaoId, mesPagamento, anoPagamento),
    onSuccess: () => {
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['cartoes-cadastrados'] })
      queryClient.invalidateQueries({ queryKey: ['outros'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
      queryClient.invalidateQueries({ queryKey: ['marmitas'] })
      queryClient.invalidateQueries({ queryKey: ['receitas'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      
      // Forçar refetch das queries principais
      queryClient.refetchQueries({ queryKey: ['outros'] })
      queryClient.refetchQueries({ queryKey: ['receitas-despesas'] })
      queryClient.refetchQueries({ queryKey: ['saldo'] })
      
      // Mostrar notificação de sucesso
      alert('Cartão marcado como pago! A despesa foi adicionada, o saldo foi atualizado e o limite foi devolvido.')
      
      setMostrarModalPagamento(false)
      setCartaoParaPagar(null)
    },
    onError: (error) => {
      console.error('Erro ao marcar cartão como pago:', error)
      alert('Erro ao marcar cartão como pago. Tente novamente.')
    },
  })

  const desmarcarCartaoPagoMutation = useMutation({
    mutationFn: cartaoService.desmarcarCartaoComoPago,
    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['cartoes-cadastrados'] })
      queryClient.invalidateQueries({ queryKey: ['outros'] })
      queryClient.invalidateQueries({ queryKey: ['receitas-despesas'] })
      queryClient.invalidateQueries({ queryKey: ['marmitas'] })
      queryClient.invalidateQueries({ queryKey: ['receitas'] })
      queryClient.invalidateQueries({ queryKey: ['saldo'] })
      
 
      queryClient.refetchQueries({ queryKey: ['outros'] })
      queryClient.refetchQueries({ queryKey: ['receitas-despesas'] })
      queryClient.refetchQueries({ queryKey: ['saldo'] })
      

      alert('Cartão desmarcado como pago! A despesa foi removida e o saldo foi atualizado.')
    },
    onError: (error) => {
      console.error('Erro ao desmarcar cartão como pago:', error)
      alert('Erro ao desmarcar cartão como pago. Tente novamente.')
    },
  })

  // Funções auxiliares
  const limparFormularioCartao = useCallback(() => {
    setInputNome('')
    setInputBandeira('visa')
    setInputLimite('')
    setInputVencimento('')
    setInputCor('#1A1F71')
    setMostrarFormularioCartao(false)
    setEditandoCartao(false)
    setEditingCartaoId(null)
  }, [])

  const iniciarEdicaoCartao = useCallback((cartao: CartaoCadastrado) => {
    setEditingCartaoId(cartao.id)
    setEditandoCartao(true)
    setInputNome(cartao.nome)
    setInputBandeira(cartao.bandeira)
    setInputLimite(cartao.limite.toString())
    setInputVencimento(cartao.vencimento.toString())
    setInputCor(cartao.cor)
    setMostrarFormularioCartao(true)
  }, [])

  const cancelarEdicaoCartao = useCallback(() => {
    setEditingCartaoId(null)
    setEditandoCartao(false)
    limparFormularioCartao()
  }, [limparFormularioCartao])

  const limparFormularioCompra = useCallback(() => {
    setInputCompraNome('')
    setInputCompraValor('')
    setInputCompraData('')
    setInputCompraCategoria('alimentacao')
    setInputCompraObservacao('')
    setMostrarFormularioCompra(false)
  }, [])

  const handleToggleModo = useCallback((novoModo: boolean) => {
    setModoValorTotal(novoModo)
    // Limpar formulário quando mudar de modo
    setInputCompraNome('')
    setInputCompraValor('')
    setInputCompraData('')
    setInputCompraCategoria('alimentacao')
    setInputCompraObservacao('')
  }, [])

  // Handlers
  const handleAdicionarCartao = useCallback(() => {
    if (!inputNome || !inputLimite || !inputVencimento) return

    const limite = parseFloat(inputLimite.replace(',', '.'))
    const vencimento = parseInt(inputVencimento)
    
    if (!isFinite(limite) || limite <= 0 || !isFinite(vencimento) || vencimento < 1 || vencimento > 31) return

    if (editandoCartao && editingCartaoId) {
      atualizarCartaoMutation.mutate({
        id: editingCartaoId,
        nome: inputNome,
        bandeira: inputBandeira,
        limite,
        vencimento,
        cor: inputCor
      })
    } else {
      adicionarCartaoMutation.mutate({
        nome: inputNome,
        bandeira: inputBandeira,
        limite,
        vencimento,
        cor: inputCor
      })
    }
  }, [inputNome, inputBandeira, inputLimite, inputVencimento, inputCor, editandoCartao, editingCartaoId, adicionarCartaoMutation, atualizarCartaoMutation])

  const handleAdicionarCompra = useCallback(() => {
    if (!inputCompraNome || !inputCompraValor || !cartaoSelecionado) return

    const valor = parseFloat(inputCompraValor.replace(',', '.'))
    if (!isFinite(valor) || valor <= 0) return

    adicionarCompraMutation.mutate({
      cartao_id: cartaoSelecionado,
      nome: inputCompraNome,
      valor,
      data: inputCompraData || new Date().toISOString().split('T')[0],
      categoria: inputCompraCategoria,
      observacao: inputCompraObservacao || undefined
    })
  }, [inputCompraNome, inputCompraValor, inputCompraData, inputCompraCategoria, inputCompraObservacao, cartaoSelecionado, adicionarCompraMutation])

  const handleRemoverCartao = useCallback((id: number) => {
    if (confirm('Tem certeza que deseja remover este cartão?')) {
      removerCartaoMutation.mutate(id)
    }
  }, [removerCartaoMutation])

  const handleRemoverCompra = useCallback((id: number) => {
    if (confirm('Tem certeza que deseja remover esta compra?')) {
      removerCompraMutation.mutate(id)
    }
  }, [removerCompraMutation])

  const handleMarcarComoPago = useCallback((cartao: CartaoCadastrado) => {
    setCartaoParaPagar(cartao)
    setMostrarModalPagamento(true)
  }, [])

  const handleConfirmarPagamento = useCallback(() => {
    if (cartaoParaPagar) {
      marcarCartaoPagoMutation.mutate({
        cartaoId: cartaoParaPagar.id,
        mesPagamento: parseInt(mesPagamento),
        anoPagamento: parseInt(anoPagamento)
      })
    }
  }, [cartaoParaPagar, mesPagamento, anoPagamento, marcarCartaoPagoMutation])

  const handleDesmarcarPagamento = useCallback((cartaoId: number) => {
    if (confirm('Tem certeza que deseja desmarcar este cartão como pago? A despesa correspondente será removida.')) {
      desmarcarCartaoPagoMutation.mutate(cartaoId)
    }
  }, [desmarcarCartaoPagoMutation])

  const handleDefinirValorTotal = useCallback(() => {
    if (!cartaoSelecionado || !inputCompraValor) return
    
    const valor = parseFloat(inputCompraValor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) {
      alert('Por favor, insira um valor válido')
      return
    }

    // Adicionar como uma compra única com o valor total
    adicionarCompraMutation.mutate({
      cartao_id: cartaoSelecionado,
      nome: 'Valor Total da Fatura',
      valor: valor,
      data: inputCompraData || new Date().toISOString().split('T')[0],
      categoria: 'outros',
      observacao: 'Valor total definido pelo usuário'
    })
  }, [cartaoSelecionado, inputCompraValor, inputCompraData, adicionarCompraMutation])

  // Cálculos
  const cartaoAtual = useMemo(() => {
    if (!cartaoSelecionado || !cartoes) return null
    return cartoes.find((c: CartaoCadastrado) => c.id === cartaoSelecionado)
  }, [cartaoSelecionado, cartoes])

  const limiteRestante = useMemo(() => {
    if (!cartaoAtual || !totalCompras) return 0
    return cartaoAtual.limite - totalCompras
  }, [cartaoAtual, totalCompras])

  const percentualUso = useMemo(() => {
    if (!cartaoAtual || !totalCompras) return 0
    return (totalCompras / cartaoAtual.limite) * 100
  }, [cartaoAtual, totalCompras])


  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cartões de Crédito</h2>
          <p className="text-muted-foreground">Gerencie seus cartões e compras</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarFormularioCartao(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus size={20} />
            Novo Cartão
          </button>
        </div>
      </div>

      {/* Lista de Cartões */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cartoes?.map((cartao: CartaoCadastrado) => {
          const bandeira = BANDEIRAS_CARTAO.find(b => b.value === cartao.bandeira) || BANDEIRAS_CARTAO[0]
          const isSelected = cartaoSelecionado === cartao.id
          
          return (
            <motion.div
              key={cartao.id}
              className={`relative p-6 rounded-xl cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-blue-500 shadow-lg scale-105' 
                  : 'hover:shadow-md hover:scale-102'
              } ${editingCartaoId === cartao.id ? 'ring-2 ring-yellow-500' : ''}`}
              style={{ 
                background: `linear-gradient(135deg, ${cartao.cor}20, ${cartao.cor}10)`,
                border: `1px solid ${cartao.cor}30`
              }}
              onClick={() => {
                if (cartaoSelecionado === cartao.id) {
                  setCartaoSelecionado(null)
                  setMostrarFormularioCompra(false)
                } else {
                  setCartaoSelecionado(cartao.id)
                  setMostrarFormularioCompra(false)
                }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Bandeira */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{bandeira.icone}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {bandeira.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      iniciarEdicaoCartao(cartao)
                    }}
                    className={`p-1 ${editingCartaoId === cartao.id ? 'text-primary bg-primary/10' : 'text-primary hover:bg-primary/10'} rounded`}
                    title={editingCartaoId === cartao.id ? 'Editando cartão' : 'Editar cartão'}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoverCartao(cartao.id)
                    }}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded"
                    title="Remover cartão"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Nome do Cartão */}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {cartao.nome}
              </h3>

              {/* Limite */}
              <div className="mb-2">
                <p className="text-sm text-muted-foreground">Limite</p>
                <p className="text-xl font-bold text-foreground">
                  {ocultarValores ? '••••••' : formatCurrency(cartao.limite)}
                </p>
              </div>

              {/* Vencimento */}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">Vencimento</p>
                <p className="text-lg font-semibold text-foreground">
                  {cartao.vencimento}º
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    cartao.ativo ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    {cartao.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {isSelected && (
                  <ChevronDown size={16} className="text-blue-500" />
                )}
              </div>

              {/* Botões de Pagamento */}
              <div className="mt-4 flex gap-2">
                {Boolean(cartao.pago) ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDesmarcarPagamento(cartao.id)
                    }}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center justify-center gap-2"
                    disabled={desmarcarCartaoPagoMutation.isPending}
                  >
                    <X size={14} />
                    Desmarcar Pago
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleMarcarComoPago(cartao)
                    }}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center justify-center gap-2 relative z-10"
                  >
                    <DollarSign size={14} />
                    Marcar Pago
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Detalhes do Cartão Selecionado */}
      <AnimatePresence>
        {cartaoSelecionado && cartaoAtual && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  {cartaoAtual.nome}
                </h3>
                <p className="text-muted-foreground">
                  {BANDEIRAS_CARTAO.find(b => b.value === cartaoAtual.bandeira)?.label}
                </p>
              </div>
              <button
                onClick={() => setMostrarFormularioCompra(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
              >
                <Plus size={16} />
                Nova Compra
              </button>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Limite</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {ocultarValores ? '••••••' : formatCurrency(cartaoAtual.limite)}
                </p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ShoppingCart className="w-5 h-5 text-destructive" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Gasto</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {ocultarValores ? '••••••' : formatCurrency(totalCompras || 0)}
                </p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CreditCard className="w-5 h-5 text-positive" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Disponível</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {ocultarValores ? '••••••' : formatCurrency(limiteRestante)}
                </p>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Uso do Limite</span>
                <span className="text-sm font-bold text-foreground">
                  {percentualUso.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    percentualUso > 90 ? 'bg-red-500' :
                    percentualUso > 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(percentualUso, 100)}%` }}
                />
              </div>
            </div>

            {/* Lista de Compras */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">
                Compras do Mês
              </h4>
              {compras && compras.length > 0 ? (
                <div className="space-y-2">
                  {compras.map((compra) => {
                    const categoria = CATEGORIAS_COMPRA.find(c => c.value === compra.categoria) || CATEGORIAS_COMPRA[CATEGORIAS_COMPRA.length - 1]
                    
                    return (
                      <div
                        key={compra.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{categoria.icone}</span>
                          <div>
                            <p className="font-medium text-foreground">{compra.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {categoria.label} • {new Date(compra.data).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground">
                            {ocultarValores ? '••••' : formatCurrency(compra.valor)}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRemoverCompra(compra.id)}
                              className="p-1 text-destructive hover:bg-destructive/10 rounded"
                              title="Remover compra"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma compra registrada este mês</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulário de Cartão */}
      <AnimatePresence>
        {mostrarFormularioCartao && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setMostrarFormularioCartao(false)}
          >
            <motion.div
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {editandoCartao ? 'Editar Cartão' : 'Novo Cartão'}
                </h3>
                <button
                  onClick={cancelarEdicaoCartao}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  title="Fechar formulário"
                  aria-label="Fechar formulário"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Nome do Cartão
                  </label>
                  <input
                    type="text"
                    value={inputNome}
                    onChange={(e) => setInputNome(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Ex: Cartão Nubank"
                    aria-label="Nome do cartão"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Bandeira
                  </label>
                  <select
                    value={inputBandeira}
                    onChange={(e) => setInputBandeira(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Bandeira do cartão"
                  >
                    {BANDEIRAS_CARTAO.map((bandeira) => (
                      <option key={bandeira.value} value={bandeira.value}>
                        {bandeira.icone} {bandeira.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Limite
                  </label>
                  <input
                    type="text"
                    value={inputLimite}
                    onChange={(e) => setInputLimite(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0,00"
                    aria-label="Limite do cartão"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Dia de Vencimento
                  </label>
                  <input
                    type="number"
                    value={inputVencimento}
                    onChange={(e) => setInputVencimento(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="15"
                    min="1"
                    max="31"
                    aria-label="Dia de vencimento"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Cor do Cartão
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {CORES_CARTAO.map((cor) => (
                      <button
                        key={cor}
                        onClick={() => setInputCor(cor)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          inputCor === cor ? 'border-foreground' : 'border-muted'
                        }`}
                        style={{ backgroundColor: cor }}
                        title={cor}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleAdicionarCartao}
                  disabled={adicionarCartaoMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {(adicionarCartaoMutation.isPending || atualizarCartaoMutation.isPending) ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {editandoCartao ? 'Salvar Alterações' : 'Adicionar Cartão'}
                </button>
                <button
                  onClick={cancelarEdicaoCartao}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulário de Compra */}
      <AnimatePresence>
        {mostrarFormularioCompra && cartaoSelecionado && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setMostrarFormularioCompra(false)}
          >
            <motion.div
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {modoValorTotal ? 'Definir Valor Total' : 'Nova Compra'}
                </h3>
                <button
                  onClick={() => setMostrarFormularioCompra(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  title="Fechar formulário de compra"
                  aria-label="Fechar formulário de compra"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Toggle entre modo individual e valor total */}
              <div className="flex items-center gap-2 mb-4 p-2 bg-muted/50 rounded-lg">
                <button
                  onClick={() => handleToggleModo(false)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    !modoValorTotal
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Compras Individuais
                </button>
                <button
                  onClick={() => handleToggleModo(true)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    modoValorTotal
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Valor Total
                </button>
              </div>

              <div className="space-y-4">
                {!modoValorTotal && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Descrição da Compra
                    </label>
                    <input
                      type="text"
                      value={inputCompraNome}
                      onChange={(e) => setInputCompraNome(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Ex: Supermercado"
                      aria-label="Descrição da compra"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {modoValorTotal ? 'Valor Total da Fatura' : 'Valor'}
                  </label>
                  <input
                    type="text"
                    value={inputCompraValor}
                    onChange={(e) => setInputCompraValor(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={modoValorTotal ? "Ex: 1.250,00" : "0,00"}
                    aria-label={modoValorTotal ? "Valor total da fatura" : "Valor da compra"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={inputCompraData}
                    onChange={(e) => setInputCompraData(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Data da compra"
                  />
                </div>

                {!modoValorTotal && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Categoria
                      </label>
                      <select
                        value={inputCompraCategoria}
                        onChange={(e) => setInputCompraCategoria(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Categoria da compra"
                      >
                        {CATEGORIAS_COMPRA.map((categoria) => (
                          <option key={categoria.value} value={categoria.value}>
                            {categoria.icone} {categoria.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Observação (opcional)
                      </label>
                      <textarea
                        value={inputCompraObservacao}
                        onChange={(e) => setInputCompraObservacao(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Observações adicionais..."
                        rows={3}
                        aria-label="Observação da compra"
                      />
                    </div>
                  </>
                )}

                {modoValorTotal && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>💡 Dica:</strong> Este valor será adicionado como uma compra única "Valor Total da Fatura". 
                      Use este modo quando você já tem o valor total da fatura do cartão.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={modoValorTotal ? handleDefinirValorTotal : handleAdicionarCompra}
                  disabled={adicionarCompraMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {adicionarCompraMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {modoValorTotal ? 'Definir Valor Total' : 'Adicionar Compra'}
                </button>
                <button
                  onClick={() => setMostrarFormularioCompra(false)}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Pagamento */}
      <AnimatePresence>
        {mostrarModalPagamento && cartaoParaPagar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setMostrarModalPagamento(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Marcar Cartão como Pago
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Cartão: <span className="font-semibold text-foreground">{cartaoParaPagar.nome}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Este cartão será convertido em despesa no mês selecionado.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Mês do Pagamento
                  </label>
                  <select
                    value={mesPagamento}
                    onChange={(e) => setMesPagamento(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Selecionar mês do pagamento"
                    title="Selecionar mês do pagamento"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1
                      return (
                        <option key={month} value={String(month).padStart(2, '0')}>
                          {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Ano do Pagamento
                  </label>
                  <select
                    value={anoPagamento}
                    onChange={(e) => setAnoPagamento(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Selecionar ano do pagamento"
                    title="Selecionar ano do pagamento"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i
                      return (
                        <option key={year} value={String(year)}>
                          {year}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmarPagamento}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  disabled={marcarCartaoPagoMutation.isPending}
                >
                  <DollarSign size={16} />
                  {marcarCartaoPagoMutation.isPending ? 'Processando...' : 'Confirmar Pagamento'}
                </button>
                <button
                  onClick={() => setMostrarModalPagamento(false)}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}