import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CompanyService } from '../services';
import { CreateCompanyDto, UpdateCompanyDto, CompanyFiltersDto, createCompanyDto, updateCompanyDto } from '../dtos';
import { requirePermission } from '../../../shared/middlewares/auth';
import { tenantMiddleware } from '../../../shared/middlewares/tenant';
import { createValidation } from '../../../shared/middlewares/validation';
import { logger } from '../../../shared/logger/index';
import { AppError } from '../../../shared/errors/AppError';

/**
 * Rotas para operações de empresa
 * Implementa todos os endpoints CRUD com validações e middlewares
 */
export async function companyRoutes(fastify: FastifyInstance) {
  const companyService = new CompanyService();

  // Aplicar middlewares globais para todas as rotas
  
  await fastify.register(tenantMiddleware);

  /**
   * POST /companies
   * Cria uma nova empresa
   */
  fastify.post('/', {
    preHandler: [
      requirePermission('companies:create'),
      createValidation({ body: createCompanyDto })
    ],
    schema: {
      tags: ['Companies'],
      summary: 'Criar nova empresa',
      description: 'Cria uma nova empresa no sistema',
      body: {
        type: 'object',
        required: ['name', 'cnpj', 'email'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          tradeName: { type: 'string', maxLength: 100 },
          cnpj: { type: 'string', minLength: 14, maxLength: 18 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', maxLength: 20 },
          address: { type: 'string', maxLength: 200 },
          city: { type: 'string', maxLength: 100 },
          state: { type: 'string', maxLength: 2 },
          zipCode: { type: 'string', maxLength: 10 },
          country: { type: 'string', maxLength: 100 },
          website: { type: 'string', format: 'uri' },
          description: { type: 'string', maxLength: 500 }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                tradeName: { type: 'string' },
                cnpj: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                country: { type: 'string' },
                website: { type: 'string' },
                description: { type: 'string' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: CreateCompanyDto }>, reply: FastifyReply) => {
    try {
      const company = await companyService.create(request.body);
      
      return reply.status(201).send({
        success: true,
        message: 'Empresa criada com sucesso',
        data: company
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      logger.error(error, 'Erro ao criar empresa');
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * GET /companies
   * Lista empresas com filtros e paginação
   */
  fastify.get('/', {
    preHandler: [requirePermission('companies:read')],
    schema: {
      tags: ['Companies'],
      summary: 'Listar empresas',
      description: 'Lista empresas com filtros e paginação',
      querystring: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          cnpj: { type: 'string' },
          email: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          isActive: { type: 'boolean' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          sortBy: { type: 'string', enum: ['name', 'cnpj', 'email', 'createdAt'], default: 'name' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  tradeName: { type: 'string' },
                  cnpj: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
                  stats: {
                    type: 'object',
                    properties: {
                      totalUsers: { type: 'integer' },
                      totalEmployees: { type: 'integer' },
                      totalProducts: { type: 'integer' },
                      totalOrders: { type: 'integer' }
                    }
                  }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: CompanyFiltersDto }>, reply: FastifyReply): Promise<void> => {
    try {
      const filters: CompanyFiltersDto = {
        name: request.query.name,
        cnpj: request.query.cnpj,
        email: request.query.email,
        city: request.query.city,
        state: request.query.state,
        isActive: request.query.isActive,
        page: request.query.page || 1,
        limit: request.query.limit || 10,
        sortBy: request.query.sortBy || 'name',
        sortOrder: request.query.sortOrder || 'asc'
      };

      const result = await companyService.findMany(filters);
      
      return reply.send({
        success: true,
        message: 'Empresas listadas com sucesso',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error(error, 'Erro ao listar empresas');
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * GET /companies/:id
   * Busca empresa por ID
   */
  fastify.get('/:id', {
    preHandler: [requirePermission('companies:read')],
    schema: {
      tags: ['Companies'],
      summary: 'Buscar empresa por ID',
      description: 'Busca uma empresa específica pelo ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                tradeName: { type: 'string' },
                cnpj: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                country: { type: 'string' },
                website: { type: 'string' },
                description: { type: 'string' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                stats: {
                  type: 'object',
                  properties: {
                    totalUsers: { type: 'integer' },
                    totalEmployees: { type: 'integer' },
                    totalProducts: { type: 'integer' },
                    totalOrders: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> => {
    try {
      const company = await companyService.findById(request.params.id);
      
      return reply.send({
        success: true,
        message: 'Empresa encontrada com sucesso',
        data: company
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      logger.error(error, 'Erro ao buscar empresa');
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * PUT /companies/:id
   * Atualiza empresa
   */
  fastify.put('/:id', {
    preHandler: [
      requirePermission('companies:update'),
      createValidation({ body: updateCompanyDto })
    ],
    schema: {
      tags: ['Companies'],
      summary: 'Atualizar empresa',
      description: 'Atualiza os dados de uma empresa',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          tradeName: { type: 'string', maxLength: 100 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', maxLength: 20 },
          address: { type: 'string', maxLength: 200 },
          city: { type: 'string', maxLength: 100 },
          state: { type: 'string', maxLength: 2 },
          zipCode: { type: 'string', maxLength: 10 },
          country: { type: 'string', maxLength: 100 },
          website: { type: 'string', format: 'uri' },
          description: { type: 'string', maxLength: 500 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                tradeName: { type: 'string' },
                cnpj: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                country: { type: 'string' },
                website: { type: 'string' },
                description: { type: 'string' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateCompanyDto }>, reply: FastifyReply): Promise<void> => {
    try {
      const company = await companyService.update(request.params.id, request.body);
      
      return reply.send({
        success: true,
        message: 'Empresa atualizada com sucesso',
        data: company
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      logger.error(error, 'Erro ao atualizar empresa');
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * DELETE /companies/:id
   * Remove empresa (soft delete)
   */
  fastify.delete('/:id', {
    preHandler: [requirePermission('companies:delete')],
    schema: {
      tags: ['Companies'],
      summary: 'Remover empresa',
      description: 'Remove uma empresa do sistema (soft delete)',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                isActive: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): Promise<void> => {
    try {
      const company = await companyService.delete(request.params.id);
      
      return reply.send({
        success: true,
        message: 'Empresa removida com sucesso',
        data: {
          id: company.id,
          name: company.name,
          isActive: company.isActive
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      logger.error(error, 'Erro ao remover empresa');
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * POST /companies/:id/restore
   * Restaura empresa removida
   */
  fastify.post('/:id/restore', {
    preHandler: [requirePermission('companies:update')],
    schema: {
      tags: ['Companies'],
      summary: 'Restaurar empresa',
      description: 'Restaura uma empresa removida',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                isActive: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const company = await companyService.restore(request.params.id);
      
      return reply.send({
        success: true,
        message: 'Empresa restaurada com sucesso',
        data: {
          id: company.id,
          name: company.name,
          isActive: company.isActive
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      logger.error(error, 'Erro ao restaurar empresa');
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });

  /**
   * GET /companies/:id/stats
   * Busca estatísticas da empresa
   */
  fastify.get('/:id/stats', {
    preHandler: [requirePermission('companies:read')],
    schema: {
      tags: ['Companies'],
      summary: 'Estatísticas da empresa',
      description: 'Busca estatísticas detalhadas da empresa',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                totalUsers: { type: 'integer' },
                totalEmployees: { type: 'integer' },
                totalProducts: { type: 'integer' },
                totalOrders: { type: 'integer' },
                totalRevenue: { type: 'number' },
                activeOrders: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const stats = await companyService.getStats(request.params.id);
      
      return reply.send({
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: stats
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message
        });
      }
      
      logger.error(error, 'Erro ao buscar estatísticas');
      return reply.status(500).send({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  });
}