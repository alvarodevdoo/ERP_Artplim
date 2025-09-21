import { PrismaClient } from '@prisma/client';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  ProductCategoryResponseDto
} from '../dtos';
import { ProductCategoryRepository } from '../repositories';
// import { RoleService } from '../../auth/services/role.service'; // TODO: Implementar validação de permissões
import { AppError } from '../../../shared/errors/AppError';

/**
 * Service para gerenciamento de categorias de produtos
 * Implementa regras de negócio e validações
 */
export class ProductCategoryService {
  private categoryRepository: ProductCategoryRepository;
  // private roleService: RoleService; // TODO: Implementar validação de permissões

  constructor(private prisma: PrismaClient) {
    this.categoryRepository = new ProductCategoryRepository(prisma);
    // this.roleService = new RoleService(prisma); // TODO: Implementar validação de permissões
  }

  /**
   * Criar nova categoria
   */
  async create(
    data: CreateProductCategoryDto,
    companyId: string,
    userId: string
  ): Promise<ProductCategoryResponseDto> {
    // Validar permissões
    await this.validatePermission(userId, companyId, 'products', 'create');

    // Validar dados da categoria
    await this.validateCategoryData(data, companyId);

    // Verificar se nome já existe
    const nameExists = await this.categoryRepository.nameExists(data.name, companyId);
    if (nameExists) {
      throw new AppError('Nome da categoria já existe para esta empresa', 409);
    }

    // Validar categoria pai se fornecida
    if (data.parentId) {
      const parentCategory = await this.categoryRepository.findById(data.parentId, companyId);
      if (!parentCategory) {
        throw new AppError('Categoria pai não encontrada', 404);
      }
      if (!parentCategory.isActive) {
        throw new AppError('Categoria pai está inativa', 400);
      }
    }

    return await this.categoryRepository.create(data, companyId);
  }

  /**
   * Buscar categoria por ID
   */
  async findById(
    id: string,
    companyId: string,
    userId: string
  ): Promise<ProductCategoryResponseDto | null> {
    await this.validatePermission(userId, companyId, 'products', 'read');

    return await this.categoryRepository.findById(id, companyId);
  }

  /**
   * Buscar todas as categorias
   */
  async findMany(
    companyId: string,
    userId: string,
    includeInactive = false
  ): Promise<ProductCategoryResponseDto[]> {
    await this.validatePermission(userId, companyId, 'products', 'read');

    return await this.categoryRepository.findMany(companyId, includeInactive);
  }

  /**
   * Buscar categorias raiz (sem pai)
   */
  async findRootCategories(
    companyId: string,
    userId: string
  ): Promise<ProductCategoryResponseDto[]> {
    await this.validatePermission(userId, companyId, 'products', 'read');

    return await this.categoryRepository.findRootCategories(companyId);
  }

  /**
   * Buscar subcategorias de uma categoria
   */
  async findChildren(
    parentId: string,
    companyId: string,
    userId: string
  ): Promise<ProductCategoryResponseDto[]> {
    await this.validatePermission(userId, companyId, 'products', 'read');

    // Verificar se categoria pai existe
    const parentCategory = await this.categoryRepository.findById(parentId, companyId);
    if (!parentCategory) {
      throw new AppError('Categoria pai não encontrada', 404);
    }

    return await this.categoryRepository.findChildren(parentId, companyId);
  }

