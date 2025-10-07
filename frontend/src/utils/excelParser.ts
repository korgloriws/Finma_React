import * as XLSX from 'xlsx'

export interface B3Ativo {
  ticker: string
  nome: string
  quantidade: number
  precoMedio: number
  valorTotal: number
  tipo: string
  dataAplicacao?: string
  vencimento?: string
  indexador?: string
  indexadorPct?: number
  isentoIr?: boolean
}

export interface B3ImportResult {
  sucesso: boolean
  ativos: B3Ativo[]
  erros: string[]
  totalAtivos: number
}

export class B3ExcelParser {
  private workbook: XLSX.WorkBook | null = null
  private errors: string[] = []

  constructor() {
    this.errors = []
  }

  /**
   * Processa arquivo Excel da B3
   */
  async processarArquivo(arquivo: File): Promise<B3ImportResult> {
    try {
      this.errors = []
      
      // Ler arquivo Excel
      const arrayBuffer = await arquivo.arrayBuffer()
      this.workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      // Verificar se tem as abas necessárias
      const abasNecessarias = ['Acoes', 'Fundo de Investimento', 'Renda Fixa', 'Tesouro Direto']
      const abasDisponiveis = this.workbook.SheetNames
      
      const abasFaltando = abasNecessarias.filter(aba => !abasDisponiveis.includes(aba))
      if (abasFaltando.length > 0) {
        this.errors.push(`Abas necessárias não encontradas: ${abasFaltando.join(', ')}`)
        return this.criarResultadoErro()
      }

      // Processar cada aba
      const ativos = await this.processarAbas()
      
      return {
        sucesso: this.errors.length === 0,
        ativos,
        erros: this.errors,
        totalAtivos: ativos.length
      }
      
    } catch (error) {
      this.errors.push(`Erro ao processar arquivo: ${error}`)
      return this.criarResultadoErro()
    }
  }

  /**
   * Processa todas as abas do relatório
   */
  private async processarAbas(): Promise<B3Ativo[]> {
    const ativos: B3Ativo[] = []
    
    try {
      // Aba Ações - ações e BDRs
      const acoesAtivos = this.processarAbaAcoes()
      ativos.push(...acoesAtivos)
      
      // Aba Fundo de Investimento - FIIs
      const fiisAtivos = this.processarAbaFIIs()
      ativos.push(...fiisAtivos)
      
      // Aba Renda Fixa - CDBs, LCIs, LCAs, etc.
      const rendaFixaAtivos = this.processarAbaRendaFixa()
      ativos.push(...rendaFixaAtivos)
      
      // Aba Tesouro Direto - títulos do tesouro
      const tesouroAtivos = this.processarAbaTesouro()
      ativos.push(...tesouroAtivos)
      
      // Consolidar ativos duplicados
      return this.consolidarAtivos(ativos)
      
    } catch (error) {
      this.errors.push(`Erro ao processar abas: ${error}`)
      return []
    }
  }

