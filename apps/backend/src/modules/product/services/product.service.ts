import { PrismaClient } from '@prisma/client';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFiltersDto,
  ProductResponseDto,
  ProductListResponseDto,
  ProductStatsDto,
  ProductCategoryResponseDto
} from '../dtos';
import {
  ProductRepository,
  ProductCategoryRepository,
  StockMovementRepository
} from '../repositories';
// import { RoleService } from '../../auth/services/role.service'; // TODO: Implementar validação de permissões
import { AppError } from '../../../shared/errors/AppError';

/**
 * Service para gerenciamento de produtos
 * Implementa regras de negócio e validações
 */
export class ProductService {
  private productRepository: ProductRepository;
  private categoryRepository: ProductCategoryRepository;
  private stockMovementRepository: StockMovementRepository;
  // private roleService: RoleService; // TODO: Implementar validação de permissões

  constructor(private prisma: PrismaClient) {
    this.productRepository = new ProductRepository(prisma);
    this.categoryRepository = new ProductCategoryRepository(prisma);
    this.stockMovementRepository = new StockMovementRepository(prisma);
    // this.roleService = new RoleService(prisma); // TODO: Implementar validação de permissões
  }

  /**
   * Criar novo produto
   */
  async create(
    data: CreateProductDto,
    companyId: string,
    userId: string
  ): Promise<ProductResponseDto> {
    // Validar permissões
    await this.validatePermission(userId, companyId, 'products', 'create');

    // Validar dados do produto
    await this.validateProductData(data, companyId);

    // Verificar se SKU já existe
    const skuExists = await this.productRepository.skuExists(data.sku, companyId);
    if (skuExists) {
      throw new AppError('SKU já existe para esta empresa', 409);
    }

    // Validar categoria se fornecida
    if (data.categoryId) {
      const category = await this.categoryRepository.findById(data.categoryId, companyId);
      if (!category) {
        throw new AppError('Categoria não encontrada', 404);
      }
      if (!category.isActive) {
        throw new AppError('Categoria está inativa', 400);
      }
    }

    // Calcular preços se não fornecidos
    const productData = this.calculatePrices(data);

    const product = await this.productRepository.create(productData, companyId);

    // Criar movimentação de estoque inicial se currentStock > 0
    if (productData.currentStock && productData.currentStock > 0) {
      try {
        await this.stockMovementRepository.create({
          productId: product.id,
          type: 'IN',
          quantity: productData.currentStock,
          unitCost: productData.costPrice,
          reason: 'Estoque inicial',
          reference: 'PRODUTO_CRIADO',
          previousStock: 0,
          newStock: productData.currentStock,
          userId,
          companyId
        });
      } catch (error) {

        // Não falha a criação do produto por causa da movimentação
      }
    }

    return this.formatProductResponse(product);
  }

  /**
   * Buscar produto por ID
   */
  async findById(
    id: string,
    companyId: string,
    userId: string
  ): Promise<ProductResponseDto | null> {
    await this.validatePermission(userId, companyId, 'products', 'read');

    const product = await this.productRepository.findById(id, companyId);
    return product ? this.formatProductResponse(product) : null;
  }

  /**
   * Buscar produtos com filtros
   */
  async findMany(
    filters: ProductFiltersDto,
    companyId: string,
    userId: string
  ): Promise<ProductListResponseDto> {
    await this.validatePermission(userId, companyId, 'products', 'read');

    const result = await this.productRepository.findMany(filters, companyId);

    return result;
  }

  /**
   * Atualizar produto
   */
  async update(
    id: string,
    data: UpdateProductDto,
    companyId: string,
    userId: string
  ): Promise<ProductResponseDto> {
    await this.validatePermission(userId, companyId, 'products', 'update');

    // Verificar se produto existe
    const existingProduct = await this.productRepository.findById(id, companyId);
    if (!existingProduct) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Validar dados do produto
    await this.validateProductData(data, companyId, id);

    // Verificar se SKU já existe (excluindo o produto atual)
    if (data.sku && data.sku !== existingProduct.sku) {
      const skuExists = await this.productRepository.skuExists(data.sku, companyId, id);
      if (skuExists) {
        throw new AppError('SKU já existe para esta empresa', 409);
      }
    }

    // A validação de categoria foi removida pois o schema atual usa um campo de texto simples.
    // if (data.categoryId) {
    //   const category = await this.categoryRepository.findById(data.categoryId, companyId);
    //   if (!category) {
    //     throw new AppError('Categoria não encontrada', 404);
    //   }
    //   if (!category.isActive) {
    //     throw new AppError('Categoria está inativa', 400);
    //   }
    // }

    // Calcular preços se alterados
    const productData = this.calculatePrices(data);

    const product = await this.productRepository.update(id, productData, companyId);
    return this.formatProductResponse(product);
  }

