import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, RotateCw, Grid, List } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import ProductModal from '@/components/ProductModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { productService, type Product, type ProductFilters } from '@/services/productService'
import { categoryService, type ProductCategory } from '@/services/categoryService'
import { useAuthStore } from '@/stores/auth'

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')

  // Estados para modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [productToReactivate, setProductToReactivate] = useState<Product | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Estados de paginação
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Estados para estatísticas gerais
  const [overallTotalProducts, setOverallTotalProducts] = useState(0)
  const [overallActiveProducts, setOverallActiveProducts] = useState(0)

  const { user } = useAuthStore()

  const loadOverallStats = () => {
    if (!user?.companyId) return;

    productService.getOverallProductStats(user.companyId)
      .then(stats => {
        setOverallTotalProducts(stats.totalProducts);
        setOverallActiveProducts(stats.activeProducts);
      })
      .catch(error => {
        toast.error('Erro ao carregar estatísticas gerais de produtos');
      });
  }

  // Carregar estatísticas gerais uma vez
  useEffect(() => {
    loadOverallStats();
  }, [user?.companyId]);

  // Carregar produtos do banco de dados
  const loadProducts = async () => {
    try {
      setLoading(true)
      
      const filters: ProductFilters = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'name',
        sortOrder: 'asc'
      }

      // Aplicar filtros
      if (searchTerm.trim()) {
        filters.search = searchTerm.trim()
      }
      
      if (categoryFilter !== 'all') {
        filters.categoryId = categoryFilter
      }
      
      if (statusFilter !== 'all') {
        filters.isActive = statusFilter === 'active'
      }

      const response = await productService.getProducts(filters)
      
      if (response && response.products) {
        setProducts(response.products)
        setPagination({
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: response.totalPages
        })
      } else {
        setProducts([])
        setPagination({
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        })
      }
    } catch (error) {
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  // Carregar categorias
  const loadCategories = async () => {
    try {
      const categoriesData = await categoryService.getCategories()
      if (categoriesData) {
        setCategories(categoriesData.filter(cat => cat.isActive))
      }
    } catch (error) {
      toast.error('Erro ao carregar categorias')
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadProducts()
  }, [searchTerm, categoryFilter, statusFilter, pagination.page])

  // Manipuladores de eventos
  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setModalMode('edit')
    setIsProductModalOpen(true)
  }

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
    setIsConfirmDialogOpen(true)
  }

  const handleReactivateClick = (product: Product) => {
    setProductToReactivate(product);
    setIsReactivateDialogOpen(true);
  };

  const handleSaveProduct = async (productData: any) => {
    try {
      setActionLoading(true)
      
      if (modalMode === 'create') {
        await productService.createProduct(productData)
        toast.success('Produto criado com sucesso!')
      } else if (selectedProduct) {
        await productService.updateProduct(selectedProduct.id, productData)
        toast.success('Produto atualizado com sucesso!')
      }
      
      await loadProducts()
      loadOverallStats()
      handleCloseModals()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar produto')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return

    try {
      setActionLoading(true)
      await productService.deleteProduct(productToDelete.id)
      toast.success('Produto desativado com sucesso!')
      await loadProducts()
      loadOverallStats()
      handleCloseModals()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao desativar produto')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmReactivation = async (resetStock: boolean) => {
    if (!productToReactivate) return;
    try {
        setActionLoading(true);
        await productService.reactivateProduct(productToReactivate.id, resetStock);
        toast.success('Produto reativado com sucesso!');
        await loadProducts();
        loadOverallStats();
    } catch (error: any) {
        toast.error(error.response?.data?.message || 'Erro ao reativar produto');
    } finally {
        setIsReactivateDialogOpen(false);
        setProductToReactivate(null);
        setActionLoading(false);
    }
  };

  const handleCloseModals = () => {
    setIsProductModalOpen(false)
    setIsConfirmDialogOpen(false)
    setIsReactivateDialogOpen(false)
    setSelectedProduct(null)
    setProductToDelete(null)
    setProductToReactivate(null)
    setModalMode('create')
  }

  // Formatador de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const filteredProducts = products;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie seu catálogo de produtos
          </p>
        </div>
        <Button 
          onClick={() => {
            setModalMode('create')
            setIsProductModalOpen(true)
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallTotalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallActiveProducts}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Baixo Estoque</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.isActive && p.trackStock && p.currentStock <= p.minStock).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Estoque</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.isActive && p.trackStock && p.currentStock === 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de produtos */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {pagination.total === 1 ? 'Produto' : 'Produtos'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('grid')}>
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredProducts.length > 0 ? (
            viewMode === 'list' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.category?.name || 'Sem categoria'}</TableCell>
                      <TableCell>{formatCurrency(product.salePrice)}</TableCell>
                      <TableCell>
                        {product.trackStock ? (
                          <div className="flex items-center gap-2">
                            <span>{product.currentStock}</span>
                            {product.currentStock <= product.minStock && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                            {product.currentStock === 0 && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">N/C</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.isActive ? 'default' : 'secondary'}>
                          {product.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {product.isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(product)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivateClick(product)}
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-4">
                          <CardTitle className="text-base font-semibold tracking-tight">{product.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                        <div className="flex items-center gap-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {product.isActive ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReactivateClick(product)}
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2 text-sm pt-0">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Preço</span>
                        <span className="font-medium">{formatCurrency(product.salePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estoque</span>
                        {product.trackStock ? (
                          <div className="flex items-center gap-1">
                            <span>{product.currentStock}</span>
                            {product.currentStock <= product.minStock && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" title={`Estoque baixo (mínimo: ${product.minStock})`} />
                            )}
                            {product.currentStock === 0 && (
                              <AlertTriangle className="h-4 w-4 text-red-500" title="Sem estoque" />
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">N/C</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={product.isActive ? 'default' : 'secondary'}>
                          {product.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      {product.category && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Categoria</span>
                          <span className="text-right truncate" title={product.category.name}>{product.category.name}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhum produto encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Comece criando um novo produto.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
            disabled={pagination.page === pagination.totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Modais */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveProduct}
        product={selectedProduct}
        mode={modalMode}
        loading={actionLoading}
        categories={categories}
        onCategoryCreated={loadCategories}
      />

      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={handleCloseModals}
        onConfirm={handleConfirmDelete}
        title="Desativar Produto"
        description={`Tem certeza que deseja desativar o produto "${productToDelete?.name}"? Ele poderá ser reativado posteriormente.`}
        loading={actionLoading}
      />

      <Dialog open={isReactivateDialogOpen} onOpenChange={setIsReactivateDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reativar Produto</DialogTitle>
                <DialogDescription>
                    Deseja reativar o produto "{productToReactivate?.name}"?
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <p>O estoque do produto pode estar desatualizado. Deseja zerar o estoque ao reativar?</p>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsReactivateDialogOpen(false)} disabled={actionLoading}>Cancelar</Button>
                <Button onClick={() => handleConfirmReactivation(false)} disabled={actionLoading}>Apenas Reativar</Button>
                <Button onClick={() => handleConfirmReactivation(true)} disabled={actionLoading}>Reativar e Zerar Estoque</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProductsPage