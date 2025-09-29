import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { type ProductCategory, type CreateCategoryData } from '@/services/categoryService'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (category: CreateCategoryData) => void
  category?: ProductCategory | null
  mode: 'create' | 'edit'
  loading?: boolean
}

export function CategoryModal({ 
  isOpen, 
  onClose, 
  onSave, 
  category, 
  mode, 
  loading = false 
}: CategoryModalProps) {
  const [formData, setFormData] = useState<CreateCategoryData>({
    name: '',
    description: '',
  })

  useEffect(() => {
    if (mode === 'edit' && category) {
      setFormData({
        name: category.name,
        description: category.description || '',
      })
    } else {
      setFormData({
        name: '',
        description: '',
      })
    }
  }, [mode, category, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Nome da categoria é obrigatório')
      return
    }
    onSave(formData)
  }

  const handleInputChange = (field: keyof CreateCategoryData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nova Categoria' : 'Editar Categoria'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Adicione uma nova categoria de produtos.' 
              : 'Faça alterações nas informações da categoria.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Digite o nome da categoria"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Digite a descrição da categoria"
              rows={3}
              disabled={loading}
            />
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
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
