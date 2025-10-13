import { useTheme } from '../contexts/ThemeContext'

// Importar as logos
import logoClaro from '../assets/1760101826967.jpg'
import logoEscuro from '../assets/1760101899780.jpg'

interface FinmasLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export default function FinmasLogo({ 
  size = 'md', 
  showText = true, 
  className = '' 
}: FinmasLogoProps) {
  const { isDark } = useTheme()
  

  const sizeClasses = {
    sm: 'h-20 sm:h-24 md:h-28 lg:h-32 xl:h-36', 
    md: 'h-24 sm:h-28 md:h-32 lg:h-36 xl:h-40 2xl:h-44', 
    lg: 'h-28 sm:h-32 md:h-36 lg:h-40 xl:h-44 2xl:h-48' 
  }
  
  const textSizes = {
    sm: 'text-lg sm:text-xl md:text-2xl',
    md: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
    lg: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl'
  }


  const getImageDimensions = () => {
    switch (size) {
      case 'sm':
        return { width: '160px', height: '80px', minHeight: '80px' } 
      case 'md':
        return { width: '200px', height: '100px', minHeight: '100px' } 
      case 'lg':
        return { width: '240px', height: '120px', minHeight: '120px' } 
      default:
        return { width: '200px', height: '100px', minHeight: '100px' } 
    }
  }

  const dimensions = getImageDimensions()

  return (
    <div className={`flex items-center gap-2 sm:gap-3 md:gap-4 ${className}`}>
      <div 
        className={`${sizeClasses[size]} flex items-center justify-center finmas-logo`}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          minHeight: dimensions.minHeight
        }}
      >
           <img
             src={isDark ? logoEscuro : logoClaro}
             alt="Finmas"
             className="w-full h-full object-contain object-center finmas-logo"
             style={{
               maxWidth: '100%',
               maxHeight: '100%',
               objectFit: 'contain'
             }}
           />
      </div>
      {showText && (
        <h1 className={`${textSizes[size]} font-bold text-foreground`}>
          Finmas
        </h1>
      )}
    </div>
  )
}
