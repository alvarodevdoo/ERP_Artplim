import { useState, useEffect } from 'react'
import { Plus, Search, TrendingUp, TrendingDown, Package, AlertTriangle, Eye, Edit } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface StockItem {
  id: string
  productName: string
  sku: string
  category: string
  currentStock: number
  minStock: number
  maxStock: number
  unitCost: number
  totalValue: number
  location: string
  lastMovement: {
    type: 'in' | 'out'
    quantity: number
    date: string
    reason: string
  }
}

interface StockStats {
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
}

export function StockPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [stats, setStats] = useState<StockStats>({ totalItems: 0, totalValue: 0, lowStockItems: 0, outOfStockItems: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')

  useEffect(() => {
    // Simular carregamento de estoque
    const loadStock = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockStockItems: StockItem[] = [
        {
          id: '1',
          productName: 'Produto A',
          sku: 'PRD-A-001',
          category: 'Categoria 1',
          currentStock: 45,
          minStock: 10,
          maxStock: 100,
          unitCost: 25.50,
          totalValue: 1147.50,
          location: 'Estoque Principal - A1',
          lastMovement: {
            type: 'out',
            quantity: 5,
            date: '2024-01-20',
            reason: 'Venda'
          }
        },
        {
          id: '2',
          productName: 'Produto B',
          sku: 'PRD-B-002',
          category: 'Categoria 2',
          currentStock: 8,
          minStock: 15,
          maxStock: 80,
          unitCost: 42.00,
          totalValue: 336.00,
          location: 'Estoque Principal - B2',
          lastMovement: {
            type: 'in',
            quantity: 20,
            date: '2024-01-18',
            reason: 'Compra'
          }
        },
        {
          id: '3',
          productName: 'Produto C',
          sku: 'PRD-C-003',
          category: 'Categoria 1',
          currentStock: 0,
          minStock: 5,
          maxStock: 50,
          unitCost: 18.75,
          totalValue: 0,
          location: 'Estoque Principal - C1',
          lastMovement: {
            type: 'out',
            quantity: 3,
            date: '2024-01-15',
            reason: 'Ordem de Serviço'
          }
        },
        {
          id: '4',
          productName: 'Produto D',
          sku: 'PRD-D-004',
          category: 'Categoria 3',
          currentStock: 75,
          minStock: 20,
          maxStock: 120,
          unitCost: 35.25,
          totalValue: 2643.75,
          location: 'Estoque Secundário - D1',
          lastMovement: {
            type: 'in',
            quantity: 25,
            date: '2024-01-19',
            reason: 'Transferência'
          }
        }
      ]
      
      setStockItems(mockStockItems)
      
      // Calcular estatísticas
      const totalItems = mockStockItems.length
      const totalValue = mockStockItems.reduce((sum, item) => sum + item.totalValue, 0)
      const lowStockItems = mockStockItems.filter(item => item.currentStock > 0 && item.currentStock <= item.minStock).length
      const outOfStockItems = mockStockItems.filter(item => item.currentStock === 0).length
      
      setStats({ totalItems, totalValue, lowStockItems, outOfStockItems })
      setLoading(false)
    }

    loadStock()
  }, [])

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    
    let matchesStockFilter = true
    if (stockFilter === 'low') {
      matchesStockFilter = item.currentStock > 0 && item.currentStock <= item.minStock
    } else if (stockFilter === 'out') {
      matchesStockFilter = item.currentStock === 0
    } else if (stockFilter === 'normal') {
      matchesStockFilter = item.currentStock > item.minStock
    }
    
    return matchesSearch && matchesCategory && matchesStockFilter
  })

  const categories = ['all', ...Array.from(new Set(stockItems.map(item => item.category)))]

  const stockFilterOptions = [
    { value: 'all', label: 'Todos os Itens' },
    { value: 'normal', label: 'Estoque Normal' },
    { value: 'low', label: 'Estoque Baixo' },
    { value: 'out', label: 'Sem Estoque' }
  ]

  const getStockStatus = (item: StockItem) => {
    if (item.currentStock === 0) {
      return { status: 'out', color: 'text-red-600', bgColor: 'bg-red-100', label: 'Sem Estoque' }
    } else if (item.currentStock <= item.minStock) {
      return { status: 'low', color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Estoque Baixo' }
    } else {
      return { status: 'normal', color: 'text-green-600', bgColor: 'bg-green-100', label: 'Normal' }
    }
  }

  const handleView = (itemId: string) => {
    toast.info(`Visualizar item ${itemId}`)
  }

  const handleEdit = (itemId: string) => {
    toast.info(`Editar item ${itemId}`)
  }

  const handleMovement = (itemId: string) => {
    toast.info(`Registrar movimentação para item ${itemId}`)
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
          <h1 className="text-2xl font-bold text-gray-900">Controle de Estoque</h1>
          <p className="text-gray-600">Gerencie seu inventário e movimentações</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Entrada
          </Button>
          <Button variant="outline">
            <TrendingDown className="mr-2 h-4 w-4" />
            Saída
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Itens</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Estoque Baixo</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sem Estoque</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</p>
              </div>
              <Package className="h-8 w-8 text-red-600" />
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
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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
            
            <div className="sm:w-48">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {stockFilterOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Items */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum item encontrado</h3>
            <p className="text-gray-600">Tente ajustar os filtros ou adicione um novo item ao estoque.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const stockStatus = getStockStatus(item)
            return (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">{item.productName}</h3>
                        <span className="text-sm text-gray-600">({item.sku})</span>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Categoria: </span>
                          <span className="font-medium">{item.category}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Estoque Atual: </span>
                          <span className={`font-bold ${stockStatus.color}`}>
                            {item.currentStock} un.
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Estoque Mín/Máx: </span>
                          <span className="font-medium">{item.minStock}/{item.maxStock}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Localização: </span>
                          <span className="font-medium">{item.location}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Custo Unitário: </span>
                          <span className="font-medium">{formatCurrency(item.unitCost)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Valor Total: </span>
                          <span className="font-bold text-primary">{formatCurrency(item.totalValue)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Última Movimentação: </span>
                          <span className="font-medium">
                            {item.lastMovement.type === 'in' ? 'Entrada' : 'Saída'} de {item.lastMovement.quantity} un. 
                            em {formatDate(item.lastMovement.date)} ({item.lastMovement.reason})
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 lg:flex-col">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(item.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item.id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMovement(item.id)}
                      >
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Movimentar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}