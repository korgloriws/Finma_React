import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ativoService } from '../services/api'
import { normalizeTicker, getDisplayTicker } from '../utils/tickerUtils'

interface TickerWithLogoProps {
  ticker: string
  nome?: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}

export default function TickerWithLogo({ 
  ticker, 
  nome, 
  size = 'md', 
  showName = false,
  className = ''
}: TickerWithLogoProps) {
  // Normaliza o ticker para garantir que tenha .SA se necessário
  const normalizedTicker = normalizeTicker(ticker)
  const displayTicker = getDisplayTicker(ticker)
  
  const { data: logoUrl } = useQuery<string | null>({
    queryKey: ['logo', normalizedTicker],
    queryFn: () => ativoService.getLogoUrl(normalizedTicker),
    enabled: !!normalizedTicker,
  })

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',    // Dobrado: 16px -> 32px
    md: 'w-12 h-12 text-sm',  // Dobrado: 24px -> 48px  
    lg: 'w-16 h-16 text-base' // Dobrado: 32px -> 64px
  }

  const logoSize = sizeClasses[size]

  return (
    <Link 
      to={`/detalhes?ticker=${displayTicker}`}
      className={`flex items-center gap-2 hover:text-primary transition-colors min-w-0 ${className}`}
    >
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={`Logo ${displayTicker}`}
          className={`${logoSize} rounded flex-shrink-0 object-contain`}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <div className={`${logoSize} bg-muted rounded flex items-center justify-center font-medium flex-shrink-0`}>
          {displayTicker.charAt(0)}
        </div>
      )}
      <span className="font-medium truncate max-w-[80px] sm:max-w-none">{displayTicker}</span>
      {showName && nome && (
        <span className="text-muted-foreground text-sm hidden md:inline">({nome})</span>
      )}
    </Link>
  )
} 