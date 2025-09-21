import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFiltersDto,
  createProductDto,
  updateProductDto,
  productFiltersDto
} from '../dtos';
import { ProductService } from '../services';
import { authMiddleware } from '../../../shared/middlewares/auth';
import { tenantMiddleware } from '../../../shared/middlewares/tenant';
import { createValidation } from '../../../shared/middlewares/validation';

/**
 * Rotas para gerenciamento de produtos
 */
export async function productRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  const productService = new ProductService(prisma);

  // Aplicar middlewares globais
  await fastify.register(authMiddleware);
  await fastify.register(tenantMiddleware);

  /**
   * Criar produto
   */
  fastify.post<{
    Body: CreateProductDto;
  }>(
    '/',
    {
      preHandler: [createValidation({ body: createProductDto })]
    },
    async (request: FastifyRequest<{ Body: CreateProductDto }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const product = await productService.create(request.body, companyId, userId);
        
        return reply.code(201).send({
          success: true,
          data: product,
          message: 'Produto criado com sucesso'
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
   * Listar produtos com filtros
   */
  fastify.get<{
    Querystring: ProductFiltersDto;
  }>(
    '/',
    {
      preHandler: [createValidation({ querystring: productFiltersDto })]
    },
    async (request: FastifyRequest<{ Querystring: ProductFiltersDto }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const result = await productService.findMany(companyId, userId, request.query);
        
        return reply.send({
          success: true,
          data: result.products,
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
   * Buscar produto por ID
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const product = await productService.findById(request.params.id, companyId, userId);
        
        if (!product) {
          return reply.code(404).send({
            success: false,
            message: 'Produto não encontrado'
          });
        }
        
        return reply.send({
          success: true,
          data: product
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
   * Atualizar produto
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateProductDto;
  }>(
    '/:id',
    {
      preHandler: [createValidation({ body: updateProductDto })]
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateProductDto }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const product = await productService.update(
          request.params.id,
          request.body,
          companyId,
          userId
        );
        
        return reply.send({
          success: true,
          data: product,
          message: 'Produto atualizado com sucesso'
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
   * Excluir produto (soft delete)
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        await productService.delete(request.params.id, companyId, userId);
        
        return reply.send({
          success: true,
          message: 'Produto excluído com sucesso'
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
   * Restaurar produto
   */
  fastify.patch<{
    Params: { id: string };
  }>(
    '/:id/restore',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const product = await productService.restore(request.params.id, companyId, userId);
        
        return reply.send({
          success: true,
          data: product,
          message: 'Produto restaurado com sucesso'
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
   * Buscar produtos por categoria
   */
  fastify.get<{
    Params: { categoryId: string };
    Querystring: { page?: number; limit?: number; includeSubcategories?: boolean };
  }>(
    '/category/:categoryId',
    async (request: FastifyRequest<{
      Params: { categoryId: string };
      Querystring: { page?: number; limit?: number; includeSubcategories?: boolean };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { page = 1, limit = 20, includeSubcategories = false } = request.query;
        
        const result = await productService.findByCategory(
          request.params.categoryId,
          companyId,
          userId,
          { page, limit, includeSubcategories }
        );
        
        return reply.send({
          success: true,
          data: result.products,
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
   * Buscar produtos com estoque baixo
   */
  fastify.get(
    '/low-stock',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const products = await productService.findLowStock(companyId, userId);
        
        return reply.send({
          success: true,
          data: products
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
   * Buscar produtos sem estoque
   */
  fastify.get(
    '/out-of-stock',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const products = await productService.findOutOfStock(companyId, userId);
        
        return reply.send({
          success: true,
          data: products
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
   * Obter estatísticas de produtos
   */
  fastify.get(
    '/stats',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const stats = await productService.getStats(companyId, userId);
        
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
   * Atualizar estoque do produto
   */
  fastify.patch<{
    Params: { id: string };
    Body: { stock: number };
  }>(
    '/:id/stock',
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { stock: number };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { stock } = request.body;
        
        if (typeof stock !== 'number' || stock < 0) {
          return reply.code(400).send({
            success: false,
            message: 'Estoque deve ser um número não negativo'
          });
        }
        
        const product = await productService.updateStock(
          request.params.id,
          stock,
          companyId,
          userId
        );
        
        return reply.send({
          success: true,
          data: product,
          message: 'Estoque atualizado com sucesso'
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
   * Ajustar estoque do produto
   */
  fastify.post<{
    Params: { id: string };
    Body: { adjustment: number; reason: string };
  }>(
    '/:id/adjust-stock',
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { adjustment: number; reason: string };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { adjustment, reason } = request.body;
        
        if (typeof adjustment !== 'number' || adjustment === 0) {
          return reply.code(400).send({
            success: false,
            message: 'Ajuste deve ser um número diferente de zero'
          });
        }
        
        if (!reason || reason.trim().length < 3) {
          return reply.code(400).send({
            success: false,
            message: 'Motivo do ajuste é obrigatório e deve ter pelo menos 3 caracteres'
          });
        }
        
        const result = await productService.adjustStock(
          request.params.id,
          adjustment,
          reason,
          companyId,
          userId
        );
        
        return reply.send({
          success: true,
          data: result,
          message: 'Estoque ajustado com sucesso'
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
   * Verificar disponibilidade de SKU
   */
  fastify.get<{
    Querystring: { sku: string; excludeId?: string };
  }>(
    '/check-sku',
    async (request: FastifyRequest<{
      Querystring: { sku: string; excludeId?: string };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { sku, excludeId } = request.query;
        
        if (!sku) {
          return reply.code(400).send({
            success: false,
            message: 'SKU é obrigatório'
          });
        }
        
        const result = await productService.checkSkuAvailability(
          sku,
          companyId,
          userId,
          excludeId
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
   * Gerar relatório de produtos
   */
  fastify.get<{
    Querystring: {
      categoryId?: string;
      active?: boolean;
      trackStock?: boolean;
      lowStock?: boolean;
      outOfStock?: boolean;
      format?: 'json' | 'csv';
    };
  }>(
    '/report',
    async (request: FastifyRequest<{
      Querystring: {
        categoryId?: string;
        active?: boolean;
        trackStock?: boolean;
        lowStock?: boolean;
        outOfStock?: boolean;
        format?: 'json' | 'csv';
      };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const report = await productService.findForReport(companyId, userId, request.query);
        
        if (request.query.format === 'csv') {
          reply.header('Content-Type', 'text/csv');
          reply.header('Content-Disposition', 'attachment; filename="produtos.csv"');
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