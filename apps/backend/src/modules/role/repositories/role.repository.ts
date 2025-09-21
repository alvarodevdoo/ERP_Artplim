import { PrismaClient, Role, Permission, Prisma } from '@prisma/client';
import { RoleFiltersDto, PermissionFiltersDto } from '../dtos';

/**
 * Repositório para operações de Role e Permission
 * Implementa padrão Repository para isolamento da camada de dados
 */
export class RoleRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Cria uma nova role
   */
  async create(data: {
    name: string;
    description?: string | null;
    companyId: string;
    permissionIds: string[];
    isActive?: boolean;
  }): Promise<Role & { permissions: Permission[]; company: { id: string; name: string; document: string } }> {
    const { permissionIds, ...roleData } = data;

    return this.prisma.role.create({
      data: {
        ...roleData,
        permissions: {
          connect: permissionIds.map(id => ({ id })),
        },
      },
      include: {
        permissions: true,
        company: {
          select: {
            id: true,
            name: true,
            document: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  /**
   * Busca role por ID
   */
  async findById(id: string): Promise<Role & { 
    permissions: Permission[]; 
    company: { id: string; name: string; document: string };
    _count: { users: number };
  } | null> {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
        company: {
          select: {
            id: true,
            name: true,
            document: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
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
  }> {
    const { page, limit, sortBy, sortOrder, ...searchFilters } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.RoleWhereInput = {
      ...(searchFilters.name && {
        name: {
          contains: searchFilters.name,
          mode: 'insensitive',
        },
      }),
      ...(searchFilters.companyId && {
        companyId: searchFilters.companyId,
      }),
      ...(searchFilters.permissionId && {
        permissions: {
          some: {
            id: searchFilters.permissionId,
          },
        },
      }),
      ...(searchFilters.isActive !== undefined && {
        isActive: searchFilters.isActive,
      }),
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        include: {
          permissions: true,
          company: {
            select: {
              id: true,
              name: true,
              document: true,
            },
          },
          _count: {
            select: {
              users: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.role.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Atualiza uma role
   */
  async update(id: string, data: {
    name?: string;
    description?: string | null;
    permissionIds?: string[];
    isActive?: boolean;
  }): Promise<Role & { permissions: Permission[]; company: { id: string; name: string; document: string } }> {
    const { permissionIds, ...updateData } = data;

    return this.prisma.role.update({
      where: { id },
      data: {
        ...updateData,
        ...(permissionIds && {
          permissions: {
            set: permissionIds.map(permissionId => ({ id: permissionId })),
          },
        }),
      },
      include: {
        permissions: true,
        company: {
          select: {
            id: true,
            name: true,
            document: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  /**
   * Remove uma role (soft delete)
   */
  async delete(id: string): Promise<Role> {
    return this.prisma.role.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Restaura uma role removida
   */
  async restore(id: string): Promise<Role> {
    return this.prisma.role.update({
      where: { id },
      data: {
        deletedAt: null,
        isActive: true,
      },
    });
  }

  /**
   * Verifica se nome da role já existe na empresa
   */
  async nameExists(name: string, companyId: string, excludeId?: string): Promise<boolean> {
    const role = await this.prisma.role.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        companyId,
        deletedAt: null,
        ...(excludeId && {
          id: {
            not: excludeId,
          },
        }),
      },
    });

    return !!role;
  }

  /**
   * Busca roles por empresa
   */
  async findByCompany(companyId: string): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: {
        companyId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        permissions: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Atribui roles a um usuário
   */
  async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          connect: roleIds.map(id => ({ id })),
        },
      },
    });
  }

  /**
   * Remove roles de um usuário
   */
  async removeRolesFromUser(userId: string, roleIds: string[]): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          disconnect: roleIds.map(id => ({ id })),
        },
      },
    });
  }

  /**
   * Busca permissões do usuário através das roles
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          include: {
            permissions: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!user) return [];

    // Coleta todas as permissões únicas das roles do usuário
    const permissions = new Map<string, Permission>();
    
    user.roles.forEach(role => {
      role.permissions.forEach(permission => {
        permissions.set(permission.id, permission);
      });
    });

    return Array.from(permissions.values());
  }

  /**
   * Verifica se usuário tem permissão específica
   */
  async userHasPermission(userId: string, permission: string, resource?: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    
    return userPermissions.some(p => {
      if (resource) {
        return p.action === permission && p.resource === resource;
      }
      return p.action === permission || p.name === permission;
    });
  }

  /**
   * Busca roles do usuário
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          include: {
            permissions: true,
          },
        },
      },
    });

    return user?.roles || [];
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
    const whereRole: Prisma.RoleWhereInput = {
      deletedAt: null,
      ...(companyId && { companyId }),
    };

    const wherePermission: Prisma.PermissionWhereInput = {};

    const [totalRoles, activeRoles, inactiveRoles, totalPermissions, activePermissions, mostUsedRoles, recentlyCreated] = await Promise.all([
      this.prisma.role.count({ where: whereRole }),
      this.prisma.role.count({ where: { ...whereRole, isActive: true } }),
      this.prisma.role.count({ where: { ...whereRole, isActive: false } }),
      this.prisma.permission.count({ where: wherePermission }),
      this.prisma.permission.count({ where: { ...wherePermission, isActive: true } }),
      this.prisma.role.findMany({
        where: whereRole,
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: {
          users: {
            _count: 'desc',
          },
        },
        take: 5,
      }),
      this.prisma.role.findMany({
        where: whereRole,
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }),
    ]);

    return {
      totalRoles,
      activeRoles,
      inactiveRoles,
      totalPermissions,
      activePermissions,
      mostUsedRoles: mostUsedRoles.map(role => ({
        id: role.id,
        name: role.name,
        usersCount: role._count.users,
      })),
      recentlyCreated,
    };
  }
}