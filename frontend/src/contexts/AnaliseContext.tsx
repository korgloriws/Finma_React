import { createContext, useContext, useState, ReactNode } from 'react'
import { AtivoAnalise } from '../types'

interface AnaliseContextType {
  // Estados para dados dos ativos
  ativosAcoes: AtivoAnalise[]
  ativosBdrs: AtivoAnalise[]
  ativosFiis: AtivoAnalise[]
  
  // Setters para os dados
  setAtivosAcoes: (ativos: AtivoAnalise[]) => void
  setAtivosBdrs: (ativos: AtivoAnalise[]) => void
  setAtivosFiis: (ativos: AtivoAnalise[]) => void
  
  // Função para obter todos os ativos combinados
  getTodosAtivos: () => AtivoAnalise[]
}

const AnaliseContext = createContext<AnaliseContextType | undefined>(undefined)

export const useAnalise = () => {
  const context = useContext(AnaliseContext)
  if (context === undefined) {
    throw new Error('useAnalise must be used within an AnaliseProvider')
  }
  return context
}

interface AnaliseProviderProps {
  children: ReactNode
}

export const AnaliseProvider = ({ children }: AnaliseProviderProps) => {
  const [ativosAcoes, setAtivosAcoes] = useState<AtivoAnalise[]>([])
  const [ativosBdrs, setAtivosBdrs] = useState<AtivoAnalise[]>([])
  const [ativosFiis, setAtivosFiis] = useState<AtivoAnalise[]>([])

  const getTodosAtivos = () => {
    return [...ativosAcoes, ...ativosBdrs, ...ativosFiis]
  }

  const value = {
    ativosAcoes,
    ativosBdrs,
    ativosFiis,
    setAtivosAcoes,
    setAtivosBdrs,
    setAtivosFiis,
    getTodosAtivos
  }

  return (
    <AnaliseContext.Provider value={value}>
      {children}
    </AnaliseContext.Provider>
  )
}
