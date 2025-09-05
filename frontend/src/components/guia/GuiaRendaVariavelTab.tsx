import { BookOpen, ExternalLink, Target, AlertCircle, PieChart, Building2 } from 'lucide-react'

interface GuiaRendaVariavelTabProps {
  IndexChart: () => JSX.Element | null
  googleUrl: (query: string) => string
  setSearchParams: (params: { ticker: string }) => void
  RENDA_VARIAVEL_DETAILS: {
    conceitos: Array<{
      title: string
      content: string
      googleQuery: string
    }>
    tipos: Array<{
      name: string
      description: string
      googleQuery: string
      pros: string[]
      cons: string[]
    }>
    estrategias: Array<{
      name: string
      description: string
      googleQuery: string
      pros: string[]
      cons: string[]
    }>
    setores: Array<{
      name: string
      description: string
      googleQuery: string
      caracteristicas: string[]
      exemplos: string[]
    }>
    riscos: Array<{
      name: string
      description: string
      googleQuery: string
      mitigacao: string
    }>
  }
}

export default function GuiaRendaVariavelTab({
  IndexChart,
  googleUrl,
  setSearchParams,
  RENDA_VARIAVEL_DETAILS
}: GuiaRendaVariavelTabProps) {
  return (
    <div className="space-y-8">
      {/* Gráfico dos Índices */}
      <IndexChart />
      
      {/* Conceitos Fundamentais */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Conceitos Fundamentais</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {RENDA_VARIAVEL_DETAILS.conceitos.map((conceito) => (
            <div 
              key={conceito.title} 
              className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => window.open(googleUrl(conceito.googleQuery), '_blank')}
              title={`Pesquisar ${conceito.title} no Google`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground text-lg">{conceito.title}</h4>
                <div className="p-2 rounded-lg bg-primary/10">
                  <ExternalLink className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">{conceito.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tipos de Ativos */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <PieChart className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Tipos de Ativos</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {RENDA_VARIAVEL_DETAILS.tipos.map((tipo) => (
            <div 
              key={tipo.name} 
              className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => window.open(googleUrl(tipo.googleQuery), '_blank')}
              title={`Pesquisar ${tipo.name} no Google`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground text-lg">{tipo.name}</h4>
                <div className="p-2 rounded-lg bg-primary/10">
                  <ExternalLink className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-muted-foreground mb-4 leading-relaxed">{tipo.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                  <ul className="space-y-1">
                    {tipo.pros.map((pro) => (
                      <li key={pro} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Desvantagens</p>
                  <ul className="space-y-1">
                    {tipo.cons.map((con) => (
                      <li key={con} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estratégias */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Estratégias de Renda Variável</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {RENDA_VARIAVEL_DETAILS.estrategias.map((estrategia) => (
            <div 
              key={estrategia.name} 
              className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => window.open(googleUrl(estrategia.googleQuery), '_blank')}
              title={`Pesquisar ${estrategia.name} no Google`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground text-lg">{estrategia.name}</h4>
                <div className="p-2 rounded-lg bg-primary/10">
                  <ExternalLink className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-muted-foreground mb-4 leading-relaxed">{estrategia.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">Vantagens</p>
                  <ul className="space-y-1">
                    {estrategia.pros.map((pro) => (
                      <li key={pro} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">Desvantagens</p>
                  <ul className="space-y-1">
                    {estrategia.cons.map((con) => (
                      <li key={con} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Setores */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Principais Setores</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {RENDA_VARIAVEL_DETAILS.setores.map((setor) => (
            <div 
              key={setor.name} 
              className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => window.open(googleUrl(setor.googleQuery), '_blank')}
              title={`Pesquisar ${setor.name} no Google`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground text-lg">{setor.name}</h4>
                <div className="p-2 rounded-lg bg-primary/10">
                  <ExternalLink className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-muted-foreground mb-4 leading-relaxed">{setor.description}</p>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2 text-blue-600 dark:text-blue-400">Características</p>
                  <ul className="space-y-1">
                    {setor.caracteristicas.map((carac) => (
                      <li key={carac} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {carac}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2 text-purple-600 dark:text-purple-400">Exemplos de Ativos</p>
                  <div className="flex flex-wrap gap-2">
                    {setor.exemplos.map((exemplo) => (
                      <button
                        key={exemplo}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchParams({ ticker: exemplo });
                        }}
                        className="text-xs px-3 py-1 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all duration-200"
                        title={`Buscar ${exemplo}`}
                      >
                        {exemplo}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Riscos */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <AlertCircle className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Principais Riscos</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {RENDA_VARIAVEL_DETAILS.riscos.map((risco) => (
            <div 
              key={risco.name} 
              className="bg-muted/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => window.open(googleUrl(risco.googleQuery), '_blank')}
              title={`Pesquisar ${risco.name} no Google`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground text-lg">{risco.name}</h4>
                <div className="p-2 rounded-lg bg-primary/10">
                  <ExternalLink className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-muted-foreground mb-3 leading-relaxed">{risco.description}</p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Mitigação</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">{risco.mitigacao}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
