import { useState, useEffect } from 'react'
import { Plus, Search, Eye, Edit, Trash2, FileText, Calendar } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { QuoteModal } from '@/components/QuoteModal'
import { QuoteViewModal } from '@/components/QuoteViewModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'

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

export function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  
  // Estados para controlar os modais
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    // Simular carregamento de orçamentos
    const loadQuotes = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockQuotes: Quote[] = [
        {
          id: '1',
          number: 'ORC-2024-001',
          client: 'João Silva',
          description: 'Orçamento para produtos personalizados de alta qualidade',
          value: 2500.00,
          status: 'pending',
          validUntil: '2024-02-15',
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          number: 'ORC-2024-002',
          client: 'Maria Santos',
          description: 'Orçamento para linha premium com acabamento especial',
          value: 4200.00,
          status: 'approved',
          validUntil: '2024-02-20',
          createdAt: '2024-01-18'
        },
        {
          id: '3',
          number: 'ORC-2024-003',
          client: 'Pedro Costa',
          description: 'Orçamento para revenda com desconto por volume',
          value: 1800.00,
          status: 'pending',
          validUntil: '2024-02-25',
          createdAt: '2024-01-20'
        }
      ]
      
      setQuotes(mockQuotes)
      setLoading(false)
    }

    loadQuotes()
  }, [])

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || quote.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const statusOptions = [
    { value: 'all', label: 'Todos os Status' },
    { value: 'pending', label: 'Pendente' },
    { value: 'approved', label: 'Aprovado' },
    { value: 'rejected', label: 'Rejeitado' },
    { value: 'expired', label: 'Expirado' }
  ]

  const getStatusColor = (status: Quote['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    }
    return colors[status]
  }

  const getStatusLabel = (status: Quote['status']) => {
    const labels = {
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      expired: 'Expirado'
    }
    return labels[status]
  }

  // Handlers para gerenciar os modais
  const handleNewQuote = () => {
    setModalMode('create')
    setSelectedQuote(null)
    setIsQuoteModalOpen(true)
  }

  const handleView = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId)
    if (quote) {
      setSelectedQuote(quote)
      setIsViewModalOpen(true)
    }
  }

  const handleEdit = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId)
    if (quote) {
      setModalMode('edit')
      setSelectedQuote(quote)
      setIsQuoteModalOpen(true)
    }
  }

  const handleDelete = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId)
    if (quote) {
      setQuoteToDelete(quote)
      setIsConfirmDialogOpen(true)
    }
  }

  const handleSaveQuote = async (quoteData: Omit<Quote, 'id' | 'createdAt' | 'number'>) => {
    setActionLoading(true)
    
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (modalMode === 'create') {
        const newQuote: Quote = {
          ...quoteData,
          id: Date.now().toString(),
          number: `ORC-2024-${String(quotes.length + 1).padStart(3, '0')}`,
          createdAt: new Date().toISOString().split('T')[0]
        }
        setQuotes(prev => [...prev, newQuote])
        toast.success('Orçamento criado com sucesso!')
      } else {
        setQuotes(prev => prev.map(quote => 
          quote.id === selectedQuote?.id 
            ? { ...quote, ...quoteData }
            : quote
        ))
        toast.success('Orçamento atualizado com sucesso!')
      }
    } catch {
      toast.error('Erro ao salvar orçamento')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!quoteToDelete) return
    
    setActionLoading(true)
    
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setQuotes(prev => prev.filter(quote => quote.id !== quoteToDelete.id))
      toast.success('Orçamento excluído com sucesso!')
      handleCloseModals()
    } catch {
      toast.error('Erro ao excluir orçamento')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseModals = () => {
    setIsQuoteModalOpen(false)
    setIsViewModalOpen(false)
    setIsConfirmDialogOpen(false)
    setSelectedQuote(null)
    setQuoteToDelete(null)
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
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-gray-600">Gerencie seus orçamentos e propostas</p>
        </div>
        
        <Button onClick={handleNewQuote}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar orçamentos..."
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
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum orçamento encontrado</h3>
            <p className="text-gray-600">Tente ajustar os filtros ou crie um novo orçamento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{quote.number}</h3>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                        {getStatusLabel(quote.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Cliente: </span>
                        <span className="font-medium">{quote.client}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Valor Total: </span>
                        <span className="font-bold text-primary text-lg">
                          {formatCurrency(quote.value)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Válido até: </span>
                        <span className="font-medium">{formatDate(quote.validUntil)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Criado em: </span>
                        <span className="font-medium">{formatDate(quote.createdAt)}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm">{quote.description}</p>
                  </div>
                  
                  <div className="flex gap-2 lg:flex-col">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(quote.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(quote.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(quote.id)}
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
      <QuoteModal
        isOpen={isQuoteModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveQuote}
        quote={selectedQuote}
        mode={modalMode}
      />
      
      <QuoteViewModal
        isOpen={isViewModalOpen}
        onClose={handleCloseModals}
        quote={selectedQuote}
      />
      
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={handleCloseModals}
        onConfirm={handleConfirmDelete}
        title="Excluir Orçamento"
        description={`Tem certeza que deseja excluir o orçamento ${quoteToDelete?.number}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  )
}