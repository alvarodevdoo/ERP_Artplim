import { api } from './api'

// Tipos baseados nos DTOs do backend
export interface ProductCategory {
  id: string
  name: string
  description?: string
  parentId?: string
  parent?: {
    id: string
    name: string
  }
  children?: {
    id: string
    name: string
    productCount: number
  }[]
  isActive: boolean
  sortOrder: number
  productCount: number
  companyId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface CreateCategoryData {
  name: string
  description?: string
  parentId?: string
  isActive?: boolean
  sortOrder?: number
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

class CategoryService {
  private baseUrl = '/product-categories'

  /**
   * Buscar todas as categorias
   */
  async getCategories(): Promise<ProductCategory[]> {
    const response = await api.get<ApiResponse<ProductCategory[]>>(this.baseUrl)
    return response.data.data
  }

  /**
   * Buscar categoria por ID
   */
  async getCategory(id: string): Promise<ProductCategory> {
    const response = await api.get<ApiResponse<ProductCategory>>(`${this.baseUrl}/${id}`)
    return response.data.data
  }

  /**
   * Criar nova categoria
   */
  async createCategory(data: CreateCategoryData): Promise<ProductCategory> {
    const response = await api.post<ApiResponse<ProductCategory>>(this.baseUrl, data)
    return response.data.data
  }

  /**
   * Atualizar categoria
   */
  async updateCategory(id: string, data: UpdateCategoryData): Promise<ProductCategory> {
    const response = await api.put<ApiResponse<ProductCategory>>(`${this.baseUrl}/${id}`, data)
    return response.data.data
  }

  /**
   * Excluir categoria (soft delete)
   */
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`)
  }

  /**
   * Restaurar categoria excluída
   */
  async restoreCategory(id: string): Promise<ProductCategory> {
    const response = await api.patch<ApiResponse<ProductCategory>>(`${this.baseUrl}/${id}/restore`)
    return response.data.data
  }
}

export const categoryService = new CategoryService()