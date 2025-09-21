import { z } from 'zod';

// Schema para movimentação de estoque
export const stockMovementSchema = z.object({
  productId: z.string().uuid('ID do produto deve ser um UUID válido'),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'], {
    errorMap: () => ({ message: 'Tipo deve ser IN, OUT, ADJUSTMENT ou TRANSFER' })
  }),
  quantity: z.number().positive('Quantidade deve ser maior que zero'),
  unitCost: z.number().min(0, 'Custo unitário não pode ser negativo').optional(),
  reason: z.string().min(1, 'Motivo é obrigatório').max(500, 'Motivo deve ter no máximo 500 caracteres'),
  reference: z.string().max(100, 'Referência deve ter no máximo 100 caracteres').optional(),
  locationId: z.string().uuid('ID da localização deve ser um UUID válido').optional(),
  destinationLocationId: z.string().uuid('ID da localização de destino deve ser um UUID válido').optional(),
  batchNumber: z.string().max(50, 'Número do lote deve ter no máximo 50 caracteres').optional(),
  expirationDate: z.string().datetime('Data de validade deve ser uma data válida').optional(),
  notes: z.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional()
});

// Schema para ajuste de estoque
export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid('ID do produto deve ser um UUID válido'),
  newQuantity: z.number().min(0, 'Nova quantidade não pode ser negativa'),
  reason: z.string().min(1, 'Motivo é obrigatório').max(500, 'Motivo deve ter no máximo 500 caracteres'),
  locationId: z.string().uuid('ID da localização deve ser um UUID válido').optional(),
  notes: z.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional()
});

// Schema para transferência de estoque
export const stockTransferSchema = z.object({
  productId: z.string().uuid('ID do produto deve ser um UUID válido'),
  fromLocationId: z.string().uuid('ID da localização de origem deve ser um UUID válido'),
  toLocationId: z.string().uuid('ID da localização de destino deve ser um UUID válido'),
  quantity: z.number().positive('Quantidade deve ser maior que zero'),
  reason: z.string().min(1, 'Motivo é obrigatório').max(500, 'Motivo deve ter no máximo 500 caracteres'),
  notes: z.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional()
});

// Schema para reserva de estoque
export const stockReservationSchema = z.object({
  productId: z.string().uuid('ID do produto deve ser um UUID válido'),
  quantity: z.number().positive('Quantidade deve ser maior que zero'),
  reason: z.string().min(1, 'Motivo é obrigatório').max(500, 'Motivo deve ter no máximo 500 caracteres'),
  referenceId: z.string().uuid('ID de referência deve ser um UUID válido').optional(),
  referenceType: z.enum(['QUOTE', 'ORDER', 'OTHER'], {
    errorMap: () => ({ message: 'Tipo de referência deve ser QUOTE, ORDER ou OTHER' })
  }).optional(),
  expiresAt: z.string().datetime('Data de expiração deve ser uma data válida').optional(),
  locationId: z.string().uuid('ID da localização deve ser um UUID válido').optional(),
  notes: z.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional()
});

// Schema para cancelar reserva
export const cancelStockReservationSchema = z.object({
  reason: z.string().min(1, 'Motivo é obrigatório').max(500, 'Motivo deve ter no máximo 500 caracteres'),
  notes: z.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional()
});

