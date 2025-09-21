import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services';
import { authMiddleware, requirePermission } from '../../../shared/middlewares/auth';
import { tenantMiddleware } from '../../../shared/middlewares/tenant';
import { createValidation } from '../../../shared/middlewares/validation';
import {
  createUserDto,
  updateUserDto,
  changePasswordDto,
  userFiltersDto,
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  UserFiltersDto,
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/logger/index';

/**
 * Rotas do módulo de usuário
 * Implementa todos os endpoints CRUD com validações e middlewares
 */
export async function userRoutes(fastify: FastifyInstance) {
  const userService = new UserService();

  // Aplicar middlewares globais para todas as rotas
  await fastify.register(authMiddleware);
  await fastify.register(tenantMiddleware);

  /**
   * Criar usuário
   * POST /users
   */
  fastify.post<{
    Body: CreateUserDto;
  }>(
    '/',
    {
      preHandler: [
        requirePermission('user:create'),
        createValidation({ body: createUserDto }),
      ],
      schema: {
        tags: ['Users'],
        summary: 'Criar usuário',
        description: 'Cria um novo usuário no sistema',
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            phone: { type: 'string', nullable: true },
            avatar: { type: 'string', nullable: true },
            cpf: { type: 'string', nullable: true },
            companyId: { type: 'string', format: 'uuid' },
            roleIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              minItems: 1,
            },
            isActive: { type: 'boolean', default: true },
          },
          required: ['name', 'email', 'password', 'companyId', 'roleIds'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string', nullable: true },
              avatar: { type: 'string', nullable: true },
              cpf: { type: 'string', nullable: true },
              isActive: { type: 'boolean' },
              lastLogin: { type: 'string', nullable: true },
              company: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  document: { type: 'string' },
                },
              },
              roles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    permissions: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
              },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateUserDto }>, reply: FastifyReply) => {
      try {
        const user = await userService.create(request.body);
        return reply.code(201).send(user);
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            error: error.message,
            statusCode: error.statusCode,
          });
        }
        logger.error('Erro ao criar usuário:', error);
        return reply.code(500).send({
          error: 'Erro interno do servidor',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * Listar usuários
   * GET /users
   */
  fastify.get<{
    Querystring: UserFiltersDto;
  }>(
    '/',
    {
      preHandler: [requirePermission('user:read')],
      schema: {
        tags: ['Users'],
        summary: 'Listar usuários',
        description: 'Lista usuários com filtros e paginação',
        querystring: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            companyId: { type: 'string', format: 'uuid' },
            roleId: { type: 'string', format: 'uuid' },
            isActive: { type: 'boolean' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
            sortBy: {
              type: 'string',
              enum: ['name', 'email', 'createdAt', 'updatedAt'],
              default: 'name',
            },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'asc',
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: UserFiltersDto }>, reply: FastifyReply) => {
      try {
        const filters = userFiltersDto.parse(request.query);
        const users = await userService.findMany(filters);
        return reply.send(users);
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            error: error.message,
            statusCode: error.statusCode,
          });
        }
        logger.error('Erro ao listar usuários:', error);
        return reply.code(500).send({
          error: 'Erro interno do servidor',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * Buscar usuário por ID
   * GET /users/:id
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id',
    {
      preHandler: [requirePermission('user:read')],
      schema: {
        tags: ['Users'],
        summary: 'Buscar usuário por ID',
        description: 'Busca um usuário específico pelo ID',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const user = await userService.findById(request.params.id);
        return reply.send(user);
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            error: error.message,
            statusCode: error.statusCode,
          });
        }
        logger.error('Erro ao buscar usuário:', error);
        return reply.code(500).send({
          error: 'Erro interno do servidor',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * Atualizar usuário
   * PUT /users/:id
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateUserDto;
  }>(
    '/:id',
    {
      preHandler: [
        requirePermission('user:update'),
        createValidation({ body: updateUserDto }),
      ],
      schema: {
        tags: ['Users'],
        summary: 'Atualizar usuário',
        description: 'Atualiza os dados de um usuário',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', nullable: true },
            avatar: { type: 'string', nullable: true },
            cpf: { type: 'string', nullable: true },
            roleIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
            },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserDto }>,
      reply: FastifyReply
    ) => {
      try {
        const user = await userService.update(request.params.id, request.body);
        return reply.send(user);
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            error: error.message,
            statusCode: error.statusCode,
          });
        }
        logger.error('Erro ao atualizar usuário:', error);
        return reply.code(500).send({
          error: 'Erro interno do servidor',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * Alterar senha
   * PATCH /users/:id/password
   */
  fastify.patch<{
    Params: { id: string };
    Body: ChangePasswordDto;
  }>(
    '/:id/password',
    {
      preHandler: [
        requirePermission('user:update'),
        createValidation({ body: changePasswordDto }),
      ],
      schema: {
        tags: ['Users'],
        summary: 'Alterar senha do usuário',
        description: 'Altera a senha de um usuário',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            currentPassword: { type: 'string', minLength: 8 },
            newPassword: { type: 'string', minLength: 8 },
            confirmPassword: { type: 'string', minLength: 8 },
          },
          required: ['currentPassword', 'newPassword', 'confirmPassword'],
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: ChangePasswordDto }>,
      reply: FastifyReply
    ) => {
      try {
        const result = await userService.changePassword(request.params.id, request.body);
        return reply.send(result);
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            error: error.message,
            statusCode: error.statusCode,
          });
        }
        logger.error('Erro ao alterar senha:', error);
        return reply.code(500).send({
          error: 'Erro interno do servidor',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * Remover usuário
   * DELETE /users/:id
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    '/:id',
    {
      preHandler: [requirePermission('user:delete')],
      schema: {
        tags: ['Users'],
        summary: 'Remover usuário',
        description: 'Remove um usuário (soft delete)',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const result = await userService.delete(request.params.id);
        return reply.send(result);
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            error: error.message,
            statusCode: error.statusCode,
          });
        }
        logger.error('Erro ao remover usuário:', error);
        return reply.code(500).send({
          error: 'Erro interno do servidor',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * Restaurar usuário
   * PATCH /users/:id/restore
   */
  fastify.patch<{
    Params: { id: string };
  }>(
    '/:id/restore',
    {
      preHandler: [requirePermission('user:update')],
      schema: {
        tags: ['Users'],
        summary: 'Restaurar usuário',
        description: 'Restaura um usuário removido',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const user = await userService.restore(request.params.id);
        return reply.send(user);
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            error: error.message,
            statusCode: error.statusCode,
          });
        }
        logger.error('Erro ao restaurar usuário:', error);
        return reply.code(500).send({
          error: 'Erro interno do servidor',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * Buscar perfil do usuário
   * GET /users/:id/profile
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id/profile',
    {
      preHandler: [requirePermission('user:read')],
      schema: {
        tags: ['Users'],
        summary: 'Buscar perfil do usuário',
        description: 'Busca o perfil completo de um usuário',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const profile = await userService.getProfile(request.params.id);
        return reply.send(profile);
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            error: error.message,
            statusCode: error.statusCode,
          });
        }
        logger.error('Erro ao buscar perfil:', error);
        return reply.code(500).send({
          error: 'Erro interno do servidor',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * Buscar estatísticas do usuário
   * GET /users/:id/stats
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id/stats',
    {
      preHandler: [requirePermission('user:read')],
      schema: {
        tags: ['Users'],
        summary: 'Buscar estatísticas do usuário',
        description: 'Busca estatísticas de atividade do usuário',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const stats = await userService.getStats(request.params.id);
        return reply.send(stats);
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            error: error.message,
            statusCode: error.statusCode,
          });
        }
        logger.error('Erro ao buscar estatísticas:', error);
        return reply.code(500).send({
          error: 'Erro interno do servidor',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * Buscar usuários por empresa
   * GET /users/company/:companyId
   */
  fastify.get<{
    Params: { companyId: string };
  }>(
    '/company/:companyId',
    {
      preHandler: [requirePermission('user:read')],
      schema: {
        tags: ['Users'],
        summary: 'Buscar usuários por empresa',
        description: 'Lista todos os usuários de uma empresa específica',
        params: {
          type: 'object',
          properties: {
            companyId: { type: 'string', format: 'uuid' },
          },
          required: ['companyId'],
        },
      },
    },
    async (request: FastifyRequest<{ Params: { companyId: string } }>, reply: FastifyReply) => {
      try {
        const users = await userService.findByCompany(request.params.companyId);
        return reply.send(users);
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            error: error.message,
            statusCode: error.statusCode,
          });
        }
        logger.error('Erro ao buscar usuários por empresa:', error);
        return reply.code(500).send({
          error: 'Erro interno do servidor',
          statusCode: 500,
        });
      }
    }
  );
}