  /**
   * Atualizar categoria
   */
  async update(
    id: string,
    data: UpdateProductCategoryDto,
    companyId: string,
    userId: string
  ): Promise<ProductCategoryResponseDto> {
    await this.validatePermission(userId, companyId, 'products', 'update');

    // Verificar se categoria existe
    const existingCategory = await this.categoryRepository.findById(id, companyId);
    if (!existingCategory) {
      throw new AppError('Categoria não encontrada', 404);
    }

    // Validar dados da categoria
    await this.validateCategoryData(data, companyId, id);

    // Verificar se nome já existe (excluindo a categoria atual)
    if (data.name && data.name !== existingCategory.name) {
      const nameExists = await this.categoryRepository.nameExists(data.name, companyId, id);
      if (nameExists) {
        throw new AppError('Nome da categoria já existe para esta empresa', 409);
      }
    }

    // Validar categoria pai se fornecida
    if (data.parentId && data.parentId !== existingCategory.parentId) {
      const parentCategory = await this.categoryRepository.findById(data.parentId, companyId);
      if (!parentCategory) {
        throw new AppError('Categoria pai não encontrada', 404);
      }
      if (!parentCategory.isActive) {
        throw new AppError('Categoria pai está inativa', 400);
      }
    }

    return await this.categoryRepository.update(id, data, companyId);
  }

  /**
   * Deletar categoria (soft delete)
   */
  async delete(
    id: string,
    companyId: string,
    userId: string
  ): Promise<void> {
    await this.validatePermission(userId, companyId, 'products', 'delete');

    // Verificar se categoria pode ser deletada
    const canDelete = await this.canDeleteCategory(id, companyId);
    if (!canDelete.canDelete) {
      throw new AppError(canDelete.reason!, 400);
    }

    await this.categoryRepository.delete(id, companyId);
  }

  /**
   * Restaurar categoria
   */
  async restore(
    id: string,
    companyId: string,
    userId: string
  ): Promise<ProductCategoryResponseDto> {
    await this.validatePermission(userId, companyId, 'products', 'update');

    return await this.categoryRepository.restore(id, companyId);
  }

  /**
   * Verificar disponibilidade de nome
   */
  async checkNameAvailability(
    name: string,
    companyId: string,
    excludeId?: string
  ): Promise<{ available: boolean }> {
    const exists = await this.categoryRepository.nameExists(name, companyId, excludeId);
    return { available: !exists };
  }

  /**
   * Reordenar categorias
   */
  async reorder(
    categoryOrders: { id: string; sortOrder: number }[],
    companyId: string,
    userId: string
  ): Promise<void> {
    await this.validatePermission(userId, companyId, 'products', 'update');

    // Validar se todas as categorias existem e pertencem à empresa
    for (const { id } of categoryOrders) {
      const category = await this.categoryRepository.findById(id, companyId);
      if (!category) {
        throw new AppError(`Categoria ${id} não encontrada`, 404);
      }
    }

    await this.categoryRepository.reorder(categoryOrders, companyId);
  }

  /**
   * Obter árvore de categorias
   */
  async getCategoryTree(
    companyId: string,
    userId: string
  ): Promise<ProductCategoryResponseDto[]> {
    await this.validatePermission(userId, companyId, 'products', 'read');

    // Buscar todas as categorias ativas
    const categories = await this.categoryRepository.findMany(companyId, false);

    // Construir árvore hierárquica
    return this.buildCategoryTree(categories);
  }

  /**
   * Mover categoria para outra categoria pai
   */
  async moveCategory(
    categoryId: string,
    newParentId: string | null,
    companyId: string,
    userId: string
  ): Promise<ProductCategoryResponseDto> {
    await this.validatePermission(userId, companyId, 'products', 'update');

    // Verificar se categoria existe
    const category = await this.categoryRepository.findById(categoryId, companyId);
    if (!category) {
      throw new AppError('Categoria não encontrada', 404);
    }

    // Validar nova categoria pai se fornecida
    if (newParentId) {
      const newParent = await this.categoryRepository.findById(newParentId, companyId);
      if (!newParent) {
        throw new AppError('Nova categoria pai não encontrada', 404);
      }
      if (!newParent.isActive) {
        throw new AppError('Nova categoria pai está inativa', 400);
      }
    }

    return await this.categoryRepository.update(
      categoryId,
      { parentId: newParentId },
      companyId
    );
  }

