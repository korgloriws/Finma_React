import { useTheme } from '../contexts/ThemeContext'

// Importar as logos
import logoClaro from '../assets/1760098125752.jpg'
import logoEscuro from '../assets/1760098250909.jpg'

interface FinmaLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export default function FinmaLogo({ 
  size = 'md', 
  showText = true, 
  className = '' 
}: FinmaLogoProps) {
  const { isDark } = useTheme()
  
  // Tamanhos padronizados e bem maiores (triplicados)
  const sizeClasses = {
    sm: 'h-48 sm:h-60 md:h-72 lg:h-84 xl:h-96',
    md: 'h-60 sm:h-72 md:h-84 lg:h-96 xl:h-108 2xl:h-120', 
    lg: 'h-72 sm:h-84 md:h-96 lg:h-108 xl:h-120 2xl:h-132'
  }
  
  const textSizes = {
    sm: 'text-lg sm:text-xl md:text-2xl',
    md: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
    lg: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl'
  }

  // Dimensões fixas para garantir consistência (triplicadas)
  const getImageDimensions = () => {
    switch (size) {
      case 'sm':
        return { width: '192px', height: '192px', minHeight: '192px' }
      case 'md':
        return { width: '240px', height: '240px', minHeight: '240px' }
      case 'lg':
        return { width: '288px', height: '288px', minHeight: '288px' }
      default:
        return { width: '240px', height: '240px', minHeight: '240px' }
    }
  }

  const dimensions = getImageDimensions()

  return (
    <div className={`flex items-center gap-2 sm:gap-3 md:gap-4 ${className}`}>
      <div 
        className={`${sizeClasses[size]} flex items-center justify-center finma-logo`}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          minHeight: dimensions.minHeight
        }}
      >
        <img 
          src={isDark ? logoEscuro : logoClaro} 
          alt="Finma" 
          className="w-full h-full object-contain object-center finma-logo"
          style={{
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        />
      </div>
      {showText && (
        <h1 className={`${textSizes[size]} font-bold text-foreground`}>
          Finma
        </h1>
      )}
    </div>
  )
}
