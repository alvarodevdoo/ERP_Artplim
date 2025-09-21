import { PrismaClient, Permission } from '@prisma/client';
import { PermissionRepository } from '../repositories';
import { 
  CreatePermissionDto, 
  UpdatePermissionDto, 
  PermissionFiltersDto 
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/logger/index';

/**
 * Service para operações de Permission
 * Implementa regras de negócio e validações para permissões do sistema RBAC
 */
export class PermissionService {
  private permissionRepository: PermissionRepository;

  constructor(private prisma: PrismaClient) {
    this.permissionRepository = new PermissionRepository(prisma);
  }

  /**
   * Cria uma nova permissão
   */
  async create(data: CreatePermissionDto): Promise<Permission> {
    try {
      // Verifica se a combinação resource + action já existe
      const exists = await this.permissionRepository.exists(data.resource, data.action);
      if (exists) {
        throw new AppError(`Já existe uma permissão para o recurso '${data.resource}' com a ação '${data.action}'`, 400);
      }

      const permission = await this.permissionRepository.create(data);

      logger.info('Permissão criada com sucesso', {
        permissionId: permission.id,
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
      });

      return permission;
    } catch (error) {
      logger.error('Erro ao criar permissão', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        data,
      });
      throw error;
    }
  }

  /**
   * Busca permissão por ID
   */
  async findById(id: string): Promise<Permission & { _count: { roles: number } }> {
    const permission = await this.permissionRepository.findById(id);
    
    if (!permission) {
      throw new AppError('Permissão não encontrada', 404);
    }

    return permission;
  }

  /**
   * Busca permissões com filtros e paginação
   */
  async findMany(filters: PermissionFiltersDto): Promise<{
    data: (Permission & { _count: { roles: number } })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.permissionRepository.findMany(filters);
    
    return {
      ...result,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(result.total / filters.limit),
    };
  }

  /**
   * Atualiza uma permissão
   */
  async update(id: string, data: UpdatePermissionDto): Promise<Permission> {
    try {
      const existingPermission = await this.permissionRepository.findById(id);
      if (!existingPermission) {
        throw new AppError('Permissão não encontrada', 404);
      }

      // Verifica se a nova combinação resource + action já existe (excluindo a permissão atual)
      if (data.resource || data.action) {
        const resource = data.resource || existingPermission.resource;
        const action = data.action || existingPermission.action;
        
        const exists = await this.permissionRepository.exists(resource, action, id);
        if (exists) {
          throw new AppError(`Já existe uma permissão para o recurso '${resource}' com a ação '${action}'`, 400);
        }
      }

      const permission = await this.permissionRepository.update(id, data);

      logger.info('Permissão atualizada com sucesso', {
        permissionId: permission.id,
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        updatedFields: Object.keys(data),
      });

      return permission;
    } catch (error) {
      logger.error('Erro ao atualizar permissão', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        permissionId: id,
        data,
      });
      throw error;
    }
  }

  /**
   * Remove uma permissão
   */
  async delete(id: string): Promise<void> {
    try {
      const permission = await this.permissionRepository.findById(id);
      if (!permission) {
        throw new AppError('Permissão não encontrada', 404);
      }

      // Verifica se a permissão está sendo usada por roles
      if (permission._count.roles > 0) {
        throw new AppError('Não é possível excluir uma permissão que está sendo usada por roles', 400);
      }

      await this.permissionRepository.delete(id);

      logger.info('Permissão removida com sucesso', {
        permissionId: id,
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
      });
    } catch (error) {
      logger.error('Erro ao remover permissão', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        permissionId: id,
      });
      throw error;
    }
  }

  /**
   * Busca todas as permissões ativas
   */
  async findAllActive(): Promise<Permission[]> {
    return this.permissionRepository.findAllActive();
  }

  /**
   * Busca permissões por recurso
   */
  async findByResource(resource: string): Promise<Permission[]> {
    return this.permissionRepository.findByResource(resource);
  }

  /**
   * Busca permissões por ação
   */
  async findByAction(action: string): Promise<Permission[]> {
    return this.permissionRepository.findByAction(action);
  }

  /**
   * Obtém recursos únicos
   */
  async getUniqueResources(): Promise<string[]> {
    return this.permissionRepository.getUniqueResources();
  }

  /**
   * Obtém ações únicas
   */
  async getUniqueActions(): Promise<string[]> {
    return this.permissionRepository.getUniqueActions();
  }

  /**
   * Cria permissões padrão do sistema
   */
  async createDefaultPermissions(): Promise<Permission[]> {
    try {
      const createdPermissions = await this.permissionRepository.createDefaultPermissions();

      logger.info('Permissões padrão criadas com sucesso', {
        count: createdPermissions.length,
        permissions: createdPermissions.map(p => `${p.resource}:${p.action}`),
      });

      return createdPermissions;
    } catch (error) {
      logger.error('Erro ao criar permissões padrão', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  /**
   * Valida se uma lista de IDs de permissões existe e está ativa
   */
  async validatePermissionIds(permissionIds: string[]): Promise<{
    valid: boolean;
    invalidIds: string[];
    permissions: Permission[];
  }> {
    try {
      const permissions = await this.permissionRepository.findByIds(permissionIds);
      const foundIds = permissions.map(p => p.id);
      const invalidIds = permissionIds.filter(id => !foundIds.includes(id));

      return {
        valid: invalidIds.length === 0,
        invalidIds,
        permissions,
      };
    } catch (error) {
      logger.error('Erro ao validar IDs de permissões', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        permissionIds,
      });
      throw error;
    }
  }

  /**
   * Busca permissões agrupadas por recurso
   */
  async findGroupedByResource(): Promise<Record<string, Permission[]>> {
    try {
      const permissions = await this.permissionRepository.findAllActive();
      
      const grouped = permissions.reduce((acc, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = [];
        }
        acc[permission.resource].push(permission);
        return acc;
      }, {} as Record<string, Permission[]>);

      // Ordena as permissões dentro de cada recurso por ação
      Object.keys(grouped).forEach(resource => {
        grouped[resource].sort((a, b) => a.action.localeCompare(b.action));
      });

      return grouped;
    } catch (error) {
      logger.error('Erro ao buscar permissões agrupadas por recurso', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  /**
   * Busca permissões com base em um padrão de nome
   */
  async searchByName(searchTerm: string): Promise<Permission[]> {
    try {
      const filters: PermissionFiltersDto = {
        name: searchTerm,
        page: 1,
        limit: 100,
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const result = await this.permissionRepository.findMany(filters);
      return result.data;
    } catch (error) {
      logger.error('Erro ao buscar permissões por nome', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        searchTerm,
      });
      throw error;
    }
  }

  /**
   * Verifica se uma permissão pode ser removida
   */
  async canDelete(id: string): Promise<{
    canDelete: boolean;
    reason?: string;
    rolesCount: number;
  }> {
    try {
      const permission = await this.permissionRepository.findById(id);
      
      if (!permission) {
        return {
          canDelete: false,
          reason: 'Permissão não encontrada',
          rolesCount: 0,
        };
      }

      const canDelete = permission._count.roles === 0;
      
      return {
        canDelete,
        reason: canDelete ? undefined : 'Permissão está sendo usada por uma ou mais roles',
        rolesCount: permission._count.roles,
      };
    } catch (error) {
      logger.error('Erro ao verificar se permissão pode ser removida', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        permissionId: id,
      });
      throw error;
    }
  }

  /**
   * Obtém estatísticas de permissões
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byResource: Record<string, number>;
    byAction: Record<string, number>;
    mostUsed: { id: string; name: string; resource: string; action: string; rolesCount: number }[];
  }> {
    try {
      const [allPermissions, activePermissions] = await Promise.all([
        this.permissionRepository.findMany({ page: 1, limit: 1000, sortBy: 'name', sortOrder: 'asc' }),
        this.permissionRepository.findAllActive(),
      ]);

      const total = allPermissions.total;
      const active = activePermissions.length;
      const inactive = total - active;

      // Agrupa por recurso
      const byResource = activePermissions.reduce((acc, permission) => {
        acc[permission.resource] = (acc[permission.resource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Agrupa por ação
      const byAction = activePermissions.reduce((acc, permission) => {
        acc[permission.action] = (acc[permission.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Permissões mais usadas (com mais roles)
      const mostUsed = allPermissions.data
        .sort((a, b) => b._count.roles - a._count.roles)
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          name: p.name,
          resource: p.resource,
          action: p.action,
          rolesCount: p._count.roles,
        }));

      return {
        total,
        active,
        inactive,
        byResource,
        byAction,
        mostUsed,
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de permissões', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }
}