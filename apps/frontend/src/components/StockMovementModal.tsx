import { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

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

interface StockMovement {
  type: 'in' | 'out'
  quantity: number
  reason: string
  date: string
}

interface StockMovementModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (movement: StockMovement) => void
  item?: StockItem | null
  movementType?: 'in' | 'out' | null
}

export function StockMovementModal({ isOpen, onClose, onSave, item, movementType }: StockMovementModalProps) {
  const [formData, setFormData] = useState({
    type: 'in' as 'in' | 'out',
    quantity: 0,
    reason: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Definir tipo de movimentação quando especificado
  useEffect(() => {
    if (movementType) {
      setFormData(prev => ({
        ...prev,
        type: movementType
      }))
    }
  }, [movementType])

  // Limpar formulário quando abrir
  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: movementType || 'in',
        quantity: 0,
        reason: '',
        date: new Date().toISOString().split('T')[0]
      })
    }
  }, [isOpen, movementType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const reasonOptions = {
    in: [
      'Compra',
      'Transferência',
      'Devolução',
      'Ajuste de Inventário',
      'Produção',
      'Outros'
    ],
    out: [
      'Venda',
      'Ordem de Serviço',
      'Transferência',
      'Perda/Avaria',
      'Ajuste de Inventário',
      'Outros'
    ]
  }

  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {formData.type === 'in' ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <h2 className="text-xl font-semibold">
              {formData.type === 'in' ? 'Entrada de Estoque' : 'Saída de Estoque'}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Informações do Produto */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="font-medium text-gray-900">Produto Selecionado</h3>
            <div className="text-sm text-gray-600">
              <p><span className="font-medium">Nome:</span> {item.productName}</p>
              <p><span className="font-medium">SKU:</span> {item.sku}</p>
              <p><span className="font-medium">Estoque Atual:</span> {item.currentStock} un.</p>
            </div>
          </div>

          {/* Tipo de Movimentação */}
          {!movementType && (
            <div>
              <Label>Tipo de Movimentação</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    value="in"
                    checked={formData.type === 'in'}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="text-green-600"
                  />
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>Entrada</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    value="out"
                    checked={formData.type === 'out'}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="text-red-600"
                  />
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span>Saída</span>
                </label>
              </div>
            </div>
          )}

          {/* Quantidade */}
          <div>
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={formData.type === 'out' ? item.currentStock : undefined}
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
              required
            />
            {formData.type === 'out' && formData.quantity > item.currentStock && (
              <p className="text-sm text-red-600 mt-1">
                Quantidade não pode ser maior que o estoque atual ({item.currentStock} un.)
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <Label htmlFor="reason">Motivo *</Label>
            <select
              id="reason"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="">Selecione o motivo</option>
              {reasonOptions[formData.type].map(reason => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div>
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              required
            />
          </div>

          {/* Resumo da Movimentação */}
          {formData.quantity > 0 && (
            <div className={`p-4 rounded-lg ${
              formData.type === 'in' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <h4 className="font-medium text-gray-900 mb-2">Resumo da Movimentação</h4>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-600">Estoque atual:</span> {item.currentStock} un.
                </p>
                <p>
                  <span className="text-gray-600">Após movimentação:</span>{' '}
                  <span className={`font-medium ${
                    formData.type === 'in' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formData.type === 'in' 
                      ? item.currentStock + formData.quantity 
                      : item.currentStock - formData.quantity
                    } un.
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={formData.type === 'out' && formData.quantity > item.currentStock}
              className={formData.type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {formData.type === 'in' ? 'Registrar Entrada' : 'Registrar Saída'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}