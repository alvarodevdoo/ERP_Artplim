import { PrismaClient, StockMovementType } from '@prisma/client';
import {
  CreateStockMovementDto,
  StockMovementResponseDto
} from '../dtos';
import {
  StockMovementRepository,
  ProductRepository
} from '../repositories';
// import { RoleService } from '../../auth/services/role.service'; // TODO: Implementar validação de permissões
import { AppError } from '../../../shared/errors/AppError';

/**
 * Service para gerenciamento de movimentações de estoque
 * Implementa regras de negócio e validações
 */
export class StockMovementService {
  private stockMovementRepository: StockMovementRepository;
  private productRepository: ProductRepository;
  // private roleService: RoleService; // TODO: Implementar validação de permissões

  constructor(private prisma: PrismaClient) {
    this.stockMovementRepository = new StockMovementRepository(prisma);
    this.productRepository = new ProductRepository(prisma);
    // this.roleService = new RoleService(prisma); // TODO: Implementar validação de permissões
  }

  /**
   * Criar nova movimentação de estoque
   */
  async create(
    data: CreateStockMovementDto,
    companyId: string,
    userId: string
  ): Promise<StockMovementResponseDto> {
    // Validar permissões
    await this.validatePermission(userId, companyId, 'stock', 'create');

    // Validar dados da movimentação
    await this.validateMovementData(data, companyId);

    // Verificar se produto existe e controla estoque
    const product = await this.productRepository.findById(data.productId, companyId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    if (!product.trackStock) {
      throw new AppError('Produto não controla estoque', 400);
    }

    // Validar estoque para saídas
    if (data.type === 'OUT') {
      const currentStock = await this.stockMovementRepository.calculateCurrentStock(
        data.productId,
        companyId
      );

      if (currentStock < data.quantity) {
        throw new AppError(
          `Estoque insuficiente. Disponível: ${currentStock}, Solicitado: ${data.quantity}`,
          400
        );
      }
    }

    // Calcular custo total se não fornecido
    const movementData = {
      ...data,
      totalCost: data.totalCost || (data.unitCost || 0) * data.quantity
    };

    // Criar movimentação
    const movement = await this.stockMovementRepository.create(
      movementData,
      companyId,
      userId
    );

    // Atualizar estoque do produto
    await this.updateProductStock(data.productId, companyId);

    return movement;
  }

  /**
   * Buscar movimentação por ID
   */
  async findById(
    id: string,
    companyId: string,
    userId: string
  ): Promise<StockMovementResponseDto | null> {
    await this.validatePermission(userId, companyId, 'stock', 'read');

    return await this.stockMovementRepository.findById(id, companyId);
  }

  /**
   * Buscar movimentações com filtros
   */
  async findMany(
    companyId: string,
    userId: string,
    filters: {
      productId?: string;
      type?: StockMovementType;
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    movements: StockMovementResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.validatePermission(userId, companyId, 'stock', 'read');

    return await this.stockMovementRepository.findMany(companyId, filters);
  }

  /**
   * Buscar movimentações por produto
   */
  async findByProduct(
    productId: string,
    companyId: string,
    userId: string,
    limit = 50
  ): Promise<StockMovementResponseDto[]> {
    await this.validatePermission(userId, companyId, 'stock', 'read');

    // Verificar se produto existe
    const product = await this.productRepository.findById(productId, companyId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    return await this.stockMovementRepository.findByProduct(productId, companyId, limit);
  }

  /**
   * Buscar movimentações por período
   */
  async findByPeriod(
    startDate: Date,
    endDate: Date,
    companyId: string,
    userId: string,
    type?: StockMovementType
  ): Promise<StockMovementResponseDto[]> {
    await this.validatePermission(userId, companyId, 'stock', 'read');

    // Validar período
    if (startDate > endDate) {
      throw new AppError('Data inicial não pode ser maior que data final', 400);
    }

    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      throw new AppError('Período não pode ser maior que 365 dias', 400);
    }

    return await this.stockMovementRepository.findByPeriod(
      startDate,
      endDate,
      companyId,
      type
    );
  }

  /**
   * Obter estatísticas de movimentações
   */
  async getStats(
    companyId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalMovements: number;
    totalIn: number;
    totalOut: number;
    totalAdjustment: number;
    movementsByType: Record<StockMovementType, number>;
    movementsByDay: Array<{
      date: string;
      in: number;
      out: number;
      adjustment: number;
    }>;
  }> {
    await this.validatePermission(userId, companyId, 'stock', 'read');

    return await this.stockMovementRepository.getStats(companyId, startDate, endDate);
  }

  /**
   * Buscar últimas movimentações
   */
  async findRecent(
    companyId: string,
    userId: string,
    limit = 10
  ): Promise<StockMovementResponseDto[]> {
    await this.validatePermission(userId, companyId, 'stock', 'read');

    return await this.stockMovementRepository.findRecent(companyId, limit);
  }

  /**
   * Entrada de estoque
   */
  async stockIn(
    productId: string,
    quantity: number,
    unitCost: number,
    reason: string,
    reference: string,
    companyId: string,
    userId: string
  ): Promise<StockMovementResponseDto> {
    await this.validatePermission(userId, companyId, 'stock', 'create');

    const movementData: CreateStockMovementDto = {
      productId,
      type: 'IN',
      quantity,
      unitCost,
      totalCost: unitCost * quantity,
      reason,
      reference
    };

    return await this.create(movementData, companyId, userId);
  }

  /**
   * Saída de estoque
   */
  async stockOut(
    productId: string,
    quantity: number,
    unitCost: number,
    reason: string,
    reference: string,
    companyId: string,
    userId: string
  ): Promise<StockMovementResponseDto> {
    await this.validatePermission(userId, companyId, 'stock', 'create');

    const movementData: CreateStockMovementDto = {
      productId,
      type: 'OUT',
      quantity,
      unitCost,
      totalCost: unitCost * quantity,
      reason,
      reference
    };

    return await this.create(movementData, companyId, userId);
  }

  /**
   * Ajuste de estoque
   */
  async stockAdjustment(
    productId: string,
    newQuantity: number,
    reason: string,
    companyId: string,
    userId: string
  ): Promise<StockMovementResponseDto> {
    await this.validatePermission(userId, companyId, 'stock', 'create');

    // Verificar se produto existe
    const product = await this.productRepository.findById(productId, companyId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    if (!product.trackStock) {
      throw new AppError('Produto não controla estoque', 400);
    }

    // Calcular estoque atual
    const currentStock = await this.stockMovementRepository.calculateCurrentStock(
      productId,
      companyId
    );

    const adjustment = newQuantity - currentStock;

    if (adjustment === 0) {
      throw new AppError('Não há diferença no estoque para ajustar', 400);
    }

    const movementData: CreateStockMovementDto = {
      productId,
      type: 'ADJUSTMENT',
      quantity: adjustment,
      unitCost: product.costPrice || 0,
      totalCost: (product.costPrice || 0) * Math.abs(adjustment),
      reason,
      reference: `AJUSTE-${Date.now()}`
    };

    return await this.create(movementData, companyId, userId);
  }

  /**
   * Transferência entre produtos (baixa de um e entrada em outro)
   */
  async transfer(
    fromProductId: string,
    toProductId: string,
    quantity: number,
    reason: string,
    companyId: string,
    userId: string
  ): Promise<{
    outMovement: StockMovementResponseDto;
    inMovement: StockMovementResponseDto;
  }> {
    await this.validatePermission(userId, companyId, 'stock', 'create');

    // Verificar se produtos existem
    const [fromProduct, toProduct] = await Promise.all([
      this.productRepository.findById(fromProductId, companyId),
      this.productRepository.findById(toProductId, companyId)
    ]);

    if (!fromProduct) {
      throw new AppError('Produto de origem não encontrado', 404);
    }
    if (!toProduct) {
      throw new AppError('Produto de destino não encontrado', 404);
    }

    if (!fromProduct.trackStock || !toProduct.trackStock) {
      throw new AppError('Ambos os produtos devem controlar estoque', 400);
    }

    // Verificar estoque disponível
    const currentStock = await this.stockMovementRepository.calculateCurrentStock(
      fromProductId,
      companyId
    );

    if (currentStock < quantity) {
      throw new AppError(
        `Estoque insuficiente no produto de origem. Disponível: ${currentStock}`,
        400
      );
    }

    const reference = `TRANSF-${Date.now()}`;
    const unitCost = fromProduct.costPrice || 0;

    // Criar movimentações
    const [outMovement, inMovement] = await Promise.all([
      this.create(
        {
          productId: fromProductId,
          type: 'OUT',
          quantity,
          unitCost,
          totalCost: unitCost * quantity,
          reason: `${reason} - Transferência para ${toProduct.name}`,
          reference
        },
        companyId,
        userId
      ),
      this.create(
        {
          productId: toProductId,
          type: 'IN',
          quantity,
          unitCost,
          totalCost: unitCost * quantity,
          reason: `${reason} - Transferência de ${fromProduct.name}`,
          reference
        },
        companyId,
        userId
      )
    ]);

    return { outMovement, inMovement };
  }

  /**
   * Calcular estoque atual de um produto
   */
  async calculateCurrentStock(
    productId: string,
    companyId: string,
    userId: string
  ): Promise<{ currentStock: number }> {
    await this.validatePermission(userId, companyId, 'stock', 'read');

    // Verificar se produto existe
    const product = await this.productRepository.findById(productId, companyId);
    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    const currentStock = await this.stockMovementRepository.calculateCurrentStock(
      productId,
      companyId
    );

    return { currentStock };
  }

  /**
   * Gerar relatório de movimentações
   */
  async generateReport(
    companyId: string,
    userId: string,
    filters: {
      productId?: string;
      type?: StockMovementType;
      startDate?: Date;
      endDate?: Date;
      format?: 'json' | 'csv';
    } = {}
  ): Promise<{ movements: StockMovementResponseDto[]; summary: { total: number; totalIn: number; totalOut: number; totalAdjustment: number; totalValue: number } } | string> {
    await this.validatePermission(userId, companyId, 'stock', 'read');

    const { format = 'json', ...searchFilters } = filters;

    const result = await this.stockMovementRepository.findMany(companyId, {
      ...searchFilters,
      limit: 10000 // Limite alto para relatórios
    });

    if (format === 'csv') {
      return this.generateCSVReport(result.movements);
    }

    return {
      movements: result.movements,
      summary: {
        total: result.total,
        totalIn: result.movements.filter(m => m.type === 'IN').length,
        totalOut: result.movements.filter(m => m.type === 'OUT').length,
        totalAdjustment: result.movements.filter(m => m.type === 'ADJUSTMENT').length,
        totalValue: result.movements.reduce((sum, m) => sum + (m.totalCost || 0), 0)
      }
    };
  }

  /**
   * Validar dados da movimentação
   */
  private async validateMovementData(
    data: CreateStockMovementDto,
    _companyId: string
  ): Promise<void> {
    // Validar quantidade
    if (data.quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400);
    }

    // Validar custo unitário
    if (data.unitCost !== undefined && data.unitCost < 0) {
      throw new AppError('Custo unitário não pode ser negativo', 400);
    }

    // Validar custo total
    if (data.totalCost !== undefined && data.totalCost < 0) {
      throw new AppError('Custo total não pode ser negativo', 400);
    }

    // Validar motivo
    if (!data.reason || data.reason.trim().length < 3) {
      throw new AppError('Motivo deve ter pelo menos 3 caracteres', 400);
    }

    // Validar referência
    if (data.reference && data.reference.length > 100) {
      throw new AppError('Referência deve ter no máximo 100 caracteres', 400);
    }
  }

  /**
   * Atualizar estoque do produto baseado nas movimentações
   */
  private async updateProductStock(
    productId: string,
    companyId: string
  ): Promise<void> {
    const currentStock = await this.stockMovementRepository.calculateCurrentStock(
      productId,
      companyId
    );

    await this.productRepository.updateStock(productId, currentStock, companyId);
  }

  /**
   * Gerar relatório em CSV
   */
  private generateCSVReport(movements: StockMovementResponseDto[]): string {
    const headers = [
      'Data',
      'Produto',
      'SKU',
      'Tipo',
      'Quantidade',
      'Custo Unitário',
      'Custo Total',
      'Motivo',
      'Referência',
      'Usuário'
    ];

    const rows = movements.map(movement => [
      movement.createdAt.toISOString().split('T')[0],
      movement.product?.name || '',
      movement.product?.sku || '',
      movement.type,
      movement.quantity.toString(),
      (movement.unitCost || 0).toFixed(2),
      (movement.totalCost || 0).toFixed(2),
      movement.reason,
      movement.reference || '',
      movement.user?.name || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
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
}