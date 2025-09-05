import { motion } from 'framer-motion'
import { 
  FileText, 
  Building2, 
  Target, 
  Globe, 
  Users, 
  ExternalLink
} from 'lucide-react'

// Componente para seção de informações
function InfoSection({ 
  title, 
  icon: Icon, 
  color, 
  children 
}: {
  title: string
  icon: any
  color: string
  children: React.ReactNode
}) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${colorClasses[color as keyof typeof colorClasses]}`} />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// Componente para linha de informação
function InfoRow({ 
  label, 
  value, 
  icon: Icon 
}: {
  label: string
  value: string | number | null | undefined
  icon: any
}) {
  if (!value || value === '-') return null

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">
        {typeof value === 'string' && value.startsWith('http') ? (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
            title="Abrir link"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          value
        )}
      </span>
    </div>
  )
}

interface DetalhesHistoryTabProps {
  info: any
}

export default function DetalhesHistoryTab({
  info
}: DetalhesHistoryTabProps) {
  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <InfoSection title="História e Atuação" icon={FileText} color="indigo">
        <div className="space-y-3">
          <div className="text-sm leading-relaxed text-foreground/90">
            {(info.longBusinessSummary && String(info.longBusinessSummary).trim())
              ? String(info.longBusinessSummary)
              : 'Resumo não disponível.'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Setor" value={info.sector} icon={Building2} />
            <InfoRow label="Indústria" value={info.industry} icon={Target} />
            <InfoRow label="País" value={info.country} icon={Globe} />
            <InfoRow label="Funcionários" value={info.fullTimeEmployees?.toLocaleString('pt-BR')} icon={Users} />
            <InfoRow label="Endereço" value={[info.address1, info.address2, info.city, info.state, info.zip, info.country].filter(Boolean).join(', ') || '-'} icon={FileText} />
            <InfoRow label="Telefone" value={info.phone} icon={FileText} />
            <InfoRow label="Website" value={info.website} icon={ExternalLink} />
          </div>
        </div>
      </InfoSection>

      <InfoSection title="Diretoria e Contatos (se disponível)" icon={Users} color="blue">
        <div className="space-y-1">
          <InfoRow label="Cidade" value={info.city} icon={Globe} />
          <InfoRow label="Estado" value={info.state} icon={Globe} />
          <InfoRow label="Código Postal" value={info.zip} icon={FileText} />
          <InfoRow label="Fax" value={info.fax} icon={FileText} />
        </div>
      </InfoSection>
    </motion.div>
  )
}
