import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import SecurityCheck from './components/SecurityCheck'
import LoadingSpinner from './components/LoadingSpinner'
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RecuperacaoSenhaPage = lazy(() => import('./pages/RecuperacaoSenhaPage'))
const ConfigurarSegurancaPage = lazy(() => import('./pages/ConfigurarSegurancaPage'))
const DetalhesPage = lazy(() => import('./pages/DetalhesPage'))
const AnalisePage = lazy(() => import('./pages/AnalisePage'))
const CarteiraPage = lazy(() => import('./pages/CarteiraPage'))
const ControlePage = lazy(() => import('./pages/ControlePage'))
const JurosCompostosPage = lazy(() => import('./pages/JurosCompostosPage'))
const GuiaMercadoPage = lazy(() => import('./pages/GuiaMercadoPage'))
const ConversorMoedasPage = lazy(() => import('./pages/ConversorMoedasPage'))

const HomePage = lazy(() => import('./pages/HomePage'))

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<Suspense fallback={<LoadingSpinner text="Carregando página de login..." />}> <LoginPage /> </Suspense>} />
          <Route path="/recuperar-senha" element={<Suspense fallback={<LoadingSpinner text="Carregando recuperação de senha..." />}> <RecuperacaoSenhaPage /> </Suspense>} />
          <Route path="/configurar-seguranca" element={<Suspense fallback={<LoadingSpinner text="Carregando configurações..." />}> <ConfigurarSegurancaPage /> </Suspense>} />
          
          {/* Rotas protegidas */}
          <Route path="/" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<LoadingSpinner text="Carregando dashboard..." />}> <HomePage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/detalhes" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<LoadingSpinner text="Carregando detalhes do ativo..." />}> <DetalhesPage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/analise" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<LoadingSpinner text="Carregando análise de mercado..." />}> <AnalisePage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/carteira" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<LoadingSpinner text="Carregando carteira..." />}> <CarteiraPage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/controle" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<LoadingSpinner text="Carregando controle financeiro..." />}> <ControlePage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/juros-compostos" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<LoadingSpinner text="Carregando calculadora..." />}> <JurosCompostosPage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />

          <Route path="/guia" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<LoadingSpinner text="Carregando guia de mercado..." />}> <GuiaMercadoPage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />

          <Route path="/conversor" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<LoadingSpinner text="Carregando conversor de moedas..." />}> <ConversorMoedasPage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          

        </Routes>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App 