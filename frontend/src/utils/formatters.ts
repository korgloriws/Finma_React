export function formatCurrency(value: number | null | undefined, prefix = 'R$'): string {
  if (value == null || isNaN(value)) return '-'
  
  if (Math.abs(value) >= 1e9) {
    return `${prefix} ${(value / 1e9).toFixed(2)} bi`.replace('.', ',')
  }
  if (Math.abs(value) >= 1e6) {
    return `${prefix} ${(value / 1e6).toFixed(2)} mi`.replace('.', ',')
  }
  
  return `${prefix} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPercentage(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '-'
  return `${value.toFixed(decimals)}%`.replace('.', ',')
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '-'
  return value.toFixed(decimals).replace('.', ',')
}

export function formatDividendYield(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '-'
  
  // Se o valor for maior que 1, já está em percentual
  if (value > 1) {
    return `${value.toFixed(2)}%`.replace('.', ',')
  }
  // Se for menor que 1, multiplicar por 100
  return `${(value * 100).toFixed(2)}%`.replace('.', ',')
}

export function normalizeTicker(ticker: string): string {
  const normalized = ticker.trim().toUpperCase()
  if (!normalized.includes('.') && normalized.length <= 6) {
    return normalized + '.SA'
  }
  return normalized
} 