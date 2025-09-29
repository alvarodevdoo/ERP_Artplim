import { PrismaClient, Prisma } from '@prisma/client';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFiltersDto,
  ProductResponseDto,
  ProductListResponseDto,
  ProductStatsDto
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';

export class ProductRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateProductDto, companyId: string): Promise<ProductResponseDto> {
    try {
      const product = await this.prisma.product.create({
        data: {
          name: data.name,
          description: data.description,
          sku: data.sku,
          categoryId: data.categoryId,
          unit: data.unit,
          costPrice: data.costPrice,
          salePrice: data.salePrice,
          minStock: data.minStock,
          maxStock: data.maxStock,
          currentStock: data.currentStock,
          trackStock: data.trackStock,
          isActive: data.isActive,
          companyId: companyId,
        },
        include: {
          variants: true,
          category: true,
        },
      });
      return this.formatProductResponse(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('SKU já existe para esta empresa', 409);
      }
      throw new AppError('Erro ao criar produto', 500);
    }
  }

  async findById(id: string, companyId: string): Promise<ProductResponseDto | null> {
    try {
      const product = await this.prisma.product.findFirst({
        where: { id, companyId },
        include: { 
          variants: true,
          category: true
        },
      });
      return product ? this.formatProductResponse(product) : null;
    } catch {
      throw new AppError('Erro ao buscar produto', 500);
    }
  }

  async findMany(filters: ProductFiltersDto, companyId: string): Promise<ProductListResponseDto> {
    try {
      const { search, categoryId, isActive, minPrice, maxPrice, inStock, sortBy, sortOrder } = filters;

      const page = parseInt(String(filters.page) || '1', 10);
      const limit = parseInt(String(filters.limit) || '10', 10);

      const where: Prisma.ProductWhereInput = {
        companyId,
        ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] }),
        ...(categoryId && { categoryId }),
        ...(isActive !== undefined && { isActive }),
        ...(minPrice !== undefined && { salePrice: { gte: minPrice } }),
        ...(maxPrice !== undefined && { salePrice: { lte: maxPrice } }),
        ...(inStock !== undefined && inStock && { currentStock: { gt: 0 } }),
      };

      if (isActive === true) {
        where.deletedAt = null;
      }

      const orderBy: Prisma.ProductOrderByWithRelationInput = sortBy && sortOrder ? { [sortBy]: sortOrder } : { createdAt: 'desc' };

      const [products, total] = await this.prisma.$transaction([
        this.prisma.product.findMany({
          where,
          include: { 
            variants: true,
            category: true
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.product.count({ where }),
      ]);

      return {
        products: products.map(this.formatProductResponse),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no banco de dados';
      throw new AppError(`Erro ao buscar produtos: ${errorMessage}`, 500);
    }
  }

  async update(id: string, data: UpdateProductDto, companyId: string): Promise<ProductResponseDto> {
    try {
      const updateData: Prisma.ProductUpdateInput = { updatedAt: new Date() };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.sku !== undefined) updateData.sku = data.sku;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.unit !== undefined) updateData.unit = data.unit;
      if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
      if (data.salePrice !== undefined) updateData.salePrice = data.salePrice;
      if (data.minStock !== undefined) updateData.minStock = data.minStock;
      if (data.currentStock !== undefined) updateData.currentStock = data.currentStock;
      if (data.trackStock !== undefined) updateData.trackStock = data.trackStock;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      if (data.isActive === true) {
        updateData.deletedAt = null;
      }

      const product = await this.prisma.product.update({
        where: { id, companyId },
        data: updateData,
        include: { variants: true, category: true },
      });
      return this.formatProductResponse(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new AppError('SKU já existe para esta empresa', 409);
        if (error.code === 'P2025') throw new AppError('Produto não encontrado', 404);
      }
      throw new AppError('Erro ao atualizar produto', 500);
    }
  }

  async delete(id: string, companyId: string): Promise<void> {
    try {
      await this.prisma.product.update({
        where: { id, companyId, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new AppError('Produto não encontrado', 404);
      }
      throw new AppError('Erro ao deletar produto', 500);
    }
  }

  async restore(id: string, companyId: string): Promise<ProductResponseDto> {
    try {
      const product = await this.prisma.product.update({
        where: { id, companyId },
        data: { deletedAt: null, isActive: true },
        include: { variants: true },
      });
      return this.formatProductResponse(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new AppError('Produto não encontrado para restaurar', 404);
      }
      throw new AppError('Erro ao restaurar produto', 500);
    }
  }

  async skuExists(sku: string, companyId: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: {
        sku,
        companyId,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }

  async reactivate(id: string, companyId: string, resetStock: boolean): Promise<ProductResponseDto> {
    try {
      const updateData: Prisma.ProductUpdateInput = {
        isActive: true,
        deletedAt: null,
      };
      if (resetStock) {
        updateData.currentStock = 0;
      }
      const product = await this.prisma.product.update({
        where: { id, companyId },
        data: updateData,
        include: { variants: true, category: true },
      });
      return this.formatProductResponse(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new AppError('Produto não encontrado para reativar', 404);
      }
      throw new AppError('Erro ao reativar produto', 500);
    }
  }

  async getOverallProductStats(companyId: string): Promise<{ totalProducts: number; activeProducts: number }> {
    const totalProducts = await this.prisma.product.count({
      where: { companyId },
    });
    const activeProducts = await this.prisma.product.count({
      where: { companyId, isActive: true, deletedAt: null },
    });
    return { totalProducts, activeProducts };
  }

  private formatProductResponse(product: any): any {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      categoryId: product.categoryId,
      category: product.category,
      unit: product.unit,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      minStock: product.minStock,
      currentStock: product.currentStock,
      trackStock: product.trackStock,
      isActive: product.isActive,
      companyId: product.companyId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
      variants: product.variants || [],
    };
  }
}