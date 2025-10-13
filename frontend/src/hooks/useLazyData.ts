import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

interface LazyDataOptions {
  enabled?: boolean
  staleTime?: number
  retry?: number
  refetchOnWindowFocus?: boolean
}

/**
 * Hook para carregamento sob demanda de dados
 * Só carrega quando o componente está visível na tela
 */
export function useLazyData<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: LazyDataOptions = {}
) {
  const [isVisible, setIsVisible] = useState(false)
  const [ref, setRef] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!ref) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    observer.observe(ref)

    return () => observer.disconnect()
  }, [ref])

  const query = useQuery({
    queryKey,
    queryFn,
    enabled: isVisible && (options.enabled ?? true),
    staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutos
    retry: options.retry ?? 3,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
  })

  return {
    ...query,
    ref: setRef,
    isVisible,
  }
}

/**
 * Hook para carregamento sequencial de dados
 * Carrega dados em ordem de prioridade
 */
export function useSequentialData<T>(
  queries: Array<{
    key: string[]
    fn: () => Promise<T>
    enabled?: boolean
    dependsOn?: string[]
  }>
) {
  const [completedQueries, setCompletedQueries] = useState<Set<string>>(new Set())
  
  return queries.map((query, index) => {
    const isEnabled = query.enabled ?? true
    const dependsOnCompleted = !query.dependsOn || 
      query.dependsOn.every(dep => completedQueries.has(dep))
    
    const shouldEnable = isEnabled && dependsOnCompleted

    const result = useQuery({
      queryKey: query.key,
      queryFn: query.fn,
      enabled: shouldEnable,
      staleTime: 5 * 60 * 1000,
      retry: 3,
      refetchOnWindowFocus: false,
    })

    // Marcar como concluída quando dados são carregados
    useEffect(() => {
      if (result.data && !result.isLoading) {
        setCompletedQueries(prev => new Set([...prev, query.key.join('-')]))
      }
    }, [result.data, result.isLoading, query.key])

    return {
      ...result,
      queryKey: query.key.join('-'),
      priority: index,
    }
  })
}

/**
 * Hook para carregamento sob demanda baseado em scroll
 * Carrega dados conforme o usuário faz scroll
 */
export function useScrollBasedData<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: LazyDataOptions & { scrollThreshold?: number } = {}
) {
  const [isNearBottom, setIsNearBottom] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      const threshold = options.scrollThreshold ?? 0.8
      const isNear = (scrollTop + windowHeight) >= (documentHeight * threshold)
      
      setIsNearBottom(isNear)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [options.scrollThreshold])

  return useQuery({
    queryKey,
    queryFn,
    enabled: isNearBottom && (options.enabled ?? true),
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    retry: options.retry ?? 3,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
  })
}