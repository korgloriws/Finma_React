import { Clock, AlertTriangle, CheckCircle, Calendar } from 'lucide-react'

interface VencimentoStatusProps {
  status_vencimento?: {
    status: 'vence_em_dias' | 'vence_em_poucos_dias' | 'vence_hoje' | 'vencido' | 'sem_vencimento' | 'erro_calculo'
    dias: number | null
  } | null
  vencimento?: string | null
}

export default function VencimentoStatus({ status_vencimento, vencimento }: VencimentoStatusProps) {
  if (!status_vencimento || !vencimento) {
    return null
  }

  const { status, dias } = status_vencimento

  const getStatusInfo = () => {
    switch (status) {
      case 'vencido':
        return {
          icon: AlertTriangle,
          text: `Vencido há ${dias} dia${dias !== 1 ? 's' : ''}`,
          className: 'text-red-600 bg-red-50',
          iconClassName: 'text-red-600'
        }
      case 'vence_hoje':
        return {
          icon: Clock,
          text: 'Vence hoje',
          className: 'text-orange-600 bg-orange-50',
          iconClassName: 'text-orange-600'
        }
      case 'vence_em_poucos_dias':
        return {
          icon: Clock,
          text: `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`,
          className: 'text-orange-500 bg-orange-50',
          iconClassName: 'text-orange-500'
        }
      case 'vence_em_dias':
        return {
          icon: Calendar,
          text: `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`,
          className: 'text-blue-600 bg-blue-50',
          iconClassName: 'text-blue-600'
        }
      case 'sem_vencimento':
        return {
          icon: CheckCircle,
          text: 'Sem vencimento',
          className: 'text-gray-600 bg-gray-50',
          iconClassName: 'text-gray-600'
        }
      case 'erro_calculo':
        return {
          icon: AlertTriangle,
          text: 'Erro no cálculo',
          className: 'text-gray-600 bg-gray-50',
          iconClassName: 'text-gray-600'
        }
      default:
        return null
    }
  }

  const statusInfo = getStatusInfo()
  if (!statusInfo) return null

  const Icon = statusInfo.icon

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
      <Icon className={`w-3 h-3 ${statusInfo.iconClassName}`} />
      <span>{statusInfo.text}</span>
    </div>
  )
}
