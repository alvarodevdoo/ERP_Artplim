import { z } from 'zod';

/**
 * DTO para criação de empresa
 */
export const createCompanyDto = z.object({
  name: z.string({
    required_error: 'Nome da empresa é obrigatório',
  }).min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  tradeName: z.string().optional(),
  
  cnpj: z.string({
    required_error: 'CNPJ é obrigatório',
  }).min(14, 'CNPJ deve ter 14 caracteres').max(18, 'CNPJ deve ter no máximo 18 caracteres'),
  
  email: z.string({
    required_error: 'Email é obrigatório',
  }).email('Email deve ter um formato válido').max(100, 'Email deve ter no máximo 100 caracteres'),
  
  phone: z.string().optional(),
  
  address: z.string().optional(),
  
  city: z.string().optional(),
  
  state: z.string().optional(),
  
  zipCode: z.string().optional(),
  
  website: z.string().url('Website deve ter um formato válido').optional().or(z.literal('')),
  
  logo: z.string().optional(),
  
  description: z.string().optional(),
});

/**
 * DTO para atualização de empresa
 */
export const updateCompanyDto = z.object({
  tradeName: z.string().optional(),
  
  cnpj: z.string().min(14, 'CNPJ deve ter 14 caracteres').max(18, 'CNPJ deve ter no máximo 18 caracteres').optional(),
  
  email: z.string().email('Email deve ter um formato válido').max(100, 'Email deve ter no máximo 100 caracteres').optional(),
  
  phone: z.string().optional(),
  
  address: z.string().optional(),
  
  city: z.string().optional(),
  
  state: z.string().optional(),
  
  zipCode: z.string().optional(),
  
  website: z.string().url('Website deve ter um formato válido').optional().or(z.literal('')),
  
  logo: z.string().optional(),
  
  description: z.string().optional(),
  
  isActive: z.boolean().optional(),
});

/**
 * DTO para filtros de busca de empresas
 */
export const companyFiltersDto = z.object({
  name: z.string().optional(),
  cnpj: z.string().optional(),
  email: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(['name', 'cnpj', 'email', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * DTO para resposta de empresa
 */
export const companyResponseDto = z.object({
  id: z.string(),
  name: z.string(),
  tradeName: z.string().nullable(),
  cnpj: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  website: z.string().nullable(),
  logo: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  _count: z.object({
    users: z.number(),
    employees: z.number(),
    products: z.number(),
    orders: z.number(),
  }).optional(),
});

/**
 * DTO para lista paginada de empresas
 */
export const companyListResponseDto = z.object({
  data: z.array(companyResponseDto),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// Tipos TypeScript inferidos dos schemas Zod
export type CreateCompanyDto = z.infer<typeof createCompanyDto>;
export type UpdateCompanyDto = z.infer<typeof updateCompanyDto>;
export type CompanyFiltersDto = z.infer<typeof companyFiltersDto>;
export type CompanyResponseDto = z.infer<typeof companyResponseDto>;
export type CompanyListResponseDto = z.infer<typeof companyListResponseDto>;