  /**
   * Processa aba "Acoes" - ações e BDRs
   */
  private processarAbaAcoes(): B3Ativo[] {
    try {
      const sheet = this.workbook!.Sheets['Acoes']
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
      
      if (!data || data.length < 2) {
        this.errors.push('Aba Ações não contém dados válidos')
        return []
      }

      const ativos: B3Ativo[] = []
      const headers = data[0] as string[]
      
      // Mapear colunas específicas da B3
      const colTicker = this.encontrarColuna(headers, ['Código de Negociação', 'Código', 'Ticker'])
      const colQuantidade = this.encontrarColuna(headers, ['Quantidade', 'Qtd'])
      const colPreco = this.encontrarColuna(headers, ['Preço de Fechamento', 'Preço', 'Preço Fechamento'])

      if (colTicker === -1) {
        this.errors.push('Coluna "Código de Negociação" não encontrada na aba Ações')
        return []
      }
      if (colQuantidade === -1) {
        this.errors.push('Coluna "Quantidade" não encontrada na aba Ações')
        return []
      }
      if (colPreco === -1) {
        this.errors.push('Coluna "Preço de Fechamento" não encontrada na aba Ações')
        return []
      }

      // Processar cada linha
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[]
        if (!row || row.length === 0) continue

        const ticker = this.limparTicker(row[colTicker])
        if (!ticker) continue

        const quantidade = this.parseNumber(row[colQuantidade])
        const preco = this.parseNumber(row[colPreco])

        if (quantidade <= 0 || preco <= 0) continue

        const ativo: B3Ativo = {
          ticker,
          nome: ticker, // Para ações, usamos o ticker como nome
          quantidade,
          precoMedio: preco,
          valorTotal: quantidade * preco,
          tipo: this.determinarTipoAcao(ticker),
        }

        ativos.push(ativo)
      }

      return ativos
      
    } catch (error) {
      this.errors.push(`Erro ao processar aba Ações: ${error}`)
      return []
    }
  }

  /**
   * Processa aba "Fundo de Investimento" - FIIs
   */
  private processarAbaFIIs(): B3Ativo[] {
    try {
      const sheet = this.workbook!.Sheets['Fundo de Investimento']
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
      
      if (!data || data.length < 2) {
        this.errors.push('Aba Fundo de Investimento não contém dados válidos')
        return []
      }

      const ativos: B3Ativo[] = []
      const headers = data[0] as string[]
      
      // Mapear colunas específicas da B3
      const colTicker = this.encontrarColuna(headers, ['Código de Negociação', 'Código', 'Ticker'])
      const colQuantidade = this.encontrarColuna(headers, ['Quantidade', 'Qtd'])
      const colPreco = this.encontrarColuna(headers, ['Preço de Fechamento', 'Preço', 'Preço Fechamento'])

      if (colTicker === -1) {
        this.errors.push('Coluna "Código de Negociação" não encontrada na aba Fundo de Investimento')
        return []
      }
      if (colQuantidade === -1) {
        this.errors.push('Coluna "Quantidade" não encontrada na aba Fundo de Investimento')
        return []
      }
      if (colPreco === -1) {
        this.errors.push('Coluna "Preço de Fechamento" não encontrada na aba Fundo de Investimento')
        return []
      }

      // Processar cada linha
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[]
        if (!row || row.length === 0) continue

        const ticker = this.limparTicker(row[colTicker])
        if (!ticker) continue

        const quantidade = this.parseNumber(row[colQuantidade])
        const preco = this.parseNumber(row[colPreco])

        if (quantidade <= 0 || preco <= 0) continue

        const ativo: B3Ativo = {
          ticker,
          nome: ticker, // Para FIIs, usamos o ticker como nome
          quantidade,
          precoMedio: preco,
          valorTotal: quantidade * preco,
          tipo: 'FII',
        }

        ativos.push(ativo)
      }

      return ativos
      
    } catch (error) {
      this.errors.push(`Erro ao processar aba Fundo de Investimento: ${error}`)
      return []
    }
  }

  /**
   * Processa aba "Renda Fixa" - CDBs, LCIs, LCAs, etc.
   */
  private processarAbaRendaFixa(): B3Ativo[] {
    try {
      const sheet = this.workbook!.Sheets['Renda Fixa']
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
      
      if (!data || data.length < 2) {
        this.errors.push('Aba Renda Fixa não contém dados válidos')
        return []
      }

      const ativos: B3Ativo[] = []
      const headers = data[0] as string[]
      
      // Mapear colunas específicas da B3
      const colProduto = this.encontrarColuna(headers, ['Produto', 'Nome', 'Descrição'])
      const colIndexador = this.encontrarColuna(headers, ['Indexador', 'Índice'])
      const colVencimento = this.encontrarColuna(headers, ['Vencimento', 'Data Vencimento'])
      const colValor = this.encontrarColuna(headers, ['Valor Atualizado CURVA', 'Valor Atualizado', 'Valor'])

      if (colProduto === -1) {
        this.errors.push('Coluna "Produto" não encontrada na aba Renda Fixa')
        return []
      }
      if (colIndexador === -1) {
        this.errors.push('Coluna "Indexador" não encontrada na aba Renda Fixa')
        return []
      }
      if (colVencimento === -1) {
        this.errors.push('Coluna "Vencimento" não encontrada na aba Renda Fixa')
        return []
      }
      if (colValor === -1) {
        this.errors.push('Coluna "Valor Atualizado CURVA" não encontrada na aba Renda Fixa')
        return []
      }

      // Processar cada linha
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[]
        if (!row || row.length === 0) continue

        const produto = row[colProduto]?.toString().trim()
        if (!produto) continue

        const valor = this.parseNumber(row[colValor])
        if (valor <= 0) {
          console.log(`Valor inválido para ${produto} na Renda Fixa:`, row[colValor])
          continue
        }

        console.log(`Processando Renda Fixa - ${produto}:`, {
          produto,
          valor,
          indexador: row[colIndexador],
          vencimento: row[colVencimento]
        })

        const ativo: B3Ativo = {
          ticker: produto, // Para renda fixa, usamos o nome do produto como ticker
          nome: produto,
          quantidade: 1, // Renda fixa sempre tem quantidade 1
          precoMedio: valor, // Valor unitário (valor total da aplicação)
          valorTotal: valor, // Valor total da aplicação
          tipo: this.determinarTipoRendaFixa(row[colIndexador]?.toString() || ''),
          dataAplicacao: this.formatarData(row[colVencimento]), // Usamos vencimento como data de aplicação
          vencimento: this.formatarData(row[colVencimento]),
          indexador: row[colIndexador]?.toString() || '',
        }

        ativos.push(ativo)
      }

      return ativos
      
    } catch (error) {
      this.errors.push(`Erro ao processar aba Renda Fixa: ${error}`)
      return []
    }
  }


  private processarAbaTesouro(): B3Ativo[] {
    try {
      const sheet = this.workbook!.Sheets['Tesouro Direto']
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
      
      if (!data || data.length < 2) {
        this.errors.push('Aba Tesouro Direto não contém dados válidos')
        return []
      }

      const ativos: B3Ativo[] = []
      const headers = data[0] as string[]
      
      
      const colProduto = this.encontrarColuna(headers, ['Produto', 'Nome', 'Descrição'])
      const colIndexador = this.encontrarColuna(headers, ['Indexador', 'Índice'])
      const colVencimento = this.encontrarColuna(headers, ['Vencimento', 'Data Vencimento'])
      const colValor = this.encontrarColuna(headers, ['Valor Atualizado', 'Valor', 'Saldo'])

      if (colProduto === -1) {
        this.errors.push('Coluna "Produto" não encontrada na aba Tesouro Direto')
        return []
      }
      if (colIndexador === -1) {
        this.errors.push('Coluna "Indexador" não encontrada na aba Tesouro Direto')
        return []
      }
      if (colVencimento === -1) {
        this.errors.push('Coluna "Vencimento" não encontrada na aba Tesouro Direto')
        return []
      }
      if (colValor === -1) {
        this.errors.push('Coluna "Valor Atualizado" não encontrada na aba Tesouro Direto')
        return []
      }

      // Processar cada linha
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[]
        if (!row || row.length === 0) continue

        const produto = row[colProduto]?.toString().trim()
        if (!produto) continue

        const valor = this.parseNumber(row[colValor])
        if (valor <= 0) {
          console.log(`Valor inválido para ${produto} no Tesouro Direto:`, row[colValor])
          continue
        }

        console.log(`Processando Tesouro Direto - ${produto}:`, {
          produto,
          valor,
          indexador: row[colIndexador],
          vencimento: row[colVencimento]
        })

        const ativo: B3Ativo = {
          ticker: produto, 
          nome: produto,
          quantidade: 1, 
          precoMedio: valor, // Valor unitário (valor total da aplicação)
          valorTotal: valor, // Valor total da aplicação
          tipo: 'Tesouro Direto',
          dataAplicacao: this.formatarData(row[colVencimento]), 
          vencimento: this.formatarData(row[colVencimento]),
          indexador: row[colIndexador]?.toString() || '',
        }

        ativos.push(ativo)
      }

      return ativos
      
    } catch (error) {
      this.errors.push(`Erro ao processar aba Tesouro Direto: ${error}`)
      return []
    }
  }


  private consolidarAtivos(ativos: B3Ativo[]): B3Ativo[] {
    const consolidado = new Map<string, B3Ativo>()

    for (const ativo of ativos) {
      const key = ativo.ticker
      
      if (consolidado.has(key)) {
        const existente = consolidado.get(key)!
        existente.quantidade += ativo.quantidade
        existente.valorTotal += ativo.valorTotal
        
      
        if (existente.quantidade > 0) {
          existente.precoMedio = existente.valorTotal / existente.quantidade
        }
      } else {
        consolidado.set(key, { ...ativo })
      }
    }

    return Array.from(consolidado.values())
  }


  private encontrarColuna(headers: string[], nomes: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]?.toString().toLowerCase() || ''
      for (const nome of nomes) {
        if (header.includes(nome.toLowerCase())) {
          return i
        }
      }
    }
    return -1
  }


  private limparTicker(ticker: any): string {
    if (!ticker) return ''
    
    let tickerLimpo = ticker.toString().trim().toUpperCase()
    
    
    tickerLimpo = tickerLimpo.replace(/\.SA$/, '')
    tickerLimpo = tickerLimpo.replace(/\.SAO$/, '')
    
    return tickerLimpo
  }

 
  private determinarTipoAcao(ticker: string): string {
    const tickerUpper = ticker.toUpperCase()
    

    if (/^\w+\d{2}$/.test(tickerUpper)) {
      return 'BDR'
    }
    
   
    if (tickerUpper.endsWith('11')) {
      return 'FII'
    }
    
  
    return 'Ação'
  }


  private determinarTipoRendaFixa(indexador: string): string {
    const indexadorUpper = indexador.toUpperCase()
    
    if (indexadorUpper.includes('CDI')) return 'CDB'
    if (indexadorUpper.includes('IPCA')) return 'Tesouro IPCA+'
    if (indexadorUpper.includes('SELIC')) return 'Tesouro Selic'
    if (indexadorUpper.includes('PREFIXADO')) return 'Tesouro Prefixado'
    if (indexadorUpper.includes('LCI')) return 'LCI'
    if (indexadorUpper.includes('LCA')) return 'LCA'
    if (indexadorUpper.includes('DEBÊNTURE') || indexadorUpper.includes('DEBENTURE')) return 'Debênture'
    
    return 'Renda Fixa'
  }



  private parseNumber(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      // Remove espaços e caracteres especiais, mantém apenas números, vírgulas e pontos
      const cleaned = value.replace(/[^\d.,]/g, '')
      
      // Se tem vírgula e ponto, assume que vírgula é separador de milhares
      if (cleaned.includes(',') && cleaned.includes('.')) {
        // Formato: 1.234,56 -> 1234.56
        const normalized = cleaned.replace(/\./g, '').replace(',', '.')
        const parsed = parseFloat(normalized)
        return isNaN(parsed) ? 0 : parsed
      }
      
      // Se tem apenas vírgula, assume que é separador decimal
      if (cleaned.includes(',') && !cleaned.includes('.')) {
        // Formato: 1234,56 -> 1234.56
        const normalized = cleaned.replace(',', '.')
        const parsed = parseFloat(normalized)
        return isNaN(parsed) ? 0 : parsed
      }
      
      // Se tem apenas ponto, assume formato americano
      if (cleaned.includes('.') && !cleaned.includes(',')) {
        const parsed = parseFloat(cleaned)
        return isNaN(parsed) ? 0 : parsed
      }
      
      // Se não tem separadores, é um número inteiro
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  /**
   * Formata data
   */
  private formatarData(data: any): string {
    if (!data) return ''
    
    if (data instanceof Date) {
      return data.toISOString().split('T')[0]
    }
    
    if (typeof data === 'string') {
      // Tentar parsear data em formato brasileiro
      const partes = data.split('/')
      if (partes.length === 3) {
        const [dia, mes, ano] = partes
        return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
      }
    }
    
    return ''
  }

  /**
   * Cria resultado de erro
   */
  private criarResultadoErro(): B3ImportResult {
    return {
      sucesso: false,
      ativos: [],
      erros: this.errors,
      totalAtivos: 0
    }
  }
}
