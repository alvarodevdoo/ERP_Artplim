import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  CreateQuoteDTO, 
  UpdateQuoteDTO, 
  QuoteFiltersDTO, 
  UpdateQuoteStatusDTO,
  DuplicateQuoteDTO,
  ConvertToOrderRequestDTO,
  createQuoteSchema,
  updateQuoteSchema,
  quoteFiltersSchema,
  updateQuoteStatusSchema,
  duplicateQuoteSchema,
  convertToOrderSchema
} from '../dtos';
import { QuoteService } from '../services';
import { requirePermission, requireRole as _requireRole } from '../../../shared/middlewares/auth';
import { createValidation } from '../../../shared/middlewares/validation';
import { PrismaClient } from '@prisma/client';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    companyId: string;
  };
}

export async function quoteRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  const quoteService = new QuoteService(prisma);

  /**
   * Criar orçamento
   */
  fastify.post<{
    Body: CreateQuoteDTO;
  }>('/', {
    preHandler: [
      requirePermission('quotes:create'),
      createValidation({ body: createQuoteSchema })
    ],
    handler: async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const quote = await quoteService.create(
          request.body,
          request.user.id,
          request.user.companyId
        );

        return reply.status(201).send({
          success: true,
          data: quote,
          message: 'Orçamento criado com sucesso'
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        return reply.status(err.statusCode || 500).send({
          success: false,
          message: err.message || 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Listar orçamentos com filtros
   */
  fastify.get<{
    Querystring: QuoteFiltersDTO;
  }>('/', {
    preHandler: [
      requirePermission('quotes:read'),
      createValidation({ querystring: quoteFiltersSchema })
    ],
    handler: async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const result = await quoteService.findMany(
          request.query,
          request.user.id,
          request.user.companyId
        );

        return reply.send({
          success: true,
          data: result.quotes,
          pagination: result.pagination
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        return reply.status(err.statusCode || 500).send({
          success: false,
          message: err.message || 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Buscar orçamento por ID
   */
  fastify.get<{
    Params: { id: string };
  }>('/:id', {
    preHandler: [requirePermission('quotes:read')],
    handler: async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const quote = await quoteService.findById(
          request.params.id,
          request.user.id,
          request.user.companyId
        );

        return reply.send({
          success: true,
          data: quote
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        return reply.status(err.statusCode || 500).send({
          success: false,
          message: err.message || 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Atualizar orçamento
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateQuoteDTO;
  }>('/:id', {
    preHandler: [
      requirePermission('quotes:update'),
      createValidation({ body: updateQuoteSchema })
    ],
    handler: async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const quote = await quoteService.update(
          request.params.id,
          request.body,
          request.user.id,
          request.user.companyId
        );

        return reply.send({
          success: true,
          data: quote,
          message: 'Orçamento atualizado com sucesso'
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        return reply.status(err.statusCode || 500).send({
          success: false,
          message: err.message || 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Excluir orçamento (soft delete)
   */
  fastify.delete<{
    Params: { id: string };
  }>('/:id', {
    preHandler: [requirePermission('quotes:delete')],
    handler: async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        await quoteService.delete(
          request.params.id,
          request.user.id,
          request.user.companyId
        );

        return reply.send({
          success: true,
          message: 'Orçamento excluído com sucesso'
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        return reply.status(err.statusCode || 500).send({
          success: false,
          message: err.message || 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Restaurar orçamento
   */
  fastify.patch<{
    Params: { id: string };
  }>('/:id/restore', {
    preHandler: [requirePermission('quotes:update')],
    handler: async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const quote = await quoteService.restore(
          request.params.id,
          request.user.id,
          request.user.companyId
        );

        return reply.send({
          success: true,
          data: quote,
          message: 'Orçamento restaurado com sucesso'
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        return reply.status(err.statusCode || 500).send({
          success: false,
          message: err.message || 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Atualizar status do orçamento
   */
  fastify.patch<{
    Params: { id: string };
    Body: UpdateQuoteStatusDTO;
  }>('/:id/status', {
    preHandler: [
      requirePermission('quotes:update'),
      createValidation({ body: updateQuoteStatusSchema })
    ],
    handler: async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const quote = await quoteService.updateStatus(
          request.params.id,
          request.body,
          request.user.id,
          request.user.companyId
        );

        return reply.send({
          success: true,
          data: quote,
          message: 'Status do orçamento atualizado com sucesso'
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        return reply.status(err.statusCode || 500).send({
          success: false,
          message: err.message || 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Duplicar orçamento
   */
  fastify.post<{
    Params: { id: string };
    Body: DuplicateQuoteDTO;
  }>('/:id/duplicate', {
    preHandler: [
      requirePermission('quotes:create'),
      createValidation({ body: duplicateQuoteSchema })
    ],
    handler: async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const quote = await quoteService.duplicate(
          request.params.id,
          request.body,
          request.user.id,
          request.user.companyId
        );

        return reply.status(201).send({
          success: true,
          data: quote,
          message: 'Orçamento duplicado com sucesso'
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        return reply.status(err.statusCode || 500).send({
          success: false,
          message: err.message || 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Converter orçamento em ordem de serviço
   */
  fastify.post<{
    Params: { id: string };
    Body: ConvertToOrderRequestDTO;
  }>('/:id/convert-to-order', {
    preHandler: [
      requirePermission('quotes:create'),
      createValidation({ body: convertToOrderSchema })
    ],
    handler: async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const result = await quoteService.convertToOrder(
          request.params.id,
          request.body,
          request.user.id,
          request.user.companyId
        );

        return reply.status(201).send({
          success: true,
          data: result,
          message: 'Orçamento convertido em OS com sucesso'
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        return reply.status(err.statusCode || 500).send({
          success: false,
          message: err.message || 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Obter estatísticas de orçamentos
   */
  fastify.get('/stats', {
    preHandler: [requirePermission('quotes:read')],
    handler: async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const stats = await quoteService.getStats(
          request.user.id,
          request.user.companyId
        );

        return reply.send({
          success: true,
          data: stats
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        return reply.status(err.statusCode || 500).send({
          success: false,
          message: err.message || 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Gerar relatório de orçamentos
   */
  fastify.get<{
    Querystring: QuoteFiltersDTO & { format?: 'json' | 'csv' };
  }>('/report', {
    preHandler: [
      requirePermission('quotes:read'),
      createValidation({ querystring: quoteFiltersSchema })
    ],
    handler: async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const { format = 'json', ...filters } = request.query;
        
        const report = await quoteService.generateReport(
          filters,
          format,
          request.user.id,
          request.user.companyId
        );

        if (format === 'csv') {
          reply.header('Content-Type', 'text/csv');
          reply.header('Content-Disposition', 'attachment; filename="relatorio-orcamentos.csv"');
          return reply.send(report);
        }

        return reply.send({
          success: true,
          data: report
        });
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        return reply.status(err.statusCode || 500).send({
          success: false,
          message: err.message || 'Erro interno do servidor'
        });
      }
    }
  });
}