// Schema para filtros de estoque
export const stockFiltersSchema = z.object({
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  category: z.string().optional(),
  lowStock: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['productName', 'quantity', 'unitCost', 'totalValue', 'lastMovement']).default('productName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

// Schema para filtros de movimentações
export const stockMovementFiltersSchema = z.object({
  productId: z.string().uuid().optional(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER']).optional(),
  locationId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().uuid().optional(),
  reference: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'type', 'quantity', 'unitCost']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Schema para filtros de reservas
export const stockReservationFiltersSchema = z.object({
  productId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED', 'FULFILLED']).optional(),
  referenceType: z.enum(['QUOTE', 'ORDER', 'OTHER']).optional(),
  referenceId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'expiresAt', 'quantity']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Schema para localização de estoque
export const createStockLocationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  code: z.string().min(1, 'Código é obrigatório').max(20, 'Código deve ter no máximo 20 caracteres'),
  description: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
  type: z.enum(['WAREHOUSE', 'STORE', 'VIRTUAL'], {
    errorMap: () => ({ message: 'Tipo deve ser WAREHOUSE, STORE ou VIRTUAL' })
  }),
  address: z.string().max(500, 'Endereço deve ter no máximo 500 caracteres').optional(),
  isActive: z.boolean().default(true)
});

export const updateStockLocationSchema = createStockLocationSchema.partial();

// Tipos TypeScript inferidos dos schemas
export type StockMovementDTO = z.infer<typeof stockMovementSchema>;
export type StockAdjustmentDTO = z.infer<typeof stockAdjustmentSchema>;
export type StockTransferDTO = z.infer<typeof stockTransferSchema>;
export type StockReservationDTO = z.infer<typeof stockReservationSchema>;
export type CancelStockReservationDTO = z.infer<typeof cancelStockReservationSchema>;
export type StockFiltersDTO = z.infer<typeof stockFiltersSchema>;
export type StockMovementFiltersDTO = z.infer<typeof stockMovementFiltersSchema>;
export type StockReservationFiltersDTO = z.infer<typeof stockReservationFiltersSchema>;
export type CreateStockLocationDTO = z.infer<typeof createStockLocationSchema>;
export type UpdateStockLocationDTO = z.infer<typeof updateStockLocationSchema>;

// Interfaces de resposta
export interface StockItemResponseDTO {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  productCategory: string;
  locationId: string | null;
  locationName: string | null;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unitCost: number;
  totalValue: number;
  minStock: number;
  maxStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  lastMovementAt: string | null;
  lastMovementType: string | null;
  batches: StockBatchResponseDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface StockBatchResponseDTO {
  id: string;
  batchNumber: string;
  quantity: number;
  unitCost: number;
  expirationDate: string | null;
  isExpired: boolean;
  createdAt: string;
}

export interface StockMovementResponseDTO {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  reason: string;
  reference: string | null;
  locationId: string | null;
  locationName: string | null;
  destinationLocationId: string | null;
  destinationLocationName: string | null;
  batchNumber: string | null;
  expirationDate: string | null;
  notes: string | null;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface StockReservationResponseDTO {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  reason: string;
  referenceId: string | null;
  referenceType: 'QUOTE' | 'ORDER' | 'OTHER' | null;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'FULFILLED';
  expiresAt: string | null;
  locationId: string | null;
  locationName: string | null;
  notes: string | null;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockLocationResponseDTO {
  id: string;
  name: string;
  code: string;
  description: string | null;
  type: 'WAREHOUSE' | 'STORE' | 'VIRTUAL';
  address: string | null;
  isActive: boolean;
  totalProducts: number;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}

// DTOs para estatísticas
export interface StockStatsDTO {
  totalProducts: number;
  totalValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalMovements: number;
  totalReservations: number;
  expiredBatches: number;
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    value: number;
  }[];
  movementsByType: {
    type: string;
    count: number;
    totalQuantity: number;
  }[];
  valueByLocation: {
    locationId: string | null;
    locationName: string | null;
    totalValue: number;
    totalProducts: number;
  }[];
}

// DTOs para relatórios
export interface StockReportDTO {
  productId: string;
  productName: string;
  productCode: string;
  productCategory: string;
  locationName: string | null;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unitCost: number;
  totalValue: number;
  minStock: number;
  maxStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  lastMovementAt: string | null;
  lastMovementType: string | null;
  batchesCount: number;
  expiredBatchesCount: number;
}

export interface StockMovementReportDTO {
  date: string;
  productName: string;
  productCode: string;
  type: string;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  reason: string;
  reference: string | null;
  locationName: string | null;
  destinationLocationName: string | null;
  userName: string;
}

// DTO para dashboard
export interface StockDashboardDTO {
  stats: StockStatsDTO;
  lowStockAlerts: StockItemResponseDTO[];
  recentMovements: StockMovementResponseDTO[];
  expiredBatches: StockBatchResponseDTO[];
  activeReservations: StockReservationResponseDTO[];
  topMovingProducts: {
    productId: string;
    productName: string;
    totalMovements: number;
    totalQuantity: number;
  }[];
}