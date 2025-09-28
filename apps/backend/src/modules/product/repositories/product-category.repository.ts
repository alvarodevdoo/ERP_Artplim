import { PrismaClient, Prisma } from '@prisma/client';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  ProductCategoryResponseDto
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';

/**
 * Repositório para gerenciamento de categorias de produtos
 * Implementa operações CRUD e consultas específicas
 */
export class ProductCategoryRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Criar nova categoria
   */
  async create(data: CreateProductCategoryDto, companyId: string): Promise<ProductCategoryResponseDto> {
    try {
      const category = await this.prisma.productCategory.create({
        data: {
          ...data,
          companyId
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true
            }
          },
          children: {
            where: {
              deletedAt: null
            },
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  products: {
                    where: {
                      deletedAt: null
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              products: {
                where: {
                  deletedAt: null
                }
              }
            }
          }
        }
      });

      return this.formatCategoryResponse(category);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError('Nome da categoria já existe para esta empresa', 409);
        }
        if (error.code === 'P2003') {
          throw new AppError('Categoria pai não encontrada', 404);
        }
      }
      throw new AppError('Erro ao criar categoria', 500);
    }
  }

  /**
   * Buscar categoria por ID
   */
  async findById(id: string, companyId: string): Promise<ProductCategoryResponseDto | null> {
    try {
      const category = await this.prisma.productCategory.findFirst({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true
            }
          },
          children: {
            where: {
              deletedAt: null
            },
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  products: {
                    where: {
                      deletedAt: null
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              products: {
                where: {
                  deletedAt: null
                }
              }
            }
          }
        }
      });

      return category ? this.formatCategoryResponse(category) : null;
    } catch {
      throw new AppError('Erro ao buscar categoria', 500);
    }
  }

  /**
   * Buscar todas as categorias
   */
  async findMany(companyId: string, includeInactive = false): Promise<ProductCategoryResponseDto[]> {
    try {
      const categories = await this.prisma.productCategory.findMany({
        where: {
          companyId,
          deletedAt: null,
          ...(includeInactive ? {} : { isActive: true })
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true
            }
          },
          children: {
            where: {
              deletedAt: null
            },
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  products: {
                    where: {
                      deletedAt: null
                    }
                  }
                }
              }
            }
          },
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
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' }
        ]
      });

      return categories.map(category => this.formatCategoryResponse(category));
    } catch {
      throw new AppError('Erro ao buscar categorias', 500);
    }
  }

  /**
   * Buscar categorias raiz (sem pai)
   */
  async findRootCategories(companyId: string): Promise<ProductCategoryResponseDto[]> {
    try {
      const categories = await this.prisma.productCategory.findMany({
        where: {
          companyId,
          deletedAt: null,
          isActive: true,
          parentId: null
        },
        include: {
          children: {
            where: {
              deletedAt: null,
              isActive: true
            },
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  products: {
                    where: {
                      deletedAt: null
                    }
                  }
                }
              }
            }
          },
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
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' }
        ]
      });

      return categories.map(category => this.formatCategoryResponse(category));
    } catch {
      throw new AppError('Erro ao buscar categorias raiz', 500);
    }
  }

  /**
   * Buscar subcategorias de uma categoria
   */
  async findChildren(parentId: string, companyId: string): Promise<ProductCategoryResponseDto[]> {
    try {
      const categories = await this.prisma.productCategory.findMany({
        where: {
          parentId,
          companyId,
          deletedAt: null,
          isActive: true
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true
            }
          },
          children: {
            where: {
              deletedAt: null,
              isActive: true
            },
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  products: {
                    where: {
                      deletedAt: null
                    }
                  }
                }
              }
            }
          },
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
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' }
        ]
      });

      return categories.map(category => this.formatCategoryResponse(category));
    } catch {
      throw new AppError('Erro ao buscar subcategorias', 500);
    }
  }

  /**
   * Atualizar categoria
   */
  async update(id: string, data: UpdateProductCategoryDto, companyId: string): Promise<ProductCategoryResponseDto> {
    try {
      // Verificar se não está tentando definir a si mesma como pai
      if (data.parentId === id) {
        throw new AppError('Uma categoria não pode ser pai de si mesma', 400);
      }

      // Verificar se não está criando uma referência circular
      if (data.parentId) {
        const isCircular = await this.checkCircularReference(id, data.parentId, companyId);
        if (isCircular) {
          throw new AppError('Não é possível criar referência circular entre categorias', 400);
        }
      }

      const category = await this.prisma.productCategory.update({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true
            }
          },
          children: {
            where: {
              deletedAt: null
            },
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  products: {
                    where: {
                      deletedAt: null
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              products: {
                where: {
                  deletedAt: null
                }
              }
            }
          }
        }
      });

      return this.formatCategoryResponse(category);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError('Nome da categoria já existe para esta empresa', 409);
        }
        if (error.code === 'P2003') {
          throw new AppError('Categoria pai não encontrada', 404);
        }
        if (error.code === 'P2025') {
          throw new AppError('Categoria não encontrada', 404);
        }
      }
      throw new AppError('Erro ao atualizar categoria', 500);
    }
  }

  /**
   * Deletar categoria (soft delete)
   */
  async delete(id: string, companyId: string): Promise<void> {
    try {
      // Verificar se a categoria tem produtos
      const productCount = await this.prisma.product.count({
        where: {
          categoryId: id,
          companyId,
          deletedAt: null
        }
      });

      if (productCount > 0) {
        throw new AppError('Não é possível deletar categoria que possui produtos', 400);
      }

      // Verificar se a categoria tem subcategorias
      const childrenCount = await this.prisma.productCategory.count({
        where: {
          parentId: id,
          companyId,
          deletedAt: null
        }
      });

      if (childrenCount > 0) {
        throw new AppError('Não é possível deletar categoria que possui subcategorias', 400);
      }

      await this.prisma.productCategory.update({
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
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('Categoria não encontrada', 404);
        }
      }
      throw new AppError('Erro ao deletar categoria', 500);
    }
  }

  /**
   * Restaurar categoria
   */
  async restore(id: string, companyId: string): Promise<ProductCategoryResponseDto> {
    try {
      const category = await this.prisma.productCategory.update({
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
          parent: {
            select: {
              id: true,
              name: true
            }
          },
          children: {
            where: {
              deletedAt: null
            },
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  products: {
                    where: {
                      deletedAt: null
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              products: {
                where: {
                  deletedAt: null
                }
              }
            }
          }
        }
      });

      return this.formatCategoryResponse(category);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('Categoria não encontrada', 404);
        }
      }
      throw new AppError('Erro ao restaurar categoria', 500);
    }
  }

  /**
   * Verificar se nome da categoria existe
   */
  async nameExists(name: string, companyId: string, excludeId?: string): Promise<boolean> {
    try {
      const category = await this.prisma.productCategory.findFirst({
        where: {
          name,
          companyId,
          deletedAt: null,
          ...(excludeId && { id: { not: excludeId } })
        }
      });

      return !!category;
    } catch {
      throw new AppError('Erro ao verificar nome da categoria', 500);
    }
  }

  /**
   * Reordenar categorias
   */
  async reorder(categoryOrders: { id: string; sortOrder: number }[], companyId: string): Promise<void> {
    try {
      const updatePromises = categoryOrders.map(({ id, sortOrder }) =>
        this.prisma.productCategory.update({
          where: {
            id,
            companyId,
            deletedAt: null
          },
          data: {
            sortOrder,
            updatedAt: new Date()
          }
        })
      );

      await Promise.all(updatePromises);
    } catch {
      throw new AppError('Erro ao reordenar categorias', 500);
    }
  }

  /**
   * Verificar referência circular
   */
  private async checkCircularReference(categoryId: string, parentId: string, companyId: string): Promise<boolean> {
    try {
      let currentParentId = parentId;
      const visited = new Set<string>();

      while (currentParentId) {
        if (visited.has(currentParentId)) {
          return true; // Referência circular detectada
        }

        if (currentParentId === categoryId) {
          return true; // Tentando definir descendente como pai
        }

        visited.add(currentParentId);

        const parent = await this.prisma.productCategory.findFirst({
          where: {
            id: currentParentId,
            companyId,
            deletedAt: null
          },
          select: {
            parentId: true
          }
        });

        currentParentId = parent?.parentId || null;
      }

      return false;
    } catch {
      throw new AppError('Erro ao verificar referência circular', 500);
    }
  }

  /**
   * Formatar resposta da categoria
   */
  private formatCategoryResponse(category: unknown): ProductCategoryResponseDto {
    const cat = category as {
      id: string;
      name: string;
      description?: string;
      parentId?: string;
      parent?: { id: string; name: string };
      children?: Array<{
        id: string;
        name: string;
        _count?: { products: number };
      }>;
      isActive: boolean;
      sortOrder: number;
      _count?: { products: number };
      companyId: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt?: Date;
    };
    
    return {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      parentId: cat.parentId,
      parent: cat.parent,
      children: cat.children?.map((child) => ({
        id: child.id,
        name: child.name,
        productCount: child._count?.products || 0
      })) || [],
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
      productCount: cat._count?.products || 0,
      companyId: cat.companyId,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      deletedAt: cat.deletedAt
    };
  }
}