import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProductModal } from '@/components/ProductModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface Product {
  id: string
  name: string
  description: string
  category: string
  price: number
  stock: number
  status: 'active' | 'inactive'
  createdAt: string
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Estados para modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    // Simular carregamento de produtos
    const loadProducts = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Produto A',
          description: 'Descrição do produto A',
          category: 'Categoria 1',
          price: 99.90,
          stock: 50,
          status: 'active',
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          name: 'Produto B',
          description: 'Descrição do produto B',
          category: 'Categoria 2',
          price: 149.90,
          stock: 25,
          status: 'active',
          createdAt: '2024-01-10'
        },
        {
          id: '3',
          name: 'Produto C',
          description: 'Descrição do produto C',
          category: 'Categoria 1',
          price: 79.90,
          stock: 0,
          status: 'inactive',
          createdAt: '2024-01-05'
        }
      ]
      
      setProducts(mockProducts)
      setLoading(false)
    }

    loadProducts()
  }, [])

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]

  // Handlers para modais
  const handleNewProduct = () => {
    setModalMode('create')
    setSelectedProduct(null)
    setIsProductModalOpen(true)
  }

  const handleEdit = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setModalMode('edit')
      setSelectedProduct(product)
      setIsProductModalOpen(true)
    }
  }

  const handleDelete = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setProductToDelete(product)
      setIsConfirmDialogOpen(true)
    }
  }

  const handleSaveProduct = async (productData: Omit<Product, 'id' | 'createdAt'>) => {
    try {
      if (modalMode === 'create') {
        // Criar novo produto
        const newProduct: Product = {
          ...productData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString().split('T')[0]
        }
        setProducts(prev => [...prev, newProduct])
        toast.success('Produto criado com sucesso!')
      } else {
        // Editar produto existente
        setProducts(prev => prev.map(p => 
          p.id === selectedProduct?.id 
            ? { ...p, ...productData }
            : p
        ))
        toast.success('Produto atualizado com sucesso!')
      }
    } catch {
      toast.error('Erro ao salvar produto')
    }
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    
    setActionLoading(true)
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id))
      toast.success('Produto excluído com sucesso!')
      setIsConfirmDialogOpen(false)
      setProductToDelete(null)
    } catch {
      toast.error('Erro ao excluir produto')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCloseModals = () => {
    setIsProductModalOpen(false)
    setIsConfirmDialogOpen(false)
    setSelectedProduct(null)
    setProductToDelete(null)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
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
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-600">Gerencie seu catálogo de produtos</p>
        </div>
        
        <Button onClick={handleNewProduct}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
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
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-600">Tente ajustar os filtros ou adicione um novo produto.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                  </div>
                  
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(product.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Categoria:</span>
                    <span className="text-sm font-medium">{product.category}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Preço:</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Estoque:</span>
                    <span className={`text-sm font-medium ${
                      product.stock > 10 ? 'text-green-600' : 
                      product.stock > 0 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {product.stock} unidades
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      product.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Modais */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveProduct}
        product={selectedProduct}
        mode={modalMode}
      />
      
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={handleCloseModals}
        onConfirm={handleConfirmDelete}
        title="Excluir Produto"
        description={`Tem certeza que deseja excluir o produto "${productToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  )
}