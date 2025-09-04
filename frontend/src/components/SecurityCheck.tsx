import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface SecurityCheckProps {
  children: React.ReactNode
}

export default function SecurityCheck({ children }: SecurityCheckProps) {
  const { user, verificarPergunta } = useAuth()
  const navigate = useNavigate()
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSecurityQuestion = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {

        const resultado = await verificarPergunta(user)
        setHasSecurityQuestion(resultado.tem_pergunta)
      } catch (error: any) {

        console.error('Erro ao verificar pergunta de segurança:', error)
        setHasSecurityQuestion(true)
      } finally {
        setLoading(false)
      }
    }

    checkSecurityQuestion()
  }, [user])

  useEffect(() => {

    if (hasSecurityQuestion === false && !loading) {
      const currentPath = window.location.pathname
      if (currentPath !== '/configurar-seguranca') {
        navigate('/configurar-seguranca')
      }
    }
  }, [hasSecurityQuestion, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  
  if (hasSecurityQuestion === false && window.location.pathname === '/configurar-seguranca') {
    return children
  }


  if (hasSecurityQuestion === true || !user) {
    return children
  }


  return children
} 