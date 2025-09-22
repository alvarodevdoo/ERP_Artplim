import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

interface Quote {
  id: string
  number: string
  client: string
  description: string
  value: number
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  validUntil: string
  createdAt: string
}

interface QuoteViewModalProps {
  isOpen: boolean
  onClose: () => void
  quote: Quote | null
}

export function QuoteViewModal({ isOpen, onClose, quote }: QuoteViewModalProps) {
  if (!quote) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100'
      case 'rejected':
        return 'text-red-600 bg-red-100'
      case 'expired':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-yellow-600 bg-yellow-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprovado'
      case 'rejected':
        return 'Rejeitado'
      case 'expired':
        return 'Expirado'
      default:
        return 'Pendente'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Orçamento</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}>
              {getStatusText(quote.status)}
            </span>
          </DialogTitle>
          <DialogDescription>
            Orçamento #{quote.number}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações do Cliente */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">Cliente</h3>
            <p className="text-gray-700">{quote.client}</p>
          </div>

          {/* Descrição do Serviço */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">Descrição do Serviço</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{quote.description}</p>
            </div>
          </div>

          {/* Informações Financeiras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Valor</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(quote.value)}</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Válido até</h3>
              <p className="text-gray-700">{formatDate(quote.validUntil)}</p>
            </div>
          </div>

          {/* Informações de Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Data de Criação</h3>
              <p className="text-gray-700">{formatDate(quote.createdAt)}</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Status</h3>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}>
                {getStatusText(quote.status)}
              </span>
            </div>
          </div>

          {/* Observações sobre validade */}
          {quote.status === 'pending' && new Date(quote.validUntil) < new Date() && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Orçamento Expirado
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>Este orçamento expirou em {formatDate(quote.validUntil)}.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}