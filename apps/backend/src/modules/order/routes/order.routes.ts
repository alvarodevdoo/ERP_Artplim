import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  createOrderSchema,
  updateOrderSchema,
  orderFiltersSchema,
  updateOrderStatusSchema,
  assignOrderSchema,
  addOrderTimeTrackingSchema,
  updateOrderTimeTrackingSchema,
  addOrderExpenseSchema,
  updateOrderExpenseSchema,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderFiltersDTO,
  UpdateOrderStatusDTO,
  AssignOrderDTO,
  AddOrderTimeTrackingDTO,
  UpdateOrderTimeTrackingDTO,
  AddOrderExpenseDTO,
  UpdateOrderExpenseDTO
} from '../dtos';
import { OrderService } from '../services';
import { requirePermission } from '../../../shared/middlewares/auth';
import { createValidation } from '../../../shared/middlewares/validation';

import { AppError } from '../../../shared/errors/AppError';

export async function orderRoutes(fastify: FastifyInstance) {
  const orderService = new OrderService(fastify.prisma);

  /**
   * Criar nova ordem de serviço
   */
  fastify.post<{
    Body: CreateOrderDTO;
  }>('/', {
    preHandler: [
      requirePermission('orders:create'),
      createValidation({ body: createOrderSchema })
    ],
    handler: async (request: FastifyRequest<{ Body: CreateOrderDTO }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const order = await orderService.create(request.body, companyId, userId);
        
        return reply.status(201).send({
          success: true,
          data: order,
          message: 'Ordem de serviço criada com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Listar ordens com filtros e paginação
   */
  fastify.get<{
    Querystring: OrderFiltersDTO;
  }>('/', {
    preHandler: [
      requirePermission('orders:read'),
      createValidation({ querystring: orderFiltersSchema })
    ],
    handler: async (request: FastifyRequest<{ Querystring: OrderFiltersDTO }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const result = await orderService.findMany(request.query, companyId, userId);
        
        return reply.send({
          success: true,
          data: result.orders,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Buscar ordem por ID
   */
  fastify.get<{
    Params: { id: string };
  }>('/:id', {
    preHandler: [requirePermission('orders:read')],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const order = await orderService.findById(request.params.id, companyId, userId);
        
        return reply.send({
          success: true,
          data: order
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Atualizar ordem
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateOrderDTO;
  }>('/:id', {
    preHandler: [
      requirePermission('orders:update'),
      createValidation({ body: updateOrderSchema })
    ],
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateOrderDTO }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const order = await orderService.update(request.params.id, request.body, companyId, userId);
        
        return reply.send({
          success: true,
          data: order,
          message: 'Ordem de serviço atualizada com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Excluir ordem (soft delete)
   */
  fastify.delete<{
    Params: { id: string };
  }>('/:id', {
    preHandler: [requirePermission('orders:delete')],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        await orderService.delete(request.params.id, companyId, userId);
        
        return reply.send({
          success: true,
          message: 'Ordem de serviço excluída com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Restaurar ordem excluída
   */
  fastify.post<{
    Params: { id: string };
  }>('/:id/restore', {
    preHandler: [requirePermission('orders:restore')],
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const order = await orderService.restore(request.params.id, companyId, userId);
        
        return reply.send({
          success: true,
          data: order,
          message: 'Ordem de serviço restaurada com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Atualizar status da ordem
   */
  fastify.patch<{
    Params: { id: string };
    Body: UpdateOrderStatusDTO;
  }>('/:id/status', {
    preHandler: [
      requirePermission('orders:update'),
      createValidation({ body: updateOrderStatusSchema })
    ],
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateOrderStatusDTO }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const order = await orderService.updateStatus(request.params.id, request.body, companyId, userId);
        
        return reply.send({
          success: true,
          data: order,
          message: 'Status da ordem atualizado com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Atribuir ordem a um funcionário
   */
  fastify.patch<{
    Params: { id: string };
    Body: AssignOrderDTO;
  }>('/:id/assign', {
    preHandler: [
      requirePermission('orders:assign'),
      createValidation({ body: assignOrderSchema })
    ],
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: AssignOrderDTO }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const order = await orderService.assign(request.params.id, request.body, companyId, userId);
        
        return reply.send({
          success: true,
          data: order,
          message: 'Ordem atribuída com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Adicionar registro de tempo
   */
  fastify.post<{
    Params: { id: string };
    Body: AddOrderTimeTrackingDTO;
  }>('/:id/time-tracking', {
    preHandler: [
      requirePermission('orders:time_tracking'),
      createValidation({ body: addOrderTimeTrackingSchema })
    ],
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: AddOrderTimeTrackingDTO }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        await orderService.addTimeTracking(request.params.id, request.body, companyId, userId);
        
        return reply.status(201).send({
          success: true,
          message: 'Registro de tempo adicionado com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Atualizar registro de tempo
   */
  fastify.put<{
    Params: { timeTrackingId: string };
    Body: UpdateOrderTimeTrackingDTO;
  }>('/time-tracking/:timeTrackingId', {
    preHandler: [
      requirePermission('orders:time_tracking'),
      createValidation({ body: updateOrderTimeTrackingSchema })
    ],
    handler: async (request: FastifyRequest<{ Params: { timeTrackingId: string }; Body: UpdateOrderTimeTrackingDTO }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        await orderService.updateTimeTracking(request.params.timeTrackingId, request.body, companyId, userId);
        
        return reply.send({
          success: true,
          message: 'Registro de tempo atualizado com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Remover registro de tempo
   */
  fastify.delete<{
    Params: { timeTrackingId: string };
  }>('/time-tracking/:timeTrackingId', {
    preHandler: [requirePermission('orders:time_tracking')],
    handler: async (request: FastifyRequest<{ Params: { timeTrackingId: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        await orderService.removeTimeTracking(request.params.timeTrackingId, companyId, userId);
        
        return reply.send({
          success: true,
          message: 'Registro de tempo removido com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Adicionar despesa
   */
  fastify.post<{
    Params: { id: string };
    Body: AddOrderExpenseDTO;
  }>('/:id/expenses', {
    preHandler: [
      requirePermission('orders:expenses'),
      createValidation({ body: addOrderExpenseSchema })
    ],
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: AddOrderExpenseDTO }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        await orderService.addExpense(request.params.id, request.body, companyId, userId);
        
        return reply.status(201).send({
          success: true,
          message: 'Despesa adicionada com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Atualizar despesa
   */
  fastify.put<{
    Params: { expenseId: string };
    Body: UpdateOrderExpenseDTO;
  }>('/expenses/:expenseId', {
    preHandler: [
      requirePermission('orders:expenses'),
      createValidation({ body: updateOrderExpenseSchema })
    ],
    handler: async (request: FastifyRequest<{ Params: { expenseId: string }; Body: UpdateOrderExpenseDTO }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        await orderService.updateExpense(request.params.expenseId, request.body, companyId, userId);
        
        return reply.send({
          success: true,
          message: 'Despesa atualizada com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Remover despesa
   */
  fastify.delete<{
    Params: { expenseId: string };
  }>('/expenses/:expenseId', {
    preHandler: [requirePermission('orders:expenses')],
    handler: async (request: FastifyRequest<{ Params: { expenseId: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        await orderService.removeExpense(request.params.expenseId, companyId, userId);
        
        return reply.send({
          success: true,
          message: 'Despesa removida com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Obter estatísticas das ordens
   */
  fastify.get('/stats', {
    preHandler: [requirePermission('orders:delete')],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const stats = await orderService.getStats(companyId, userId);
        
        return reply.send({
          success: true,
          data: stats
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Gerar relatório de ordens
   */
  fastify.get<{
    Querystring: OrderFiltersDTO & { format?: 'json' | 'csv' };
  }>('/report', {
    preHandler: [requirePermission('orders:export')],
    handler: async (request: FastifyRequest<{ Querystring: OrderFiltersDTO & { format?: 'json' | 'csv' } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { format = 'json', ...filters } = request.query;
        
        const report = await orderService.generateReport(filters, format, companyId, userId);
        
        if (format === 'csv') {
          reply.header('Content-Type', 'text/csv');
          reply.header('Content-Disposition', 'attachment; filename="relatorio-ordens.csv"');
          return reply.send(report);
        }
        
        return reply.send({
          success: true,
          data: report
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Obter dados para dashboard
   */
  fastify.get('/dashboard', {
    preHandler: [requirePermission('orders:dashboard')],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const dashboard = await orderService.getDashboard(companyId, userId);
        
        return reply.send({
          success: true,
          data: dashboard
        });
      } catch (error) {
        if (error instanceof AppError) {
          return reply.status(error.statusCode).send({
            success: false,
            message: error.message
          });
        }
        
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });
}