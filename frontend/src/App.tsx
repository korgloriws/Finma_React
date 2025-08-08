import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import SecurityCheck from './components/SecurityCheck'
import LoginPage from './pages/LoginPage'
import RecuperacaoSenhaPage from './pages/RecuperacaoSenhaPage'
import ConfigurarSegurancaPage from './pages/ConfigurarSegurancaPage'
import DetalhesPage from './pages/DetalhesPage'
import AnalisePage from './pages/AnalisePage'
import CarteiraPage from './pages/CarteiraPage'
import ControlePage from './pages/ControlePage'

import HomePage from './pages/HomePage'

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          {/* Rotas públicas */}
                  <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-senha" element={<RecuperacaoSenhaPage />} />
        <Route path="/configurar-seguranca" element={<ConfigurarSegurancaPage />} />
          
          {/* Rotas protegidas */}
          <Route path="/" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <HomePage />
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/detalhes" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <DetalhesPage />
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/analise" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <AnalisePage />
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/carteira" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <CarteiraPage />
                </Layout>
              </SecurityCheck>
            </ProtectedRoute>
          } />
          
          <Route path="/controle" element={
            <ProtectedRoute>
              <SecurityCheck>
                <Layout>
                  <ControlePage />
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