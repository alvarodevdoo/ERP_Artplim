import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Edit, Trash2, ClipboardList, Calendar, User } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { OrderModal } from '@/components/OrderModal'
import { OrderViewModal } from '@/components/OrderViewModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'

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

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  
  // Estados para modais
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    // Simular carregamento de ordens de serviço
    const loadOrders = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockOrders: Order[] = [
        {
          id: '1',
          number: 'OS-2024-001',
          customerName: 'Ana Costa',
          customerPhone: '(11) 99999-9999',
          description: 'Reparo em produto personalizado',
          priority: 'high',
          status: 'in_progress',
          assignedTo: 'João Técnico',
          estimatedDelivery: '2024-02-10',
          totalValue: 350.00,
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          number: 'OS-2024-002',
          customerName: 'Carlos Silva',
          customerPhone: '(11) 88888-8888',
          description: 'Manutenção preventiva',
          priority: 'medium',
          status: 'pending',
          assignedTo: 'Maria Técnica',
          estimatedDelivery: '2024-02-15',
          totalValue: 200.00,
          createdAt: '2024-01-18'
        },
        {
          id: '3',
          number: 'OS-2024-003',
          customerName: 'Lucia Santos',
          customerPhone: '(11) 77777-7777',
          description: 'Instalação de equipamento',
          priority: 'urgent',
          status: 'waiting_approval',
          assignedTo: 'Pedro Técnico',
          estimatedDelivery: '2024-02-08',
          totalValue: 800.00,
          createdAt: '2024-01-20'
        }
      ]
      
      setOrders(mockOrders)
      setLoading(false)
    }

    loadOrders()
  }, [])

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus
    const matchesPriority = selectedPriority === 'all' || order.priority === selectedPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  const statusOptions = [
    { value: 'all', label: 'Todos os Status' },
    { value: 'pending', label: 'Pendente' },
    { value: 'in_progress', label: 'Em Andamento' },
    { value: 'waiting_approval', label: 'Aguardando Aprovação' },
    { value: 'completed', label: 'Concluída' },
    { value: 'cancelled', label: 'Cancelada' }
  ]

  const priorityOptions = [
    { value: 'all', label: 'Todas as Prioridades' },
    { value: 'low', label: 'Baixa' },
    { value: 'medium', label: 'Média' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' }
  ]

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

  // Handlers para modais
  const handleNewOrder = () => {
    setModalMode('create')
    setSelectedOrder(null)
    setIsOrderModalOpen(true)
  }

  const handleView = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (order) {
      setSelectedOrder(order)
      setIsViewModalOpen(true)
    }
  }

  const handleEdit = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (order) {
      setModalMode('edit')
      setSelectedOrder(order)
      setIsOrderModalOpen(true)
    }
  }

  const handleDelete = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (order) {
      setOrderToDelete(order)
      setIsConfirmDialogOpen(true)
    }
  }

  const handleSaveOrder = async (orderData: Partial<Order>) => {
    setActionLoading(true)
    
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (modalMode === 'create') {
        // Criar nova OS
        const newOrder: Order = {
          id: Date.now().toString(),
          number: `OS-2024-${String(orders.length + 1).padStart(3, '0')}`,
          status: 'pending',
          createdAt: new Date().toISOString().split('T')[0],
          ...orderData
        } as Order
        
        setOrders(prev => [newOrder, ...prev])
        toast.success('Ordem de serviço criada com sucesso!')
      } else {
        // Editar OS existente
        setOrders(prev => prev.map(order => 
          order.id === selectedOrder?.id 
            ? { ...order, ...orderData }
            : order
        ))
        toast.success('Ordem de serviço atualizada com sucesso!')
      }
      
      handleCloseModals()
    } catch {
      toast.error('Erro ao salvar ordem de serviço')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return
    
    setActionLoading(true)
    
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setOrders(prev => prev.filter(order => order.id !== orderToDelete.id))
      toast.success('Ordem de serviço excluída com sucesso!')
      handleCloseModals()
    } catch {
      toast.error('Erro ao excluir ordem de serviço')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseModals = () => {
    setIsOrderModalOpen(false)
    setIsViewModalOpen(false)
    setIsConfirmDialogOpen(false)
    setSelectedOrder(null)
    setOrderToDelete(null)
    setActionLoading(false)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
          <p className="text-gray-600">Gerencie suas ordens de serviço e atendimentos</p>
        </div>
        
        <Button onClick={handleNewOrder}>
          <Plus className="mr-2 h-4 w-4" />
          Nova OS
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar ordens de serviço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="sm:w-48">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="sm:w-48">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma OS encontrada</h3>
            <p className="text-gray-600">Tente ajustar os filtros ou crie uma nova ordem de serviço.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">{order.number}</h3>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                        {getPriorityLabel(order.priority)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Cliente: </span>
                        <span className="font-medium">{order.customerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Telefone: </span>
                        <span className="font-medium">{order.customerPhone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Responsável: </span>
                        <span className="font-medium">{order.assignedTo}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Valor: </span>
                        <span className="font-bold text-primary">
                          {formatCurrency(order.totalValue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Entrega: </span>
                        <span className="font-medium">{formatDate(order.estimatedDelivery)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Criada em: </span>
                        <span className="font-medium">{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm">{order.description}</p>
                  </div>
                  
                  <div className="flex gap-2 lg:flex-col">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(order.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(order.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(order.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Modais */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveOrder}
        order={selectedOrder}
        mode={modalMode}
      />
      
      <OrderViewModal
        isOpen={isViewModalOpen}
        onClose={handleCloseModals}
        order={selectedOrder}
      />
      
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={handleCloseModals}
        onConfirm={handleConfirmDelete}
        title="Excluir Ordem de Serviço"
        description={`Tem certeza que deseja excluir a ordem de serviço ${orderToDelete?.number}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  )
}