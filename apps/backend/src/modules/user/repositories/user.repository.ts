import { PrismaClient, User, Prisma } from '@prisma/client';
import { prisma } from '../../../database/connection';
import { logger } from '../../../shared/logger/index';
import { CreateUserDto, UpdateUserDto, UserFiltersDto } from '../dtos';

/**
 * Repositório para operações de usuário
 * Implementa o padrão Repository para isolamento da camada de dados
 */
export class UserRepository {
  private db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  /**
   * Cria um novo usuário com roles
   * @param data Dados do usuário
   * @returns Usuário criado
   */
  async create(data: CreateUserDto): Promise<User & {
    company: { id: string; name: string; cnpj: string };
    roles: { id: string; name: string; description: string | null; permissions: string[] }[];
  }> {
    try {
      const user = await this.db.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
          avatar: data.avatar,
          companyId: data.companyId,
          isActive: data.isActive,
          userRoles: {
            create: data.roleIds.map(roleId => ({
              roleId,
            })),
          },
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              cnpj: true,
            },
          },
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Mapear roles com permissões
      const roles = user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
        permissions: ur.role.rolePermissions.map(rp => rp.permission.name),
      }));

      logger.info(`Usuário criado: ${user.name} (${user.email})`);
      return { ...user, roles };
    } catch (error) {
      logger.error('Erro ao criar usuário:', error);
      throw new Error('Falha ao criar usuário');
    }
  }

  /**
   * Busca usuário por ID com relacionamentos
   * @param id ID do usuário
   * @returns Usuário encontrado ou null
   */
  async findById(id: string): Promise<User & {
    company: { id: string; name: string; cnpj: string };
    roles: { id: string; name: string; description: string | null; permissions: string[] }[];
  } | null> {
    try {
      const user = await this.db.user.findUnique({
        where: { id },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              cnpj: true,
            },
          },
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) return null;

      // Mapear roles com permissões
      const roles = user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
        permissions: ur.role.rolePermissions.map(rp => rp.permission.name),
      }));

      return { ...user, roles };
    } catch (error) {
      logger.error('Erro ao buscar usuário por ID:', error);
      throw new Error('Falha ao buscar usuário');
    }
  }

  /**
   * Busca usuário por email
   * @param email Email do usuário
   * @returns Usuário encontrado ou null
   */
  async findByEmail(email: string): Promise<User & {
    company: { id: string; name: string; cnpj: string };
    roles: { id: string; name: string; description: string | null; permissions: string[] }[];
  } | null> {
    try {
      const user = await this.db.user.findUnique({
        where: { email },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              cnpj: true,
            },
          },
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) return null;

      // Mapear roles com permissões
      const roles = user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
        permissions: ur.role.rolePermissions.map(rp => rp.permission.name),
      }));

      return { ...user, roles };
    } catch (error) {
      logger.error('Erro ao buscar usuário por email:', error);
      throw new Error('Falha ao buscar usuário por email');
    }
  }

  /**
   * Lista usuários com filtros e paginação
   * @param filters Filtros de busca
   * @returns Lista paginada de usuários
   */
  async findMany(filters: UserFiltersDto): Promise<{
    data: (User & {
      company: { id: string; name: string; cnpj: string };
      roles: { id: string; name: string; description: string | null; permissions: string[] }[];
    })[];
    total: number;
  }> {
    try {
      const {
        name,
        email,
        companyId,
        roleId,
        isActive,
        page,
        limit,
        sortBy,
        sortOrder,
      } = filters;

      // Construir filtros WHERE
      const where: Prisma.UserWhereInput = {};

      if (name) {
        where.name = {
          contains: name,
          mode: 'insensitive',
        };
      }

      if (email) {
        where.email = {
          contains: email,
          mode: 'insensitive',
        };
      }

      if (companyId) {
        where.companyId = companyId;
      }

      if (roleId) {
        where.userRoles = {
          some: {
            roleId,
          },
        };
      }

      if (typeof isActive === 'boolean') {
        where.isActive = isActive;
      }

      // Configurar ordenação
      const orderBy: Prisma.UserOrderByWithRelationInput = {
        [sortBy]: sortOrder,
      };

      // Calcular offset para paginação
      const skip = (page - 1) * limit;

      // Buscar usuários e total
      const [users, total] = await Promise.all([
        this.db.user.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            company: {
              select: {
                id: true,
                name: true,
                cnpj: true,
              },
            },
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        this.db.user.count({ where }),
      ]);

      // Mapear usuários com roles
      const data = users.map(user => {
        const roles = user.userRoles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
          permissions: ur.role.rolePermissions.map(rp => rp.permission.name),
        }));

        return { ...user, roles };
      });

      return { data, total };
    } catch (error) {
      logger.error('Erro ao listar usuários:', error);
      throw new Error('Falha ao listar usuários');
    }
  }

  /**
   * Atualiza usuário
   * @param id ID do usuário
   * @param data Dados para atualização
   * @returns Usuário atualizado
   */
  async update(id: string, data: UpdateUserDto): Promise<User & {
    company: { id: string; name: string; cnpj: string };
    roles: { id: string; name: string; description: string | null; permissions: string[] }[];
  }> {
    try {
      const updateData: Prisma.UserUpdateInput = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        avatar: data.avatar,
        isActive: data.isActive,
      };

      // Se roleIds foram fornecidos, atualizar relacionamentos
      if (data.roleIds) {
        updateData.userRoles = {
          deleteMany: {},
          create: data.roleIds.map(roleId => ({
            roleId,
          })),
        };
      }

      const user = await this.db.user.update({
        where: { id },
        data: updateData,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              cnpj: true,
            },
          },
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Mapear roles com permissões
      const roles = user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
        permissions: ur.role.rolePermissions.map(rp => rp.permission.name),
      }));

      logger.info(`Usuário atualizado: ${user.name} (${user.email})`);
      return { ...user, roles };
    } catch (error) {
      logger.error('Erro ao atualizar usuário:', error);
      throw new Error('Falha ao atualizar usuário');
    }
  }

  /**
   * Atualiza senha do usuário
   * @param id ID do usuário
   * @param hashedPassword Nova senha hasheada
   * @returns Usuário atualizado
   */
  async updatePassword(id: string, hashedPassword: string): Promise<User> {
    try {
      const user = await this.db.user.update({
        where: { id },
        data: {
          password: hashedPassword,
        },
      });

      logger.info(`Senha atualizada para usuário: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Erro ao atualizar senha:', error);
      throw new Error('Falha ao atualizar senha');
    }
  }

  /**
   * Atualiza último login do usuário
   * @param id ID do usuário
   * @returns Usuário atualizado
   */
  async updateLastLogin(id: string): Promise<User> {
    try {
      const user = await this.db.user.update({
        where: { id },
        data: {
          lastLogin: new Date(),
        },
      });

      return user;
    } catch (error) {
      logger.error('Erro ao atualizar último login:', error);
      throw new Error('Falha ao atualizar último login');
    }
  }

  /**
   * Remove usuário (soft delete)
   * @param id ID do usuário
   * @returns Usuário removido
   */
  async delete(id: string): Promise<User> {
    try {
      const user = await this.db.user.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      logger.info(`Usuário removido: ${user.name} (${user.email})`);
      return user;
    } catch (error) {
      logger.error('Erro ao remover usuário:', error);
      throw new Error('Falha ao remover usuário');
    }
  }

  /**
   * Restaura usuário removido
   * @param id ID do usuário
   * @returns Usuário restaurado
   */
  async restore(id: string): Promise<User> {
    try {
      const user = await this.db.user.update({
        where: { id },
        data: {
          isActive: true,
          deletedAt: null,
        },
      });

      logger.info(`Usuário restaurado: ${user.name} (${user.email})`);
      return user;
    } catch (error) {
      logger.error('Erro ao restaurar usuário:', error);
      throw new Error('Falha ao restaurar usuário');
    }
  }

  /**
   * Verifica se email já existe
   * @param email Email para verificar
   * @param excludeId ID para excluir da verificação (para updates)
   * @returns true se existe, false caso contrário
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    try {
      const where: Prisma.UserWhereInput = { email };
      
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const user = await this.db.user.findFirst({
        where,
        select: { id: true },
      });
      
      return !!user;
    } catch (error) {
      logger.error('Erro ao verificar se email existe:', error);
      throw new Error('Falha ao verificar email');
    }
  }

  /**
   * Busca estatísticas do usuário
   * @param id ID do usuário
   * @returns Estatísticas do usuário
   */
  async getStats(id: string): Promise<{
    totalLogins: number;
    lastLogin: Date | null;
    totalOrders: number;
    totalQuotes: number;
    createdAt: Date;
  }> {
    try {
      const [user, totalOrders, totalQuotes] = await Promise.all([
        this.db.user.findUnique({
          where: { id },
          select: {
            lastLogin: true,
            createdAt: true,
          },
        }),
        this.db.order.count({
          where: {
            createdBy: id,
          },
        }),
        this.db.quote.count({
          where: {
            createdBy: id,
          },
        }),
      ]);

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Para totalLogins, seria necessário implementar um sistema de log de logins
      // Por enquanto, retornamos 0
      const totalLogins = 0;

      return {
        totalLogins,
        lastLogin: user.lastLogin,
        totalOrders,
        totalQuotes,
        createdAt: user.createdAt,
      };
    } catch (error) {
      logger.error('Erro ao buscar estatísticas do usuário:', error);
      throw new Error('Falha ao buscar estatísticas');
    }
  }

  /**
   * Busca usuários por empresa
   * @param companyId ID da empresa
   * @returns Lista de usuários da empresa
   */
  async findByCompany(companyId: string): Promise<(User & {
    roles: { id: string; name: string; description: string | null; permissions: string[] }[];
  })[]> {
    try {
      const users = await this.db.user.findMany({
        where: {
          companyId,
          isActive: true,
        },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Mapear usuários com roles
      return users.map(user => {
        const roles = user.userRoles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
          permissions: ur.role.rolePermissions.map(rp => rp.permission.name),
        }));

        return { ...user, roles };
      });
    } catch (error) {
      logger.error('Erro ao buscar usuários por empresa:', error);
      throw new Error('Falha ao buscar usuários por empresa');
    }
  }
}