import { z } from 'zod';

/**
 * DTO para criação de produto
 */
export const createProductDto = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome deve ter no máximo 255 caracteres'),
  description: z.string().optional(),
  sku: z.string().min(1, 'SKU é obrigatório').max(100, 'SKU deve ter no máximo 100 caracteres'),
  barcode: z.string().optional(),
  categoryId: z.string().uuid('ID da categoria deve ser um UUID válido'),
  unitOfMeasure: z.enum(['UN', 'KG', 'L', 'M', 'M2', 'M3', 'PC', 'CX', 'PCT'], {
    errorMap: () => ({ message: 'Unidade de medida inválida' })
  }),
  costPrice: z.number().min(0, 'Preço de custo deve ser maior ou igual a zero'),
  salePrice: z.number().min(0, 'Preço de venda deve ser maior ou igual a zero'),
  minStock: z.number().int().min(0, 'Estoque mínimo deve ser um número inteiro maior ou igual a zero').default(0),
  maxStock: z.number().int().min(0, 'Estoque máximo deve ser um número inteiro maior ou igual a zero').optional(),
  currentStock: z.number().int().min(0, 'Estoque atual deve ser um número inteiro maior ou igual a zero').default(0),
  location: z.string().optional(),
  weight: z.number().min(0, 'Peso deve ser maior ou igual a zero').optional(),
  dimensions: z.object({
    length: z.number().min(0, 'Comprimento deve ser maior ou igual a zero').optional(),
    width: z.number().min(0, 'Largura deve ser maior ou igual a zero').optional(),
    height: z.number().min(0, 'Altura deve ser maior ou igual a zero').optional()
  }).optional(),
  images: z.array(z.string().url('URL da imagem inválida')).optional(),
  isActive: z.boolean().default(true),
  isService: z.boolean().default(false),
  hasVariations: z.boolean().default(false),
  variations: z.array(z.object({
    name: z.string().min(1, 'Nome da variação é obrigatório'),
    sku: z.string().min(1, 'SKU da variação é obrigatório'),
    costPrice: z.number().min(0, 'Preço de custo da variação deve ser maior ou igual a zero'),
    salePrice: z.number().min(0, 'Preço de venda da variação deve ser maior ou igual a zero'),
    stock: z.number().int().min(0, 'Estoque da variação deve ser um número inteiro maior ou igual a zero').default(0),
    attributes: z.record(z.string()).optional()
  })).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional()
});

/**
 * DTO para atualização de produto
 */
export const updateProductDto = createProductDto.partial();

/**
 * DTO para filtros de produto
 */
export const productFiltersDto = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  isService: z.boolean().optional(),
  hasVariations: z.boolean().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  inStock: z.boolean().optional(),
  lowStock: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'sku', 'costPrice', 'salePrice', 'currentStock', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

/**
 * DTO para resposta de produto
 */
export const productResponseDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  sku: z.string(),
  barcode: z.string().nullable(),
  categoryId: z.string().uuid(),
  category: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable()
  }).optional(),
  unitOfMeasure: z.string(),
  costPrice: z.number(),
  salePrice: z.number(),
  minStock: z.number(),
  maxStock: z.number().nullable(),
  currentStock: z.number(),
  location: z.string().nullable(),
  weight: z.number().nullable(),
  dimensions: z.object({
    length: z.number().nullable(),
    width: z.number().nullable(),
    height: z.number().nullable()
  }).nullable(),
  images: z.array(z.string()),
  isActive: z.boolean(),
  isService: z.boolean(),
  hasVariations: z.boolean(),
  variations: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    sku: z.string(),
    costPrice: z.number(),
    salePrice: z.number(),
    stock: z.number(),
    attributes: z.record(z.string())
  })).optional(),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
  companyId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable()
});

/**
 * DTO para lista de produtos
 */
export const productListResponseDto = z.object({
  products: z.array(productResponseDto),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number()
});

/**
 * DTO para estatísticas de produtos
 */
export const productStatsDto = z.object({
  totalProducts: z.number(),
  activeProducts: z.number(),
  inactiveProducts: z.number(),
  services: z.number(),
  physicalProducts: z.number(),
  productsWithVariations: z.number(),
  lowStockProducts: z.number(),
  outOfStockProducts: z.number(),
  totalStockValue: z.number(),
  averagePrice: z.number(),
  topCategories: z.array(z.object({
    categoryId: z.string().uuid(),
    categoryName: z.string(),
    productCount: z.number()
  })),
  recentlyAdded: z.array(productResponseDto)
});

/**
 * DTO para criação de categoria de produto
 */
export const createProductCategoryDto = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome deve ter no máximo 255 caracteres'),
  description: z.string().optional(),
  parentId: z.string().uuid('ID da categoria pai deve ser um UUID válido').optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0)
});

/**
 * DTO para atualização de categoria de produto
 */
export const updateProductCategoryDto = createProductCategoryDto.partial();

/**
 * DTO para resposta de categoria de produto
 */
export const productCategoryResponseDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  parentId: z.string().uuid().nullable(),
  parent: z.object({
    id: z.string().uuid(),
    name: z.string()
  }).optional(),
  children: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    productCount: z.number()
  })).optional(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  productCount: z.number(),
  companyId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable()
});

/**
 * DTO para movimentação de estoque
 */
export const createStockMovementDto = z.object({
  productId: z.string().uuid('ID do produto deve ser um UUID válido'),
  variationId: z.string().uuid('ID da variação deve ser um UUID válido').optional(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'], {
    errorMap: () => ({ message: 'Tipo de movimentação inválido' })
  }),
  quantity: z.number().int().min(1, 'Quantidade deve ser um número inteiro maior que zero'),
  unitCost: z.number().min(0, 'Custo unitário deve ser maior ou igual a zero').optional(),
  reason: z.string().min(1, 'Motivo é obrigatório').max(500, 'Motivo deve ter no máximo 500 caracteres'),
  reference: z.string().optional(),
  notes: z.string().optional()
});

/**
 * DTO para resposta de movimentação de estoque
 */
export const stockMovementResponseDto = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    sku: z.string()
  }),
  variationId: z.string().uuid().nullable(),
  variation: z.object({
    id: z.string().uuid(),
    name: z.string(),
    sku: z.string()
  }).optional(),
  type: z.string(),
  quantity: z.number(),
  unitCost: z.number().nullable(),
  totalCost: z.number().nullable(),
  reason: z.string(),
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  previousStock: z.number(),
  newStock: z.number(),
  userId: z.string().uuid(),
  user: z.object({
    id: z.string().uuid(),
    name: z.string()
  }),
  companyId: z.string().uuid(),
  createdAt: z.date()
});

// Tipos TypeScript inferidos dos schemas Zod
export type CreateProductDto = z.infer<typeof createProductDto>;
export type UpdateProductDto = z.infer<typeof updateProductDto>;
export type ProductFiltersDto = z.infer<typeof productFiltersDto>;
export type ProductResponseDto = z.infer<typeof productResponseDto>;
export type ProductListResponseDto = z.infer<typeof productListResponseDto>;
export type ProductStatsDto = z.infer<typeof productStatsDto>;
export type CreateProductCategoryDto = z.infer<typeof createProductCategoryDto>;
export type UpdateProductCategoryDto = z.infer<typeof updateProductCategoryDto>;
export type ProductCategoryResponseDto = z.infer<typeof productCategoryResponseDto>;
export type CreateStockMovementDto = z.infer<typeof createStockMovementDto>;
export type StockMovementResponseDto = z.infer<typeof stockMovementResponseDto>;