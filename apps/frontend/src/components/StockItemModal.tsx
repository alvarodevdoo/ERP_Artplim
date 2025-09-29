import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

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

interface StockItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (item: Partial<StockItem>) => void
  item?: StockItem | null
  mode: 'create' | 'edit'
}

export function StockItemModal({ isOpen, onClose, onSave, item, mode }: StockItemModalProps) {
  const [formData, setFormData] = useState({
    productName: '',
    sku: '',
    category: '',
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    unitCost: 0,
    location: ''
  })

  // Preencher formulário quando editar
  useEffect(() => {
    if (item && mode === 'edit') {
      setFormData({
        productName: item.productName,
        sku: item.sku,
        category: item.category,
        currentStock: item.currentStock,
        minStock: item.minStock,
        maxStock: item.maxStock,
        unitCost: item.unitCost,
        location: item.location
      })
    } else {
      // Limpar formulário para novo item
      setFormData({
        productName: '',
        sku: '',
        category: '',
        currentStock: 0,
        minStock: 0,
        maxStock: 0,
        unitCost: 0,
        location: ''
      })
    }
  }, [item, mode, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Calcular valor total
    const totalValue = formData.currentStock * formData.unitCost
    
    const itemData = {
      ...formData,
      totalValue,
      ...(mode === 'edit' && item ? { id: item.id } : {})
    }
    
    onSave(itemData)
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? 'Novo Item de Estoque' : 'Editar Item de Estoque'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="productName">Nome do Produto *</Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) => handleInputChange('productName', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="location">Localização *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="currentStock">Estoque Atual *</Label>
              <Input
                id="currentStock"
                type="number"
                min="0"
                value={formData.currentStock}
                onChange={(e) => handleInputChange('currentStock', parseInt(e.target.value) || 0)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="minStock">Estoque Mínimo *</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="maxStock">Estoque Máximo *</Label>
              <Input
                id="maxStock"
                type="number"
                min="0"
                value={formData.maxStock}
                onChange={(e) => handleInputChange('maxStock', parseInt(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="unitCost">Custo Unitário (R$) *</Label>
            <Input
              id="unitCost"
              type="number"
              step="0.01"
              min="0"
              value={formData.unitCost}
              onChange={(e) => handleInputChange('unitCost', parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Criar Item' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}