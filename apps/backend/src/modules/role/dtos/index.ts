import { z } from 'zod';

/**
 * DTO para criação de role
 */
export const createRoleDto = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50, 'Nome deve ter no máximo 50 caracteres'),
  description: z.string().optional().nullable(),
  companyId: z.string().uuid('ID da empresa deve ser um UUID válido'),
  permissionIds: z.array(z.string().uuid('ID da permissão deve ser um UUID válido')).min(1, 'Pelo menos uma permissão deve ser selecionada'),
  isActive: z.boolean().default(true),
});

/**
 * DTO para atualização de role
 */
export const updateRoleDto = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50, 'Nome deve ter no máximo 50 caracteres').optional(),
  description: z.string().optional().nullable(),
  permissionIds: z.array(z.string().uuid('ID da permissão deve ser um UUID válido')).optional(),
  isActive: z.boolean().optional(),
});

/**
 * DTO para filtros de busca de roles
 */
export const roleFiltersDto = z.object({
  name: z.string().optional(),
  companyId: z.string().uuid('ID da empresa deve ser um UUID válido').optional(),
  permissionId: z.string().uuid('ID da permissão deve ser um UUID válido').optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1, 'Página deve ser maior que 0').default(1),
  limit: z.number().int().min(1, 'Limite deve ser maior que 0').max(100, 'Limite deve ser no máximo 100').default(10),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * DTO para criação de permissão
 */
export const createPermissionDto = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().optional().nullable(),
  resource: z.string().min(2, 'Recurso deve ter pelo menos 2 caracteres').max(50, 'Recurso deve ter no máximo 50 caracteres'),
  action: z.enum(['create', 'read', 'update', 'delete', 'manage'], {
    errorMap: () => ({ message: 'Ação deve ser: create, read, update, delete ou manage' }),
  }),
  isActive: z.boolean().default(true),
});

/**
 * DTO para atualização de permissão
 */
export const updatePermissionDto = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres').optional(),
  description: z.string().optional().nullable(),
  resource: z.string().min(2, 'Recurso deve ter pelo menos 2 caracteres').max(50, 'Recurso deve ter no máximo 50 caracteres').optional(),
  action: z.enum(['create', 'read', 'update', 'delete', 'manage'], {
    errorMap: () => ({ message: 'Ação deve ser: create, read, update, delete ou manage' }),
  }).optional(),
  isActive: z.boolean().optional(),
});

/**
 * DTO para filtros de busca de permissões
 */
export const permissionFiltersDto = z.object({
  name: z.string().optional(),
  resource: z.string().optional(),
  action: z.enum(['create', 'read', 'update', 'delete', 'manage']).optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1, 'Página deve ser maior que 0').default(1),
  limit: z.number().int().min(1, 'Limite deve ser maior que 0').max(100, 'Limite deve ser no máximo 100').default(10),
  sortBy: z.enum(['name', 'resource', 'action', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * DTO de resposta para role
 */
export const roleResponseDto = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  company: z.object({
    id: z.string(),
    name: z.string(),
    document: z.string(),
  }),
  permissions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      resource: z.string(),
      action: z.string(),
    })
  ),
  usersCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * DTO de resposta para lista de roles
 */
export const roleListResponseDto = z.object({
  data: z.array(roleResponseDto),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

/**
 * DTO de resposta para permissão
 */
export const permissionResponseDto = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  resource: z.string(),
  action: z.string(),
  isActive: z.boolean(),
  rolesCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * DTO de resposta para lista de permissões
 */
export const permissionListResponseDto = z.object({
  data: z.array(permissionResponseDto),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

/**
 * DTO para atribuição de role a usuário
 */
export const assignRoleDto = z.object({
  userId: z.string().uuid('ID do usuário deve ser um UUID válido'),
  roleIds: z.array(z.string().uuid('ID da role deve ser um UUID válido')).min(1, 'Pelo menos uma role deve ser selecionada'),
});

/**
 * DTO para remoção de role de usuário
 */
export const removeRoleDto = z.object({
  userId: z.string().uuid('ID do usuário deve ser um UUID válido'),
  roleIds: z.array(z.string().uuid('ID da role deve ser um UUID válido')).min(1, 'Pelo menos uma role deve ser selecionada'),
});

/**
 * DTO para verificação de permissão
 */
export const checkPermissionDto = z.object({
  userId: z.string().uuid('ID do usuário deve ser um UUID válido'),
  permission: z.string().min(1, 'Permissão é obrigatória'),
  resource: z.string().optional(),
});

/**
 * DTO de resposta para verificação de permissão
 */
export const permissionCheckResponseDto = z.object({
  hasPermission: z.boolean(),
  permissions: z.array(z.string()),
  roles: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
});

/**
 * DTO para estatísticas de role
 */
export const roleStatsDto = z.object({
  totalRoles: z.number(),
  activeRoles: z.number(),
  inactiveRoles: z.number(),
  totalPermissions: z.number(),
  activePermissions: z.number(),
  mostUsedRoles: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      usersCount: z.number(),
    })
  ),
  recentlyCreated: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      createdAt: z.date(),
    })
  ),
});

// Tipos TypeScript inferidos dos schemas Zod
export type CreateRoleDto = z.infer<typeof createRoleDto>;
export type UpdateRoleDto = z.infer<typeof updateRoleDto>;
export type RoleFiltersDto = z.infer<typeof roleFiltersDto>;
export type CreatePermissionDto = z.infer<typeof createPermissionDto>;
export type UpdatePermissionDto = z.infer<typeof updatePermissionDto>;
export type PermissionFiltersDto = z.infer<typeof permissionFiltersDto>;
export type RoleResponseDto = z.infer<typeof roleResponseDto>;
export type RoleListResponseDto = z.infer<typeof roleListResponseDto>;
export type PermissionResponseDto = z.infer<typeof permissionResponseDto>;
export type PermissionListResponseDto = z.infer<typeof permissionListResponseDto>;
export type AssignRoleDto = z.infer<typeof assignRoleDto>;
export type RemoveRoleDto = z.infer<typeof removeRoleDto>;
export type CheckPermissionDto = z.infer<typeof checkPermissionDto>;
export type PermissionCheckResponseDto = z.infer<typeof permissionCheckResponseDto>;
export type RoleStatsDto = z.infer<typeof roleStatsDto>;