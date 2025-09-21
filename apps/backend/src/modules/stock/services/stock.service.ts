import { PrismaClient } from '@prisma/client';
import { AppError } from '../../../shared/errors/AppError';
import { RoleService } from '../../role/services/role.service';
import { StockRepository } from '../repositories';
import {
  StockMovementDTO,
  StockAdjustmentDTO,
  StockTransferDTO,
  StockReservationDTO,
  CancelStockReservationDTO,
  StockFiltersDTO,
  StockMovementFiltersDTO,
  StockReservationFiltersDTO,
  CreateStockLocationDTO,
  UpdateStockLocationDTO,
  StockItemResponseDTO,
  StockMovementResponseDTO,
  StockReservationResponseDTO,
  StockLocationResponseDTO,
  StockStatsDTO,
  StockReportDTO,
  StockMovementReportDTO,
  StockDashboardDTO
} from '../dtos';

export class StockService {
  private stockRepository: StockRepository;
  private roleService: RoleService;

  constructor(
    private prisma: PrismaClient,
    roleService?: RoleService
  ) {
    this.stockRepository = new StockRepository(prisma);
    this.roleService = roleService || new RoleService(prisma);
  }

  /**
   * Registra entrada de estoque
   */
  async stockIn(data: StockMovementDTO, userId: string, companyId: string): Promise<StockMovementResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:write');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para registrar entrada de estoque', 403);
    }

    // Valida dados
    if (data.type !== 'IN') {
      throw new AppError('Tipo de movimentação deve ser IN para entrada de estoque', 400);
    }

    if (data.quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400);
    }

    if (data.unitCost && data.unitCost < 0) {
      throw new AppError('Custo unitário não pode ser negativo', 400);
    }

    // Verifica se o produto existe
    const product = await this.prisma.product.findFirst({
      where: {
        id: data.productId,
        companyId,
        deletedAt: null
      }
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Verifica se a localização existe (se informada)
    if (data.locationId) {
      const location = await this.prisma.stockLocation.findFirst({
        where: {
          id: data.locationId,
          companyId,
          deletedAt: null
        }
      });

      if (!location) {
        throw new AppError('Localização não encontrada', 404);
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Registra a movimentação
        const movement = await this.stockRepository.createMovement(data, userId, companyId);

        // Atualiza o estoque
        await this.stockRepository.updateStockQuantity(
          data.productId,
          data.locationId || null,
          data.quantity,
          data.unitCost,
          companyId
        );

        // Cria ou atualiza lote se informado
        if (data.batchNumber) {
          await this.createOrUpdateBatch(
            data.productId,
            data.locationId || null,
            data.batchNumber,
            data.quantity,
            data.unitCost || 0,
            data.expirationDate ? new Date(data.expirationDate) : null,
            companyId
          );
        }

        return movement;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao registrar entrada de estoque', 500);
    }
  }

  /**
   * Registra saída de estoque
   */
  async stockOut(data: StockMovementDTO, userId: string, companyId: string): Promise<StockMovementResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:write');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para registrar saída de estoque', 403);
    }

    // Valida dados
    if (data.type !== 'OUT') {
      throw new AppError('Tipo de movimentação deve ser OUT para saída de estoque', 400);
    }

    if (data.quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400);
    }

    // Verifica disponibilidade em estoque
    const stockItem = await this.stockRepository.findStockItem(
      data.productId,
      data.locationId || undefined,
      companyId
    );

    if (!stockItem) {
      throw new AppError('Produto não encontrado no estoque', 404);
    }

    if (stockItem.availableQuantity < data.quantity) {
      throw new AppError(
        `Quantidade insuficiente em estoque. Disponível: ${stockItem.availableQuantity}`,
        400
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Registra a movimentação
        const movement = await this.stockRepository.createMovement(data, userId, companyId);

        // Atualiza o estoque
        await this.stockRepository.updateStockQuantity(
          data.productId,
          data.locationId || null,
          -data.quantity,
          undefined,
          companyId
        );

        // Atualiza lotes se necessário (FIFO)
        if (data.batchNumber) {
          await this.updateBatchQuantity(
            data.productId,
            data.locationId || null,
            data.batchNumber,
            -data.quantity,
            companyId
          );
        } else {
          await this.updateBatchesFIFO(
            data.productId,
            data.locationId || null,
            data.quantity,
            companyId
          );
        }

        return movement;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao registrar saída de estoque', 500);
    }
  }

  /**
   * Ajusta estoque
   */
  async adjustStock(data: StockAdjustmentDTO, userId: string, companyId: string): Promise<StockMovementResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:adjust');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para ajustar estoque', 403);
    }

    // Valida dados
    if (data.newQuantity < 0) {
      throw new AppError('Nova quantidade não pode ser negativa', 400);
    }

    // Busca item atual do estoque
    const currentStock = await this.stockRepository.findStockItem(
      data.productId,
      data.locationId || undefined,
      companyId
    );

    const currentQuantity = currentStock?.quantity || 0;
    const quantityDifference = data.newQuantity - currentQuantity;

    if (quantityDifference === 0) {
      throw new AppError('Nova quantidade é igual à quantidade atual', 400);
    }

    const movementData: StockMovementDTO = {
      productId: data.productId,
      type: 'ADJUSTMENT',
      quantity: Math.abs(quantityDifference),
      reason: data.reason,
      locationId: data.locationId,
      notes: data.notes
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Registra a movimentação
        const movement = await this.stockRepository.createMovement(movementData, userId, companyId);

        // Atualiza o estoque
        await this.stockRepository.updateStockQuantity(
          data.productId,
          data.locationId || null,
          quantityDifference,
          undefined,
          companyId
        );

        return movement;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao ajustar estoque', 500);
    }
  }

  /**
   * Transfere estoque entre localizações
   */
  async transferStock(data: StockTransferDTO, userId: string, companyId: string): Promise<StockMovementResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:transfer');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para transferir estoque', 403);
    }

    // Valida dados
    if (data.fromLocationId === data.toLocationId) {
      throw new AppError('Localização de origem e destino não podem ser iguais', 400);
    }

    if (data.quantity <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 400);
    }

    // Verifica disponibilidade na localização de origem
    const sourceStock = await this.stockRepository.findStockItem(
      data.productId,
      data.fromLocationId,
      companyId
    );

    if (!sourceStock) {
      throw new AppError('Produto não encontrado na localização de origem', 404);
    }

    if (sourceStock.availableQuantity < data.quantity) {
      throw new AppError(
        `Quantidade insuficiente na localização de origem. Disponível: ${sourceStock.availableQuantity}`,
        400
      );
    }

    // Verifica se as localizações existem
    const [fromLocation, toLocation] = await Promise.all([
      this.prisma.stockLocation.findFirst({
        where: { id: data.fromLocationId, companyId, deletedAt: null }
      }),
      this.prisma.stockLocation.findFirst({
        where: { id: data.toLocationId, companyId, deletedAt: null }
      })
    ]);

    if (!fromLocation) {
      throw new AppError('Localização de origem não encontrada', 404);
    }

    if (!toLocation) {
      throw new AppError('Localização de destino não encontrada', 404);
    }

    const movementData: StockMovementDTO = {
      productId: data.productId,
      type: 'TRANSFER',
      quantity: data.quantity,
      reason: data.reason,
      locationId: data.fromLocationId,
      destinationLocationId: data.toLocationId,
      notes: data.notes
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Registra a movimentação
        const movement = await this.stockRepository.createMovement(movementData, userId, companyId);

        // Remove da localização de origem
        await this.stockRepository.updateStockQuantity(
          data.productId,
          data.fromLocationId,
          -data.quantity,
          undefined,
          companyId
        );

        // Adiciona na localização de destino
        await this.stockRepository.updateStockQuantity(
          data.productId,
          data.toLocationId,
          data.quantity,
          sourceStock.unitCost,
          companyId
        );

        return movement;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao transferir estoque', 500);
    }
  }

  /**
   * Lista itens de estoque
   */
  async findMany(filters: StockFiltersDTO, userId: string, companyId: string): Promise<{ items: StockItemResponseDTO[]; total: number }> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar estoque', 403);
    }

    return this.stockRepository.findMany(filters, companyId);
  }

  /**
   * Busca item de estoque
   */
  async findStockItem(productId: string, locationId: string | undefined, userId: string, companyId: string): Promise<StockItemResponseDTO | null> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar estoque', 403);
    }

    return this.stockRepository.findStockItem(productId, locationId, companyId);
  }

  /**
   * Lista movimentações de estoque
   */
  async findMovements(filters: StockMovementFiltersDTO, userId: string, companyId: string): Promise<{ items: StockMovementResponseDTO[]; total: number }> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar movimentações de estoque', 403);
    }

    return this.stockRepository.findMovements(filters, companyId);
  }

  /**
   * Cria reserva de estoque
   */
  async createReservation(data: StockReservationDTO, userId: string, companyId: string): Promise<StockReservationResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:reserve');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para reservar estoque', 403);
    }

    // Verifica disponibilidade
    const stockItem = await this.stockRepository.findStockItem(
      data.productId,
      data.locationId || undefined,
      companyId
    );

    if (!stockItem) {
      throw new AppError('Produto não encontrado no estoque', 404);
    }

    if (stockItem.availableQuantity < data.quantity) {
      throw new AppError(
        `Quantidade insuficiente para reserva. Disponível: ${stockItem.availableQuantity}`,
        400
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Cria a reserva
        const reservation = await this.stockRepository.createReservation(data, userId, companyId);

        // Atualiza quantidade reservada
        await this.stockRepository.updateReservedQuantity(
          data.productId,
          data.locationId || null,
          data.quantity,
          companyId
        );

        return reservation;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao criar reserva de estoque', 500);
    }
  }

  /**
   * Cancela reserva de estoque
   */
  async cancelReservation(id: string, data: CancelStockReservationDTO, userId: string, companyId: string): Promise<void> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:reserve');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para cancelar reserva de estoque', 403);
    }

    // Busca a reserva
    const reservation = await this.stockRepository.findReservationById(id, companyId);
    if (!reservation) {
      throw new AppError('Reserva não encontrada', 404);
    }

    if (reservation.status !== 'ACTIVE') {
      throw new AppError('Apenas reservas ativas podem ser canceladas', 400);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Cancela a reserva
        await this.stockRepository.cancelReservation(id, data, companyId);

        // Libera quantidade reservada
        await this.stockRepository.updateReservedQuantity(
          reservation.productId,
          reservation.locationId,
          -reservation.quantity,
          companyId
        );
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao cancelar reserva de estoque', 500);
    }
  }

  /**
   * Lista reservas de estoque
   */
  async findReservations(filters: StockReservationFiltersDTO, userId: string, companyId: string): Promise<{ items: StockReservationResponseDTO[]; total: number }> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar reservas de estoque', 403);
    }

    return this.stockRepository.findReservations(filters, companyId);
  }

  /**
   * Cria localização de estoque
   */
  async createLocation(data: CreateStockLocationDTO, userId: string, companyId: string): Promise<StockLocationResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:manage_locations');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para gerenciar localizações de estoque', 403);
    }

    // Verifica se já existe localização com o mesmo código
    const existingLocation = await this.prisma.stockLocation.findFirst({
      where: {
        code: data.code,
        companyId,
        deletedAt: null
      }
    });

    if (existingLocation) {
      throw new AppError('Já existe uma localização com este código', 400);
    }

    return this.stockRepository.createLocation(data, companyId);
  }

  /**
   * Busca localização por ID
   */
  async findLocationById(id: string, userId: string, companyId: string): Promise<StockLocationResponseDTO | null> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar localizações de estoque', 403);
    }

    return this.stockRepository.findLocationById(id, companyId);
  }

  /**
   * Atualiza localização
   */
  async updateLocation(id: string, data: UpdateStockLocationDTO, userId: string, companyId: string): Promise<StockLocationResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:manage_locations');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para gerenciar localizações de estoque', 403);
    }

    // Verifica se a localização existe
    const existingLocation = await this.stockRepository.findLocationById(id, companyId);
    if (!existingLocation) {
      throw new AppError('Localização não encontrada', 404);
    }

    // Verifica se o código não está em uso por outra localização
    if (data.code && data.code !== existingLocation.code) {
      const codeInUse = await this.prisma.stockLocation.findFirst({
        where: {
          code: data.code,
          companyId,
          id: { not: id },
          deletedAt: null
        }
      });

      if (codeInUse) {
        throw new AppError('Código já está em uso por outra localização', 400);
      }
    }

    return this.stockRepository.updateLocation(id, data, companyId);
  }

  /**
   * Remove localização
   */
  async deleteLocation(id: string, userId: string, companyId: string): Promise<void> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:manage_locations');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para gerenciar localizações de estoque', 403);
    }

    // Verifica se a localização existe
    const location = await this.stockRepository.findLocationById(id, companyId);
    if (!location) {
      throw new AppError('Localização não encontrada', 404);
    }

    // Verifica se há produtos na localização
    if (location.totalProducts > 0) {
      throw new AppError('Não é possível excluir localização que possui produtos em estoque', 400);
    }

    await this.stockRepository.deleteLocation(id, companyId);
  }

  /**
   * Obtém estatísticas do estoque
   */
  async getStats(userId: string, companyId: string): Promise<StockStatsDTO> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar estatísticas de estoque', 403);
    }

    return this.stockRepository.getStats(companyId);
  }

  /**
   * Gera relatório de estoque
   */
  async generateReport(format: 'json' | 'csv', userId: string, companyId: string): Promise<StockReportDTO[] | string> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:report');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para gerar relatórios de estoque', 403);
    }

    const data = await this.stockRepository.findForReport(companyId);

    if (format === 'json') {
      return data;
    }

    // Gera CSV
    const headers = [
      'Produto ID', 'Nome do Produto', 'Código', 'Categoria', 'Localização',
      'Quantidade', 'Qtd Reservada', 'Qtd Disponível', 'Custo Unitário', 'Valor Total',
      'Estoque Mínimo', 'Estoque Máximo', 'Estoque Baixo', 'Sem Estoque',
      'Última Movimentação', 'Tipo Última Movimentação', 'Qtd Lotes', 'Lotes Vencidos'
    ];

    const csvRows = [headers.join(',')];
    
    data.forEach(item => {
      const row = [
        item.productId,
        `"${item.productName}"`,
        item.productCode,
        `"${item.productCategory}"`,
        item.locationName ? `"${item.locationName}"` : '',
        item.quantity,
        item.reservedQuantity,
        item.availableQuantity,
        item.unitCost,
        item.totalValue,
        item.minStock,
        item.maxStock,
        item.isLowStock ? 'Sim' : 'Não',
        item.isOutOfStock ? 'Sim' : 'Não',
        item.lastMovementAt || '',
        item.lastMovementType || '',
        item.batchesCount,
        item.expiredBatchesCount
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Gera relatório de movimentações
   */
  async generateMovementReport(
    format: 'json' | 'csv',
    startDate?: string,
    endDate?: string,
    userId?: string,
    companyId?: string
  ): Promise<StockMovementReportDTO[] | string> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId!, 'stock:report');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para gerar relatórios de movimentações', 403);
    }

    const data = await this.stockRepository.findMovementsForReport(companyId!, startDate, endDate);

    if (format === 'json') {
      return data;
    }

    // Gera CSV
    const headers = [
      'Data', 'Nome do Produto', 'Código', 'Tipo', 'Quantidade',
      'Custo Unitário', 'Custo Total', 'Motivo', 'Referência',
      'Localização', 'Destino', 'Usuário'
    ];

    const csvRows = [headers.join(',')];
    
    data.forEach(item => {
      const row = [
        item.date,
        `"${item.productName}"`,
        item.productCode,
        item.type,
        item.quantity,
        item.unitCost || '',
        item.totalCost || '',
        `"${item.reason}"`,
        item.reference ? `"${item.reference}"` : '',
        item.locationName ? `"${item.locationName}"` : '',
        item.destinationLocationName ? `"${item.destinationLocationName}"` : '',
        `"${item.userName}"`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Obtém dados para dashboard
   */
  async getDashboard(userId: string, companyId: string): Promise<StockDashboardDTO> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'stock:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar dashboard de estoque', 403);
    }

    const [stats, lowStockItems, recentMovements, activeReservations] = await Promise.all([
      this.stockRepository.getStats(companyId),
      this.stockRepository.findMany(
        { lowStock: true, page: 1, limit: 10, sortBy: 'quantity', sortOrder: 'asc' },
        companyId
      ),
      this.stockRepository.findMovements(
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
        companyId
      ),
      this.stockRepository.findReservations(
        { status: 'ACTIVE', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
        companyId
      )
    ]);

    return {
      stats,
      lowStockAlerts: lowStockItems.items,
      recentMovements: recentMovements.items,
      expiredBatches: [], // TODO: Implementar busca de lotes vencidos
      activeReservations: activeReservations.items,
      topMovingProducts: [] // TODO: Implementar produtos com mais movimentação
    };
  }

  /**
   * Métodos auxiliares privados
   */
  private async createOrUpdateBatch(
    productId: string,
    locationId: string | null,
    batchNumber: string,
    quantity: number,
    unitCost: number,
    expirationDate: Date | null,
    companyId: string
  ): Promise<void> {
    const existingBatch = await this.prisma.stockBatch.findFirst({
      where: {
        productId,
        locationId,
        batchNumber,
        companyId,
        deletedAt: null
      }
    });

    if (existingBatch) {
      await this.prisma.stockBatch.update({
        where: { id: existingBatch.id },
        data: {
          quantity: existingBatch.quantity + quantity,
          unitCost: (existingBatch.unitCost * existingBatch.quantity + unitCost * quantity) / (existingBatch.quantity + quantity)
        }
      });
    } else {
      await this.prisma.stockBatch.create({
        data: {
          productId,
          locationId,
          batchNumber,
          quantity,
          unitCost,
          expirationDate,
          companyId
        }
      });
    }
  }

  private async updateBatchQuantity(
    productId: string,
    locationId: string | null,
    batchNumber: string,
    quantityChange: number,
    companyId: string
  ): Promise<void> {
    const batch = await this.prisma.stockBatch.findFirst({
      where: {
        productId,
        locationId,
        batchNumber,
        companyId,
        deletedAt: null
      }
    });

    if (batch) {
      const newQuantity = Math.max(0, batch.quantity + quantityChange);
      await this.prisma.stockBatch.update({
        where: { id: batch.id },
        data: { quantity: newQuantity }
      });
    }
  }

  private async updateBatchesFIFO(
    productId: string,
    locationId: string | null,
    quantityToReduce: number,
    companyId: string
  ): Promise<void> {
    const batches = await this.prisma.stockBatch.findMany({
      where: {
        productId,
        locationId,
        companyId,
        quantity: { gt: 0 },
        deletedAt: null
      },
      orderBy: [
        { expirationDate: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    let remainingQuantity = quantityToReduce;

    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const quantityFromBatch = Math.min(batch.quantity, remainingQuantity);
      
      await this.prisma.stockBatch.update({
        where: { id: batch.id },
        data: { quantity: batch.quantity - quantityFromBatch }
      });

      remainingQuantity -= quantityFromBatch;
    }
  }
}