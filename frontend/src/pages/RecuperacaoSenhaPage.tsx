import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  HelpCircle
} from 'lucide-react'

export default function RecuperacaoSenhaPage() {
  const { obterPergunta, verificarResposta, redefinirSenha } = useAuth()
  const navigate = useNavigate()
  
  const [step, setStep] = useState<'username' | 'question' | 'answer' | 'password' | 'success'>('username')
  const [username, setUsername] = useState('')
  const [pergunta, setPergunta] = useState('')
  const [resposta, setResposta] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleObterPergunta = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const perguntaSeguranca = await obterPergunta(username)
      setPergunta(perguntaSeguranca)
      setStep('question')
    } catch (error: any) {

      if (error.message === "Usuário não possui pergunta de segurança configurada") {
        setError('Este usuário não possui uma pergunta de segurança configurada. Para recuperar sua senha, você precisa primeiro fazer login e configurar uma pergunta de segurança.')
      } else if (error.message === "Usuário não encontrado") {
        setError('Usuário não encontrado. Verifique se o nome de usuário está correto.')
      } else {
        setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerificarResposta = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const respostaCorreta = await verificarResposta(username, resposta)
      if (respostaCorreta) {
        setStep('password')
      } else {
        setError('Resposta incorreta')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRedefinirSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      await redefinirSenha(username, password)
      setStep('success')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVoltar = () => {
    if (step === 'username') {
      navigate('/login')
    } else if (step === 'question') {
      setStep('username')
    } else if (step === 'answer') {
      setStep('question')
    } else if (step === 'password') {
      setStep('answer')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={handleVoltar}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {step === 'username' && 'Recuperar Senha'}
            {step === 'question' && 'Pergunta de Segurança'}
            {step === 'answer' && 'Responder Pergunta'}
            {step === 'password' && 'Nova Senha'}
            {step === 'success' && 'Senha Alterada!'}
          </h1>
          
          <p className="text-muted-foreground">
            {step === 'username' && 'Digite seu nome de usuário para recuperar a senha'}
            {step === 'question' && 'Responda à sua pergunta de segurança'}
            {step === 'answer' && 'Digite sua resposta'}
            {step === 'password' && 'Digite sua nova senha'}
            {step === 'success' && 'Sua senha foi alterada com sucesso!'}
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 mb-4 border rounded-lg"
              style={{
                backgroundColor: 'rgb(254 242 242)', // Light red background
                borderColor: 'rgb(239 68 68)', // Red border
                color: 'rgb(185 28 28)' // Dark red text
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm">{error}</span>
                  {error.includes('não possui uma pergunta de segurança') && (
                    <div className="mt-3">
                      <button
                        onClick={() => navigate('/login')}
                        className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                      >
                        Ir para Login
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 1: Username */}
          {step === 'username' && (
            <motion.form 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleObterPergunta}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Nome de Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Digite seu nome de usuário"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  'Continuar'
                )}
              </button>
            </motion.form>
          )}

          {/* Step 2: Question */}
          {step === 'question' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                      Sua pergunta de segurança:
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300">
                      {pergunta}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('answer')}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Responder Pergunta
              </button>
            </motion.div>
          )}

          {/* Step 3: Answer */}
          {step === 'answer' && (
            <motion.form 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleVerificarResposta}
              className="space-y-4"
            >
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
                <p className="text-blue-800 dark:text-blue-200 font-medium mb-2">
                  Pergunta:
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  {pergunta}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sua Resposta</label>
                <input
                  type="text"
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Digite sua resposta"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar Resposta'
                )}
              </button>
            </motion.form>
          )}

          {/* Step 4: Password */}
          {step === 'password' && (
            <motion.form 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleRedefinirSenha}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Digite sua nova senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={mostrarConfirmarSenha ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Confirme sua nova senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {mostrarConfirmarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </button>
            </motion.form>
          )}

          {/* Step 5: Success */}
          {step === 'success' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-4"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Senha Alterada com Sucesso!
                </h3>
                <p className="text-muted-foreground">
                  Sua senha foi alterada. Agora você pode fazer login com sua nova senha.
                </p>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Ir para Login
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
} 