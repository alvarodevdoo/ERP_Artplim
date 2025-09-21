import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, StockMovementType } from '@prisma/client';
import {
  CreateStockMovementDto,
  createStockMovementDto
} from '../dtos';
import { StockMovementService } from '../services';
import { authMiddleware } from '../../../shared/middlewares/auth';
import { tenantMiddleware } from '../../../shared/middlewares/tenant';
import { createValidation } from '../../../shared/middlewares/validation';

/**
 * Rotas para gerenciamento de movimentações de estoque
 */
export async function stockMovementRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  const stockMovementService = new StockMovementService(prisma);

  // Aplicar middlewares globais
  await fastify.register(authMiddleware);
  await fastify.register(tenantMiddleware);

  /**
   * Criar movimentação de estoque
   */
  fastify.post<{
    Body: CreateStockMovementDto;
  }>(
    '/',
    {
      preHandler: [createValidation({ body: createStockMovementDto })]
    },
    async (request: FastifyRequest<{ Body: CreateStockMovementDto }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const movement = await stockMovementService.create(request.body, companyId, userId);
        
        return reply.code(201).send({
          success: true,
          data: movement,
          message: 'Movimentação criada com sucesso'
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );

  /**
   * Listar movimentações com filtros
   */
  fastify.get<{
    Querystring: {
      productId?: string;
      type?: StockMovementType;
      startDate?: string;
      endDate?: string;
      userId?: string;
      page?: number;
      limit?: number;
    };
  }>(
    '/',
    async (request: FastifyRequest<{
      Querystring: {
        productId?: string;
        type?: StockMovementType;
        startDate?: string;
        endDate?: string;
        userId?: string;
        page?: number;
        limit?: number;
      };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const filters = {
          ...request.query,
          startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
          endDate: request.query.endDate ? new Date(request.query.endDate) : undefined
        };
        
        const result = await stockMovementService.findMany(companyId, userId, filters);
        
        return reply.send({
          success: true,
          data: result.movements,
          meta: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages
          }
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );

  /**
   * Buscar movimentação por ID
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const movement = await stockMovementService.findById(request.params.id, companyId, userId);
        
        if (!movement) {
          return reply.code(404).send({
            success: false,
            message: 'Movimentação não encontrada'
          });
        }
        
        return reply.send({
          success: true,
          data: movement
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );

  /**
   * Buscar movimentações por produto
   */
  fastify.get<{
    Params: { productId: string };
    Querystring: { limit?: number };
  }>(
    '/product/:productId',
    async (request: FastifyRequest<{
      Params: { productId: string };
      Querystring: { limit?: number };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { limit = 50 } = request.query;
        
        const movements = await stockMovementService.findByProduct(
          request.params.productId,
          companyId,
          userId,
          limit
        );
        
        return reply.send({
          success: true,
          data: movements
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );

  /**
   * Buscar movimentações por período
   */
  fastify.get<{
    Querystring: {
      startDate: string;
      endDate: string;
      type?: StockMovementType;
    };
  }>(
    '/period',
    async (request: FastifyRequest<{
      Querystring: {
        startDate: string;
        endDate: string;
        type?: StockMovementType;
      };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { startDate, endDate, type } = request.query;
        
        if (!startDate || !endDate) {
          return reply.code(400).send({
            success: false,
            message: 'Data inicial e final são obrigatórias'
          });
        }
        
        const movements = await stockMovementService.findByPeriod(
          new Date(startDate),
          new Date(endDate),
          companyId,
          userId,
          type
        );
        
        return reply.send({
          success: true,
          data: movements
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );

  /**
   * Obter estatísticas de movimentações
   */
  fastify.get<{
    Querystring: {
      startDate?: string;
      endDate?: string;
    };
  }>(
    '/stats',
    async (request: FastifyRequest<{
      Querystring: {
        startDate?: string;
        endDate?: string;
      };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { startDate, endDate } = request.query;
        
        const stats = await stockMovementService.getStats(
          companyId,
          userId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        
        return reply.send({
          success: true,
          data: stats
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );

  /**
   * Buscar últimas movimentações
   */
  fastify.get<{
    Querystring: { limit?: number };
  }>(
    '/recent',
    async (request: FastifyRequest<{
      Querystring: { limit?: number };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { limit = 10 } = request.query;
        
        const movements = await stockMovementService.findRecent(companyId, userId, limit);
        
        return reply.send({
          success: true,
          data: movements
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );

  /**
   * Entrada de estoque
   */
  fastify.post<{
    Body: {
      productId: string;
      quantity: number;
      unitCost: number;
      reason: string;
      reference: string;
    };
  }>(
    '/stock-in',
    async (request: FastifyRequest<{
      Body: {
        productId: string;
        quantity: number;
        unitCost: number;
        reason: string;
        reference: string;
      };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { productId, quantity, unitCost, reason, reference } = request.body;
        
        // Validações básicas
        if (!productId || !quantity || !unitCost || !reason || !reference) {
          return reply.code(400).send({
            success: false,
            message: 'Todos os campos são obrigatórios'
          });
        }
        
        const movement = await stockMovementService.stockIn(
          productId,
          quantity,
          unitCost,
          reason,
          reference,
          companyId,
          userId
        );
        
        return reply.code(201).send({
          success: true,
          data: movement,
          message: 'Entrada de estoque realizada com sucesso'
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );

  /**
   * Saída de estoque
   */
  fastify.post<{
    Body: {
      productId: string;
      quantity: number;
      unitCost: number;
      reason: string;
      reference: string;
    };
  }>(
    '/stock-out',
    async (request: FastifyRequest<{
      Body: {
        productId: string;
        quantity: number;
        unitCost: number;
        reason: string;
        reference: string;
      };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { productId, quantity, unitCost, reason, reference } = request.body;
        
        // Validações básicas
        if (!productId || !quantity || !unitCost || !reason || !reference) {
          return reply.code(400).send({
            success: false,
            message: 'Todos os campos são obrigatórios'
          });
        }
        
        const movement = await stockMovementService.stockOut(
          productId,
          quantity,
          unitCost,
          reason,
          reference,
          companyId,
          userId
        );
        
        return reply.code(201).send({
          success: true,
          data: movement,
          message: 'Saída de estoque realizada com sucesso'
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );

  /**
   * Ajuste de estoque
   */
  fastify.post<{
    Body: {
      productId: string;
      newQuantity: number;
      reason: string;
    };
  }>(
    '/adjustment',
    async (request: FastifyRequest<{
      Body: {
        productId: string;
        newQuantity: number;
        reason: string;
      };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { productId, newQuantity, reason } = request.body;
        
        // Validações básicas
        if (!productId || newQuantity === undefined || !reason) {
          return reply.code(400).send({
            success: false,
            message: 'Todos os campos são obrigatórios'
          });
        }
        
        if (newQuantity < 0) {
          return reply.code(400).send({
            success: false,
            message: 'Nova quantidade não pode ser negativa'
          });
        }
        
        const movement = await stockMovementService.stockAdjustment(
          productId,
          newQuantity,
          reason,
          companyId,
          userId
        );
        
        return reply.code(201).send({
          success: true,
          data: movement,
          message: 'Ajuste de estoque realizado com sucesso'
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );

  /**
   * Transferência entre produtos
   */
  fastify.post<{
    Body: {
      fromProductId: string;
      toProductId: string;
      quantity: number;
      reason: string;
    };
  }>(
    '/transfer',
    async (request: FastifyRequest<{
      Body: {
        fromProductId: string;
        toProductId: string;
        quantity: number;
        reason: string;
      };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { fromProductId, toProductId, quantity, reason } = request.body;
        
        // Validações básicas
        if (!fromProductId || !toProductId || !quantity || !reason) {
          return reply.code(400).send({
            success: false,
            message: 'Todos os campos são obrigatórios'
          });
        }
        
        if (fromProductId === toProductId) {
          return reply.code(400).send({
            success: false,
            message: 'Produto de origem e destino devem ser diferentes'
          });
        }
        
        if (quantity <= 0) {
          return reply.code(400).send({
            success: false,
            message: 'Quantidade deve ser maior que zero'
          });
        }
        
        const result = await stockMovementService.transfer(
          fromProductId,
          toProductId,
          quantity,
          reason,
          companyId,
          userId
        );
        
        return reply.code(201).send({
          success: true,
          data: result,
          message: 'Transferência realizada com sucesso'
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );

  /**
   * Calcular estoque atual de um produto
   */
  fastify.get<{
    Params: { productId: string };
  }>(
    '/current-stock/:productId',
    async (request: FastifyRequest<{ Params: { productId: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const result = await stockMovementService.calculateCurrentStock(
          request.params.productId,
          companyId,
          userId
        );
        
        return reply.send({
          success: true,
          data: result
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );

  /**
   * Gerar relatório de movimentações
   */
  fastify.get<{
    Querystring: {
      productId?: string;
      type?: StockMovementType;
      startDate?: string;
      endDate?: string;
      format?: 'json' | 'csv';
    };
  }>(
    '/report',
    async (request: FastifyRequest<{
      Querystring: {
        productId?: string;
        type?: StockMovementType;
        startDate?: string;
        endDate?: string;
        format?: 'json' | 'csv';
      };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const filters = {
          ...request.query,
          startDate: request.query.startDate ? new Date(request.query.startDate) : undefined,
          endDate: request.query.endDate ? new Date(request.query.endDate) : undefined
        };
        
        const report = await stockMovementService.generateReport(companyId, userId, filters);
        
        if (request.query.format === 'csv') {
          reply.header('Content-Type', 'text/csv');
          reply.header('Content-Disposition', 'attachment; filename="movimentacoes-estoque.csv"');
          return reply.send(report);
        }
        
        return reply.send({
          success: true,
          data: report
        });
      } catch (error: any) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || 'Erro interno do servidor'
        });
      }
    }
  );
}