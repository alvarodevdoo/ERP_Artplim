import { z } from 'zod';

// Schemas de validação
export const createQuoteSchema = z.object({
  customerId: z.string().uuid('ID do cliente deve ser um UUID válido'),
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  description: z.string().optional(),
  validUntil: z.string().datetime('Data de validade deve ser uma data válida'),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  observations: z.string().optional(),
  discount: z.number().min(0, 'Desconto deve ser maior ou igual a 0').default(0),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  items: z.array(z.object({
    productId: z.string().uuid('ID do produto deve ser um UUID válido'),
    quantity: z.number().min(0.01, 'Quantidade deve ser maior que 0'),
    unitPrice: z.number().min(0, 'Preço unitário deve ser maior ou igual a 0'),
    discount: z.number().min(0, 'Desconto deve ser maior ou igual a 0').default(0),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
    observations: z.string().optional()
  })).min(1, 'Orçamento deve ter pelo menos um item')
});

export const updateQuoteSchema = z.object({
  customerId: z.string().uuid('ID do cliente deve ser um UUID válido').optional(),
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres').optional(),
  description: z.string().optional(),
  validUntil: z.string().datetime('Data de validade deve ser uma data válida').optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  observations: z.string().optional(),
  discount: z.number().min(0, 'Desconto deve ser maior ou igual a 0').optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  items: z.array(z.object({
    id: z.string().uuid().optional(), // Para atualização de item existente
    productId: z.string().uuid('ID do produto deve ser um UUID válido'),
    quantity: z.number().min(0.01, 'Quantidade deve ser maior que 0'),
    unitPrice: z.number().min(0, 'Preço unitário deve ser maior ou igual a 0'),
    discount: z.number().min(0, 'Desconto deve ser maior ou igual a 0').default(0),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
    observations: z.string().optional()
  })).optional()
});

export const quoteFiltersSchema = z.object({
  search: z.string().optional(),
  customerId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minValue: z.number().min(0).optional(),
  maxValue: z.number().min(0).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'validUntil', 'totalValue', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const updateQuoteStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED']),
  reason: z.string().optional()
});

export const duplicateQuoteSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres').optional(),
  customerId: z.string().uuid('ID do cliente deve ser um UUID válido').optional(),
  validUntil: z.string().datetime('Data de validade deve ser uma data válida').optional()
});

// Tipos TypeScript inferidos dos schemas
export type CreateQuoteDTO = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteDTO = z.infer<typeof updateQuoteSchema>;
export type QuoteFiltersDTO = z.infer<typeof quoteFiltersSchema>;
export type UpdateQuoteStatusDTO = z.infer<typeof updateQuoteStatusSchema>;
export type DuplicateQuoteDTO = z.infer<typeof duplicateQuoteSchema>;

// Interfaces de resposta
export interface QuoteItemResponseDTO {
  id: string;
  productId: string;
  productName: string;
  productCode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  subtotal: number;
  total: number;
  observations?: string;
}

export interface QuoteResponseDTO {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerDocument?: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  validUntil: Date;
  paymentTerms?: string;
  deliveryTerms?: string;
  observations?: string;
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  subtotal: number;
  discountValue: number;
  totalValue: number;
  items: QuoteItemResponseDTO[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName: string;
}

// Interface para estatísticas
export interface QuoteStatsDTO {
  total: number;
  byStatus: {
    draft: number;
    sent: number;
    approved: number;
    rejected: number;
    expired: number;
    converted: number;
  };
  totalValue: number;
  averageValue: number;
  conversionRate: number;
  thisMonth: {
    total: number;
    totalValue: number;
    approved: number;
    approvedValue: number;
  };
  lastMonth: {
    total: number;
    totalValue: number;
    approved: number;
    approvedValue: number;
  };
}

// Interface para relatório
export interface QuoteReportDTO {
  id: string;
  number: string;
  customerName: string;
  customerDocument?: string;
  title: string;
  status: string;
  validUntil: string;
  subtotal: number;
  discountValue: number;
  totalValue: number;
  itemsCount: number;
  createdAt: string;
  createdByName: string;
}

// Interface para conversão em OS
export interface ConvertToOrderDTO {
  quoteId: string;
  deliveryDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  observations?: string;
}

// Schema para conversão em OS
export const convertToOrderSchema = z.object({
  deliveryDate: z.string().datetime('Data de entrega deve ser uma data válida').optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  observations: z.string().optional()
});

export type ConvertToOrderRequestDTO = z.infer<typeof convertToOrderSchema>;