  /**
   * Duplicar categoria
   */
  async duplicate(
    id: string,
    newName: string,
    companyId: string,
    userId: string
  ): Promise<ProductCategoryResponseDto> {
    await this.validatePermission(userId, companyId, 'products', 'create');

    // Verificar se categoria original existe
    const originalCategory = await this.categoryRepository.findById(id, companyId);
    if (!originalCategory) {
      throw new AppError('Categoria original não encontrada', 404);
    }

    // Verificar se novo nome já existe
    const nameExists = await this.categoryRepository.nameExists(newName, companyId);
    if (nameExists) {
      throw new AppError('Nome da categoria já existe para esta empresa', 409);
    }

    // Criar nova categoria com dados da original
    const duplicateData: CreateProductCategoryDto = {
      name: newName,
      description: originalCategory.description,
      parentId: originalCategory.parentId,
      isActive: originalCategory.isActive,
      sortOrder: originalCategory.sortOrder
    };

    return await this.categoryRepository.create(duplicateData, companyId);
  }

  /**
   * Validar dados da categoria
   */
  private async validateCategoryData(
    data: CreateProductCategoryDto | UpdateProductCategoryDto,
    companyId: string,
    excludeId?: string
  ): Promise<void> {
    // Validar nome
    if (data.name) {
      if (data.name.length < 2) {
        throw new AppError('Nome da categoria deve ter pelo menos 2 caracteres', 400);
      }
      if (data.name.length > 100) {
        throw new AppError('Nome da categoria deve ter no máximo 100 caracteres', 400);
      }
    }

    // Validar descrição
    if (data.description && data.description.length > 500) {
      throw new AppError('Descrição da categoria deve ter no máximo 500 caracteres', 400);
    }

    // Validar ordem de classificação
    if (data.sortOrder !== undefined && data.sortOrder < 0) {
      throw new AppError('Ordem de classificação não pode ser negativa', 400);
    }
  }

  /**
   * Verificar se categoria pode ser deletada
   */
  private async canDeleteCategory(
    categoryId: string,
    companyId: string
  ): Promise<{ canDelete: boolean; reason?: string }> {
    try {
      // Verificar se categoria tem produtos
      const productCount = await this.prisma.product.count({
        where: {
          categoryId,
          companyId,
          deletedAt: null
        }
      });

      if (productCount > 0) {
        return {
          canDelete: false,
          reason: 'Categoria possui produtos associados'
        };
      }

      // Verificar se categoria tem subcategorias
      const childrenCount = await this.prisma.productCategory.count({
        where: {
          parentId: categoryId,
          companyId,
          deletedAt: null
        }
      });

      if (childrenCount > 0) {
        return {
          canDelete: false,
          reason: 'Categoria possui subcategorias'
        };
      }

      return { canDelete: true };
    } catch (error) {
      throw new AppError('Erro ao verificar se categoria pode ser deletada', 500);
    }
  }

  /**
   * Construir árvore hierárquica de categorias
   */
  private buildCategoryTree(
    categories: ProductCategoryResponseDto[],
    parentId: string | null = null
  ): ProductCategoryResponseDto[] {
    const tree: ProductCategoryResponseDto[] = [];

    for (const category of categories) {
      if (category.parentId === parentId) {
        const children = this.buildCategoryTree(categories, category.id);
        tree.push({
          ...category,
          children: children.length > 0 ? children : []
        });
      }
    }

    return tree.sort((a, b) => {
      // Ordenar por sortOrder primeiro, depois por nome
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Validar permissões do usuário
   * TODO: Implementar validação de permissões quando RoleService estiver disponível
   */
  private async validatePermission(
    userId: string,
    companyId: string,
    resource: string,
    action: string
  ): Promise<void> {
    // TODO: Implementar validação de permissões
    // const hasPermission = await this.roleService.checkPermission(
    //   userId,
    //   companyId,
    //   resource,
    //   action
    // );

    // if (!hasPermission) {
    //   throw new AppError('Usuário não tem permissão para esta ação', 403);
    // }
  }
}