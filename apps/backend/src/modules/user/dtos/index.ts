import { z } from 'zod';

/**
 * DTO para criação de usuário
 */
export const createUserDto = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(100, 'Senha deve ter no máximo 100 caracteres'),
  phone: z.string().max(20, 'Telefone deve ter no máximo 20 caracteres').optional(),
  avatar: z.string().url('URL do avatar inválida').optional(),
  companyId: z.string().uuid('ID da empresa inválido'),
  roleIds: z.array(z.string().uuid('ID do role inválido')).optional(),
  isActive: z.boolean().default(true),
});

/**
 * DTO para atualização de usuário
 */
export const updateUserDto = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().max(20, 'Telefone deve ter no máximo 20 caracteres').optional(),
  avatar: z.string().url('URL do avatar inválida').optional(),
  roleIds: z.array(z.string().uuid('ID do role inválido')).optional(),
  isActive: z.boolean().optional(),
});

/**
 * DTO para alteração de senha
 */
export const changePasswordDto = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres').max(100, 'Nova senha deve ter no máximo 100 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Nova senha e confirmação devem ser iguais',
  path: ['confirmPassword'],
});

/**
 * DTO para filtros de usuário
 */
export const userFiltersDto = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  companyId: z.string().uuid('ID da empresa inválido').optional(),
  roleId: z.string().uuid('ID do role inválido').optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1, 'Página deve ser maior que 0').default(1),
  limit: z.number().int().min(1, 'Limite deve ser maior que 0').max(100, 'Limite deve ser no máximo 100').default(10),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLogin']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * DTO para resposta de usuário
 */
export const userResponseDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  avatar: z.string().nullable(),
  isActive: z.boolean(),
  lastLogin: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  company: z.object({
    id: z.string().uuid(),
    name: z.string(),
    document: z.string(),
  }),
  roles: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    permissions: z.array(z.string()),
  })),
});

/**
 * DTO para lista de usuários
 */
export const userListResponseDto = z.object({
  data: z.array(userResponseDto),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

/**
 * DTO para perfil do usuário
 */
export const userProfileDto = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres').optional(),
  phone: z.string().max(20, 'Telefone deve ter no máximo 20 caracteres').optional(),
  avatar: z.string().url('URL do avatar inválida').optional(),
});

/**
 * DTO para estatísticas do usuário
 */
export const userStatsDto = z.object({
  totalLogins: z.number().int(),
  lastLogin: z.date().nullable(),
  totalOrders: z.number().int(),
  totalQuotes: z.number().int(),
  createdAt: z.date(),
});

// Tipos TypeScript inferidos dos schemas Zod
export type CreateUserDto = z.infer<typeof createUserDto>;
export type UpdateUserDto = z.infer<typeof updateUserDto>;
export type ChangePasswordDto = z.infer<typeof changePasswordDto>;
export type UserFiltersDto = z.infer<typeof userFiltersDto>;
export type UserResponseDto = z.infer<typeof userResponseDto>;
export type UserListResponseDto = z.infer<typeof userListResponseDto>;
export type UserProfileDto = z.infer<typeof userProfileDto>;
export type UserStatsDto = z.infer<typeof userStatsDto>;