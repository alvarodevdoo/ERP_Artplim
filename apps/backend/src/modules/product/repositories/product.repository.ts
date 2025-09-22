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

/**
 * Repositório para gerenciamento de produtos
 * Implementa operações CRUD e consultas específicas
 */
export class ProductRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Criar novo produto
   */
  async create(data: CreateProductDto, companyId: string): Promise<ProductResponseDto> {
    try {
      const { variations, dimensions, ...productData } = data;

      const product = await this.prisma.product.create({
        data: {
          ...productData,
          companyId,
          dimensions: dimensions ? JSON.stringify(dimensions) : null,
          variations: variations ? {
            create: variations.map(variation => ({
              ...variation,
              companyId,
              attributes: variation.attributes ? JSON.stringify(variation.attributes) : null
            }))
          } : undefined
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          variations: true
        }
      });

      return this.formatProductResponse(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError('SKU já existe para esta empresa', 409);
        }
      }
      throw new AppError('Erro ao criar produto', 500);
    }
  }

  /**
   * Buscar produto por ID
   */
  async findById(id: string, companyId: string): Promise<ProductResponseDto | null> {
    try {
      const product = await this.prisma.product.findFirst({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          variations: {
            where: {
              deletedAt: null
            }
          }
        }
      });

      return product ? this.formatProductResponse(product) : null;
    } catch {
      throw new AppError('Erro ao buscar produto', 500);
    }
  }

  /**
   * Buscar produtos com filtros e paginação
   */
  async findMany(filters: ProductFiltersDto, companyId: string): Promise<ProductListResponseDto> {
    try {
      const {
        search,
        categoryId,
        isActive,
        isService,
        hasVariations,
        minPrice,
        maxPrice,
        inStock,
        lowStock,
        tags,
        page,
        limit,
        sortBy,
        sortOrder
      } = filters;

      const where: Prisma.ProductWhereInput = {
        companyId,
        deletedAt: null,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(categoryId && { categoryId }),
        ...(isActive !== undefined && { isActive }),
        ...(isService !== undefined && { isService }),
        ...(hasVariations !== undefined && { hasVariations }),
        ...(minPrice !== undefined && { salePrice: { gte: minPrice } }),
        ...(maxPrice !== undefined && { salePrice: { lte: maxPrice } }),
        ...(inStock !== undefined && inStock && { currentStock: { gt: 0 } }),
        ...(lowStock !== undefined && lowStock && {
          currentStock: {
            lte: this.prisma.product.fields.minStock
          }
        }),
        ...(tags && tags.length > 0 && {
          tags: {
            hasSome: tags
          }
        })
      };

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                description: true
              }
            },
            variations: {
              where: {
                deletedAt: null
              }
            }
          },
          orderBy: {
            [sortBy]: sortOrder
          },
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.product.count({ where })
      ]);

      const formattedProducts = products.map(product => this.formatProductResponse(product));

      return {
        products: formattedProducts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch {
      throw new AppError('Erro ao buscar produtos', 500);
    }
  }

  /**
   * Atualizar produto
   */
  async update(id: string, data: UpdateProductDto, companyId: string): Promise<ProductResponseDto> {
    try {
      const { variations: _variations, dimensions, ...productData } = data;
      // _variations não é usado neste método, apenas extraído para não ser incluído em productData

      const product = await this.prisma.product.update({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        data: {
          ...productData,
          dimensions: dimensions ? JSON.stringify(dimensions) : undefined,
          updatedAt: new Date()
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          variations: {
            where: {
              deletedAt: null
            }
          }
        }
      });

      return this.formatProductResponse(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError('SKU já existe para esta empresa', 409);
        }
        if (error.code === 'P2025') {
          throw new AppError('Produto não encontrado', 404);
        }
      }
      throw new AppError('Erro ao atualizar produto', 500);
    }
  }

  /**
   * Deletar produto (soft delete)
   */
  async delete(id: string, companyId: string): Promise<void> {
    try {
      await this.prisma.product.update({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        data: {
          deletedAt: new Date(),
          isActive: false
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('Produto não encontrado', 404);
        }
      }
      throw new AppError('Erro ao deletar produto', 500);
    }
  }

  /**
   * Restaurar produto
   */
  async restore(id: string, companyId: string): Promise<ProductResponseDto> {
    try {
      const product = await this.prisma.product.update({
        where: {
          id,
          companyId
        },
        data: {
          deletedAt: null,
          isActive: true,
          updatedAt: new Date()
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          variations: {
            where: {
              deletedAt: null
            }
          }
        }
      });

      return this.formatProductResponse(product);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('Produto não encontrado', 404);
        }
      }
      throw new AppError('Erro ao restaurar produto', 500);
    }
  }

  /**
   * Verificar se SKU existe
   */
  async skuExists(sku: string, companyId: string, excludeId?: string): Promise<boolean> {
    try {
      const product = await this.prisma.product.findFirst({
        where: {
          sku,
          companyId,
          deletedAt: null,
          ...(excludeId && { id: { not: excludeId } })
        }
      });

      return !!product;
    } catch {
      throw new AppError('Erro ao verificar SKU', 500);
    }
  }

  /**
   * Buscar produtos por categoria
   */
  async findByCategory(categoryId: string, companyId: string): Promise<ProductResponseDto[]> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          categoryId,
          companyId,
          deletedAt: null,
          isActive: true
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          variations: {
            where: {
              deletedAt: null
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      return products.map(product => this.formatProductResponse(product));
    } catch {
      throw new AppError('Erro ao buscar produtos por categoria', 500);
    }
  }

  /**
   * Buscar produtos com estoque baixo
   */
  async findLowStock(companyId: string): Promise<ProductResponseDto[]> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          companyId,
          deletedAt: null,
          isActive: true,
          isService: false,
          currentStock: {
            lte: this.prisma.product.fields.minStock
          }
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          variations: {
            where: {
              deletedAt: null
            }
          }
        },
        orderBy: {
          currentStock: 'asc'
        }
      });

      return products.map(product => this.formatProductResponse(product));
    } catch {
      throw new AppError('Erro ao buscar produtos com estoque baixo', 500);
    }
  }

  /**
   * Buscar produtos sem estoque
   */
  async findOutOfStock(companyId: string): Promise<ProductResponseDto[]> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          companyId,
          deletedAt: null,
          isActive: true,
          isService: false,
          currentStock: 0
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          variations: {
            where: {
              deletedAt: null
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      return products.map(product => this.formatProductResponse(product));
    } catch {
      throw new AppError('Erro ao buscar produtos sem estoque', 500);
    }
  }

  /**
   * Obter estatísticas de produtos
   */
  async getStats(companyId: string): Promise<ProductStatsDto> {
    try {
      const [stats, topCategories, recentlyAdded] = await Promise.all([
        this.prisma.product.aggregate({
          where: {
            companyId,
            deletedAt: null
          },
          _count: {
            id: true
          },
          _sum: {
            currentStock: true
          },
          _avg: {
            salePrice: true
          }
        }),
        this.prisma.productCategory.findMany({
          where: {
            companyId,
            deletedAt: null
          },
          include: {
            _count: {
              select: {
                products: {
                  where: {
                    deletedAt: null
                  }
                }
              }
            }
          },
          orderBy: {
            products: {
              _count: 'desc'
            }
          },
          take: 5
        }),
        this.prisma.product.findMany({
          where: {
            companyId,
            deletedAt: null
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                description: true
              }
            },
            variations: {
              where: {
                deletedAt: null
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        })
      ]);

      const [activeCount, inactiveCount, servicesCount, physicalCount, variationsCount, lowStockCount, outOfStockCount] = await Promise.all([
        this.prisma.product.count({
          where: {
            companyId,
            deletedAt: null,
            isActive: true
          }
        }),
        this.prisma.product.count({
          where: {
            companyId,
            deletedAt: null,
            isActive: false
          }
        }),
        this.prisma.product.count({
          where: {
            companyId,
            deletedAt: null,
            isService: true
          }
        }),
        this.prisma.product.count({
          where: {
            companyId,
            deletedAt: null,
            isService: false
          }
        }),
        this.prisma.product.count({
          where: {
            companyId,
            deletedAt: null,
            hasVariations: true
          }
        }),
        this.prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM "Product"
          WHERE "companyId" = ${companyId}
            AND "deletedAt" IS NULL
            AND "isActive" = true
            AND "isService" = false
            AND "currentStock" <= "minStock"
        `,
        this.prisma.product.count({
          where: {
            companyId,
            deletedAt: null,
            isActive: true,
            isService: false,
            currentStock: 0
          }
        })
      ]);

      // Calcular valor total do estoque
      const stockValue = await this.prisma.product.aggregate({
        where: {
          companyId,
          deletedAt: null,
          isService: false
        },
        _sum: {
          currentStock: true
        }
      });

      const totalStockValue = stockValue._sum.currentStock || 0;

      return {
        totalProducts: stats._count.id,
        activeProducts: activeCount,
        inactiveProducts: inactiveCount,
        services: servicesCount,
        physicalProducts: physicalCount,
        productsWithVariations: variationsCount,
        lowStockProducts: Array.isArray(lowStockCount) ? lowStockCount[0]?.count || 0 : 0,
        outOfStockProducts: outOfStockCount,
        totalStockValue,
        averagePrice: stats._avg.salePrice || 0,
        topCategories: topCategories.map(category => ({
          categoryId: category.id,
          categoryName: category.name,
          productCount: category._count.products
        })),
        recentlyAdded: recentlyAdded.map(product => this.formatProductResponse(product))
      };
    } catch {
      throw new AppError('Erro ao obter estatísticas de produtos', 500);
    }
  }

  /**
   * Atualizar estoque do produto
   */
  async updateStock(id: string, newStock: number, companyId: string): Promise<void> {
    try {
      await this.prisma.product.update({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        data: {
          currentStock: newStock,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('Produto não encontrado', 404);
        }
      }
      throw new AppError('Erro ao atualizar estoque', 500);
    }
  }

  /**
   * Buscar produtos para relatório
   */
  async findForReport(filters: Record<string, unknown>, companyId: string): Promise<ProductResponseDto[]> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...filters
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          variations: {
            where: {
              deletedAt: null
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      return products.map(product => this.formatProductResponse(product));
    } catch {
      throw new AppError('Erro ao buscar produtos para relatório', 500);
    }
  }

  /**
   * Formatar resposta do produto
   */
  private formatProductResponse(product: unknown): ProductResponseDto {
    const prod = product as {
      id: string;
      name: string;
      description?: string;
      sku: string;
      barcode?: string;
      categoryId?: string;
      category?: { id: string; name: string; description?: string };
      unitOfMeasure: string;
      costPrice: number;
      salePrice: number;
      minStock: number;
      maxStock?: number;
      currentStock: number;
      location?: string;
      weight?: number;
      dimensions?: string;
      images?: string[];
      isActive: boolean;
      isService: boolean;
      hasVariations: boolean;
      variations?: Array<{
        id: string;
        name: string;
        sku: string;
        costPrice: number;
        salePrice: number;
        stock: number;
        attributes?: string;
      }>;
      tags?: string[];
      notes?: string;
      companyId: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt?: Date;
    };
    
    return {
      id: prod.id,
      name: prod.name,
      description: prod.description,
      sku: prod.sku,
      barcode: prod.barcode,
      categoryId: prod.categoryId,
      category: prod.category,
      unitOfMeasure: prod.unitOfMeasure,
      costPrice: prod.costPrice,
      salePrice: prod.salePrice,
      minStock: prod.minStock,
      maxStock: prod.maxStock,
      currentStock: prod.currentStock,
      location: prod.location,
      weight: prod.weight,
      dimensions: prod.dimensions ? JSON.parse(prod.dimensions) : null,
      images: prod.images || [],
      isActive: prod.isActive,
      isService: prod.isService,
      hasVariations: prod.hasVariations,
      variations: prod.variations?.map((variation) => ({
        id: variation.id,
        name: variation.name,
        sku: variation.sku,
        costPrice: variation.costPrice,
        salePrice: variation.salePrice,
        stock: variation.stock,
        attributes: variation.attributes ? JSON.parse(variation.attributes) : {}
      })) || [],
      tags: prod.tags || [],
      notes: prod.notes,
      companyId: prod.companyId,
      createdAt: prod.createdAt,
      updatedAt: prod.updatedAt,
      deletedAt: prod.deletedAt
    };
  }
}