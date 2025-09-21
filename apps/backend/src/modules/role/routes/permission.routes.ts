import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PermissionService } from '../services';
import { 
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionFiltersDto,
  createPermissionDto,
  updatePermissionDto,
  permissionFiltersDto
} from '../dtos';
import { authMiddleware } from '../../../shared/middlewares/auth';
import { tenantMiddleware } from '../../../shared/middlewares/tenant';
import { createValidation } from '../../../shared/middlewares/validation';
import { AppError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/logger/index';

/**
 * Rotas para o módulo de Permission
 * Implementa endpoints CRUD para gerenciamento de permissões
 */
export async function permissionRoutes(fastify: FastifyInstance) {
  const permissionService = new PermissionService(fastify.prisma);

  // Middleware de autenticação para todas as rotas
  await fastify.register(authMiddleware);
  await fastify.register(tenantMiddleware);

  /**
   * Criar nova permissão
   * POST /permissions
   */
  fastify.post<{
    Body: CreatePermissionDto;
  }>('/permissions', {
    preHandler: [
      createValidation({ body: createPermissionDto })
    ],
    schema: {
      tags: ['Permissions'],
      summary: 'Criar nova permissão',
      body: {
        type: 'object',
        required: ['name', 'resource', 'action'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          resource: { type: 'string', minLength: 2, maxLength: 50 },
          action: { type: 'string', minLength: 2, maxLength: 50 },
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
                resource: { type: 'string' },
                action: { type: 'string' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: CreatePermissionDto }>, reply: FastifyReply) => {
    try {
      const permission = await permissionService.create(request.body);
      
      logger.info('Permissão criada via API', {
        permissionId: permission.id,
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        userId: request.user.id
      });
      
      return reply.status(201).send({
        success: true,
        data: permission
      });
    } catch (error) {
      logger.error('Erro ao criar permissão via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        body: request.body,
        userId: request.user.id
      });
      
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
   * Listar permissões com filtros
   * GET /permissions
   */
  fastify.get<{
    Querystring: PermissionFiltersDto;
  }>('/permissions', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Listar permissões',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          name: { type: 'string' },
          resource: { type: 'string' },
          action: { type: 'string' },
          isActive: { type: 'boolean' },
          sortBy: { type: 'string', enum: ['name', 'resource', 'action', 'createdAt', 'updatedAt'], default: 'name' },
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
                  resource: { type: 'string' },
                  action: { type: 'string' },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  _count: {
                    type: 'object',
                    properties: {
                      roles: { type: 'integer' }
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
  }, async (request: FastifyRequest<{ Querystring: PermissionFiltersDto }>, reply: FastifyReply) => {
    try {
      const result = await permissionService.findMany(request.query);
      
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
      logger.error('Erro ao listar permissões via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        query: request.query,
        userId: request.user.id
      });
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Buscar permissão por ID
   * GET /permissions/:id
   */
  fastify.get<{
    Params: { id: string };
  }>('/permissions/:id', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Buscar permissão por ID',
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
      const permission = await permissionService.findById(id);
      
      return reply.send({
        success: true,
        data: permission
      });
    } catch (error) {
      logger.error('Erro ao buscar permissão por ID via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        permissionId: request.params.id,
        userId: request.user.id
      });
      
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
   * Atualizar permissão
   * PUT /permissions/:id
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdatePermissionDto;
  }>('/permissions/:id', {
    preHandler: [
      createValidation({ body: updatePermissionDto })
    ],
    schema: {
      tags: ['Permissions'],
      summary: 'Atualizar permissão',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdatePermissionDto }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const permission = await permissionService.update(id, request.body);
      
      logger.info('Permissão atualizada via API', {
        permissionId: id,
        updatedFields: Object.keys(request.body),
        userId: request.user.id
      });
      
      return reply.send({
        success: true,
        data: permission
      });
    } catch (error) {
      logger.error('Erro ao atualizar permissão via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        permissionId: request.params.id,
        body: request.body,
        userId: request.user.id
      });
      
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
   * Remover permissão
   * DELETE /permissions/:id
   */
  fastify.delete<{
    Params: { id: string };
  }>('/permissions/:id', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Remover permissão',
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
      await permissionService.delete(id);
      
      logger.info('Permissão removida via API', {
        permissionId: id,
        userId: request.user.id
      });
      
      return reply.status(204).send();
    } catch (error) {
      logger.error('Erro ao remover permissão via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        permissionId: request.params.id,
        userId: request.user.id
      });
      
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

  // ========== ROTAS ESPECIAIS ==========

  /**
   * Listar todas as permissões ativas
   * GET /permissions/active
   */
  fastify.get('/permissions/active', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Listar todas as permissões ativas'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const permissions = await permissionService.findAllActive();
      
      return reply.send({
        success: true,
        data: permissions
      });
    } catch (error) {
      logger.error('Erro ao listar permissões ativas via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userId: request.user.id
      });
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Buscar permissões por recurso
   * GET /permissions/resource/:resource
   */
  fastify.get<{
    Params: { resource: string };
  }>('/permissions/resource/:resource', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Buscar permissões por recurso',
      params: {
        type: 'object',
        required: ['resource'],
        properties: {
          resource: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { resource: string } }>, reply: FastifyReply) => {
    try {
      const { resource } = request.params;
      const permissions = await permissionService.findByResource(resource);
      
      return reply.send({
        success: true,
        data: permissions
      });
    } catch (error) {
      logger.error('Erro ao buscar permissões por recurso via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        resource: request.params.resource,
        userId: request.user.id
      });
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Buscar permissões por ação
   * GET /permissions/action/:action
   */
  fastify.get<{
    Params: { action: string };
  }>('/permissions/action/:action', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Buscar permissões por ação',
      params: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { action: string } }>, reply: FastifyReply) => {
    try {
      const { action } = request.params;
      const permissions = await permissionService.findByAction(action);
      
      return reply.send({
        success: true,
        data: permissions
      });
    } catch (error) {
      logger.error('Erro ao buscar permissões por ação via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        action: request.params.action,
        userId: request.user.id
      });
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Obter recursos únicos
   * GET /permissions/resources
   */
  fastify.get('/permissions/resources', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Obter recursos únicos'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const resources = await permissionService.getUniqueResources();
      
      return reply.send({
        success: true,
        data: resources
      });
    } catch (error) {
      logger.error('Erro ao obter recursos únicos via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userId: request.user.id
      });
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Obter ações únicas
   * GET /permissions/actions
   */
  fastify.get('/permissions/actions', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Obter ações únicas'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const actions = await permissionService.getUniqueActions();
      
      return reply.send({
        success: true,
        data: actions
      });
    } catch (error) {
      logger.error('Erro ao obter ações únicas via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userId: request.user.id
      });
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Obter permissões agrupadas por recurso
   * GET /permissions/grouped
   */
  fastify.get('/permissions/grouped', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Obter permissões agrupadas por recurso'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const grouped = await permissionService.findGroupedByResource();
      
      return reply.send({
        success: true,
        data: grouped
      });
    } catch (error) {
      logger.error('Erro ao obter permissões agrupadas via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userId: request.user.id
      });
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Criar permissões padrão
   * POST /permissions/create-defaults
   */
  fastify.post('/permissions/create-defaults', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Criar permissões padrão do sistema'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const permissions = await permissionService.createDefaultPermissions();
      
      logger.info('Permissões padrão criadas via API', {
        count: permissions.length,
        userId: request.user.id
      });
      
      return reply.status(201).send({
        success: true,
        data: permissions,
        message: `${permissions.length} permissões padrão criadas com sucesso`
      });
    } catch (error) {
      logger.error('Erro ao criar permissões padrão via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userId: request.user.id
      });
      
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
   * Buscar permissões por nome
   * GET /permissions/search
   */
  fastify.get<{
    Querystring: { q: string };
  }>('/permissions/search', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Buscar permissões por nome',
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { q: string } }>, reply: FastifyReply) => {
    try {
      const { q } = request.query;
      const permissions = await permissionService.searchByName(q);
      
      return reply.send({
        success: true,
        data: permissions
      });
    } catch (error) {
      logger.error('Erro ao buscar permissões por nome via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        searchTerm: request.query.q,
        userId: request.user.id
      });
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * Verificar se permissão pode ser removida
   * GET /permissions/:id/can-delete
   */
  fastify.get<{
    Params: { id: string };
  }>('/permissions/:id/can-delete', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Verificar se permissão pode ser removida',
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
      const result = await permissionService.canDelete(id);
      
      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Erro ao verificar se permissão pode ser removida via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        permissionId: request.params.id,
        userId: request.user.id
      });
      
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
   * Obter estatísticas de permissões
   * GET /permissions/stats
   */
  fastify.get('/permissions/stats', {
    preHandler: [],
    schema: {
      tags: ['Permissions'],
      summary: 'Obter estatísticas de permissões'
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await permissionService.getStats();
      
      return reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas de permissões via API', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        userId: request.user.id
      });
      
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });
}