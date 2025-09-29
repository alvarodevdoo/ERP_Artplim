import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { 
  CreatePartnerDTO, 
  UpdatePartnerDTO, 
  PartnerFiltersDTO,
  createPartnerSchema,
  updatePartnerSchema,
  partnerFiltersSchema
} from '../dtos';
import { PartnerType } from '@prisma/client';
import { PartnerService } from '../services';

import { tenantMiddleware } from '../../../shared/middlewares/tenant';
import { createValidation } from '../../../shared/middlewares/validation';
import { AppError } from '../../../shared/errors/AppError';

export async function partnerRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  const partnerService = new PartnerService(prisma);

  // Middleware de autenticação e tenant para todas as rotas
  
  await fastify.register(tenantMiddleware);

  /**
   * Criar parceiro
   */
  fastify.post<{
    Body: CreatePartnerDTO;
  }>('/', {
    preHandler: [createValidation({ body: createPartnerSchema })],
    handler: async (request: FastifyRequest<{ Body: CreatePartnerDTO }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const partner = await partnerService.create(request.body, userId, companyId);
        
        return reply.code(201).send({
          success: true,
          data: partner,
          message: 'Parceiro criado com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Listar parceiros com filtros
   */
  fastify.get<{
    Querystring: PartnerFiltersDTO;
  }>('/', {
    preHandler: [createValidation({ querystring: partnerFiltersSchema })],
    handler: async (request: FastifyRequest<{ Querystring: PartnerFiltersDTO }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const result = await partnerService.findMany(request.query, userId, companyId);
        
        return reply.send({
          success: true,
          data: result.partners,
          pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages
          }
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Buscar parceiro por ID
   */
  fastify.get<{
    Params: { id: string };
  }>('/:id', {
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const partner = await partnerService.findById(request.params.id, userId, companyId);
        
        return reply.send({
          success: true,
          data: partner
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Atualizar parceiro
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdatePartnerDTO;
  }>('/:id', {
    preHandler: [createValidation({ body: updatePartnerSchema })],
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: UpdatePartnerDTO }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const partner = await partnerService.update(request.params.id, request.body, userId, companyId);
        
        return reply.send({
          success: true,
          data: partner,
          message: 'Parceiro atualizado com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Excluir parceiro (soft delete)
   */
  fastify.delete<{
    Params: { id: string };
  }>('/:id', {
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        await partnerService.delete(request.params.id, userId, companyId);
        
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Restaurar parceiro
   */
  fastify.patch<{
    Params: { id: string };
  }>('/:id/restore', {
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const partner = await partnerService.restore(request.params.id, userId, companyId);
        
        return reply.send({
          success: true,
          data: partner,
          message: 'Parceiro restaurado com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Buscar parceiros por tipo
   */
  fastify.get<{
    Params: { type: string };
    Querystring: Omit<PartnerFiltersDTO, 'type'>;
  }>('/type/:type', {
    handler: async (request: FastifyRequest<{ Params: { type: string }; Querystring: Omit<PartnerFiltersDTO, 'type'> }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const filters = { ...request.query, type: request.params.type };
        const result = await partnerService.findByType(request.params.type as PartnerType, filters, userId, companyId);
        
        return reply.send({
          success: true,
          data: result.partners,
          pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages
          }
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Obter estatísticas de parceiros
   */
  fastify.get('/stats', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const stats = await partnerService.getStats(userId, companyId);
        
        return reply.send({
          success: true,
          data: stats
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Verificar disponibilidade de documento
   */
  fastify.get<{
    Querystring: { document: string; excludeId?: string };
  }>('/check-document', {
    handler: async (request: FastifyRequest<{ Querystring: { document: string; excludeId?: string } }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const { document, excludeId } = request.query;
        
        if (!document) {
          return reply.code(400).send({
            success: false,
            message: 'Documento é obrigatório'
          });
        }
        
        const result = await partnerService.checkDocumentAvailability(document, userId, companyId, excludeId);
        
        return reply.send({
          success: true,
          data: result
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Atualizar status do parceiro
   */
  fastify.patch<{
    Params: { id: string };
    Body: { status: string };
  }>('/:id/status', {
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const { status } = request.body;
        
        if (!status) {
          return reply.code(400).send({
            success: false,
            message: 'Status é obrigatório'
          });
        }
        
        const partner = await partnerService.updateStatus(request.params.id, status as string, userId, companyId);
        
        return reply.send({
          success: true,
          data: partner,
          message: 'Status do parceiro atualizado com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Gerar relatório de parceiros
   */
  fastify.get<{
    Querystring: PartnerFiltersDTO & { format?: 'json' | 'csv' };
  }>('/report', {
    handler: async (request: FastifyRequest<{ Querystring: PartnerFiltersDTO & { format?: 'json' | 'csv' } }>, reply: FastifyReply) => {
      try {
        const { userId, companyId } = request.user;
        const { format = 'json', ...filters } = request.query;
        
        const report = await partnerService.generateReport(filters, format, userId, companyId);
        
        if (format === 'csv') {
          return reply
            .header('Content-Type', 'text/csv')
            .header('Content-Disposition', 'attachment; filename="partners-report.csv"')
            .send(report);
        }
        
        return reply.send({
          success: true,
          data: report
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });
}