  /**
   * Deletar produto (soft delete)
   */
  async delete(
    id: string,
    companyId: string,
    userId: string
  ): Promise<void> {
    await this.validatePermission(userId, companyId, 'products', 'delete');

    // Verificar se produto pode ser deletado
    const canDelete = await this.canDeleteProduct(id, companyId);
    if (!canDelete.canDelete) {
      throw new AppError(canDelete.reason!, 400);
    }

    await this.productRepository.delete(id, companyId);
  }

  async reactivate(
    id: string,
    companyId: string,
    userId: string,
    resetStock: boolean
  ): Promise<ProductResponseDto> {
    await this.validatePermission(userId, companyId, 'products', 'update');
    const product = await this.productRepository.reactivate(id, companyId, resetStock);
    return this.formatProductResponse(product);
  }

  /**
   * Restaurar produto
   */
  async restore(
    id: string,
    companyId: string,
    userId: string
  ): Promise<ProductResponseDto> {
    await this.validatePermission(userId, companyId, 'products', 'update');

    const product = await this.productRepository.restore(id, companyId);
    return this.formatProductResponse(product);
  }

  /**
   * Buscar produtos por categoria
   */
  async findByCategory(
    categoryId: string,
    companyId: string,
    userId: string,
    includeInactive = false
  ): Promise<ProductResponseDto[]> {
    await this.validatePermission(userId, companyId, 'products', 'read');

    const products = await this.productRepository.findByCategory(
      categoryId,
      companyId,
      includeInactive
    );

    return products.map(product => this.formatProductResponse(product));
  }

  /**
   * Buscar produtos com estoque baixo
   */
  async findLowStock(
    companyId: string,
    userId: string
  ): Promise<ProductResponseDto[]> {
    await this.validatePermission(userId, companyId, 'products', 'read');

    const products = await this.productRepository.findLowStock(companyId);
    return products.map(product => this.formatProductResponse(product));
  }

  /**
   * Buscar produtos sem estoque
   */
  async findOutOfStock(
    companyId: string,
    userId: string
  ): Promise<ProductResponseDto[]> {
    await this.validatePermission(userId, companyId, 'products', 'read');

    const products = await this.productRepository.findOutOfStock(companyId);
    return products.map(product => this.formatProductResponse(product));
  }

  /**
   * Obter estatísticas de produtos
   */
  async getStats(
    companyId: string,
    userId: string
  ): Promise<ProductStatsDto> {
    await this.validatePermission(userId, companyId, 'products', 'read');

    return await this.productRepository.getStats(companyId);
  }

  async getOverallProductStats(
    companyId: string,
    userId: string
  ): Promise<{ totalProducts: number; activeProducts: number }> {
    await this.validatePermission(userId, companyId, 'products', 'read');
    return this.productRepository.getOverallProductStats(companyId);
  }

