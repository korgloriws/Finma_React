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
  
  // Tamanhos otimizados para preencher melhor o espaço
  const sizeClasses = {
    sm: 'h-32 sm:h-36 md:h-40 lg:h-44 xl:h-48', // Mobile: maior para preencher
    md: 'h-36 sm:h-40 md:h-44 lg:h-48 xl:h-52 2xl:h-56', // Mobile: maior para preencher
    lg: 'h-40 sm:h-44 md:h-48 lg:h-52 xl:h-56 2xl:h-60' // Mobile: maior para preencher
  }
  
  const textSizes = {
    sm: 'text-lg sm:text-xl md:text-2xl',
    md: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
    lg: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl'
  }

  // Dimensões otimizadas para preencher melhor o espaço
  const getImageDimensions = () => {
    switch (size) {
      case 'sm':
        return { width: '128px', height: '128px', minHeight: '128px' } // Mobile: maior para preencher
      case 'md':
        return { width: '144px', height: '144px', minHeight: '144px' } // Mobile: maior para preencher
      case 'lg':
        return { width: '160px', height: '160px', minHeight: '160px' } // Mobile: maior para preencher
      default:
        return { width: '144px', height: '144px', minHeight: '144px' } // Mobile: maior para preencher
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
