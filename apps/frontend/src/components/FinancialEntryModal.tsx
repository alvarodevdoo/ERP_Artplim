import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'

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

interface FinancialEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<FinancialEntry, 'id'>) => void
  entry?: FinancialEntry | null
  mode: 'create' | 'edit'
  defaultType?: 'income' | 'expense'
}

export function FinancialEntryModal({ 
  isOpen, 
  onClose, 
  onSave, 
  entry, 
  mode, 
  defaultType 
}: FinancialEntryModalProps) {
  const [formData, setFormData] = useState({
    description: '',
    type: defaultType || 'income' as 'income' | 'expense',
    category: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    status: 'pending' as 'pending' | 'paid' | 'overdue' | 'cancelled',
    paymentMethod: '',
    reference: '',
    notes: ''
  })

  useEffect(() => {
    if (entry && mode === 'edit') {
      setFormData({
        description: entry.description,
        type: entry.type,
        category: entry.category,
        amount: entry.amount,
        date: entry.date,
        dueDate: entry.dueDate || '',
        status: entry.status,
        paymentMethod: entry.paymentMethod || '',
        reference: entry.reference || '',
        notes: entry.notes || ''
      })
    } else if (mode === 'create') {
      setFormData({
        description: '',
        type: defaultType || 'income',
        category: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        status: 'pending',
        paymentMethod: '',
        reference: '',
        notes: ''
      })
    }
  }, [entry, mode, defaultType, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.description.trim() || !formData.category.trim() || formData.amount <= 0) {
      return
    }

    const entryData = {
      ...formData,
      dueDate: formData.dueDate || undefined,
      paymentMethod: formData.paymentMethod || undefined,
      reference: formData.reference || undefined,
      notes: formData.notes || undefined
    }

    onSave(entryData)
    onClose()
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  const categories = {
    income: ['Vendas', 'Serviços', 'Outras Receitas'],
    expense: ['Compras', 'Despesas Fixas', 'Utilidades', 'Marketing', 'Outras Despesas']
  }

  const statusOptions = [
    { value: 'pending', label: 'Pendente' },
    { value: 'paid', label: 'Pago' },
    { value: 'overdue', label: 'Vencido' },
    { value: 'cancelled', label: 'Cancelado' }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? 'Novo Lançamento' : 'Editar Lançamento'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrição do lançamento"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="">Selecione uma categoria</option>
                {categories[formData.type].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de Vencimento</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Input
                id="paymentMethod"
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                placeholder="Ex: Cartão de Crédito, PIX, Dinheiro"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reference">Referência</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                placeholder="Ex: OS-2024-001, NF-12345"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Criar Lançamento' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}