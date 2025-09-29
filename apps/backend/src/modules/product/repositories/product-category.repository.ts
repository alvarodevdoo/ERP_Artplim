import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../../../shared/errors/AppError';

export class ProductCategoryRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: any, companyId: string): Promise<any> {
    try {
      return await this.prisma.productCategory.create({
        data: {
          ...data,
          companyId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('Uma categoria com este nome e na mesma categoria pai já existe.', 409);
      }
      throw new AppError('Erro ao criar categoria de produto.', 500);
    }
  }

  async findMany(companyId: string): Promise<any[]> {
    try {
      return await this.prisma.productCategory.findMany({
        where: { companyId, deletedAt: null },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      throw new AppError('Erro ao buscar categorias de produto.', 500);
    }
  }

  async findById(id: string, companyId: string): Promise<any | null> {
    try {
      return await this.prisma.productCategory.findFirst({
        where: { id, companyId, deletedAt: null },
      });
    } catch (error) {
      throw new AppError('Erro ao buscar categoria de produto.', 500);
    }
  }

  async update(id: string, data: any, companyId: string): Promise<any> {
    try {
      return await this.prisma.productCategory.update({
        where: { id, companyId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new AppError('Categoria não encontrada.', 404);
      }
      throw new AppError('Erro ao atualizar categoria de produto.', 500);
    }
  }

  async delete(id: string, companyId: string): Promise<void> {
    try {
      await this.prisma.productCategory.update({
        where: { id, companyId },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new AppError('Categoria não encontrada.', 404);
      }
      throw new AppError('Erro ao deletar categoria de produto.', 500);
    }
  }
}
