import { z } from 'zod';
import { PartnerType } from '@prisma/client';

// Schema de validação para criação de parceiro
export const createPartnerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome deve ter no máximo 255 caracteres'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional(),
  document: z.string().optional(),
  type: z.nativeEnum(PartnerType, { required_error: 'Tipo é obrigatório' }),
  // Campo status removido - não existe no schema
  notes: z.string().optional(),
  
  // Endereço
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default('Brasil')
  }).optional(),
  
  // Informações financeiras
  creditLimit: z.number().min(0, 'Limite de crédito deve ser positivo').optional(),
  paymentTerms: z.string().optional(),
  
  // Informações comerciais
  salesRepresentative: z.string().optional(),
  discount: z.number().min(0, 'Desconto deve ser positivo').max(100, 'Desconto não pode ser maior que 100%').optional(),
  
  // Metadados
  metadata: z.record(z.string(), z.unknown()).optional()
});

// Schema de validação para atualização de parceiro
export const updatePartnerSchema = createPartnerSchema.partial();

// Schema de validação para filtros de busca
export const partnerFiltersSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  document: z.string().optional(),
  type: z.nativeEnum(PartnerType).optional(),
  // Campo status removido - não existe no schema
  city: z.string().optional(),
  state: z.string().optional(),
  salesRepresentative: z.string().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'email', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

// Schema de validação para contatos do parceiro
export const createPartnerContactSchema = z.object({
  partnerId: z.string().uuid('ID do parceiro inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome deve ter no máximo 255 caracteres'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional()
});

export const updatePartnerContactSchema = createPartnerContactSchema.partial().omit({ partnerId: true });

// Tipos TypeScript derivados dos schemas
export type CreatePartnerDTO = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerDTO = z.infer<typeof updatePartnerSchema>;
export type PartnerFiltersDTO = z.infer<typeof partnerFiltersSchema>;
export type CreatePartnerContactDTO = z.infer<typeof createPartnerContactSchema>;
export type UpdatePartnerContactDTO = z.infer<typeof updatePartnerContactSchema>;

// Interface para resposta de parceiro
export interface PartnerResponseDTO {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  type: PartnerType;
  isActive: boolean;
  notes?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  creditLimit?: number;
  paymentTerms?: string;
  salesRepresentative?: string;
  discount?: number;
  metadata?: Record<string, unknown>;
  contacts?: PartnerContactResponseDTO[];
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Interface para resposta de contato do parceiro
export interface PartnerContactResponseDTO {
  id: string;
  partnerId: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface para estatísticas de parceiros
export interface PartnerStatsDTO {
  total: number;
  active: number;
  inactive: number;
  blocked: number;
  customers: number;
  suppliers: number;
  both: number;
  totalCreditLimit: number;
  averageCreditLimit: number;
  topCustomers: Array<{
    id: string;
    name: string;
    totalOrders: number;
    totalValue: number;
  }>;
  topSuppliers: Array<{
    id: string;
    name: string;
    totalPurchases: number;
    totalValue: number;
  }>;
}

// Interface para relatório de parceiros
export interface PartnerReportDTO {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  type: string;
  isActive: boolean;
  city?: string;
  state?: string;
  creditLimit?: number;
  totalOrders?: number;
  totalValue?: number;
  lastOrderDate?: Date;
  createdAt: Date;
}