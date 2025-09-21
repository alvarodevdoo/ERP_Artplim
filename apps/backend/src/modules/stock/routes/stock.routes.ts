import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StockService } from '../services';
import { requirePermission, authMiddleware } from '../../../shared/middlewares/auth';
import { createValidation } from '../../../shared/middlewares/validation';

import {
  stockMovementSchema,
  stockAdjustmentSchema,
  stockTransferSchema,
  stockReservationSchema,
  cancelStockReservationSchema,
  stockFiltersSchema,
  stockMovementFiltersSchema,
  stockReservationFiltersSchema,
  createStockLocationSchema,
  updateStockLocationSchema,
  StockMovementDTO,
  StockAdjustmentDTO,
  StockTransferDTO,
  StockReservationDTO,
  CancelStockReservationDTO,
  StockFiltersDTO,
  StockMovementFiltersDTO,
  StockReservationFiltersDTO,
  CreateStockLocationDTO,
  UpdateStockLocationDTO
} from '../dtos';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    companyId: string;
  };
}

export async function stockRoutes(fastify: FastifyInstance) {
  const stockService = new StockService(fastify.prisma);

  // Middleware de autenticação para todas as rotas
  fastify.addHook('preHandler', authMiddleware);

  /**
   * @route POST /stock/in
   * @desc Registra entrada de estoque
   * @access Private - Requer permissão stock:write
   */
  fastify.post<{
    Body: StockMovementDTO;
  }>('/in', {
    preHandler: [
      requirePermission('stock:write'),
      createValidation({ body: stockMovementSchema })
    ]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const movement = await stockService.stockIn(
        request.body,
        request.user.id,
        request.user.companyId
      );

      return reply.status(201).send({
        success: true,
        data: movement,
        message: 'Entrada de estoque registrada com sucesso'
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route POST /stock/out
   * @desc Registra saída de estoque
   * @access Private - Requer permissão stock:write
   */
  fastify.post<{
    Body: StockMovementDTO;
  }>('/out', {
    preHandler: [
      requirePermission('stock:write'),
      createValidation({ body: stockMovementSchema })
    ]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const movement = await stockService.stockOut(
        request.body,
        request.user.id,
        request.user.companyId
      );

      return reply.status(201).send({
        success: true,
        data: movement,
        message: 'Saída de estoque registrada com sucesso'
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route POST /stock/adjust
   * @desc Ajusta estoque
   * @access Private - Requer permissão stock:adjust
   */
  fastify.post<{
    Body: StockAdjustmentDTO;
  }>('/adjust', {
    preHandler: [
      requirePermission('stock:adjust'),
      createValidation({ body: stockAdjustmentSchema })
    ]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const movement = await stockService.adjustStock(
        request.body,
        request.user.id,
        request.user.companyId
      );

      return reply.status(201).send({
        success: true,
        data: movement,
        message: 'Ajuste de estoque realizado com sucesso'
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route POST /stock/transfer
   * @desc Transfere estoque entre localizações
   * @access Private - Requer permissão stock:transfer
   */
  fastify.post<{
    Body: StockTransferDTO;
  }>('/transfer', {
    preHandler: [
      requirePermission('stock:transfer'),
      createValidation({ body: stockTransferSchema })
    ]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const movement = await stockService.transferStock(
        request.body,
        request.user.id,
        request.user.companyId
      );

      return reply.status(201).send({
        success: true,
        data: movement,
        message: 'Transferência de estoque realizada com sucesso'
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route GET /stock
   * @desc Lista itens de estoque com filtros
   * @access Private - Requer permissão stock:read
   */
  fastify.get<{
    Querystring: StockFiltersDTO;
  }>('/', {
    preHandler: [
      requirePermission('stock:read'),
      createValidation({ querystring: stockFiltersSchema })
    ]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const result = await stockService.findMany(
        request.query,
        request.user.id,
        request.user.companyId
      );

      return reply.send({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: request.query.page || 1,
          limit: request.query.limit || 20,
          totalPages: Math.ceil(result.total / (request.query.limit || 20))
        }
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route GET /stock/product/:productId
   * @desc Busca item de estoque por produto
   * @access Private - Requer permissão stock:read
   */
  fastify.get<{
    Params: { productId: string };
    Querystring: { locationId?: string };
  }>('/product/:productId', {
    preHandler: [requirePermission('stock:read')]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const stockItem = await stockService.findStockItem(
        request.params.productId,
        request.query.locationId,
        request.user.id,
        request.user.companyId
      );

      if (!stockItem) {
        return reply.status(404).send({
          success: false,
          message: 'Item de estoque não encontrado'
        });
      }

      return reply.send({
        success: true,
        data: stockItem
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route GET /stock/movements
   * @desc Lista movimentações de estoque
   * @access Private - Requer permissão stock:read
   */
  fastify.get<{
    Querystring: StockMovementFiltersDTO;
  }>('/movements', {
    preHandler: [
      requirePermission('stock:read'),
      createValidation({ querystring: stockMovementFiltersSchema })
    ]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const result = await stockService.findMovements(
        request.query,
        request.user.id,
        request.user.companyId
      );

      return reply.send({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: request.query.page || 1,
          limit: request.query.limit || 20,
          totalPages: Math.ceil(result.total / (request.query.limit || 20))
        }
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route POST /stock/reservations
   * @desc Cria reserva de estoque
   * @access Private - Requer permissão stock:reserve
   */
  fastify.post<{
    Body: StockReservationDTO;
  }>('/reservations', {
    preHandler: [
      requirePermission('stock:reserve'),
      createValidation({ body: stockReservationSchema })
    ]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const reservation = await stockService.createReservation(
        request.body,
        request.user.id,
        request.user.companyId
      );

      return reply.status(201).send({
        success: true,
        data: reservation,
        message: 'Reserva de estoque criada com sucesso'
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route PUT /stock/reservations/:id/cancel
   * @desc Cancela reserva de estoque
   * @access Private - Requer permissão stock:reserve
   */
  fastify.put<{
    Params: { id: string };
    Body: CancelStockReservationDTO;
  }>('/reservations/:id/cancel', {
    preHandler: [
      requirePermission('stock:reserve'),
      createValidation({ body: cancelStockReservationSchema })
    ]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      await stockService.cancelReservation(
        request.params.id,
        request.body,
        request.user.id,
        request.user.companyId
      );

      return reply.send({
        success: true,
        message: 'Reserva cancelada com sucesso'
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route GET /stock/reservations
   * @desc Lista reservas de estoque
   * @access Private - Requer permissão stock:read
   */
  fastify.get<{
    Querystring: StockReservationFiltersDTO;
  }>('/reservations', {
    preHandler: [
      requirePermission('stock:read'),
      createValidation({ querystring: stockReservationFiltersSchema })
    ]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const result = await stockService.findReservations(
        request.query,
        request.user.id,
        request.user.companyId
      );

      return reply.send({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: request.query.page || 1,
          limit: request.query.limit || 20,
          totalPages: Math.ceil(result.total / (request.query.limit || 20))
        }
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route POST /stock/locations
   * @desc Cria localização de estoque
   * @access Private - Requer permissão stock:manage_locations
   */
  fastify.post<{
    Body: CreateStockLocationDTO;
  }>('/locations', {
    preHandler: [
      requirePermission('stock:manage_locations'),
      createValidation({ body: createStockLocationSchema })
    ]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const location = await stockService.createLocation(
        request.body,
        request.user.id,
        request.user.companyId
      );

      return reply.status(201).send({
        success: true,
        data: location,
        message: 'Localização criada com sucesso'
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route GET /stock/locations/:id
   * @desc Busca localização por ID
   * @access Private - Requer permissão stock:read
   */
  fastify.get<{
    Params: { id: string };
  }>('/locations/:id', {
    preHandler: [requirePermission('stock:read')]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const location = await stockService.findLocationById(
        request.params.id,
        request.user.id,
        request.user.companyId
      );

      if (!location) {
        return reply.status(404).send({
          success: false,
          message: 'Localização não encontrada'
        });
      }

      return reply.send({
        success: true,
        data: location
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route PUT /stock/locations/:id
   * @desc Atualiza localização
   * @access Private - Requer permissão stock:manage_locations
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateStockLocationDTO;
  }>('/locations/:id', {
    preHandler: [
      requirePermission('stock:manage_locations'),
      createValidation({ body: updateStockLocationSchema })
    ]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const location = await stockService.updateLocation(
        request.params.id,
        request.body,
        request.user.id,
        request.user.companyId
      );

      return reply.send({
        success: true,
        data: location,
        message: 'Localização atualizada com sucesso'
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route DELETE /stock/locations/:id
   * @desc Remove localização
   * @access Private - Requer permissão stock:manage_locations
   */
  fastify.delete<{
    Params: { id: string };
  }>('/locations/:id', {
    preHandler: [requirePermission('stock:manage_locations')]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      await stockService.deleteLocation(
        request.params.id,
        request.user.id,
        request.user.companyId
      );

      return reply.send({
        success: true,
        message: 'Localização removida com sucesso'
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route GET /stock/stats
   * @desc Obtém estatísticas do estoque
   * @access Private - Requer permissão stock:read
   */
  fastify.get('/stats', {
    preHandler: [requirePermission('stock:read')]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const stats = await stockService.getStats(
        request.user.id,
        request.user.companyId
      );

      return reply.send({
        success: true,
        data: stats
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route GET /stock/report
   * @desc Gera relatório de estoque
   * @access Private - Requer permissão stock:report
   */
  fastify.get<{
    Querystring: { format?: 'json' | 'csv' };
  }>('/report', {
    preHandler: [requirePermission('stock:report')]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const format = request.query.format || 'json';
      const report = await stockService.generateReport(
        format,
        request.user.id,
        request.user.companyId
      );

      if (format === 'csv') {
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="relatorio-estoque.csv"');
        return reply.send(report);
      }

      return reply.send({
        success: true,
        data: report
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route GET /stock/movements/report
   * @desc Gera relatório de movimentações
   * @access Private - Requer permissão stock:report
   */
  fastify.get<{
    Querystring: {
      format?: 'json' | 'csv';
      startDate?: string;
      endDate?: string;
    };
  }>('/movements/report', {
    preHandler: [requirePermission('stock:report')]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { format = 'json', startDate, endDate } = request.query;
      const report = await stockService.generateMovementReport(
        format,
        startDate,
        endDate,
        request.user.id,
        request.user.companyId
      );

      if (format === 'csv') {
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="relatorio-movimentacoes.csv"');
        return reply.send(report);
      }

      return reply.send({
        success: true,
        data: report
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * @route GET /stock/dashboard
   * @desc Obtém dados para dashboard de estoque
   * @access Private - Requer permissão stock:read
   */
  fastify.get('/dashboard', {
    preHandler: [requirePermission('stock:read')]
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const dashboard = await stockService.getDashboard(
        request.user.id,
        request.user.companyId
      );

      return reply.send({
        success: true,
        data: dashboard
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  });
}