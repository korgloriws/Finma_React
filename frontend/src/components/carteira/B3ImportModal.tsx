import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Trash2
} from 'lucide-react'
import { B3ExcelParser, B3Ativo, B3ImportResult } from '../../utils/excelParser'
import { formatCurrency } from '../../utils/formatters'

interface B3ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (ativos: B3Ativo[]) => void
}

export default function B3ImportModal({ isOpen, onClose, onImport }: B3ImportModalProps) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [resultado, setResultado] = useState<B3ImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewAtivos, setPreviewAtivos] = useState<B3Ativo[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.endsWith('.xlsx')) {
      setArquivo(file)
      setResultado(null)
      setPreviewAtivos([])
    } else {
      alert('Por favor, selecione um arquivo .xlsx válido')
    }
  }

  const handleProcessFile = async () => {
    if (!arquivo) return

    setIsProcessing(true)
    try {
      const parser = new B3ExcelParser()
      const resultado = await parser.processarArquivo(arquivo)
      
      setResultado(resultado)
      if (resultado.sucesso) {
        setPreviewAtivos(resultado.ativos)
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      setResultado({
        sucesso: false,
        ativos: [],
        erros: ['Erro ao processar arquivo'],
        totalAtivos: 0
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = () => {
    if (resultado?.sucesso && previewAtivos.length > 0) {
      onImport(previewAtivos)
      handleClose()
    }
  }

  const handleClose = () => {
    setArquivo(null)
    setResultado(null)
    setPreviewAtivos([])
    setIsProcessing(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  const handleRemoveAtivo = (index: number) => {
    setPreviewAtivos(prev => prev.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Importar Relatório B3</h2>
                <p className="text-sm text-muted-foreground">
                  Importe seus ativos a partir de um relatório .xlsx da B3
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {!arquivo ? (
              /* Seleção de Arquivo */
              <div className="text-center py-12">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Selecione o arquivo .xlsx da B3
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    O arquivo deve conter as abas: Ações, Fundo de Investimento, Renda Fixa e Tesouro Direto
                  </p>
                </div>

                <div className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx"
                      onChange={handleFileSelect}
                      className="hidden"
                      aria-label="Selecionar arquivo Excel da B3"
                    />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    aria-label="Selecionar arquivo Excel da B3"
                  >
                    Selecionar Arquivo
                  </button>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Formatos suportados: .xlsx</p>
                    <p>Tamanho máximo: 10MB</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Processamento e Preview */
              <div className="space-y-6">
                {/* Arquivo Selecionado */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{arquivo.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setArquivo(null)
                      setResultado(null)
                      setPreviewAtivos([])
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    aria-label="Remover arquivo selecionado"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Botão Processar */}
                {!resultado && (
                  <div className="text-center">
                  <button
                    onClick={handleProcessFile}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    aria-label="Processar arquivo Excel selecionado"
                  >
                    {isProcessing ? 'Processando...' : 'Processar Arquivo'}
                  </button>
                  </div>
                )}

                {/* Resultado do Processamento */}
                {resultado && (
                  <div className="space-y-4">
                    {/* Status */}
                    <div className={`p-4 rounded-lg flex items-center gap-3 ${
                      resultado.sucesso 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      {resultado.sucesso ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className={`font-medium ${
                          resultado.sucesso ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {resultado.sucesso 
                            ? `Arquivo processado com sucesso! ${resultado.totalAtivos} ativos encontrados com valores históricos da B3.`
                            : 'Erro ao processar arquivo'
                          }
                        </p>
                        {resultado.erros.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-red-700 font-medium">Erros encontrados:</p>
                            <ul className="text-sm text-red-600 mt-1">
                              {resultado.erros.map((erro, index) => (
                                <li key={index}>• {erro}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preview dos Ativos */}
                    {resultado.sucesso && previewAtivos.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              Preview dos Ativos ({previewAtivos.length})
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Os valores mostrados são históricos da B3, não valores atuais de mercado
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleImport}
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              Adicionar à Carteira
                            </button>
                          </div>
                        </div>

                        <div className="border border-border rounded-lg overflow-hidden">
                          <div className="max-h-96 overflow-y-auto">
                            <table className="w-full">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Ticker</th>
                                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Nome</th>
                                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Qtd</th>
                                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Preço Histórico</th>
                                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Valor Histórico</th>
                                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Tipo</th>
                                  <th className="text-center p-3 text-sm font-medium text-muted-foreground">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {previewAtivos.map((ativo, index) => (
                                  <tr key={index} className="border-t border-border hover:bg-muted/30">
                                    <td className="p-3 font-medium text-foreground">{ativo.ticker}</td>
                                    <td className="p-3 text-muted-foreground">{ativo.nome}</td>
                                    <td className="p-3 text-right text-foreground">{ativo.quantidade}</td>
                                    <td className="p-3 text-right text-foreground">
                                      {formatCurrency(ativo.precoMedio)}
                                    </td>
                                    <td className="p-3 text-right text-foreground">
                                      {formatCurrency(ativo.valorTotal)}
                                    </td>
                                    <td className="p-3 text-muted-foreground">{ativo.tipo}</td>
                                    <td className="p-3 text-center">
                                      <button
                                        onClick={() => handleRemoveAtivo(index)}
                                        className="p-1 hover:bg-muted rounded transition-colors"
                                        title="Remover ativo"
                                      >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
