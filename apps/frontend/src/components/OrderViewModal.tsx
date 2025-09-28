import { X, User, Calendar, Phone, ClipboardList } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface Order {
  id: string
  number: string
  customerName: string
  customerPhone: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'waiting_approval' | 'completed' | 'cancelled'
  assignedTo: string
  estimatedDelivery: string
  totalValue: number
  createdAt: string
}

interface OrderViewModalProps {
  isOpen: boolean
  onClose: () => void
  order?: Order | null
}

export function OrderViewModal({ isOpen, onClose, order }: OrderViewModalProps) {
  if (!isOpen || !order) return null

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      waiting_approval: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status]
  }

  const getPriorityColor = (priority: Order['priority']) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return colors[priority]
  }

  const getStatusLabel = (status: Order['status']) => {
    const labels = {
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      waiting_approval: 'Aguardando Aprovação',
      completed: 'Concluída',
      cancelled: 'Cancelada'
    }
    return labels[status]
  }

  const getPriorityLabel = (priority: Order['priority']) => {
    const labels = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente'
    }
    return labels[priority]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Detalhes da Ordem de Serviço
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Cabeçalho com número e status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{order.number}</h3>
              <p className="text-sm text-gray-600">Criada em {formatDate(order.createdAt)}</p>
            </div>
            <div className="flex gap-2">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(order.priority)}`}>
                Prioridade {getPriorityLabel(order.priority)}
              </span>
            </div>
          </div>

          {/* Informações do Cliente */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Informações do Cliente</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-600">Nome:</span>
                  <p className="font-medium">{order.customerName}</p>
                </div>
              </div>
              {order.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-600">Telefone:</span>
                    <p className="font-medium">{order.customerPhone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Descrição do Serviço */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Descrição do Serviço</h4>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{order.description}</p>
            </div>
          </div>

          {/* Informações do Serviço */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Informações do Serviço</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Responsável:</span>
                <p className="font-medium flex items-center gap-1">
                  <User className="h-4 w-4 text-gray-400" />
                  {order.assignedTo}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Data de Entrega Estimada:</span>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {formatDate(order.estimatedDelivery)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Valor Total:</span>
                <p className="font-bold text-primary text-lg">
                  {formatCurrency(order.totalValue)}
                </p>
              </div>
            </div>
          </div>

          {/* Botão de Fechar */}
          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}