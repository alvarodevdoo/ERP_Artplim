import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (order: Partial<Order>) => void
  order?: Order | null
  mode: 'create' | 'edit'
}

export function OrderModal({ isOpen, onClose, onSave, order, mode }: OrderModalProps) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    description: '',
    priority: 'medium' as Order['priority'],
    assignedTo: '',
    estimatedDelivery: '',
    totalValue: 0
  })

  // Preencher formulário quando editando
  useEffect(() => {
    if (mode === 'edit' && order) {
      setFormData({
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        description: order.description,
        priority: order.priority,
        assignedTo: order.assignedTo,
        estimatedDelivery: order.estimatedDelivery,
        totalValue: order.totalValue
      })
    } else {
      // Limpar formulário para criação
      setFormData({
        customerName: '',
        customerPhone: '',
        description: '',
        priority: 'medium',
        assignedTo: '',
        estimatedDelivery: '',
        totalValue: 0
      })
    }
  }, [mode, order, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações básicas
    if (!formData.customerName.trim()) {
      toast.error('Nome do cliente é obrigatório')
      return
    }
    
    if (!formData.description.trim()) {
      toast.error('Descrição é obrigatória')
      return
    }
    
    if (!formData.assignedTo.trim()) {
      toast.error('Responsável é obrigatório')
      return
    }
    
    if (!formData.estimatedDelivery) {
      toast.error('Data de entrega estimada é obrigatória')
      return
    }

    // Preparar dados para salvar
    const orderData: Partial<Order> = {
      ...formData,
      id: mode === 'edit' ? order?.id : undefined
    }

    onSave(orderData)
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>
            {mode === 'create' ? 'Nova Ordem de Serviço' : 'Editar Ordem de Serviço'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Informações do Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Cliente *
                </label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  placeholder="Digite o nome do cliente"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <Input
                  value={formData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição do Serviço *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descreva o serviço a ser realizado"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                required
              />
            </div>

            {/* Prioridade e Responsável */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsável *
                </label>
                <Input
                  value={formData.assignedTo}
                  onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                  placeholder="Nome do técnico responsável"
                  required
                />
              </div>
            </div>

            {/* Data de Entrega e Valor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Entrega Estimada *
                </label>
                <Input
                  type="date"
                  value={formData.estimatedDelivery}
                  onChange={(e) => handleInputChange('estimatedDelivery', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Total (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.totalValue}
                  onChange={(e) => handleInputChange('totalValue', parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {mode === 'create' ? 'Criar OS' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}