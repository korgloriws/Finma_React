# FINMA 3.0

Aplicação full-stack para controle financeiro pessoal e análise de investimentos.

- Backend: Flask (Python), SQLite (bancos por usuário)
- Frontend: React + TypeScript (Vite), Tailwind, React Query, Recharts, Framer Motion

## Requisitos

- Python 3.11+
- Node.js 18+
- npm (ou pnpm/yarn)
- Windows: scripts .bat disponíveis para facilitar o start

## Instalação

1) Clonar o repositório e entrar na pasta
2) Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac
pip install -r ..\requirements.txt
```

3) Frontend

```bash
cd ../frontend
npm install
```

## Execução (desenvolvimento)

Opção A — via scripts Windows (recomendado no projeto)

```bash
# Na raiz do projeto
start-dev.bat
```

- Sobe backend em `http://localhost:5005`
- Sobe frontend em `http://localhost:3000`

Opção B — manual

- Backend

```bash
cd backend
.venv\Scripts\activate
python app.py
```

- Frontend

```bash
cd frontend
npm run dev
```

## Credenciais / Autenticação

- Registro exige pergunta e resposta de segurança (obrigatórias).
- Login cria sessão no backend; o sistema sempre inicia na tela de login (sem auto-login).

## Estrutura do Projeto

```
backend/
  app.py            # Endpoints Flask
  models.py         # Lógica de negócio, SQLite por usuário, yfinance
  bancos_usuarios/  # Bancos individuais por usuário (criados no registro)
frontend/
  src/
    pages/          # Telas (Home, Carteira, Detalhes, Análise, Controle, Login)
    services/       # APIs (axios)
    contexts/       # Auth/Theme contexts
    components/     # Componentes (Layout, ProtectedRoute, etc.)
    utils/          # Formatters e helpers
```

## Principais Funcionalidades

- Home

  - Gráfico de distribuição com percentuais e animação
  - Card de despesas que considera apenas cartões e outros (marmitas excluídas)
- Carteira

  - Tabela de ativos com ROE/DY/PL/PVP
  - Gráficos de distribuição e rankings
  - Proventos (pagos e recebidos) com filtros: mês, 6m, 1a, 5a, total (padrão mensal)
  - Movimentações por período (compra e venda) com origem real no banco
  - Evolução patrimonial com base real nas movimentações + comparação com IBOV, IVVB11, IFIX, IPCA (rebased 100) e filtros: mensal, trimestral, semestral, anual, máximo
- Detalhes do Ativo

  - Informações enriquecidas (para FIIs: tipo, segmento, gestora, administradora, PL, vacância, nº cotistas, nº imóveis, VP/cota, DY 12m, dividendo médio 12m, último rendimento)
  - Indicador animado de estratégia (Ação, BDR, FII) conforme filtros do usuário
  - Aba Comparação: busca por Enter/botão (input não recarrega enquanto digita)
- Análise

  - Abas para Ações, BDRs, FIIs com filtros e top 10
  - Tabelas robustas tolerantes a dados faltantes
- Controle Financeiro

  - Receitas, cartões, outros gastos, marmitas (datas exibidas exatamente como salvas)
  - Saldo, evolução financeira e totais por pessoa
- Segurança

  - Pergunta de segurança obrigatória no registro
  - Verificação e configuração da pergunta na primeira sessão
  - Sugestão/validação de senha forte

## Variáveis / Portas

- Backend: porta 5005 (configurada em `app.py`)
- Frontend: porta 3000 (Vite)
- Base URL do axios: `/api` (proxy no Vite para backend)

## Dicas de Uso

- Sempre logar primeiro; sem usuário, as APIs retornam 401/sem dados.
- Para FIIs, os campos podem vir zerados/null dependendo do yfinance; os campos ainda assim existem na UI.
- Se gráficos de comparação não renderizarem imediatamente, aguarde alguns segundos (yfinance) ou tente novamente; há fallbacks para índices.

## Testes Rápidos

- Criar usuário, configurar pergunta, logar.
- Adicionar ativos (compra), remover (venda) e verificar:
  - Movimentações (Carteira > Movimentações)
  - Evolução patrimonial e comparação
  - Proventos pagos/recebidos com filtros

## Problemas Comuns

- Datas: o backend padroniza strings e remove timezone para comparações.
- Infinity em JSON: tratado no backend para retornar null.
- Perda de foco em inputs: inputs críticos (ex.: comparação) usam `ref` não-controlado.

## Build/Deploy

- Frontend

```bash
cd frontend
npm run build
```

- Backend: executar `app.py` (WSGI/ASGI conforme infra desejada). Ajustar CORS/host/porta se necessário.

## Licença

Projeto pessoal do autor. Ajuste conforme necessidade antes de uso comercial.
