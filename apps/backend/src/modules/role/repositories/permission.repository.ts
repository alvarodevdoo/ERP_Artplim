import { PrismaClient, Permission, Prisma } from '@prisma/client';
import { PermissionFiltersDto } from '../dtos';

/**
 * Repositório para operações de Permission
 * Implementa padrão Repository para isolamento da camada de dados
 */
export class PermissionRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Cria uma nova permissão
   */
  async create(data: {
    name: string;
    description?: string | null;
    resource: string;
    action: string;
    isActive?: boolean;
  }): Promise<Permission> {
    return this.prisma.permission.create({
      data,
    });
  }

  /**
   * Busca permissão por ID
   */
  async findById(id: string): Promise<Permission & { _count: { roles: number } } | null> {
    return this.prisma.permission.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            roles: true,
          },
        },
      },
    });
  }

  /**
   * Busca permissões com filtros e paginação
   */
  async findMany(filters: PermissionFiltersDto): Promise<{
    data: (Permission & { _count: { roles: number } })[];
    total: number;
  }> {
    const { page, limit, sortBy, sortOrder, ...searchFilters } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PermissionWhereInput = {
      ...(searchFilters.name && {
        name: {
          contains: searchFilters.name,
          mode: 'insensitive',
        },
      }),
      ...(searchFilters.resource && {
        resource: {
          contains: searchFilters.resource,
          mode: 'insensitive',
        },
      }),
      ...(searchFilters.action && {
        action: searchFilters.action,
      }),
      ...(searchFilters.isActive !== undefined && {
        isActive: searchFilters.isActive,
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        include: {
          _count: {
            select: {
              roles: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.permission.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Atualiza uma permissão
   */
  async update(id: string, data: {
    name?: string;
    description?: string | null;
    resource?: string;
    action?: string;
    isActive?: boolean;
  }): Promise<Permission> {
    return this.prisma.permission.update({
      where: { id },
      data,
    });
  }

  /**
   * Remove uma permissão
   */
  async delete(id: string): Promise<Permission> {
    return this.prisma.permission.delete({
      where: { id },
    });
  }

  /**
   * Verifica se permissão já existe
   */
  async exists(resource: string, action: string, excludeId?: string): Promise<boolean> {
    const permission = await this.prisma.permission.findFirst({
      where: {
        resource: {
          equals: resource,
          mode: 'insensitive',
        },
        action,
        ...(excludeId && {
          id: {
            not: excludeId,
          },
        }),
      },
    });

    return !!permission;
  }

  /**
   * Busca todas as permissões ativas
   */
  async findAllActive(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  /**
   * Busca permissões por recurso
   */
  async findByResource(resource: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: {
        resource: {
          equals: resource,
          mode: 'insensitive',
        },
        isActive: true,
      },
      orderBy: {
        action: 'asc',
      },
    });
  }

  /**
   * Busca permissões por ação
   */
  async findByAction(action: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: {
        action,
        isActive: true,
      },
      orderBy: {
        resource: 'asc',
      },
    });
  }

  /**
   * Busca permissões por IDs
   */
  async findByIds(ids: string[]): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: {
        id: {
          in: ids,
        },
        isActive: true,
      },
    });
  }

  /**
   * Obtém recursos únicos
   */
  async getUniqueResources(): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      where: {
        isActive: true,
      },
      select: {
        resource: true,
      },
      distinct: ['resource'],
      orderBy: {
        resource: 'asc',
      },
    });

    return permissions.map(p => p.resource);
  }

  /**
   * Obtém ações únicas
   */
  async getUniqueActions(): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      where: {
        isActive: true,
      },
      select: {
        action: true,
      },
      distinct: ['action'],
      orderBy: {
        action: 'asc',
      },
    });

    return permissions.map(p => p.action);
  }

  /**
   * Cria permissões padrão do sistema
   */
  async createDefaultPermissions(): Promise<Permission[]> {
    const defaultPermissions = [
      // Permissões de Company
      { name: 'Criar Empresa', resource: 'company', action: 'create', description: 'Permite criar novas empresas' },
      { name: 'Visualizar Empresa', resource: 'company', action: 'read', description: 'Permite visualizar dados da empresa' },
      { name: 'Editar Empresa', resource: 'company', action: 'update', description: 'Permite editar dados da empresa' },
      { name: 'Excluir Empresa', resource: 'company', action: 'delete', description: 'Permite excluir empresa' },
      { name: 'Gerenciar Empresa', resource: 'company', action: 'manage', description: 'Acesso total à empresa' },

      // Permissões de User
      { name: 'Criar Usuário', resource: 'user', action: 'create', description: 'Permite criar novos usuários' },
      { name: 'Visualizar Usuário', resource: 'user', action: 'read', description: 'Permite visualizar usuários' },
      { name: 'Editar Usuário', resource: 'user', action: 'update', description: 'Permite editar usuários' },
      { name: 'Excluir Usuário', resource: 'user', action: 'delete', description: 'Permite excluir usuários' },
      { name: 'Gerenciar Usuário', resource: 'user', action: 'manage', description: 'Acesso total aos usuários' },

      // Permissões de Role
      { name: 'Criar Role', resource: 'role', action: 'create', description: 'Permite criar novas roles' },
      { name: 'Visualizar Role', resource: 'role', action: 'read', description: 'Permite visualizar roles' },
      { name: 'Editar Role', resource: 'role', action: 'update', description: 'Permite editar roles' },
      { name: 'Excluir Role', resource: 'role', action: 'delete', description: 'Permite excluir roles' },
      { name: 'Gerenciar Role', resource: 'role', action: 'manage', description: 'Acesso total às roles' },

      // Permissões de Permission
      { name: 'Criar Permissão', resource: 'permission', action: 'create', description: 'Permite criar novas permissões' },
      { name: 'Visualizar Permissão', resource: 'permission', action: 'read', description: 'Permite visualizar permissões' },
      { name: 'Editar Permissão', resource: 'permission', action: 'update', description: 'Permite editar permissões' },
      { name: 'Excluir Permissão', resource: 'permission', action: 'delete', description: 'Permite excluir permissões' },
      { name: 'Gerenciar Permissão', resource: 'permission', action: 'manage', description: 'Acesso total às permissões' },

      // Permissões de Product
      { name: 'Criar Produto', resource: 'product', action: 'create', description: 'Permite criar novos produtos' },
      { name: 'Visualizar Produto', resource: 'product', action: 'read', description: 'Permite visualizar produtos' },
      { name: 'Editar Produto', resource: 'product', action: 'update', description: 'Permite editar produtos' },
      { name: 'Excluir Produto', resource: 'product', action: 'delete', description: 'Permite excluir produtos' },
      { name: 'Gerenciar Produto', resource: 'product', action: 'manage', description: 'Acesso total aos produtos' },

      // Permissões de Quote
      { name: 'Criar Orçamento', resource: 'quote', action: 'create', description: 'Permite criar novos orçamentos' },
      { name: 'Visualizar Orçamento', resource: 'quote', action: 'read', description: 'Permite visualizar orçamentos' },
      { name: 'Editar Orçamento', resource: 'quote', action: 'update', description: 'Permite editar orçamentos' },
      { name: 'Excluir Orçamento', resource: 'quote', action: 'delete', description: 'Permite excluir orçamentos' },
      { name: 'Gerenciar Orçamento', resource: 'quote', action: 'manage', description: 'Acesso total aos orçamentos' },

      // Permissões de Order
      { name: 'Criar Ordem de Serviço', resource: 'order', action: 'create', description: 'Permite criar novas ordens de serviço' },
      { name: 'Visualizar Ordem de Serviço', resource: 'order', action: 'read', description: 'Permite visualizar ordens de serviço' },
      { name: 'Editar Ordem de Serviço', resource: 'order', action: 'update', description: 'Permite editar ordens de serviço' },
      { name: 'Excluir Ordem de Serviço', resource: 'order', action: 'delete', description: 'Permite excluir ordens de serviço' },
      { name: 'Gerenciar Ordem de Serviço', resource: 'order', action: 'manage', description: 'Acesso total às ordens de serviço' },

      // Permissões de Stock
      { name: 'Criar Estoque', resource: 'stock', action: 'create', description: 'Permite criar movimentações de estoque' },
      { name: 'Visualizar Estoque', resource: 'stock', action: 'read', description: 'Permite visualizar estoque' },
      { name: 'Editar Estoque', resource: 'stock', action: 'update', description: 'Permite editar estoque' },
      { name: 'Excluir Estoque', resource: 'stock', action: 'delete', description: 'Permite excluir movimentações de estoque' },
      { name: 'Gerenciar Estoque', resource: 'stock', action: 'manage', description: 'Acesso total ao estoque' },

      // Permissões de Financial
      { name: 'Criar Financeiro', resource: 'financial', action: 'create', description: 'Permite criar registros financeiros' },
      { name: 'Visualizar Financeiro', resource: 'financial', action: 'read', description: 'Permite visualizar dados financeiros' },
      { name: 'Editar Financeiro', resource: 'financial', action: 'update', description: 'Permite editar dados financeiros' },
      { name: 'Excluir Financeiro', resource: 'financial', action: 'delete', description: 'Permite excluir registros financeiros' },
      { name: 'Gerenciar Financeiro', resource: 'financial', action: 'manage', description: 'Acesso total ao financeiro' },

      // Permissões de Dashboard
      { name: 'Visualizar Dashboard', resource: 'dashboard', action: 'read', description: 'Permite visualizar dashboard' },
      { name: 'Gerenciar Dashboard', resource: 'dashboard', action: 'manage', description: 'Acesso total ao dashboard' },

      // Permissões de Reports
      { name: 'Visualizar Relatórios', resource: 'reports', action: 'read', description: 'Permite visualizar relatórios' },
      { name: 'Criar Relatórios', resource: 'reports', action: 'create', description: 'Permite criar relatórios' },
      { name: 'Gerenciar Relatórios', resource: 'reports', action: 'manage', description: 'Acesso total aos relatórios' },
    ];

    const createdPermissions: Permission[] = [];

    for (const permissionData of defaultPermissions) {
      const exists = await this.exists(permissionData.resource, permissionData.action);
      
      if (!exists) {
        const permission = await this.create(permissionData);
        createdPermissions.push(permission);
      }
    }

    return createdPermissions;
  }
}