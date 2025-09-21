import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  createProductCategoryDto,
  updateProductCategoryDto
} from '../dtos';
import { ProductCategoryService } from '../services';
import { authMiddleware } from '../../../shared/middlewares/auth';
import { tenantMiddleware } from '../../../shared/middlewares/tenant';
import { createValidation } from '../../../shared/middlewares/validation';

/**
 * Rotas para gerenciamento de categorias de produtos
 */
export async function productCategoryRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();
  const categoryService = new ProductCategoryService(prisma);

  // Aplicar middlewares globais
  await fastify.register(authMiddleware);
  await fastify.register(tenantMiddleware);

  /**
   * Criar categoria
   */
  fastify.post<{
    Body: CreateProductCategoryDto;
  }>(
    '/',
    {
      preHandler: [createValidation({ body: createProductCategoryDto })]
    },
    async (request: FastifyRequest<{ Body: CreateProductCategoryDto }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const category = await categoryService.create(request.body, companyId, userId);
        
        return reply.code(201).send({
          success: true,
          data: category,
          message: 'Categoria criada com sucesso'
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
   * Listar categorias
   */
  fastify.get<{
    Querystring: {
      parentId?: string;
      active?: boolean;
      page?: number;
      limit?: number;
      search?: string;
    };
  }>(
    '/',
    async (request: FastifyRequest<{
      Querystring: {
        parentId?: string;
        active?: boolean;
        page?: number;
        limit?: number;
        search?: string;
      };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const result = await categoryService.findMany(companyId, userId, request.query);
        
        return reply.send({
          success: true,
          data: result.categories,
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
   * Buscar categoria por ID
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const category = await categoryService.findById(request.params.id, companyId, userId);
        
        if (!category) {
          return reply.code(404).send({
            success: false,
            message: 'Categoria não encontrada'
          });
        }
        
        return reply.send({
          success: true,
          data: category
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
   * Atualizar categoria
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateProductCategoryDto;
  }>(
    '/:id',
    {
      preHandler: [createValidation({ body: updateProductCategoryDto })]
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateProductCategoryDto }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const category = await categoryService.update(
          request.params.id,
          request.body,
          companyId,
          userId
        );
        
        return reply.send({
          success: true,
          data: category,
          message: 'Categoria atualizada com sucesso'
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
   * Excluir categoria (soft delete)
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        await categoryService.delete(request.params.id, companyId, userId);
        
        return reply.send({
          success: true,
          message: 'Categoria excluída com sucesso'
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
   * Restaurar categoria
   */
  fastify.patch<{
    Params: { id: string };
  }>(
    '/:id/restore',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const category = await categoryService.restore(request.params.id, companyId, userId);
        
        return reply.send({
          success: true,
          data: category,
          message: 'Categoria restaurada com sucesso'
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
   * Buscar categorias raiz (sem categoria pai)
   */
  fastify.get(
    '/root',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const categories = await categoryService.findRootCategories(companyId, userId);
        
        return reply.send({
          success: true,
          data: categories
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
   * Buscar subcategorias de uma categoria
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id/children',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const children = await categoryService.findChildren(request.params.id, companyId, userId);
        
        return reply.send({
          success: true,
          data: children
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
   * Verificar disponibilidade de nome
   */
  fastify.get<{
    Querystring: { name: string; parentId?: string; excludeId?: string };
  }>(
    '/check-name',
    async (request: FastifyRequest<{
      Querystring: { name: string; parentId?: string; excludeId?: string };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { name, parentId, excludeId } = request.query;
        
        if (!name) {
          return reply.code(400).send({
            success: false,
            message: 'Nome é obrigatório'
          });
        }
        
        const result = await categoryService.checkNameAvailability(
          name,
          companyId,
          userId,
          parentId,
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
   * Reordenar categorias
   */
  fastify.patch<{
    Body: { categoryIds: string[] };
  }>(
    '/reorder',
    async (request: FastifyRequest<{ Body: { categoryIds: string[] } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { categoryIds } = request.body;
        
        if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
          return reply.code(400).send({
            success: false,
            message: 'Lista de IDs de categorias é obrigatória'
          });
        }
        
        await categoryService.reorder(categoryIds, companyId, userId);
        
        return reply.send({
          success: true,
          message: 'Categorias reordenadas com sucesso'
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
   * Obter árvore de categorias
   */
  fastify.get(
    '/tree',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const tree = await categoryService.getCategoryTree(companyId, userId);
        
        return reply.send({
          success: true,
          data: tree
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
   * Mover categoria para outro pai
   */
  fastify.patch<{
    Params: { id: string };
    Body: { newParentId?: string };
  }>(
    '/:id/move',
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { newParentId?: string };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { newParentId } = request.body;
        
        const category = await categoryService.moveCategory(
          request.params.id,
          newParentId,
          companyId,
          userId
        );
        
        return reply.send({
          success: true,
          data: category,
          message: 'Categoria movida com sucesso'
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
   * Duplicar categoria
   */
  fastify.post<{
    Params: { id: string };
    Body: { name?: string; includeProducts?: boolean };
  }>(
    '/:id/duplicate',
    async (request: FastifyRequest<{
      Params: { id: string };
      Body: { name?: string; includeProducts?: boolean };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        const { name, includeProducts = false } = request.body;
        
        const category = await categoryService.duplicate(
          request.params.id,
          companyId,
          userId,
          name,
          includeProducts
        );
        
        return reply.code(201).send({
          success: true,
          data: category,
          message: 'Categoria duplicada com sucesso'
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
   * Obter estatísticas da categoria
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id/stats',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, userId } = request.user;
        
        // Buscar categoria
        const category = await categoryService.findById(request.params.id, companyId, userId);
        if (!category) {
          return reply.code(404).send({
            success: false,
            message: 'Categoria não encontrada'
          });
        }
        
        // Buscar subcategorias
        const children = await categoryService.findChildren(request.params.id, companyId, userId);
        
        // Aqui você pode adicionar mais estatísticas conforme necessário
        const stats = {
          id: category.id,
          name: category.name,
          totalSubcategories: children.length,
          // totalProducts: 0, // Implementar quando tiver relação com produtos
          level: category.level,
          hasChildren: children.length > 0
        };
        
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
}