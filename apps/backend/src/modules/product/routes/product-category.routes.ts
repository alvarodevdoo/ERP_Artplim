import { FastifyInstance } from 'fastify';
import { ProductCategoryService } from '../services/product-category.service';
import { createValidation } from '../../../shared/middlewares/validation';
import { createProductCategoryDto } from '../dtos';

export async function productCategoryRoutes(fastify: FastifyInstance) {
  const service = new ProductCategoryService(fastify.prisma);

  fastify.get('/', async (request, reply) => {
    const categories = await service.findMany(request.companyId);
    return reply.send({ success: true, data: categories });
  });

  fastify.post(
    '/',
    {
      preHandler: [createValidation({ body: createProductCategoryDto })],
    },
    async (request, reply) => {
      const category = await service.create(request.body, request.companyId);
      return reply.status(201).send({ success: true, data: category });
    },
  );

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const category = await service.findById(id, request.companyId);
    if (!category) {
      return reply.status(404).send({ success: false, message: 'Categoria não encontrada' });
    }
    return reply.send({ success: true, data: category });
  });

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const category = await service.update(id, request.body, request.companyId);
    return reply.send({ success: true, data: category });
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(id, request.companyId);
    return reply.status(204).send();
  });
}
