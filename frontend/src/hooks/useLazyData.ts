import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

interface LazyDataOptions {
  enabled?: boolean
  priority?: 'high' | 'medium' | 'low'
  delay?: number
}

/**
 * Hook para carregamento lazy de dados com priorização
 */
export function useLazyData<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: LazyDataOptions = {}
) {
  const { enabled = true, priority = 'medium', delay = 0 } = options
  const [shouldLoad, setShouldLoad] = useState(false)

  // Delay baseado na prioridade
  useEffect(() => {
    if (!enabled) return

    const delays = {
      high: 0,
      medium: 100,
      low: 300
    }

    const timer = setTimeout(() => {
      setShouldLoad(true)
    }, delays[priority] + delay)

    return () => clearTimeout(timer)
  }, [enabled, priority, delay])

  return useQuery({
    queryKey,
    queryFn,
    enabled: enabled && shouldLoad,
    staleTime: priority === 'high' ? 60000 : 300000, // 1min para high, 5min para outros
    retry: priority === 'high' ? 3 : 1,
    refetchOnWindowFocus: priority === 'high'
  })
}

/**
 * Hook para carregamento progressivo de dados
 */
export function useProgressiveData<T>(
  queries: Array<{
    key: string[]
    fn: () => Promise<T>
    priority: 'high' | 'medium' | 'low'
    delay?: number
  }>
) {
  const results = queries.map(({ key, fn, priority, delay = 0 }) => 
    useLazyData(key, fn, { priority, delay })
  )

  return {
    results,
    isLoading: results.some(r => r.isLoading),
    isError: results.some(r => r.isError),
    allLoaded: results.every(r => r.isSuccess || r.isError)
  }
}
