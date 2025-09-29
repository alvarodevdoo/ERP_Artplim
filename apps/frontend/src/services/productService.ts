import { api } from './api'

// Tipos baseados nos DTOs do backend
export interface Product {
  id: string
  name: string
  description?: string
  sku: string
  barcode?: string
  categoryId: string
  category?: {
    id: string
    name: string
    description?: string
  }
  unit: string
  costPrice: number
  salePrice: number
  minStock: number
  maxStock?: number
  currentStock: number
  location?: string
  weight?: number
  dimensions?: {
    length?: number
    width?: number
    height?: number
  }
  images?: string[]
  trackStock: boolean
  isActive: boolean
  isService: boolean
  hasVariations: boolean
  variations?: ProductVariation[]
  tags?: string[]
  notes?: string
  companyId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface ProductVariation {
  id: string
  name: string
  sku: string
  costPrice: number
  salePrice: number
  stock: number
  attributes?: Record<string, string>
}

export interface CreateProductData {
  name: string
  description?: string
  sku: string
  barcode?: string
  categoryId?: string
  unit: 'UN' | 'KG' | 'L' | 'M' | 'M2' | 'M3' | 'PC' | 'CX' | 'PCT'
  costPrice: number
  salePrice: number
  minStock?: number
  maxStock?: number
  currentStock?: number
  location?: string
  weight?: number
  dimensions?: {
    length?: number
    width?: number
    height?: number
  }
  images?: string[]
  trackStock?: boolean
  isActive?: boolean
  isService?: boolean
  hasVariations?: boolean
  variations?: Omit<ProductVariation, 'id'>[]
  tags?: string[]
  notes?: string
}

export interface UpdateProductData extends Partial<CreateProductData> {}

export interface ProductFilters {
  search?: string
  categoryId?: string
  isActive?: boolean
  isService?: boolean
  hasVariations?: boolean
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  lowStock?: boolean
  tags?: string[]
  page?: number
  limit?: number
  sortBy?: 'name' | 'sku' | 'costPrice' | 'salePrice' | 'currentStock' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface ProductListResponse {
  products: Product[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

class ProductService {
  private baseUrl = '/products'

  /**
   * Buscar produtos com filtros
   */
  async getProducts(filters?: ProductFilters): Promise<ProductListResponse> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item.toString()))
          } else {
            params.append(key, value.toString())
          }
        }
      })
    }

    const response = await api.get<ApiResponse<ProductListResponse>>(
      `${this.baseUrl}?${params.toString()}`
    )
    
    return response.data.data
  }

  /**
   * Buscar produto por ID
   */
  async getProduct(id: string): Promise<Product> {
    const response = await api.get<ApiResponse<Product>>(`${this.baseUrl}/${id}`)
    return response.data.data
  }

  /**
   * Criar novo produto
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    const response = await api.post<ApiResponse<Product>>(this.baseUrl, data)
    return response.data.data
  }

  /**
   * Atualizar produto
   */
  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    const response = await api.put<ApiResponse<Product>>(`${this.baseUrl}/${id}`, data)
    return response.data.data
  }

  /**
   * Excluir produto (soft delete)
   */
  async deleteProduct(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`)
  }

  /**
   * Restaurar produto excluído
   */
  async restoreProduct(id: string): Promise<Product> {
    const response = await api.patch<ApiResponse<Product>>(`${this.baseUrl}/${id}/restore`)
    return response.data.data
  }

  /**
   * Reativar produto
   */
  async reactivateProduct(id: string, resetStock: boolean): Promise<Product> {
    const response = await api.patch<ApiResponse<Product>>(`${this.baseUrl}/${id}/reactivate`, { resetStock });
    return response.data.data;
  }

  /**
   * Verificar disponibilidade de SKU
   */
  async checkSkuAvailability(sku: string, excludeId?: string): Promise<boolean> {
    const params = new URLSearchParams({ sku })
    if (excludeId) {
      params.append('excludeId', excludeId)
    }
    
    const response = await api.get<ApiResponse<{ available: boolean }>>(
      `${this.baseUrl}/check-sku?${params.toString()}`
    )
    
    return response.data.data.available
  }

  /**
   * Ajustar estoque do produto
   */
  async adjustStock(productId: string, data: {
    quantity: number
    type: 'IN' | 'OUT' | 'ADJUSTMENT'
    reason: string
    reference?: string
    notes?: string
  }): Promise<void> {
    await api.post(`${this.baseUrl}/${productId}/stock/adjust`, data)
  }

  /**
   * Obter estatísticas gerais de produtos (total e ativos)
   */
  async getOverallProductStats(companyId: string): Promise<{ totalProducts: number; activeProducts: number }> {
    const response = await api.get<ApiResponse<{ totalProducts: number; activeProducts: number }>>(`${this.baseUrl}/overall-stats`, {
      params: { companyId }
    });

    return response.data.data;
  }

  /**
   * Buscar produtos por categoria
   */
  async getProductsByCategory(categoryId: string, filters?: Omit<ProductFilters, 'categoryId'>): Promise<ProductListResponse> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item.toString()))
          } else {
            params.append(key, value.toString())
          }
        }
      })
    }

    const response = await api.get<ApiResponse<ProductListResponse>>(
      `${this.baseUrl}/category/${categoryId}?${params.toString()}`
    )
    
    return response.data.data
  }

  /**
   * Buscar produtos com baixo estoque
   */
  async getLowStockProducts(filters?: Omit<ProductFilters, 'lowStock'>): Promise<ProductListResponse> {
    const params = new URLSearchParams({ lowStock: 'true' })
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item.toString()))
          } else {
            params.append(key, value.toString())
          }
        }
      })
    }

    const response = await api.get<ApiResponse<ProductListResponse>>(
      `${this.baseUrl}/low-stock?${params.toString()}`
    )
    
    return response.data.data
  }

  /**
   * Buscar produtos sem estoque
   */
  async getOutOfStockProducts(filters?: Omit<ProductFilters, 'inStock'>): Promise<ProductListResponse> {
    const params = new URLSearchParams({ inStock: 'false' })
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item.toString()))
          } else {
            params.append(key, value.toString())
          }
        }
      })
    }

    const response = await api.get<ApiResponse<ProductListResponse>>(
      `${this.baseUrl}/out-of-stock?${params.toString()}`
    )
    
    return response.data.data
  }
}

export const productService = new ProductService()