import { X, Package, MapPin, TrendingUp, TrendingDown } from 'lucide-react'

import { Button } from '@/components/ui/Button'

// Interface para item de estoque
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

interface StockItemViewModalProps {
  isOpen: boolean
  onClose: () => void
  item?: StockItem | null
}

export function StockItemViewModal({ isOpen, onClose, item }: StockItemViewModalProps) {
  if (!isOpen || !item) return null

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStockStatus = () => {
    if (item.currentStock === 0) {
      return { status: 'out', color: 'text-red-600', bgColor: 'bg-red-100', label: 'Sem Estoque' }
    } else if (item.currentStock <= item.minStock) {
      return { status: 'low', color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Estoque Baixo' }
    } else {
      return { status: 'normal', color: 'text-green-600', bgColor: 'bg-green-100', label: 'Normal' }
    }
  }

  const stockStatus = getStockStatus()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Detalhes do Item</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Informações Básicas</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
              <div>
                <span className="text-sm text-gray-600">Nome do Produto:</span>
                <p className="font-medium text-gray-900">{item.productName}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">SKU:</span>
                <p className="font-medium text-gray-900">{item.sku}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Categoria:</span>
                <p className="font-medium text-gray-900">{item.category}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Localização:</span>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <p className="font-medium text-gray-900">{item.location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Informações de Estoque */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Controle de Estoque</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-8">
              <div>
                <span className="text-sm text-gray-600">Estoque Atual:</span>
                <div className="flex items-center gap-2">
                  <p className={`text-xl font-bold ${stockStatus.color}`}>
                    {item.currentStock} un.
                  </p>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.color}`}>
                    {stockStatus.label}
                  </span>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Estoque Mínimo:</span>
                <p className="text-xl font-bold text-gray-900">{item.minStock} un.</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Estoque Máximo:</span>
                <p className="text-xl font-bold text-gray-900">{item.maxStock} un.</p>
              </div>
            </div>
          </div>

          {/* Informações Financeiras */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Informações Financeiras</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
              <div>
                <span className="text-sm text-gray-600">Custo Unitário:</span>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(item.unitCost)}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Valor Total em Estoque:</span>
                <p className="text-xl font-bold text-primary">{formatCurrency(item.totalValue)}</p>
              </div>
            </div>
          </div>

          {/* Última Movimentação */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {item.lastMovement.type === 'in' ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">Última Movimentação</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-8">
              <div>
                <span className="text-sm text-gray-600">Tipo:</span>
                <div className="flex items-center gap-2">
                  {item.lastMovement.type === 'in' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <p className={`font-medium ${
                    item.lastMovement.type === 'in' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.lastMovement.type === 'in' ? 'Entrada' : 'Saída'}
                  </p>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Quantidade:</span>
                <p className="font-medium text-gray-900">{item.lastMovement.quantity} un.</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Data:</span>
                <p className="font-medium text-gray-900">{formatDate(item.lastMovement.date)}</p>
              </div>
              
              <div className="md:col-span-3">
                <span className="text-sm text-gray-600">Motivo:</span>
                <p className="font-medium text-gray-900">{item.lastMovement.reason}</p>
              </div>
            </div>
          </div>
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