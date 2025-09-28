import { PrismaClient, Role, Permission } from '@prisma/client';
import { RoleRepository, PermissionRepository } from '../repositories';
import { 
  CreateRoleDto, 
  UpdateRoleDto, 
  RoleFiltersDto, 
  AssignRoleDto, 
  RemoveRoleDto, 
  CheckPermissionDto 
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/logger/index';

/**
 * Service para operações de Role
 * Implementa regras de negócio e validações para o sistema RBAC
 */
export class RoleService {
  private roleRepository: RoleRepository;
  private permissionRepository: PermissionRepository;

  constructor(private prisma: PrismaClient) {
    this.roleRepository = new RoleRepository(prisma);
    this.permissionRepository = new PermissionRepository(prisma);
  }

  /**
   * Cria uma nova role
   */
  async create(data: CreateRoleDto): Promise<Role & { 
    permissions: Permission[]; 
    company: { id: string; name: string; document: string };
    _count: { users: number };
  }> {
    try {
      // Verifica se o nome da role já existe na empresa
      const nameExists = await this.roleRepository.nameExists(data.name, data.companyId);
      if (nameExists) {
        throw new AppError('Já existe uma role com este nome nesta empresa', 400);
      }

      // Verifica se todas as permissões existem e estão ativas
      const permissions = await this.permissionRepository.findByIds(data.permissionIds);
      if (permissions.length !== data.permissionIds.length) {
        throw new AppError('Uma ou mais permissões não foram encontradas ou estão inativas', 400);
      }

      const role = await this.roleRepository.create(data);

      logger.info('Role criada com sucesso', {
        roleId: role.id,
        roleName: role.name,
        companyId: role.companyId,
        permissionsCount: permissions.length,
      });

      return role;
    } catch (error) {
      logger.error('Erro ao criar role', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        data,
      });
      throw error;
    }
  }

  /**
   * Busca role por ID
   */
  async findById(id: string): Promise<Role & { 
    permissions: Permission[]; 
    company: { id: string; name: string; document: string };
    _count: { users: number };
  }> {
    const role = await this.roleRepository.findById(id);
    
    if (!role) {
      throw new AppError('Role não encontrada', 404);
    }

    return role;
  }

  /**
   * Busca roles com filtros e paginação
   */
  async findMany(filters: RoleFiltersDto): Promise<{
    data: (Role & { 
      permissions: Permission[]; 
      company: { id: string; name: string; document: string };
      _count: { users: number };
    })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.roleRepository.findMany(filters);
    
    return {
      ...result,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(result.total / filters.limit),
    };
  }

  /**
   * Atualiza uma role
   */
  async update(id: string, data: UpdateRoleDto): Promise<Role & { 
    permissions: Permission[]; 
    company: { id: string; name: string; document: string };
  }> {
    try {
      const existingRole = await this.roleRepository.findById(id);
      if (!existingRole) {
        throw new AppError('Role não encontrada', 404);
      }

      // Verifica se o nome da role já existe na empresa (excluindo a role atual)
      if (data.name) {
        const nameExists = await this.roleRepository.nameExists(
          data.name, 
          existingRole.companyId, 
          id
        );
        if (nameExists) {
          throw new AppError('Já existe uma role com este nome nesta empresa', 400);
        }
      }

      // Verifica se todas as permissões existem e estão ativas
      if (data.permissionIds) {
        const permissions = await this.permissionRepository.findByIds(data.permissionIds);
        if (permissions.length !== data.permissionIds.length) {
          throw new AppError('Uma ou mais permissões não foram encontradas ou estão inativas', 400);
        }
      }

      const role = await this.roleRepository.update(id, data);

      logger.info('Role atualizada com sucesso', {
        roleId: role.id,
        roleName: role.name,
        companyId: role.companyId,
        updatedFields: Object.keys(data),
      });

      return role;
    } catch (error) {
      logger.error('Erro ao atualizar role', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        roleId: id,
        data,
      });
      throw error;
    }
  }

  /**
   * Remove uma role (soft delete)
   */
  async delete(id: string): Promise<void> {
    try {
      const role = await this.roleRepository.findById(id);
      if (!role) {
        throw new AppError('Role não encontrada', 404);
      }

      // Verifica se a role está sendo usada por usuários
      if (role._count.users > 0) {
        throw new AppError('Não é possível excluir uma role que está sendo usada por usuários', 400);
      }

      await this.roleRepository.delete(id);

      logger.info('Role removida com sucesso', {
        roleId: id,
        roleName: role.name,
        companyId: role.companyId,
      });
    } catch (error) {
      logger.error('Erro ao remover role', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        roleId: id,
      });
      throw error;
    }
  }

  /**
   * Restaura uma role removida
   */
  async restore(id: string): Promise<Role> {
    try {
      const role = await this.roleRepository.restore(id);

      logger.info('Role restaurada com sucesso', {
        roleId: role.id,
        roleName: role.name,
        companyId: role.companyId,
      });

      return role;
    } catch (error) {
      logger.error('Erro ao restaurar role', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        roleId: id,
      });
      throw error;
    }
  }

  /**
   * Busca roles por empresa
   */
  async findByCompany(companyId: string): Promise<Role[]> {
    return this.roleRepository.findByCompany(companyId);
  }

  /**
   * Atribui roles a um usuário
   */
  async assignRolesToUser(data: AssignRoleDto): Promise<void> {
    try {
      // Verifica se o usuário existe
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        include: { roles: true },
      });

      if (!user) {
        throw new AppError('Usuário não encontrado', 404);
      }

      // Verifica se todas as roles existem e estão ativas
      const roles = await Promise.all(
        data.roleIds.map(roleId => this.roleRepository.findById(roleId))
      );

      const invalidRoles = roles.filter(role => !role || !role.isActive);
      if (invalidRoles.length > 0) {
        throw new AppError('Uma ou mais roles não foram encontradas ou estão inativas', 400);
      }

      // Verifica se as roles pertencem à mesma empresa do usuário
      const differentCompanyRoles = roles.filter(role => role && role.companyId !== user.companyId);
      if (differentCompanyRoles.length > 0) {
        throw new AppError('Não é possível atribuir roles de outras empresas ao usuário', 400);
      }

      await this.roleRepository.assignRolesToUser(data.userId, data.roleIds);

      logger.info('Roles atribuídas ao usuário com sucesso', {
        userId: data.userId,
        roleIds: data.roleIds,
        companyId: user.companyId,
      });
    } catch (error) {
      logger.error('Erro ao atribuir roles ao usuário', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        data,
      });
      throw error;
    }
  }

  /**
   * Remove roles de um usuário
   */
  async removeRolesFromUser(data: RemoveRoleDto): Promise<void> {
    try {
      // Verifica se o usuário existe
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        include: { roles: true },
      });

      if (!user) {
        throw new AppError('Usuário não encontrado', 404);
      }

      // Verifica se o usuário possui as roles que estão sendo removidas
      const userRoleIds = user.roles.map(role => role.id);
      const rolesToRemove = data.roleIds.filter(roleId => userRoleIds.includes(roleId));

      if (rolesToRemove.length === 0) {
        throw new AppError('Nenhuma das roles especificadas está atribuída ao usuário', 400);
      }

      await this.roleRepository.removeRolesFromUser(data.userId, rolesToRemove);

      logger.info('Roles removidas do usuário com sucesso', {
        userId: data.userId,
        roleIds: rolesToRemove,
        companyId: user.companyId,
      });
    } catch (error) {
      logger.error('Erro ao remover roles do usuário', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        data,
      });
      throw error;
    }
  }

  /**
   * Verifica se usuário tem permissão específica
   */
  async checkPermission(data: CheckPermissionDto): Promise<{
    hasPermission: boolean;
    permissions: string[];
    roles: { id: string; name: string }[];
  }> {
    try {
      const hasPermission = await this.roleRepository.userHasPermission(
        data.userId, 
        data.permission, 
        data.resource
      );

      const userPermissions = await this.roleRepository.getUserPermissions(data.userId);
      const userRoles = await this.roleRepository.getUserRoles(data.userId);

      return {
        hasPermission,
        permissions: userPermissions.map(p => `${p.resource}:${p.action}`),
        roles: userRoles.map(r => ({ id: r.id, name: r.name })),
      };
    } catch (error) {
      logger.error('Erro ao verificar permissão do usuário', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        data,
      });
      throw error;
    }
  }

  /**
   * Busca permissões do usuário
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    return this.roleRepository.getUserPermissions(userId);
  }

  /**
   * Busca roles do usuário
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    return this.roleRepository.getUserRoles(userId);
  }

  /**
   * Obtém estatísticas de roles
   */
  async getStats(companyId?: string): Promise<{
    totalRoles: number;
    activeRoles: number;
    inactiveRoles: number;
    totalPermissions: number;
    activePermissions: number;
    mostUsedRoles: { id: string; name: string; usersCount: number }[];
    recentlyCreated: { id: string; name: string; createdAt: Date }[];
  }> {
    return this.roleRepository.getStats(companyId);
  }

  /**
   * Cria role de administrador padrão para uma empresa
   */
  async createDefaultAdminRole(companyId: string): Promise<Role> {
    try {
      // Busca todas as permissões ativas
      const allPermissions = await this.permissionRepository.findAllActive();
      
      if (allPermissions.length === 0) {
        throw new AppError('Nenhuma permissão encontrada no sistema', 400);
      }

      // Verifica se já existe uma role de administrador para esta empresa
      const existingAdminRole = await this.roleRepository.nameExists('Administrador', companyId);
      if (existingAdminRole) {
        throw new AppError('Já existe uma role de Administrador para esta empresa', 400);
      }

      const adminRoleData: CreateRoleDto = {
        name: 'Administrador',
        description: 'Role com acesso total ao sistema',
        companyId,
        permissionIds: allPermissions.map(p => p.id),
        isActive: true,
      };

      const adminRole = await this.roleRepository.create(adminRoleData);

      logger.info('Role de administrador criada com sucesso', {
        roleId: adminRole.id,
        companyId,
        permissionsCount: allPermissions.length,
      });

      return adminRole;
    } catch (error) {
      logger.error('Erro ao criar role de administrador padrão', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        companyId,
      });
      throw error;
    }
  }

  /**
   * Cria role de usuário padrão para uma empresa
   */
  async createDefaultUserRole(companyId: string): Promise<Role> {
    try {
      // Busca permissões básicas para usuário comum
      const basicPermissions = await this.prisma.permission.findMany({
        where: {
          OR: [
            { resource: 'dashboard', action: 'read' },
            { resource: 'user', action: 'read' },
            { resource: 'product', action: 'read' },
            { resource: 'quote', action: 'read' },
            { resource: 'order', action: 'read' },
            { resource: 'stock', action: 'read' },
          ],
          isActive: true,
        },
      });

      // Verifica se já existe uma role de usuário para esta empresa
      const existingUserRole = await this.roleRepository.nameExists('Usuário', companyId);
      if (existingUserRole) {
        throw new AppError('Já existe uma role de Usuário para esta empresa', 400);
      }

      const userRoleData: CreateRoleDto = {
        name: 'Usuário',
        description: 'Role com permissões básicas do sistema',
        companyId,
        permissionIds: basicPermissions.map(p => p.id),
        isActive: true,
      };

      const userRole = await this.roleRepository.create(userRoleData);

      logger.info('Role de usuário criada com sucesso', {
        roleId: userRole.id,
        companyId,
        permissionsCount: basicPermissions.length,
      });

      return userRole;
    } catch (error) {
      logger.error('Erro ao criar role de usuário padrão', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        companyId,
      });
      throw error;
    }
  }
}