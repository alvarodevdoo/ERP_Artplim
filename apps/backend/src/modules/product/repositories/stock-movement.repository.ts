import { PrismaClient, Prisma, StockMovementType } from '@prisma/client';
import {
  CreateStockMovementDto,
  StockMovementResponseDto
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';

/**
 * Repositório para gerenciamento de movimentações de estoque
 * Implementa operações CRUD e consultas específicas
 */
export class StockMovementRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Criar nova movimentação de estoque
   */
  async create(data: CreateStockMovementDto, companyId: string, userId: string): Promise<StockMovementResponseDto> {
    try {
      const movement = await this.prisma.stockMovement.create({
        data: {
          ...data,
          companyId,
          userId
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return this.formatMovementResponse(movement);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new AppError('Produto não encontrado', 404);
        }
      }
      throw new AppError('Erro ao criar movimentação de estoque', 500);
    }
  }

  /**
   * Buscar movimentação por ID
   */
  async findById(id: string, companyId: string): Promise<StockMovementResponseDto | null> {
    try {
      const movement = await this.prisma.stockMovement.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return movement ? this.formatMovementResponse(movement) : null;
    } catch {
      throw new AppError('Erro ao buscar movimentação', 500);
    }
  }

  /**
   * Buscar movimentações com filtros
   */
  async findMany(
    companyId: string,
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
    try {
      const {
        productId,
        type,
        startDate,
        endDate,
        userId,
        page = 1,
        limit = 20
      } = filters;

      const skip = (page - 1) * limit;

      const where: Prisma.StockMovementWhereInput = {
        companyId,
        ...(productId && { productId }),
        ...(type && { type }),
        ...(userId && { userId }),
        ...(startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate })
          }
        }
      };

      const [movements, total] = await Promise.all([
        this.prisma.stockMovement.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        this.prisma.stockMovement.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        movements: movements.map(movement => this.formatMovementResponse(movement)),
        total,
        page,
        limit,
        totalPages
      };
    } catch {
      throw new AppError('Erro ao buscar movimentações', 500);
    }
  }

  /**
   * Buscar movimentações por produto
   */
  async findByProduct(
    productId: string,
    companyId: string,
    limit = 50
  ): Promise<StockMovementResponseDto[]> {
    try {
      const movements = await this.prisma.stockMovement.findMany({
        where: {
          productId,
          companyId
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return movements.map(movement => this.formatMovementResponse(movement));
    } catch {
      throw new AppError('Erro ao buscar movimentações do produto', 500);
    }
  }

  /**
   * Buscar movimentações por período
   */
  async findByPeriod(
    startDate: Date,
    endDate: Date,
    companyId: string,
    type?: StockMovementType
  ): Promise<StockMovementResponseDto[]> {
    try {
      const movements = await this.prisma.stockMovement.findMany({
        where: {
          companyId,
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          ...(type && { type })
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return movements.map(movement => this.formatMovementResponse(movement));
    } catch {
      throw new AppError('Erro ao buscar movimentações por período', 500);
    }
  }

  /**
   * Obter estatísticas de movimentações
   */
  async getStats(
    companyId: string,
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
    try {
      const where: Prisma.StockMovementWhereInput = {
        companyId,
        ...(startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate })
          }
        }
      };

      // Estatísticas gerais
      const [totalMovements, movementsByType] = await Promise.all([
        this.prisma.stockMovement.count({ where }),
        this.prisma.stockMovement.groupBy({
          by: ['type'],
          where,
          _count: {
            id: true
          }
        })
      ]);

      // Inicializar contadores por tipo
      const typeStats: Record<StockMovementType, number> = {
        IN: 0,
        OUT: 0,
        ADJUSTMENT: 0
      };

      let totalIn = 0;
      let totalOut = 0;
      let totalAdjustment = 0;

      movementsByType.forEach(stat => {
        typeStats[stat.type] = stat._count.id;
        
        switch (stat.type) {
          case 'IN':
            totalIn = stat._count.id;
            break;
          case 'OUT':
            totalOut = stat._count.id;
            break;
          case 'ADJUSTMENT':
            totalAdjustment = stat._count.id;
            break;
        }
      });

      // Movimentações por dia (últimos 30 dias se não especificado período)
      const periodStart = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const periodEnd = endDate || new Date();

      const dailyMovements = await this.prisma.$queryRaw<Array<{
        date: string;
        type: StockMovementType;
        count: bigint;
      }>>(`
        SELECT 
          DATE("createdAt") as date,
          type,
          COUNT(*) as count
        FROM "StockMovement"
        WHERE "companyId" = ${companyId}
          AND "createdAt" >= ${periodStart.toISOString()}
          AND "createdAt" <= ${periodEnd.toISOString()}
        GROUP BY DATE("createdAt"), type
        ORDER BY date DESC
      `);

      // Agrupar por data
      const movementsByDay = dailyMovements.reduce((acc, curr) => {
        const existing = acc.find(item => item.date === curr.date);
        const count = Number(curr.count);

        if (existing) {
          switch (curr.type) {
            case 'IN':
              existing.in += count;
              break;
            case 'OUT':
              existing.out += count;
              break;
            case 'ADJUSTMENT':
              existing.adjustment += count;
              break;
          }
        } else {
          acc.push({
            date: curr.date,
            in: curr.type === 'IN' ? count : 0,
            out: curr.type === 'OUT' ? count : 0,
            adjustment: curr.type === 'ADJUSTMENT' ? count : 0
          });
        }

        return acc;
      }, [] as Array<{
        date: string;
        in: number;
        out: number;
        adjustment: number;
      }>);

      return {
        totalMovements,
        totalIn,
        totalOut,
        totalAdjustment,
        movementsByType: typeStats,
        movementsByDay
      };
    } catch {
      throw new AppError('Erro ao obter estatísticas de movimentações', 500);
    }
  }

  /**
   * Buscar últimas movimentações
   */
  async findRecent(
    companyId: string,
    limit = 10
  ): Promise<StockMovementResponseDto[]> {
    try {
      const movements = await this.prisma.stockMovement.findMany({
        where: {
          companyId
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return movements.map(movement => this.formatMovementResponse(movement));
    } catch {
      throw new AppError('Erro ao buscar movimentações recentes', 500);
    }
  }

  /**
   * Calcular saldo atual de um produto
   */
  async calculateCurrentStock(
    productId: string,
    companyId: string
  ): Promise<number> {
    try {
      const movements = await this.prisma.stockMovement.findMany({
        where: {
          productId,
          companyId
        },
        select: {
          type: true,
          quantity: true
        }
      });

      let currentStock = 0;

      movements.forEach(movement => {
        switch (movement.type) {
          case 'IN':
            currentStock += movement.quantity;
            break;
          case 'OUT':
            currentStock -= movement.quantity;
            break;
          case 'ADJUSTMENT':
            // Para ajustes, a quantidade pode ser positiva ou negativa
            currentStock += movement.quantity;
            break;
        }
      });

      return Math.max(0, currentStock); // Não permitir estoque negativo
    } catch {
      throw new AppError('Erro ao calcular estoque atual', 500);
    }
  }

  /**
   * Formatar resposta da movimentação
   */
  private formatMovementResponse(movement: {
    id: string;
    productId: string;
    product: { id: string; name: string; sku: string; unit: string };
    type: string;
    quantity: number;
    unitCost: number | null;
    totalCost: number | null;
    reason: string;
    reference: string | null;
    userId: string;
    user: { id: string; name: string; email: string };
    companyId: string;
    createdAt: Date;
    updatedAt: Date;
  }): StockMovementResponseDto {
    return {
      id: movement.id,
      productId: movement.productId,
      product: movement.product,
      type: movement.type,
      quantity: movement.quantity,
      unitCost: movement.unitCost,
      totalCost: movement.totalCost,
      reason: movement.reason,
      reference: movement.reference,
      userId: movement.userId,
      user: movement.user,
      companyId: movement.companyId,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt
    };
  }
}