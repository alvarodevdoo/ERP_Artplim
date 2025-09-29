import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

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

interface QuoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (quote: Omit<Quote, 'id' | 'createdAt' | 'number'>) => void
  quote?: Quote | null
  mode: 'create' | 'edit'
}

export function QuoteModal({ isOpen, onClose, onSave, quote, mode }: QuoteModalProps) {
  const [formData, setFormData] = useState({
    client: '',
    description: '',
    value: 0,
    status: 'pending' as 'pending' | 'approved' | 'rejected' | 'expired',
    validUntil: ''
  })
  const [loading, setLoading] = useState(false)

  // Preencher formulário quando estiver editando
  useEffect(() => {
    if (mode === 'edit' && quote) {
      setFormData({
        client: quote.client,
        description: quote.description,
        value: quote.value,
        status: quote.status,
        validUntil: quote.validUntil
      })
    } else {
      // Limpar formulário para criação
      const defaultValidUntil = new Date()
      defaultValidUntil.setDate(defaultValidUntil.getDate() + 30) // 30 dias a partir de hoje
      
      setFormData({
        client: '',
        description: '',
        value: 0,
        status: 'pending',
        validUntil: defaultValidUntil.toISOString().split('T')[0]
      })
    }
  }, [mode, quote, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onSave(formData)
      onClose()
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Orçamento' : 'Editar Orçamento'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Crie um novo orçamento para seu cliente.' 
              : 'Faça alterações nas informações do orçamento.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Cliente */}
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Input
                id="client"
                type="text"
                value={formData.client}
                onChange={(e) => handleInputChange('client', e.target.value)}
                placeholder="Nome do cliente"
                required
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Serviço *</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descreva o serviço a ser realizado"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={4}
                required
              />
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$) *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                value={formData.value}
                onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                required
              />
            </div>

            {/* Válido até */}
            <div className="space-y-2">
              <Label htmlFor="validUntil">Válido até *</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => handleInputChange('validUntil', e.target.value)}
                required
              />
            </div>

            {/* Status (apenas para edição) */}
            {mode === 'edit' && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as 'pending' | 'approved' | 'rejected' | 'expired')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="pending">Pendente</option>
                  <option value="approved">Aprovado</option>
                  <option value="rejected">Rejeitado</option>
                  <option value="expired">Expirado</option>
                </select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </div>
              ) : (
                mode === 'create' ? 'Criar Orçamento' : 'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}