  /**
   * Atualizar estoque do produto
   */
  async updateStock(
    id: string,
    quantity: number,
    companyId: string,
    userId: string,
    reason?: string,
    reference?: string
  ): Promise<ProductResponseDto> {
    await this.validatePermission(userId, companyId, 'products', 'update');

    // Verificar se produto existe
    const product = await this.productRepository.findById(id, companyId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    if (!product.trackStock) {
      throw new AppError('Produto não controla estoque', 400);
    }

    // Criar movimentação de estoque
    const movementType = quantity > 0 ? 'IN' : 'OUT';
    const movementQuantity = Math.abs(quantity);

    await this.stockMovementRepository.create(
      {
        productId: id,
        type: movementType,
        quantity: movementQuantity,
        unitCost: product.costPrice || 0,
        totalCost: (product.costPrice || 0) * movementQuantity,
        reason: reason || `${movementType === 'IN' ? 'Entrada' : 'Saída'} manual`,
        reference: reference || `MANUAL-${Date.now()}`
      },
      companyId,
      userId
    );

    // Atualizar estoque do produto
    const newStock = Math.max(0, product.currentStock + quantity);
    const updatedProduct = await this.productRepository.updateStock(id, newStock, companyId);

    return this.formatProductResponse(updatedProduct);
  }

  /**
   * Ajustar estoque do produto
   */
  async adjustStock(
    id: string,
    newQuantity: number,
    companyId: string,
    userId: string,
    reason?: string
  ): Promise<ProductResponseDto> {
    await this.validatePermission(userId, companyId, 'products', 'update');

    // Verificar se produto existe
    const product = await this.productRepository.findById(id, companyId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    if (!product.trackStock) {
      throw new AppError('Produto não controla estoque', 400);
    }

    const currentStock = product.currentStock;
    const adjustment = newQuantity - currentStock;

    if (adjustment !== 0) {
      // Criar movimentação de ajuste
      await this.stockMovementRepository.create(
        {
          productId: id,
          type: 'ADJUSTMENT',
          quantity: adjustment,
          unitCost: product.costPrice || 0,
          totalCost: (product.costPrice || 0) * Math.abs(adjustment),
          reason: reason || 'Ajuste de estoque',
          reference: `AJUSTE-${Date.now()}`
        },
        companyId,
        userId
      );

      // Atualizar estoque do produto
      const updatedProduct = await this.productRepository.updateStock(id, newQuantity, companyId);
      return this.formatProductResponse(updatedProduct);
    }

    return this.formatProductResponse(product);
  }

  /**
   * Verificar disponibilidade de SKU
   */
  async checkSkuAvailability(
    sku: string,
    companyId: string,
    excludeId?: string
  ): Promise<{ available: boolean }> {
    const exists = await this.productRepository.skuExists(sku, companyId, excludeId);
    return { available: !exists };
  }

  /**
   * Buscar produtos para relatório
   */
  async findForReport(
    filters: ProductFiltersDto,
    companyId: string,
    userId: string
  ): Promise<ProductResponseDto[]> {
    await this.validatePermission(userId, companyId, 'products', 'read');

    return await this.productRepository.findForReport(filters, companyId);
  }

  /**
   * Validar dados do produto
   */
  private async validateProductData(
    data: CreateProductDto | UpdateProductDto,
    _companyId: string,
    _excludeId?: string
  ): Promise<void> {
    // Validar SKU
    if (data.sku) {
      if (data.sku.length < 2) {
        throw new AppError('SKU deve ter pelo menos 2 caracteres', 400);
      }
      if (!/^[A-Z0-9-_]+$/i.test(data.sku)) {
        throw new AppError('SKU deve conter apenas letras, números, hífens e underscores', 400);
      }
    }

    // Validar preços
    if (data.costPrice !== undefined && data.costPrice < 0) {
      throw new AppError('Preço de custo não pode ser negativo', 400);
    }
    if (data.salePrice !== undefined && data.salePrice < 0) {
      throw new AppError('Preço de venda não pode ser negativo', 400);
    }

    // Validar estoque
    if (data.minStock !== undefined && data.minStock < 0) {
      throw new AppError('Estoque mínimo não pode ser negativo', 400);
    }
    if (data.maxStock !== undefined && data.maxStock < 0) {
      throw new AppError('Estoque máximo não pode ser negativo', 400);
    }
    if (data.minStock !== undefined && data.maxStock && data.minStock > data.maxStock) {
      throw new AppError('Estoque mínimo não pode ser maior que o máximo', 400);
    }


  }

  /**
   * Calcular preços baseados em margens
   */
  private calculatePrices(data: CreateProductDto | UpdateProductDto): CreateProductDto | UpdateProductDto {
    const result = { ...data };

    // Se tem preço de custo e margem, calcular preço de venda
    if (data.costPrice && data.profitMargin && !data.salePrice) {
      result.salePrice = data.costPrice * (1 + data.profitMargin / 100);
    }



    return result;
  }

  /**
   * Verificar se produto pode ser deletado
   */
  private async canDeleteProduct(
    productId: string,
    companyId: string
  ): Promise<{ canDelete: boolean; reason?: string }> {
    try {
      // Verificar se produto tem movimentações de estoque
      const movementCount = await this.prisma.stockMovement.count({
        where: {
          productId,
          companyId
        }
      });

      if (movementCount > 0) {
        return {
          canDelete: false,
          reason: 'Produto possui movimentações de estoque'
        };
      }

      // Verificar se produto está em orçamentos
      const quoteItemCount = await this.prisma.quoteItem.count({
        where: {
          productId,
          quote: {
            companyId
          }
        }
      });

      if (quoteItemCount > 0) {
        return {
          canDelete: false,
          reason: 'Produto está sendo usado em orçamentos'
        };
      }

      // Verificar se produto está em ordens de serviço
      const orderItemCount = await this.prisma.orderItem.count({
        where: {
          productId,
          order: {
            companyId
          }
        }
      });

      if (orderItemCount > 0) {
        return {
          canDelete: false,
          reason: 'Produto está sendo usado em ordens de serviço'
        };
      }

      return { canDelete: true };
    } catch {
      throw new AppError('Erro ao verificar se produto pode ser deletado', 500);
    }
  }

  /**
   * Validar permissões do usuário
   * TODO: Implementar validação de permissões quando RoleService estiver disponível
   */
  private async validatePermission(
    _userId: string,
    _companyId: string,
    _resource: string,
    _action: string
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

  /**
   * Formatar resposta do produto
   */
  private formatProductResponse(product: Product & { category?: ProductCategoryResponseDto }): ProductResponseDto {
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
      currentStock: product.currentStock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      isActive: product.isActive,
      companyId: product.companyId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt
    };
  }
}