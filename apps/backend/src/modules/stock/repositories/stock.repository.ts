import { PrismaClient } from '@prisma/client';
import {
  StockMovementDTO,
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
  StockMovementReportDTO
} from '../dtos';

export class StockRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Busca item de estoque por produto e localização
   */
  async findStockItem(productId: string, locationId?: string, companyId?: string): Promise<StockItemResponseDTO | null> {
    const stockItem = await this.prisma.stockItem.findFirst({
      where: {
        productId,
        locationId,
        companyId,
        deletedAt: null
      },
      include: {
        product: {
          select: {
            name: true,
            code: true,
            category: true
          }
        },
        location: {
          select: {
            name: true
          }
        },
        batches: {
          where: {
            quantity: { gt: 0 },
            deletedAt: null
          },
          orderBy: {
            expirationDate: 'asc'
          }
        }
      }
    });

    if (!stockItem) return null;

    return {
      id: stockItem.id,
      productId: stockItem.productId,
      productName: stockItem.product.name,
      productCode: stockItem.product.code,
      productCategory: stockItem.product.category || '',
      locationId: stockItem.locationId,
      locationName: stockItem.location?.name || null,
      quantity: stockItem.quantity,
      reservedQuantity: stockItem.reservedQuantity,
      availableQuantity: stockItem.quantity - stockItem.reservedQuantity,
      unitCost: stockItem.unitCost,
      totalValue: stockItem.quantity * stockItem.unitCost,
      minStock: stockItem.minStock,
      maxStock: stockItem.maxStock,
      isLowStock: stockItem.quantity <= stockItem.minStock,
      isOutOfStock: stockItem.quantity <= 0,
      lastMovementAt: stockItem.lastMovementAt?.toISOString() || null,
      lastMovementType: stockItem.lastMovementType,
      batches: stockItem.batches.map(batch => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        quantity: batch.quantity,
        unitCost: batch.unitCost,
        expirationDate: batch.expirationDate?.toISOString() || null,
        isExpired: batch.expirationDate ? batch.expirationDate < new Date() : false,
        createdAt: batch.createdAt.toISOString()
      })),
      createdAt: stockItem.createdAt.toISOString(),
      updatedAt: stockItem.updatedAt.toISOString()
    };
  }

  /**
   * Lista itens de estoque com filtros
   */
  async findMany(filters: StockFiltersDTO, companyId: string): Promise<{ items: StockItemResponseDTO[]; total: number }> {
    const where: Record<string, unknown> = {
      companyId,
      deletedAt: null
    };

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters.category) {
      where.product = {
        category: {
          contains: filters.category,
          mode: 'insensitive'
        }
      };
    }

    if (filters.search) {
      where.OR = [
        {
          product: {
            name: {
              contains: filters.search,
              mode: 'insensitive'
            }
          }
        },
        {
          product: {
            code: {
              contains: filters.search,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    if (filters.lowStock) {
      where.quantity = {
        lte: this.prisma.stockItem.fields.minStock
      };
    }

    if (filters.outOfStock) {
      where.quantity = {
        lte: 0
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.stockItem.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
              code: true,
              category: true
            }
          },
          location: {
            select: {
              name: true
            }
          },
          batches: {
            where: {
              quantity: { gt: 0 },
              deletedAt: null
            },
            orderBy: {
              expirationDate: 'asc'
            }
          }
        },
        orderBy: {
          [filters.sortBy]: filters.sortOrder
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit
      }),
      this.prisma.stockItem.count({ where })
    ]);

    return {
      items: items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productCode: item.product.code,
        productCategory: item.product.category || '',
        locationId: item.locationId,
        locationName: item.location?.name || null,
        quantity: item.quantity,
        reservedQuantity: item.reservedQuantity,
        availableQuantity: item.quantity - item.reservedQuantity,
        unitCost: item.unitCost,
        totalValue: item.quantity * item.unitCost,
        minStock: item.minStock,
        maxStock: item.maxStock,
        isLowStock: item.quantity <= item.minStock,
        isOutOfStock: item.quantity <= 0,
        lastMovementAt: item.lastMovementAt?.toISOString() || null,
        lastMovementType: item.lastMovementType,
        batches: item.batches.map(batch => ({
          id: batch.id,
          batchNumber: batch.batchNumber,
          quantity: batch.quantity,
          unitCost: batch.unitCost,
          expirationDate: batch.expirationDate?.toISOString() || null,
          isExpired: batch.expirationDate ? batch.expirationDate < new Date() : false,
          createdAt: batch.createdAt.toISOString()
        })),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      })),
      total
    };
  }

  /**
   * Registra movimentação de estoque
   */
  async createMovement(data: StockMovementDTO, userId: string, companyId: string): Promise<StockMovementResponseDTO> {
    const movement = await this.prisma.stockMovement.create({
      data: {
        ...data,
        userId,
        companyId,
        totalCost: data.unitCost ? data.quantity * data.unitCost : null
      },
      include: {
        product: {
          select: {
            name: true,
            code: true
          }
        },
        location: {
          select: {
            name: true
          }
        },
        destinationLocation: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      }
    });

    return {
      id: movement.id,
      productId: movement.productId,
      productName: movement.product.name,
      productCode: movement.product.code,
      type: movement.type as 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER',
      quantity: movement.quantity,
      unitCost: movement.unitCost,
      totalCost: movement.totalCost,
      reason: movement.reason,
      reference: movement.reference,
      locationId: movement.locationId,
      locationName: movement.location?.name || null,
      destinationLocationId: movement.destinationLocationId,
      destinationLocationName: movement.destinationLocation?.name || null,
      batchNumber: movement.batchNumber,
      expirationDate: movement.expirationDate?.toISOString() || null,
      notes: movement.notes,
      userId: movement.userId,
      userName: movement.user.name,
      createdAt: movement.createdAt.toISOString()
    };
  }

  /**
   * Atualiza quantidade em estoque
   */
  async updateStockQuantity(
    productId: string,
    locationId: string | null,
    quantityChange: number,
    unitCost?: number,
    companyId?: string
  ): Promise<void> {
    const stockItem = await this.prisma.stockItem.findFirst({
      where: {
        productId,
        locationId,
        companyId,
        deletedAt: null
      }
    });

    if (stockItem) {
      // Atualiza item existente
      await this.prisma.stockItem.update({
        where: { id: stockItem.id },
        data: {
          quantity: stockItem.quantity + quantityChange,
          unitCost: unitCost || stockItem.unitCost,
          lastMovementAt: new Date(),
          lastMovementType: quantityChange > 0 ? 'IN' : 'OUT'
        }
      });
    } else if (quantityChange > 0) {
      // Cria novo item de estoque apenas para entradas
      await this.prisma.stockItem.create({
        data: {
          productId,
          locationId,
          companyId: companyId!,
          quantity: quantityChange,
          reservedQuantity: 0,
          unitCost: unitCost || 0,
          minStock: 0,
          maxStock: 0,
          lastMovementAt: new Date(),
          lastMovementType: 'IN'
        }
      });
    }
  }

  /**
   * Lista movimentações de estoque
   */
  async findMovements(filters: StockMovementFiltersDTO, companyId: string): Promise<{ items: StockMovementResponseDTO[]; total: number }> {
    const where: Record<string, unknown> = {
      companyId,
      deletedAt: null
    };

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.reference) {
      where.reference = {
        contains: filters.reference,
        mode: 'insensitive'
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
              code: true
            }
          },
          location: {
            select: {
              name: true
            }
          },
          destinationLocation: {
            select: {
              name: true
            }
          },
          user: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          [filters.sortBy]: filters.sortOrder
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit
      }),
      this.prisma.stockMovement.count({ where })
    ]);

    return {
      items: items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productCode: item.product.code,
        type: item.type as 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER',
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        reason: item.reason,
        reference: item.reference,
        locationId: item.locationId,
        locationName: item.location?.name || null,
        destinationLocationId: item.destinationLocationId,
        destinationLocationName: item.destinationLocation?.name || null,
        batchNumber: item.batchNumber,
        expirationDate: item.expirationDate?.toISOString() || null,
        notes: item.notes,
        userId: item.userId,
        userName: item.user.name,
        createdAt: item.createdAt.toISOString()
      })),
      total
    };
  }

  /**
   * Cria reserva de estoque
   */
  async createReservation(data: StockReservationDTO, userId: string, companyId: string): Promise<StockReservationResponseDTO> {
    const reservation = await this.prisma.stockReservation.create({
      data: {
        ...data,
        userId,
        companyId,
        status: 'ACTIVE',
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
      },
      include: {
        product: {
          select: {
            name: true,
            code: true
          }
        },
        location: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      }
    });

    return {
      id: reservation.id,
      productId: reservation.productId,
      productName: reservation.product.name,
      productCode: reservation.product.code,
      quantity: reservation.quantity,
      reason: reservation.reason,
      referenceId: reservation.referenceId,
      referenceType: reservation.referenceType as 'QUOTE' | 'ORDER' | 'OTHER' | null,
      status: reservation.status as 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'FULFILLED',
      expiresAt: reservation.expiresAt?.toISOString() || null,
      locationId: reservation.locationId,
      locationName: reservation.location?.name || null,
      notes: reservation.notes,
      userId: reservation.userId,
      userName: reservation.user.name,
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString()
    };
  }

  /**
   * Atualiza quantidade reservada no estoque
   */
  async updateReservedQuantity(
    productId: string,
    locationId: string | null,
    quantityChange: number,
    companyId: string
  ): Promise<void> {
    const stockItem = await this.prisma.stockItem.findFirst({
      where: {
        productId,
        locationId,
        companyId,
        deletedAt: null
      }
    });

    if (stockItem) {
      await this.prisma.stockItem.update({
        where: { id: stockItem.id },
        data: {
          reservedQuantity: Math.max(0, stockItem.reservedQuantity + quantityChange)
        }
      });
    }
  }

  /**
   * Busca reserva por ID
   */
  async findReservationById(id: string, companyId: string): Promise<StockReservationResponseDTO | null> {
    const reservation = await this.prisma.stockReservation.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null
      },
      include: {
        product: {
          select: {
            name: true,
            code: true
          }
        },
        location: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      }
    });

    if (!reservation) return null;

    return {
      id: reservation.id,
      productId: reservation.productId,
      productName: reservation.product.name,
      productCode: reservation.product.code,
      quantity: reservation.quantity,
      reason: reservation.reason,
      referenceId: reservation.referenceId,
      referenceType: reservation.referenceType as 'QUOTE' | 'ORDER' | 'OTHER' | null,
      status: reservation.status as 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'FULFILLED',
      expiresAt: reservation.expiresAt?.toISOString() || null,
      locationId: reservation.locationId,
      locationName: reservation.location?.name || null,
      notes: reservation.notes,
      userId: reservation.userId,
      userName: reservation.user.name,
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString()
    };
  }

  /**
   * Cancela reserva de estoque
   */
  async cancelReservation(id: string, data: CancelStockReservationDTO, companyId: string): Promise<void> {
    await this.prisma.stockReservation.update({
      where: {
        id,
        companyId
      },
      data: {
        status: 'CANCELLED',
        notes: data.notes || null,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Lista reservas de estoque
   */
  async findReservations(filters: StockReservationFiltersDTO, companyId: string): Promise<{ items: StockReservationResponseDTO[]; total: number }> {
    const where: Record<string, unknown> = {
      companyId,
      deletedAt: null
    };

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.referenceType) {
      where.referenceType = filters.referenceType;
    }

    if (filters.referenceId) {
      where.referenceId = filters.referenceId;
    }

    if (filters.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.stockReservation.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
              code: true
            }
          },
          location: {
            select: {
              name: true
            }
          },
          user: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          [filters.sortBy]: filters.sortOrder
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit
      }),
      this.prisma.stockReservation.count({ where })
    ]);

    return {
      items: items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productCode: item.product.code,
        quantity: item.quantity,
        reason: item.reason,
        referenceId: item.referenceId,
        referenceType: item.referenceType as 'QUOTE' | 'ORDER' | 'OTHER' | null,
        status: item.status as 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'FULFILLED',
        expiresAt: item.expiresAt?.toISOString() || null,
        locationId: item.locationId,
        locationName: item.location?.name || null,
        notes: item.notes,
        userId: item.userId,
        userName: item.user.name,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      })),
      total
    };
  }

  /**
   * Cria localização de estoque
   */
  async createLocation(data: CreateStockLocationDTO, companyId: string): Promise<StockLocationResponseDTO> {
    const location = await this.prisma.stockLocation.create({
      data: {
        ...data,
        companyId
      }
    });

    return {
      id: location.id,
      name: location.name,
      code: location.code,
      description: location.description,
      type: location.type as 'WAREHOUSE' | 'STORE' | 'VIRTUAL',
      address: location.address,
      isActive: location.isActive,
      totalProducts: 0,
      totalValue: 0,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString()
    };
  }

  /**
   * Busca localização por ID
   */
  async findLocationById(id: string, companyId: string): Promise<StockLocationResponseDTO | null> {
    const location = await this.prisma.stockLocation.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null
      },
      include: {
        _count: {
          select: {
            stockItems: {
              where: {
                deletedAt: null
              }
            }
          }
        },
        stockItems: {
          where: {
            deletedAt: null
          },
          select: {
            quantity: true,
            unitCost: true
          }
        }
      }
    });

    if (!location) return null;

    const totalValue = location.stockItems.reduce(
      (sum, item) => sum + (item.quantity * item.unitCost),
      0
    );

    return {
      id: location.id,
      name: location.name,
      code: location.code,
      description: location.description,
      type: location.type as 'WAREHOUSE' | 'STORE' | 'VIRTUAL',
      address: location.address,
      isActive: location.isActive,
      totalProducts: location._count.stockItems,
      totalValue,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString()
    };
  }

  /**
   * Atualiza localização
   */
  async updateLocation(id: string, data: UpdateStockLocationDTO, companyId: string): Promise<StockLocationResponseDTO> {
    const location = await this.prisma.stockLocation.update({
      where: {
        id,
        companyId
      },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            stockItems: {
              where: {
                deletedAt: null
              }
            }
          }
        },
        stockItems: {
          where: {
            deletedAt: null
          },
          select: {
            quantity: true,
            unitCost: true
          }
        }
      }
    });

    const totalValue = location.stockItems.reduce(
      (sum, item) => sum + (item.quantity * item.unitCost),
      0
    );

    return {
      id: location.id,
      name: location.name,
      code: location.code,
      description: location.description,
      type: location.type as 'WAREHOUSE' | 'STORE' | 'VIRTUAL',
      address: location.address,
      isActive: location.isActive,
      totalProducts: location._count.stockItems,
      totalValue,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString()
    };
  }

  /**
   * Remove localização (soft delete)
   */
  async deleteLocation(id: string, companyId: string): Promise<void> {
    await this.prisma.stockLocation.update({
      where: {
        id,
        companyId
      },
      data: {
        deletedAt: new Date()
      }
    });
  }

  /**
   * Obtém estatísticas do estoque
   */
  async getStats(companyId: string): Promise<StockStatsDTO> {
    const [stockItems, movements, reservations] = await Promise.all([
      this.prisma.stockItem.findMany({
        where: {
          companyId,
          deletedAt: null
        },
        include: {
          product: {
            select: {
              name: true
            }
          },
          location: {
            select: {
              name: true
            }
          }
        }
      }),
      this.prisma.stockMovement.count({
        where: {
          companyId,
          deletedAt: null
        }
      }),
      this.prisma.stockReservation.count({
        where: {
          companyId,
          status: 'ACTIVE',
          deletedAt: null
        }
      })
    ]);

    const totalProducts = stockItems.length;
    const totalValue = stockItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const lowStockProducts = stockItems.filter(item => item.quantity <= item.minStock).length;
    const outOfStockProducts = stockItems.filter(item => item.quantity <= 0).length;

    // Top produtos por valor
    const topProducts = stockItems
      .map(item => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        value: item.quantity * item.unitCost
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Valor por localização
    const valueByLocation = stockItems.reduce((acc, item) => {
      const locationId = item.locationId;
      const locationName = item.location?.name || null;
      const key = locationId || 'null';
      
      if (!acc[key]) {
        acc[key] = {
          locationId,
          locationName,
          totalValue: 0,
          totalProducts: 0
        };
      }
      
      acc[key].totalValue += item.quantity * item.unitCost;
      acc[key].totalProducts += 1;
      
      return acc;
    }, {} as Record<string, { locationId: string | null; locationName: string | null; totalValue: number; totalProducts: number }>);

    return {
      totalProducts,
      totalValue,
      lowStockProducts,
      outOfStockProducts,
      totalMovements: movements,
      totalReservations: reservations,
      expiredBatches: 0, // TODO: Implementar contagem de lotes vencidos
      topProducts,
      movementsByType: [], // TODO: Implementar agrupamento por tipo
      valueByLocation: Object.values(valueByLocation)
    };
  }

  /**
   * Gera relatório de estoque
   */
  async findForReport(companyId: string): Promise<StockReportDTO[]> {
    const stockItems = await this.prisma.stockItem.findMany({
      where: {
        companyId,
        deletedAt: null
      },
      include: {
        product: {
          select: {
            name: true,
            code: true,
            category: true
          }
        },
        location: {
          select: {
            name: true
          }
        },
        batches: {
          where: {
            deletedAt: null
          }
        }
      }
    });

    return stockItems.map(item => ({
      productId: item.productId,
      productName: item.product.name,
      productCode: item.product.code,
      productCategory: item.product.category || '',
      locationName: item.location?.name || null,
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity,
      availableQuantity: item.quantity - item.reservedQuantity,
      unitCost: item.unitCost,
      totalValue: item.quantity * item.unitCost,
      minStock: item.minStock,
      maxStock: item.maxStock,
      isLowStock: item.quantity <= item.minStock,
      isOutOfStock: item.quantity <= 0,
      lastMovementAt: item.lastMovementAt?.toISOString() || null,
      lastMovementType: item.lastMovementType,
      batchesCount: item.batches.length,
      expiredBatchesCount: item.batches.filter(batch => 
        batch.expirationDate && batch.expirationDate < new Date()
      ).length
    }));
  }

  /**
   * Gera relatório de movimentações
   */
  async findMovementsForReport(companyId: string, startDate?: string, endDate?: string): Promise<StockMovementReportDTO[]> {
    const where: Record<string, unknown> = {
      companyId,
      deletedAt: null
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const movements = await this.prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            code: true
          }
        },
        location: {
          select: {
            name: true
          }
        },
        destinationLocation: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return movements.map(movement => ({
      date: movement.createdAt.toISOString().split('T')[0],
      productName: movement.product.name,
      productCode: movement.product.code,
      type: movement.type,
      quantity: movement.quantity,
      unitCost: movement.unitCost,
      totalCost: movement.totalCost,
      reason: movement.reason,
      reference: movement.reference,
      locationName: movement.location?.name || null,
      destinationLocationName: movement.destinationLocation?.name || null,
      userName: movement.user.name
    }));
  }
}