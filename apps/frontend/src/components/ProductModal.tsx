import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { type Product, type CreateProductData } from '@/services/productService'
import { type ProductCategory, categoryService, type CreateCategoryData } from '@/services/categoryService'
import { CategoryModal } from './CategoryModal'
import { toast } from 'sonner'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (product: CreateProductData) => void
  product?: Product | null
  mode: 'create' | 'edit'
  loading?: boolean
  categories: ProductCategory[]
  onCategoryCreated: () => void
}

const initialFormData: CreateProductData = {
  name: '',
  description: '',
  sku: '',
  categoryId: '',
  costPrice: 0,
  salePrice: 0,
  trackStock: true,
  minStock: 0,
  maxStock: 0,
  currentStock: 0,
  unit: 'UN',
  isActive: true,
  variations: []
}

export default function ProductModal({
  isOpen,
  onClose,
  onSave,
  product,
  mode,
  loading = false,
  categories,
  onCategoryCreated
}: ProductModalProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [formData, setFormData] = useState<CreateProductData>(initialFormData)

  // Preencher formulário quando estiver editando
  useEffect(() => {
    if (mode === 'edit' && product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku,
        categoryId: product.categoryId || '',
        costPrice: product.costPrice,
        salePrice: product.salePrice,
        trackStock: product.trackStock,
        minStock: product.minStock,
        maxStock: product.maxStock,
        currentStock: product.currentStock,
        unit: product.unit as CreateProductData['unit'],
        isActive: product.isActive,
        variations: product.variations || []
      })
    } else if (mode === 'create') {
      // Limpar formulário para criação
      setFormData(initialFormData)
    }
  }, [mode, product, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações básicas
    if (!formData.name.trim()) {
      alert('Nome do produto é obrigatório');
      return;
    }
    if (!formData.sku.trim()) {
      alert('SKU é obrigatório');
      return;
    }
    if (Number(formData.salePrice) <= 0) {
      alert('Preço de venda deve ser maior que zero');
      return;
    }

    const payload = {
      ...formData,
      costPrice: formData.costPrice === null ? undefined : Number(formData.costPrice),
      salePrice: formData.salePrice === null ? undefined : Number(formData.salePrice),
      minStock: formData.minStock === null ? undefined : Number(formData.minStock),
      maxStock: formData.maxStock === null ? undefined : Number(formData.maxStock),
      currentStock: formData.currentStock === null ? undefined : Number(formData.currentStock),
      categoryId: formData.categoryId === '' ? undefined : formData.categoryId,
    };

    onSave(payload as CreateProductData);
  };

  const handleInputChange = (field: keyof CreateProductData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleTrackStockChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      trackStock: checked,
      // Zera os campos de estoque se o controle for desativado
      ...(!checked && { currentStock: 0, minStock: 0, maxStock: 0 })
    }));
  };

  const handleSaveCategory = async (categoryData: CreateCategoryData) => {
    try {
      setCategoryLoading(true)
      const newCategory = await categoryService.createCategory(categoryData)
      toast.success('Categoria criada com sucesso!')
      onCategoryCreated()
      setIsCategoryModalOpen(false)
      handleInputChange('categoryId', newCategory.id)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao criar categoria')
    } finally {
      setCategoryLoading(false)
    }
  }

  const unitOptions = [
    { value: 'UN', label: 'Unidade' },
    { value: 'KG', label: 'Quilograma' },
    { value: 'L', label: 'Litro' },
    { value: 'M', label: 'Metro' },
    { value: 'M2', label: 'Metro Quadrado' },
    { value: 'M3', label: 'Metro Cúbico' },
    { value: 'PC', label: 'Peça' },
    { value: 'CX', label: 'Caixa' },
    { value: 'PCT', label: 'Pacote' }
  ]

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Novo Produto' : 'Editar Produto'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create' 
                ? 'Adicione um novo produto ao seu catálogo.' 
                : 'Faça alterações nas informações do produto.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Nome do Produto */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Digite o nome do produto"
                  required
                  disabled={loading}
                />
              </div>

              {/* SKU */}
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value.toUpperCase())}
                  placeholder="Digite o código SKU"
                  required
                  disabled={loading}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Digite a descrição do produto"
                  rows={3}
                  disabled={loading}
                />
              </div>

              {/* Categoria e Unidade */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Categoria</Label>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={formData.categoryId} 
                      onValueChange={(value) => handleInputChange('categoryId', value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem categoria</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setIsCategoryModalOpen(true)}
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade *</Label>
                  <Select 
                    value={formData.unit} 
                    onValueChange={(value) => handleInputChange('unit', value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preços */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Preço de Custo (R$)</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice ?? ''}
                    onChange={(e) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Preço de Venda (R$) *</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salePrice ?? ''}
                    onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Controle de Estoque */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="trackStock"
                  checked={formData.trackStock}
                  onCheckedChange={handleTrackStockChange}
                  disabled={loading}
                />
                <Label htmlFor="trackStock" className="cursor-pointer">
                  Controlar Estoque
                </Label>
              </div>

              {/* Estoque (condicional) */}
              {formData.trackStock && (
                <div className="grid grid-cols-3 gap-4 p-4 border rounded-md">
                  <div className="space-y-2">
                    <Label htmlFor="currentStock">Estoque Atual</Label>
                    <Input
                      id="currentStock"
                      type="number"
                      min="0"
                      value={formData.currentStock ?? ''}
                      onChange={(e) => handleInputChange('currentStock', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minStock">Estoque Mínimo</Label>
                    <Input
                      id="minStock"
                      type="number"
                      min="0"
                      value={formData.minStock ?? ''}
                      onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="isActive">Status</Label>
                <Select 
                  value={formData.isActive ? 'true' : 'false'} 
                  onValueChange={(value) => handleInputChange('isActive', value === 'true')}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  mode === 'create' ? 'Criar Produto' : 'Salvar Alterações'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        mode="create"
        loading={categoryLoading}
      />
    </>
  )
}
