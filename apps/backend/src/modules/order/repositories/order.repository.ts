import { PrismaClient, Prisma } from '@prisma/client';
import { 
  CreateOrderDTO, 
  UpdateOrderDTO, 
  OrderFiltersDTO, 
  UpdateOrderStatusDTO,
  AssignOrderDTO,
  OrderResponseDTO,
  OrderStatsDTO,
  OrderReportDTO
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';

export class OrderRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Cria uma nova ordem de serviço
   */
  async create(data: CreateOrderDTO, companyId: string, userId: string): Promise<OrderResponseDTO> {
    const productIds = data.items.map(item => item.productId).filter(id => id) as string[];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId,
      },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    return this.prisma.$transaction(async (tx) => {
      const stockUpdates: { id: string; newStock: number }[] = [];

      for (const item of data.items) {
        if (!item.productId) continue;
        const product = productMap.get(item.productId);

        if (product && product.trackStock) {
          if (product.currentStock < item.quantity) {
            throw new AppError(`Estoque insuficiente para o produto "${product.name}".`, 400);
          }
          stockUpdates.push({
            id: product.id,
            newStock: product.currentStock - item.quantity,
          });
        }
      }

      const lastOrder = await tx.order.findFirst({
        where: { companyId },
        orderBy: { number: 'desc' },
      });

      const nextNumber = lastOrder
        ? String(parseInt(lastOrder.number, 10) + 1).padStart(6, '0')
        : '000001';

      const itemsWithCalculations = data.items.map(item => {
        const subtotal = item.quantity * item.unitPrice;
        const discountValue = item.discountType === 'PERCENTAGE'
          ? (subtotal * item.discount) / 100
          : item.discount;
        const total = subtotal - discountValue;
        return { ...item, subtotal, discountValue, total };
      });

      const subtotal = itemsWithCalculations.reduce((sum, item) => sum + item.subtotal, 0);
      const itemsDiscountValue = itemsWithCalculations.reduce((sum, item) => sum + item.discountValue, 0);
      const orderDiscountValue = data.discountType === 'PERCENTAGE'
        ? (subtotal * data.discount) / 100
        : data.discount;
      const totalValue = subtotal - itemsDiscountValue - orderDiscountValue;

      const order = await tx.order.create({
        data: {
          number: nextNumber,
          companyId,
          quoteId: data.quoteId,
          customerId: data.customerId,
          title: data.title,
          description: data.description,
          status: 'PENDING',
          priority: data.priority,
          expectedStartDate: data.expectedStartDate ? new Date(data.expectedStartDate) : null,
          expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : null,
          paymentTerms: data.paymentTerms,
          observations: data.observations,
          discount: data.discount,
          discountType: data.discountType,
          subtotal,
          discountValue: orderDiscountValue,
          totalValue,
          createdBy: userId,
          items: {
            create: itemsWithCalculations.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              discountType: item.discountType,
              subtotal: item.subtotal,
              discountValue: item.discountValue,
              total: item.total,
              observations: item.observations,
            })),
          },
        },
        include: {
          customer: { select: { name: true, document: true } },
          quote: { select: { number: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
          assignedToUser: { select: { name: true } },
          createdByUser: { select: { name: true } },
          timeTracking: { include: { employee: { select: { name: true } } } },
          expenses: true,
        },
      });

      for (const update of stockUpdates) {
        await tx.product.update({
          where: { id: update.id },
          data: { currentStock: update.newStock },
        });
      }

      const stockMovements = data.items
        .map(item => {
          if (!item.productId) return null;
          const product = productMap.get(item.productId);
          if (!product || !product.trackStock) return null;
          return {
            productId: product.id,
            userId: userId,
            type: 'OUT' as const,
            quantity: item.quantity,
            reason: `Ordem de Serviço #${nextNumber}`,
            reference: `ORDER:${order.id}`,
            companyId: companyId,
          };
        })
        .filter((sm): sm is NonNullable<typeof sm> => sm !== null);

      if (stockMovements.length > 0) {
        await tx.stockMovement.createMany({ data: stockMovements });
      }

      return this.formatOrderResponse(order);
    });
  }

  /**
   * Busca uma ordem por ID
   */
  async findById(id: string, companyId: string): Promise<OrderResponseDTO | null> {
    try {
      const order = await this.prisma.order.findFirst({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        include: {
          customer: {
            select: {
              name: true,
              document: true
            }
          },
          quote: {
            select: {
              number: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true
                }
              }
            }
          },
          assignedToUser: {
            select: {
              name: true
            }
          },
          createdByUser: {
            select: {
              name: true
            }
          },
          timeTracking: {
            include: {
              employee: {
                select: {
                  name: true
                }
              }
            }
          },
          expenses: true
        }
      });

      return order ? this.formatOrderResponse(order) : null;
    } catch {
      throw new AppError('Erro ao buscar ordem de serviço', 500);
    }
  }

  /**
   * Lista ordens com filtros e paginação
   */
  async findMany(filters: OrderFiltersDTO, companyId: string): Promise<{
    orders: OrderResponseDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const where: Prisma.OrderWhereInput = {
        companyId,
        deletedAt: null
      };

      // Aplicar filtros
      if (filters.search) {
        where.OR = [
          { number: { contains: filters.search, mode: 'insensitive' } },
          { title: { contains: filters.search, mode: 'insensitive' } },
          { customer: { name: { contains: filters.search, mode: 'insensitive' } } }
        ];
      }

      if (filters.customerId) {
        where.customerId = filters.customerId;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.priority) {
        where.priority = filters.priority;
      }

      if (filters.assignedTo) {
        where.assignedTo = filters.assignedTo;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          (where.createdAt as Prisma.DateTimeFilter).lte = new Date(filters.endDate);
        }
      }

      const [orders, total] = await this.prisma.$transaction([
        this.prisma.order.findMany({
          where,
          include: {
            customer: { select: { name: true, document: true } },
            quote: { select: { number: true } },
            items: { include: { product: { select: { name: true, sku: true } } } },
            assignedToUser: { select: { name: true } },
            createdByUser: { select: { name: true } },
            timeTracking: { include: { employee: { select: { name: true } } } },
            expenses: true
          },
          orderBy: {
            [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc'
          },
          skip: ((filters.page || 1) - 1) * (filters.limit || 10),
          take: filters.limit || 10
        }),
        this.prisma.order.count({ where })
      ]);

      return {
        orders: orders.map(order => this.formatOrderResponse(order)),
        total,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: Math.ceil(total / (filters.limit || 10))
      };
    } catch {
      throw new AppError('Erro ao listar ordens de serviço', 500);
    }
  }

  /**
   * Atualiza uma ordem
   */
  async update(id: string, data: UpdateOrderDTO, companyId: string): Promise<OrderResponseDTO> {
    // This also needs to be transactional and handle stock changes (add back, etc)
    // For now, focusing on create
    return this.prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findFirst({
        where: { id, companyId, deletedAt: null },
        include: { items: true },
      });

      if (!existingOrder) {
        throw new AppError('Ordem de serviço não encontrada', 404);
      }

      if (existingOrder.status === 'COMPLETED' || existingOrder.status === 'CANCELLED') {
        throw new AppError('Não é possível editar uma ordem finalizada ou cancelada', 400);
      }

      // Logic to handle stock reversal for old items would be needed here

      let updateData: Prisma.OrderUpdateInput = {
        customerId: data.customerId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        expectedStartDate: data.expectedStartDate ? new Date(data.expectedStartDate) : undefined,
        expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : undefined,
        paymentTerms: data.paymentTerms,
        observations: data.observations,
        discount: data.discount,
        discountType: data.discountType
      };

      if (data.items) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });

        const itemsWithCalculations = data.items.map(item => {
          const subtotal = item.quantity * item.unitPrice;
          const discountValue = item.discountType === 'PERCENTAGE' 
            ? (subtotal * item.discount) / 100 
            : item.discount;
          const total = subtotal - discountValue;
          return { ...item, subtotal, discountValue, total };
        });

        const subtotal = itemsWithCalculations.reduce((sum, item) => sum + item.subtotal, 0);
        const itemsDiscountValue = itemsWithCalculations.reduce((sum, item) => sum + item.discountValue, 0);
        const orderDiscountValue = (data.discountType || existingOrder.discountType) === 'PERCENTAGE'
          ? (subtotal * (data.discount ?? existingOrder.discount)) / 100
          : (data.discount ?? existingOrder.discount);
        const totalValue = subtotal - itemsDiscountValue - orderDiscountValue;

        updateData = {
          ...updateData,
          subtotal,
          discountValue: orderDiscountValue,
          totalValue,
          items: {
            create: itemsWithCalculations.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              discountType: item.discountType,
              subtotal: item.subtotal,
              discountValue: item.discountValue,
              total: item.total,
              observations: item.observations
            }))
          }
        };
        // New stock deduction logic would be needed here as well
      }

      const order = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          customer: { select: { name: true, document: true } },
          quote: { select: { number: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
          assignedToUser: { select: { name: true } },
          createdByUser: { select: { name: true } },
          timeTracking: { include: { employee: { select: { name: true } } } },
          expenses: true
        }
      });

      return this.formatOrderResponse(order);
    });
  }

  /**
   * Exclui uma ordem (soft delete)
   */
  async delete(id: string, companyId: string): Promise<void> {
    try {
      const order = await this.prisma.order.findFirst({
        where: {
          id,
          companyId,
          deletedAt: null
        }
      });

      if (!order) {
        throw new AppError('Ordem de serviço não encontrada', 404);
      }

      if (order.status === 'IN_PROGRESS') {
        throw new AppError('Não é possível excluir uma ordem em andamento', 400);
      }

      await this.prisma.order.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Erro ao excluir ordem de serviço', 500);
    }
  }

  /**
   * Restaura uma ordem excluída
   */
  async restore(id: string, companyId: string): Promise<OrderResponseDTO> {
    try {
      const order = await this.prisma.order.findFirst({
        where: {
          id,
          companyId,
          deletedAt: { not: null }
        }
      });

      if (!order) {
        throw new AppError('Ordem de serviço não encontrada', 404);
      }

      const restoredOrder = await this.prisma.order.update({
        where: { id },
        data: {
          deletedAt: null
        },
        include: {
          customer: { select: { name: true, document: true } },
          quote: { select: { number: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
          assignedToUser: { select: { name: true } },
          createdByUser: { select: { name: true } },
          timeTracking: { include: { employee: { select: { name: true } } } },
          expenses: true
        }
      });

      return this.formatOrderResponse(restoredOrder);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Erro ao restaurar ordem de serviço', 500);
    }
  }

  /**
   * Atualiza o status de uma ordem
   */
  async updateStatus(id: string, data: UpdateOrderStatusDTO, companyId: string): Promise<OrderResponseDTO> {
    // This should also trigger stock movements if status changes to e.g. CANCELLED
    try {
      const order = await this.prisma.order.findFirst({
        where: {
          id,
          companyId,
          deletedAt: null
        }
      });

      if (!order) {
        throw new AppError('Ordem de serviço não encontrada', 404);
      }

      const validTransitions: Record<string, string[]> = {
        'PENDING': ['IN_PROGRESS', 'CANCELLED'],
        'IN_PROGRESS': ['PAUSED', 'COMPLETED', 'CANCELLED'],
        'PAUSED': ['IN_PROGRESS', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': ['PENDING']
      };

      if (!validTransitions[order.status].includes(data.status)) {
        throw new AppError(`Transição de status inválida: ${order.status} -> ${data.status}`, 400);
      }

      const updateData: Prisma.OrderUpdateInput = {
        status: data.status
      };

      if (data.status === 'IN_PROGRESS' && !order.actualStartDate) {
        updateData.actualStartDate = new Date();
      }

      if (data.status === 'COMPLETED') {
        updateData.actualEndDate = new Date();
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: updateData,
        include: {
          customer: { select: { name: true, document: true } },
          quote: { select: { number: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
          assignedToUser: { select: { name: true } },
          createdByUser: { select: { name: true } },
          timeTracking: { include: { employee: { select: { name: true } } } },
          expenses: true
        }
      });

      return this.formatOrderResponse(updatedOrder);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Erro ao atualizar status da ordem de serviço', 500);
    }
  }

  /**
   * Atribui uma ordem a um funcionário
   */
  async assign(id: string, data: AssignOrderDTO, companyId: string): Promise<OrderResponseDTO> {
    try {
      const order = await this.prisma.order.findFirst({
        where: {
          id,
          companyId,
          deletedAt: null
        }
      });

      if (!order) {
        throw new AppError('Ordem de serviço não encontrada', 404);
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          assignedTo: data.assignedTo
        },
        include: {
          customer: { select: { name: true, document: true } },
          quote: { select: { number: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
          assignedToUser: { select: { name: true } },
          createdByUser: { select: { name: true } },
          timeTracking: { include: { employee: { select: { name: true } } } },
          expenses: true
        }
      });

      return this.formatOrderResponse(updatedOrder);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Erro ao atribuir ordem de serviço', 500);
    }
  }

  /**
   * Obtém estatísticas das ordens
   */
  async getStats(companyId: string): Promise<OrderStatsDTO> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const [total, byStatus, byPriority, totalValue, thisMonth, lastMonth, overdue, totalHours, totalExpenses] = await Promise.all([
        this.prisma.order.count({ where: { companyId, deletedAt: null } }),
        this.prisma.order.groupBy({ by: ['status'], where: { companyId, deletedAt: null }, _count: true }),
        this.prisma.order.groupBy({ by: ['priority'], where: { companyId, deletedAt: null }, _count: true }),
        this.prisma.order.aggregate({ where: { companyId, deletedAt: null }, _sum: { totalValue: true }, _avg: { totalValue: true } }),
        this.prisma.order.aggregate({ where: { companyId, deletedAt: null, createdAt: { gte: startOfMonth } }, _count: true, _sum: { totalValue: true } }),
        this.prisma.order.aggregate({ where: { companyId, deletedAt: null, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } }, _count: true, _sum: { totalValue: true } }),
        this.prisma.order.count({ where: { companyId, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS'] }, expectedEndDate: { lt: now } } }),
        this.prisma.orderTimeTracking.aggregate({ where: { order: { companyId, deletedAt: null }, endTime: { not: null } }, _sum: { duration: true } }),
        this.prisma.orderExpense.aggregate({ where: { order: { companyId, deletedAt: null } }, _sum: { amount: true } })
      ]);

      const completedOrders = await this.prisma.order.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: 'COMPLETED',
          actualStartDate: { not: null },
          actualEndDate: { not: null }
        },
        select: {
          actualStartDate: true,
          actualEndDate: true
        }
      });

      const averageCompletionTime = completedOrders.length > 0
        ? completedOrders.reduce((sum, order) => {
            const days = Math.ceil(
              (order.actualEndDate!.getTime() - order.actualStartDate!.getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / completedOrders.length
        : 0;

      const [thisMonthCompleted, lastMonthCompleted] = await Promise.all([
        this.prisma.order.aggregate({
          where: { companyId, deletedAt: null, status: 'COMPLETED', actualEndDate: { gte: startOfMonth } },
          _count: true,
          _sum: { totalValue: true }
        }),
        this.prisma.order.aggregate({
          where: { companyId, deletedAt: null, status: 'COMPLETED', actualEndDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
          _count: true,
          _sum: { totalValue: true }
        })
      ]);

      return {
        total,
        byStatus: {
          pending: byStatus.find(s => s.status === 'PENDING')?._count || 0,
          inProgress: byStatus.find(s => s.status === 'IN_PROGRESS')?._count || 0,
          paused: byStatus.find(s => s.status === 'PAUSED')?._count || 0,
          completed: byStatus.find(s => s.status === 'COMPLETED')?._count || 0,
          cancelled: byStatus.find(s => s.status === 'CANCELLED')?._count || 0
        },
        byPriority: {
          low: byPriority.find(p => p.priority === 'LOW')?._count || 0,
          medium: byPriority.find(p => p.priority === 'MEDIUM')?._count || 0,
          high: byPriority.find(p => p.priority === 'HIGH')?._count || 0,
          urgent: byPriority.find(p => p.priority === 'URGENT')?._count || 0
        },
        totalValue: totalValue._sum.totalValue || 0,
        averageValue: totalValue._avg.totalValue || 0,
        averageCompletionTime,
        thisMonth: {
          total: thisMonth._count,
          totalValue: thisMonth._sum.totalValue || 0,
          completed: thisMonthCompleted._count,
          completedValue: thisMonthCompleted._sum.totalValue || 0
        },
        lastMonth: {
          total: lastMonth._count,
          totalValue: lastMonth._sum.totalValue || 0,
          completed: lastMonthCompleted._count,
          completedValue: lastMonthCompleted._sum.totalValue || 0
        },
        overdue,
        totalHours: totalHours._sum.duration || 0,
        totalExpenses: totalExpenses._sum.amount || 0
      };
    } catch {
      throw new AppError('Erro ao obter estatísticas das ordens de serviço', 500);
    }
  }

  /**
   * Busca ordens para relatório
   */
  async findForReport(filters: OrderFiltersDTO, companyId: string): Promise<OrderReportDTO[]> {
    try {
      const where: Prisma.OrderWhereInput = {
        companyId,
        deletedAt: null
      };

      // Aplicar filtros (mesmo código do findMany)
      if (filters.search) {
        where.OR = [
          { number: { contains: filters.search, mode: 'insensitive' } },
          { title: { contains: filters.search, mode: 'insensitive' } },
          { customer: { name: { contains: filters.search, mode: 'insensitive' } } }
        ];
      }

      if (filters.customerId) where.customerId = filters.customerId;
      if (filters.status) where.status = filters.status;
      if (filters.priority) where.priority = filters.priority;
      if (filters.assignedTo) where.assignedTo = filters.assignedTo;

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filters.startDate);
        if (filters.endDate) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(filters.endDate);
      }

      const orders = await this.prisma.order.findMany({
        where,
        include: {
          customer: { select: { name: true, document: true } },
          items: true,
          assignedToUser: { select: { name: true } },
          createdByUser: { select: { name: true } },
          timeTracking: { where: { endTime: { not: null } } },
          expenses: true
        },
        orderBy: {
          [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc'
        }
      });

      return orders.map(order => ({
        id: order.id,
        number: order.number,
        customerName: order.customer.name,
        customerDocument: order.customer.document,
        title: order.title,
        status: order.status,
        priority: order.priority,
        expectedStartDate: order.expectedStartDate?.toISOString(),
        expectedEndDate: order.expectedEndDate?.toISOString(),
        actualStartDate: order.actualStartDate?.toISOString(),
        actualEndDate: order.actualEndDate?.toISOString(),
        subtotal: order.subtotal,
        discountValue: order.discountValue,
        totalValue: order.totalValue,
        totalHours: order.timeTracking.reduce((sum, t) => sum + (t.duration || 0), 0),
        totalExpenses: order.expenses.reduce((sum, e) => sum + e.amount, 0),
        itemsCount: order.items.length,
        assignedToName: order.assignedToUser?.name,
        createdAt: order.createdAt.toISOString(),
        createdByName: order.createdByUser.name
      }));
    } catch {
      throw new AppError('Erro ao buscar ordens para relatório', 500);
    }
  }

  /**
   * Formata a resposta da ordem
   */
  private formatOrderResponse(order: any): OrderResponseDTO {
    return {
      id: order.id,
      number: order.number,
      quoteId: order.quoteId,
      quoteNumber: order.quote?.number,
      customerId: order.customerId,
      customerName: order.customer.name,
      customerDocument: order.customer.document,
      title: order.title,
      description: order.description,
      status: order.status,
      priority: order.priority,
      expectedStartDate: order.expectedStartDate,
      expectedEndDate: order.expectedEndDate,
      actualStartDate: order.actualStartDate,
      actualEndDate: order.actualEndDate,
      paymentTerms: order.paymentTerms,
      observations: order.observations,
      discount: order.discount,
      discountType: order.discountType,
      subtotal: order.subtotal,
      discountValue: order.discountValue,
      totalValue: order.totalValue,
      assignedTo: order.assignedTo,
      assignedToName: order.assignedToUser?.name,
      items: order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productCode: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        subtotal: item.subtotal,
        total: item.total,
        observations: item.observations
      })),
      timeTracking: order.timeTracking.map((tracking: any) => ({
        id: tracking.id,
        employeeId: tracking.employeeId,
        employeeName: tracking.employee.name,
        startTime: tracking.startTime,
        endTime: tracking.endTime,
        duration: tracking.duration,
        description: tracking.description,
        billable: tracking.billable,
        createdAt: tracking.createdAt
      })),
      expenses: order.expenses.map((expense: any) => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        receipt: expense.receipt,
        billable: expense.billable,
        createdAt: expense.createdAt
      })),
      totalHours: order.timeTracking.reduce((sum: number, t: any) => sum + (t.duration || 0), 0),
      totalExpenses: order.expenses.reduce((sum: number, e: any) => sum + e.amount, 0),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      createdBy: order.createdBy,
      createdByName: order.createdByUser.name
    };
  }
}