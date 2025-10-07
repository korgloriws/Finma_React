import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { X, Save, Building2, Calendar, Percent, DollarSign, AlertCircle } from 'lucide-react'
import { rfCatalogService } from '../../services/api'

interface RendaFixaFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  editingItem?: any
}

export default function RendaFixaFormModal({ open, onClose, onSuccess, editingItem }: RendaFixaFormModalProps) {
  const [formData, setFormData] = useState({
    nome: editingItem?.nome || '',
    emissor: editingItem?.emissor || '',
    tipo: editingItem?.tipo || 'CDB',
    indexador: editingItem?.indexador || 'CDI',
    taxa_percentual: editingItem?.taxa_percentual || 100,
    taxa_fixa: editingItem?.taxa_fixa || 0,
    quantidade: editingItem?.quantidade || '',
    preco: editingItem?.preco || '',
    data_inicio: editingItem?.data_inicio || '',
    vencimento: editingItem?.vencimento || '',
    liquidez_diaria: editingItem?.liquidez_diaria || false,
    isento_ir: editingItem?.isento_ir || false,
    observacao: editingItem?.observacao || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: rfCatalogService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rf-catalog-modal'] })
      queryClient.invalidateQueries({ queryKey: ['rf-catalog'] })
      onSuccess?.()
      onClose()
    },
    onError: (error: any) => {
      console.error('Erro ao criar item:', error)
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => rfCatalogService.update({ ...data, id: editingItem?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rf-catalog-modal'] })
      queryClient.invalidateQueries({ queryKey: ['rf-catalog'] })
      onSuccess?.()
      onClose()
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar item:', error)
    }
  })

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    if (!formData.emissor.trim()) {
      newErrors.emissor = 'Emissor é obrigatório'
    }

    if (!formData.tipo) {
      newErrors.tipo = 'Tipo é obrigatório'
    }

    if (!formData.indexador) {
      newErrors.indexador = 'Indexador é obrigatório'
    }

    if (formData.taxa_percentual && (Number(formData.taxa_percentual) < 0 || Number(formData.taxa_percentual) > 1000)) {
      newErrors.taxa_percentual = 'Taxa percentual deve estar entre 0 e 1000'
    }

    if (formData.taxa_fixa && (Number(formData.taxa_fixa) < 0 || Number(formData.taxa_fixa) > 50)) {
      newErrors.taxa_fixa = 'Taxa fixa deve estar entre 0 e 50%'
    }

    if (!formData.quantidade || formData.quantidade === '' || Number(formData.quantidade) <= 0) {
      newErrors.quantidade = 'Quantidade é obrigatória e deve ser maior que zero'
    }

    if (!formData.preco || formData.preco === '' || Number(formData.preco) <= 0) {
      newErrors.preco = 'Preço é obrigatório e deve ser maior que zero'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData = {
      ...formData,
      taxa_percentual: Number(formData.taxa_percentual),
      taxa_fixa: Number(formData.taxa_fixa),
      quantidade: Number(formData.quantidade),
      preco: Number(formData.preco)
    }

    if (editingItem) {
      updateMutation.mutate(submitData)
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {editingItem ? 'Editar' : 'Novo'} Produto de Renda Fixa
                </h2>
                <p className="text-sm text-muted-foreground">
                  {editingItem ? 'Atualize as informações do produto' : 'Cadastre um novo produto no catálogo'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-xl transition-colors"
              disabled={isLoading}
              title="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome e Emissor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Nome do Produto *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Ex: CDB Banco X, LCI Banco Y"
                className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                  errors.nome 
                    ? 'border-destructive bg-destructive/5' 
                    : 'border-border bg-background focus:border-primary'
                }`}
                disabled={isLoading}
              />
              {errors.nome && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.nome}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Emissor *
              </label>
              <input
                type="text"
                value={formData.emissor}
                onChange={(e) => handleInputChange('emissor', e.target.value)}
                placeholder="Ex: Banco X, Banco Y"
                className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                  errors.emissor 
                    ? 'border-destructive bg-destructive/5' 
                    : 'border-border bg-background focus:border-primary'
                }`}
                disabled={isLoading}
              />
              {errors.emissor && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.emissor}
                </p>
              )}
            </div>
          </div>

          {/* Tipo e Indexador */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Tipo *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => handleInputChange('tipo', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                  errors.tipo 
                    ? 'border-destructive bg-destructive/5' 
                    : 'border-border bg-background focus:border-primary'
                }`}
                disabled={isLoading}
                title="Selecionar tipo de produto"
              >
                <option value="CDB">CDB</option>
                <option value="LCI">LCI</option>
                <option value="LCA">LCA</option>
                <option value="Debênture">Debênture</option>
                <option value="Tesouro">Tesouro</option>
                <option value="Outros">Outros</option>
              </select>
              {errors.tipo && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.tipo}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Indexador *
              </label>
              <select
                value={formData.indexador}
                onChange={(e) => handleInputChange('indexador', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                  errors.indexador 
                    ? 'border-destructive bg-destructive/5' 
                    : 'border-border bg-background focus:border-primary'
                }`}
                disabled={isLoading}
                title="Selecionar indexador"
              >
                <option value="CDI">CDI</option>
                <option value="CDI+">CDI+ (CDI + taxa fixa)</option>
                <option value="IPCA">IPCA</option>
                <option value="IPCA+">IPCA+ (IPCA + taxa fixa)</option>
                <option value="SELIC">SELIC</option>
                <option value="PREFIXADO">PREFIXADO</option>
              </select>
              {errors.indexador && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.indexador}
                </p>
              )}
            </div>
          </div>

          {/* Taxas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Taxa Percentual (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1000"
                  value={formData.taxa_percentual}
                  onChange={(e) => handleInputChange('taxa_percentual', e.target.value)}
                  placeholder="100"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-colors ${
                    errors.taxa_percentual 
                      ? 'border-destructive bg-destructive/5' 
                      : 'border-border bg-background focus:border-primary'
                  }`}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ex: 100 = 100% do indexador, 110 = 110% do indexador
              </p>
              {errors.taxa_percentual && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.taxa_percentual}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Taxa Fixa (% a.a.)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="50"
                  value={formData.taxa_fixa}
                  onChange={(e) => handleInputChange('taxa_fixa', e.target.value)}
                  placeholder="0"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-colors ${
                    errors.taxa_fixa 
                      ? 'border-destructive bg-destructive/5' 
                      : 'border-border bg-background focus:border-primary'
                  }`}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ex: 2 = 2% a.a. (para CDI+ ou IPCA+)
              </p>
              {errors.taxa_fixa && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.taxa_fixa}
                </p>
              )}
            </div>
          </div>

          {/* Quantidade e Preço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Quantidade *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.quantidade}
                  onChange={(e) => handleInputChange('quantidade', e.target.value)}
                  placeholder="Ex: 1000"
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                    errors.quantidade 
                      ? 'border-destructive bg-destructive/5' 
                      : 'border-border bg-background focus:border-primary'
                  }`}
                  disabled={isLoading}
                  title="Quantidade do produto"
                />
              </div>
              {errors.quantidade && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.quantidade}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Preço Unitário (R$) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.preco}
                  onChange={(e) => handleInputChange('preco', e.target.value)}
                  placeholder="Ex: 1000.00"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-colors ${
                    errors.preco 
                      ? 'border-destructive bg-destructive/5' 
                      : 'border-border bg-background focus:border-primary'
                  }`}
                  disabled={isLoading}
                  title="Preço unitário do produto"
                />
              </div>
              {errors.preco && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.preco}
                </p>
              )}
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Data de Início
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => handleInputChange('data_inicio', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:border-primary transition-colors"
                  disabled={isLoading}
                  title="Data de início do produto"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Vencimento
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={formData.vencimento}
                  onChange={(e) => handleInputChange('vencimento', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:border-primary transition-colors"
                  disabled={isLoading}
                  title="Data de vencimento do produto"
                />
              </div>
            </div>
          </div>

          {/* Opções */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.liquidez_diaria}
                  onChange={(e) => handleInputChange('liquidez_diaria', e.target.checked)}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                  disabled={isLoading}
                  title="Produto com liquidez diária"
                />
                <span className="text-sm font-medium text-foreground">Liquidez Diária</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isento_ir}
                  onChange={(e) => handleInputChange('isento_ir', e.target.checked)}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                  disabled={isLoading}
                  title="Produto isento de imposto de renda"
                />
                <span className="text-sm font-medium text-foreground">Isento de IR</span>
              </label>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Observações
            </label>
            <textarea
              value={formData.observacao}
              onChange={(e) => handleInputChange('observacao', e.target.value)}
              placeholder="Informações adicionais sobre o produto..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary transition-colors resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-border text-foreground hover:bg-muted transition-colors font-medium"
              disabled={isLoading}
              title="Cancelar cadastro"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={editingItem ? 'Atualizar produto' : 'Cadastrar produto'}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingItem ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
