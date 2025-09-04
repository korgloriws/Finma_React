import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import SecurityCheck from './components/SecurityCheck'
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
          <Route path="/login" element={<Suspense fallback={<div />}> <LoginPage /> </Suspense>} />
          <Route path="/recuperar-senha" element={<Suspense fallback={<div />}> <RecuperacaoSenhaPage /> </Suspense>} />
          <Route path="/configurar-seguranca" element={<Suspense fallback={<div />}> <ConfigurarSegurancaPage /> </Suspense>} />
          
          {/* Rotas protegidas */}
          <Route path="/" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<div />}> <HomePage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/detalhes" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<div />}> <DetalhesPage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/analise" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<div />}> <AnalisePage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/carteira" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<div />}> <CarteiraPage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/controle" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<div />}> <ControlePage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/juros-compostos" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<div />}> <JurosCompostosPage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />

          <Route path="/guia" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<div />}> <GuiaMercadoPage /> </Suspense>
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />

          <Route path="/conversor" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <Suspense fallback={<div />}> <ConversorMoedasPage /> </Suspense>
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