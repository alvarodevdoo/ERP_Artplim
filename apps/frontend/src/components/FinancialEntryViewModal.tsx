import { X, Calendar, DollarSign, FileText, CreditCard } from 'lucide-react'

import { Button } from '@/components/ui/Button'

interface FinancialEntry {
  id: string
  description: string
  type: 'income' | 'expense'
  category: string
  amount: number
  date: string
  dueDate?: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  paymentMethod?: string
  reference?: string
  notes?: string
}

interface FinancialEntryViewModalProps {
  isOpen: boolean
  onClose: () => void
  entry: FinancialEntry | null
}

export function FinancialEntryViewModal({ isOpen, onClose, entry }: FinancialEntryViewModalProps) {
  if (!isOpen || !entry) return null

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusColor = (status: FinancialEntry['status']) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return colors[status]
  }

  const getStatusLabel = (status: FinancialEntry['status']) => {
    const labels = {
      paid: 'Pago',
      pending: 'Pendente',
      overdue: 'Vencido',
      cancelled: 'Cancelado'
    }
    return labels[status]
  }

  const getTypeColor = (type: FinancialEntry['type']) => {
    return type === 'income' ? 'text-green-600' : 'text-red-600'
  }

  const getTypeLabel = (type: FinancialEntry['type']) => {
    return type === 'income' ? 'Receita' : 'Despesa'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Detalhes do Lançamento</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Descrição</label>
                <p className="text-gray-900 font-medium">{entry.description}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Tipo</label>
                <p className={`font-medium ${getTypeColor(entry.type)}`}>
                  {getTypeLabel(entry.type)}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Categoria</label>
                <p className="text-gray-900 font-medium">{entry.category}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                  {getStatusLabel(entry.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Informações Financeiras */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Informações Financeiras</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Valor</span>
              </div>
              <p className={`text-2xl font-bold ${getTypeColor(entry.type)}`}>
                {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <label className="text-sm font-medium text-gray-600">Data</label>
                </div>
                <p className="text-gray-900 font-medium">{formatDate(entry.date)}</p>
              </div>
              
              {entry.dueDate && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <label className="text-sm font-medium text-gray-600">Data de Vencimento</label>
                  </div>
                  <p className="text-gray-900 font-medium">{formatDate(entry.dueDate)}</p>
                </div>
              )}
              
              {entry.paymentMethod && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-gray-600" />
                    <label className="text-sm font-medium text-gray-600">Forma de Pagamento</label>
                  </div>
                  <p className="text-gray-900 font-medium">{entry.paymentMethod}</p>
                </div>
              )}
              
              {entry.reference && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <label className="text-sm font-medium text-gray-600">Referência</label>
                  </div>
                  <p className="text-gray-900 font-medium">{entry.reference}</p>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          {entry.notes && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Observações</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{entry.notes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t">
          <Button onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}