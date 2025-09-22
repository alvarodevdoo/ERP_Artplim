import { useState, useEffect } from 'react'
import { Search, TrendingUp, TrendingDown, DollarSign, Calendar, Eye, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { FinancialEntryModal } from '@/components/FinancialEntryModal'
import { FinancialEntryViewModal } from '@/components/FinancialEntryViewModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'

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

interface FinancialStats {
  totalIncome: number
  totalExpenses: number
  balance: number
  pendingReceivables: number
  pendingPayables: number
}

export function FinancialPage() {
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [stats, setStats] = useState<FinancialStats>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    pendingReceivables: 0,
    pendingPayables: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Estados dos modais
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedEntry, setSelectedEntry] = useState<FinancialEntry | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<FinancialEntry | null>(null)
  const [defaultEntryType, setDefaultEntryType] = useState<'income' | 'expense'>('income')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    // Simular carregamento de dados financeiros
    const loadFinancialData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockEntries: FinancialEntry[] = [
        {
          id: '1',
          description: 'Venda de produtos - Cliente A',
          type: 'income',
          category: 'Vendas',
          amount: 2500.00,
          date: '2024-01-15',
          status: 'paid',
          paymentMethod: 'Cartão de Crédito',
          reference: 'OS-2024-001'
        },
        {
          id: '2',
          description: 'Pagamento de fornecedor - Matéria Prima',
          type: 'expense',
          category: 'Compras',
          amount: 1200.00,
          date: '2024-01-18',
          dueDate: '2024-01-20',
          status: 'pending',
          reference: 'NF-12345'
        },
        {
          id: '3',
          description: 'Serviço de manutenção - Cliente B',
          type: 'income',
          category: 'Serviços',
          amount: 800.00,
          date: '2024-01-20',
          dueDate: '2024-02-05',
          status: 'pending',
          reference: 'OS-2024-002'
        },
        {
          id: '4',
          description: 'Aluguel do galpão',
          type: 'expense',
          category: 'Despesas Fixas',
          amount: 3500.00,
          date: '2024-01-01',
          status: 'paid',
          paymentMethod: 'Transferência Bancária'
        },
        {
          id: '5',
          description: 'Conta de energia elétrica',
          type: 'expense',
          category: 'Utilidades',
          amount: 450.00,
          date: '2024-01-10',
          dueDate: '2024-01-25',
          status: 'overdue'
        }
      ]
      
      setEntries(mockEntries)
      
      // Calcular estatísticas
      const totalIncome = mockEntries
        .filter(entry => entry.type === 'income' && entry.status === 'paid')
        .reduce((sum, entry) => sum + entry.amount, 0)
      
      const totalExpenses = mockEntries
        .filter(entry => entry.type === 'expense' && entry.status === 'paid')
        .reduce((sum, entry) => sum + entry.amount, 0)
      
      const pendingReceivables = mockEntries
        .filter(entry => entry.type === 'income' && entry.status === 'pending')
        .reduce((sum, entry) => sum + entry.amount, 0)
      
      const pendingPayables = mockEntries
        .filter(entry => entry.type === 'expense' && (entry.status === 'pending' || entry.status === 'overdue'))
        .reduce((sum, entry) => sum + entry.amount, 0)
      
      const balance = totalIncome - totalExpenses
      
      setStats({
        totalIncome,
        totalExpenses,
        balance,
        pendingReceivables,
        pendingPayables
      })
      
      setLoading(false)
    }

    loadFinancialData()
  }, [])

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (entry.reference && entry.reference.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = selectedType === 'all' || entry.type === selectedType
    const matchesStatus = selectedStatus === 'all' || entry.status === selectedStatus
    const matchesCategory = selectedCategory === 'all' || entry.category === selectedCategory
    return matchesSearch && matchesType && matchesStatus && matchesCategory
  })

  const categories = ['all', ...Array.from(new Set(entries.map(entry => entry.category)))]

  const typeOptions = [
    { value: 'all', label: 'Todos os Tipos' },
    { value: 'income', label: 'Receitas' },
    { value: 'expense', label: 'Despesas' }
  ]

  const statusOptions = [
    { value: 'all', label: 'Todos os Status' },
    { value: 'paid', label: 'Pago' },
    { value: 'pending', label: 'Pendente' },
    { value: 'overdue', label: 'Vencido' },
    { value: 'cancelled', label: 'Cancelado' }
  ]

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

  // Handlers dos modais
  const handleNewIncome = () => {
    setDefaultEntryType('income')
    setModalMode('create')
    setSelectedEntry(null)
    setIsEntryModalOpen(true)
  }

  const handleNewExpense = () => {
    setDefaultEntryType('expense')
    setModalMode('create')
    setSelectedEntry(null)
    setIsEntryModalOpen(true)
  }

  const handleView = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId)
    if (entry) {
      setSelectedEntry(entry)
      setIsViewModalOpen(true)
    }
  }

  const handleEdit = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId)
    if (entry) {
      setSelectedEntry(entry)
      setModalMode('edit')
      setIsEntryModalOpen(true)
    }
  }

  const handleDelete = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId)
    if (entry) {
      setEntryToDelete(entry)
      setIsConfirmDialogOpen(true)
    }
  }

  const handleSaveEntry = async (entryData: Omit<FinancialEntry, 'id'>) => {
    setActionLoading(true)
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (modalMode === 'create') {
        const newEntry: FinancialEntry = {
          ...entryData,
          id: Date.now().toString()
        }
        setEntries(prev => [...prev, newEntry])
        toast.success('Lançamento criado com sucesso!')
      } else {
        setEntries(prev => prev.map(entry => 
          entry.id === selectedEntry?.id 
            ? { ...entryData, id: entry.id }
            : entry
        ))
        toast.success('Lançamento atualizado com sucesso!')
      }
      
      handleCloseModals()
    } catch {
      toast.error('Erro ao salvar lançamento')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return
    
    setActionLoading(true)
    try {
      // Simular exclusão
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setEntries(prev => prev.filter(entry => entry.id !== entryToDelete.id))
      toast.success('Lançamento excluído com sucesso!')
      handleCloseModals()
    } catch {
      toast.error('Erro ao excluir lançamento')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseModals = () => {
    setIsEntryModalOpen(false)
    setIsViewModalOpen(false)
    setIsConfirmDialogOpen(false)
    setSelectedEntry(null)
    setEntryToDelete(null)
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
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-600">Controle suas receitas e despesas</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNewIncome}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Nova Receita
          </Button>
          <Button variant="outline" onClick={handleNewExpense}>
            <TrendingDown className="mr-2 h-4 w-4" />
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Receitas</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalIncome)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Despesas</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saldo</p>
                <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.balance)}
                </p>
              </div>
              <DollarSign className={`h-8 w-8 ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">A Receber</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.pendingReceivables)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">A Pagar</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.pendingPayables)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar lançamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="sm:w-40">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {typeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="sm:w-40">
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
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'Todas as Categorias' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Entries */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lançamento encontrado</h3>
            <p className="text-gray-600">Tente ajustar os filtros ou adicione um novo lançamento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">{entry.description}</h3>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                        {getStatusLabel(entry.status)}
                      </span>
                      {entry.reference && (
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {entry.reference}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Tipo: </span>
                        <span className={`font-medium ${getTypeColor(entry.type)}`}>
                          {entry.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Categoria: </span>
                        <span className="font-medium">{entry.category}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Valor: </span>
                        <span className={`font-bold text-lg ${getTypeColor(entry.type)}`}>
                          {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Data: </span>
                        <span className="font-medium">{formatDate(entry.date)}</span>
                      </div>
                      {entry.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Vencimento: </span>
                          <span className="font-medium">{formatDate(entry.dueDate)}</span>
                        </div>
                      )}
                      {entry.paymentMethod && (
                        <div>
                          <span className="text-gray-600">Forma de Pagamento: </span>
                          <span className="font-medium">{entry.paymentMethod}</span>
                        </div>
                      )}
                    </div>
                    
                    {entry.notes && (
                      <p className="text-gray-600 text-sm">{entry.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 lg:flex-col">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(entry.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(entry.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(entry.id)}
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
      <FinancialEntryModal
        isOpen={isEntryModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveEntry}
        entry={selectedEntry}
        mode={modalMode}
        defaultType={defaultEntryType}
      />
      
      <FinancialEntryViewModal
        isOpen={isViewModalOpen}
        onClose={handleCloseModals}
        entry={selectedEntry}
      />
      
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={handleCloseModals}
        onConfirm={handleConfirmDelete}
        title="Excluir Lançamento"
        description={`Tem certeza que deseja excluir o lançamento "${entryToDelete?.description || 'selecionado'}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  )
}