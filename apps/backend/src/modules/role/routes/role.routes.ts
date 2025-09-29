import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RoleService } from '../services';
import { 
  CreateRoleDto,
  UpdateRoleDto,
  RoleFiltersDto,
  AssignRoleDto,
  RemoveRoleDto,
  CheckPermissionDto,
  createRoleDto,
  updateRoleDto,
  assignRoleDto,
  removeRoleDto,
  checkPermissionDto
} from '../dtos';
import { requirePermission } from '../../../shared/middlewares/auth';
import { tenantMiddleware } from '../../../shared/middlewares/tenant';
import { createValidation } from '../../../shared/middlewares/validation';
import { AppError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/logger/index';

/**
 * Rotas para o módulo de Role
 * Implementa endpoints CRUD e funcionalidades RBAC
 */
export async function roleRoutes(fastify: FastifyInstance) {
  const roleService = new RoleService(fastify.prisma);

  // Middleware de autenticação para todas as rotas
  
  await fastify.register(tenantMiddleware);

  // ========== ROTAS DE ROLES ==========

  /**
   * Criar nova role
   * POST /roles
   */
  fastify.post<{
    Body: CreateRoleDto;
  }>('/roles', {
    preHandler: [
      requirePermission('role:create'),
      createValidation({ body: createRoleDto })
    ],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'description'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          permissions: {
            type: 'array',
            items: { type: 'string', format: 'uuid' }
          },
          isActive: { type: 'boolean', default: true }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                isActive: { type: 'boolean' },
                companyId: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateRoleDto }>, reply: FastifyReply) => {
    try {
      const { companyId } = request.user as any;
      const roleData = { ...request.body, companyId };
      
      const role = await roleService.create(roleData);
      
      logger.info('Role criada via API');
      
      return reply.status(201).send({
        success: true,
        data: role
      });
    } catch (error) {
      logger.error('Erro ao criar role via API');
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Listar roles com filtros
   * GET /roles
   */
  fastify.get<{
    Querystring: RoleFiltersDto;
  }>('/roles', {
    preHandler: [requirePermission('role:read')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          name: { type: 'string' },
          isActive: { type: 'boolean' },
          sortBy: { type: 'string', enum: ['name', 'createdAt', 'updatedAt'], default: 'name' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  isActive: { type: 'boolean' },
                  companyId: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  _count: {
                    type: 'object',
                    properties: {
                      users: { type: 'integer' },
                      permissions: { type: 'integer' }
                    }
                  }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: RoleFiltersDto }>, reply: FastifyReply) => {
    try {
      const { companyId } = request.user as any;
      const filters = { ...request.query, companyId };
      
      const result = await roleService.findMany(filters);
      
      return reply.send({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      logger.error('Erro ao listar roles via API');
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Buscar role por ID
   * GET /roles/:id
   */
  fastify.get<{
    Params: { id: string };
  }>('/roles/:id', {
    preHandler: [requirePermission('role:read')],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const role = await roleService.findById(id);
      
      return reply.send({
        success: true,
        data: role
      });
    } catch (error) {
      logger.error('Erro ao buscar role por ID via API');
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Atualizar role
   * PUT /roles/:id
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateRoleDto;
  }>('/roles/:id', {
    preHandler: [
      requirePermission('role:update'),
      createValidation({ body: updateRoleDto })
    ],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateRoleDto }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const role = await roleService.update(id, request.body);
      
      logger.info('Role atualizada via API');
      
      return reply.send({
        success: true,
        data: role
      });
    } catch (error) {
      logger.error('Erro ao atualizar role via API');
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Remover role
   * DELETE /roles/:id
   */
  fastify.delete<{
    Params: { id: string };
  }>('/roles/:id', {
    preHandler: [requirePermission('role:delete')],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      await roleService.delete(id);
      
      logger.info('Role removida via API');
      
      return reply.status(204).send();
    } catch (error) {
      logger.error('Erro ao remover role via API');
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Restaurar role
   * PATCH /roles/:id/restore
   */
  fastify.patch<{
    Params: { id: string };
  }>('/roles/:id/restore', {
    preHandler: [requirePermission('role:update')],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const role = await roleService.restore(id);
      
      logger.info('Role restaurada via API');
      
      return reply.send({
        success: true,
        data: role
      });
    } catch (error) {
      logger.error('Erro ao restaurar role via API');
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // ========== ROTAS DE ATRIBUIÇÃO DE ROLES ==========

  /**
   * Atribuir roles a um usuário
   * POST /roles/assign
   */
  fastify.post<{
    Body: AssignRoleDto;
  }>('/roles/assign', {
    preHandler: [
      requirePermission('role:assign'),
      createValidation({ body: assignRoleDto })
    ],
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'roleIds'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          roleIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: AssignRoleDto }>, reply: FastifyReply) => {
    try {
      const { userId, roleIds } = request.body;
      await roleService.assignRolesToUser({ userId, roleIds });
      
      logger.info('Roles atribuídas a usuário via API');
      
      return reply.status(201).send({
        success: true,
        message: 'Roles atribuídas com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao atribuir roles via API');
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Remover roles de um usuário
   * POST /roles/remove
   */
  fastify.post<{
    Body: RemoveRoleDto;
  }>('/roles/remove', {
    preHandler: [
      requirePermission('role:assign'),
      createValidation({ body: removeRoleDto })
    ],
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'roleIds'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          roleIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: RemoveRoleDto }>, reply: FastifyReply) => {
    try {
      const { userId, roleIds } = request.body;
      await roleService.removeRolesFromUser({ userId, roleIds });
      
      logger.info('Roles removidas de usuário via API');
      
      return reply.send({
        success: true,
        message: 'Roles removidas com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao remover roles via API');
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // ========== ROTAS DE VERIFICAÇÃO DE PERMISSÕES ==========

  /**
   * Verificar permissão de usuário
   * POST /roles/check-permission
   */
  fastify.post<{
    Body: CheckPermissionDto;
  }>('/roles/check-permission', {
    preHandler: [createValidation({ body: checkPermissionDto })],
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'resource', 'action'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          resource: { type: 'string' },
          action: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: CheckPermissionDto }>, reply: FastifyReply) => {
    try {
      const { userId, resource, action } = request.body;
      const hasPermission = await roleService.checkPermission({ userId, resource, action });
      
      return reply.send({
        success: true,
        data: {
          hasPermission,
          userId,
          resource,
          action
        }
      });
    } catch (error) {
      logger.error('Erro ao verificar permissão via API');
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Obter permissões de usuário
   * GET /roles/user/:userId/permissions
   */
  fastify.get<{
    Params: { userId: string };
  }>('/roles/user/:userId/permissions', {
    preHandler: [requirePermission('role:read')],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      const permissions = await roleService.getUserPermissions(userId);
      
      return reply.send({
        success: true,
        data: permissions
      });
    } catch (error) {
      logger.error('Erro ao obter permissões de usuário via API');
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Obter roles de usuário
   * GET /roles/user/:userId/roles
   */
  fastify.get<{
    Params: { userId: string };
  }>('/roles/user/:userId/roles', {
    preHandler: [requirePermission('role:read')],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      const roles = await roleService.getUserRoles(userId);
      
      return reply.send({
        success: true,
        data: roles
      });
    } catch (error) {
      logger.error('Erro ao obter roles de usuário via API');
      
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  // ========== ROTAS DE ESTATÍSTICAS ==========

  /**
   * Obter estatísticas de roles
   * GET /roles/stats
   */
  fastify.get('/roles/stats', {
    preHandler: [requirePermission('role:read')],
    schema: {
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user as any;
      const stats = await roleService.getStats(companyId);
      
      return reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas de roles via API');
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });
}
