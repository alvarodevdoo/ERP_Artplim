import { PrismaClient } from '@prisma/client';
import { 
  CreateOrderDTO, 
  UpdateOrderDTO, 
  OrderFiltersDTO, 
  UpdateOrderStatusDTO,
  AssignOrderDTO,
  AddOrderTimeTrackingDTO,
  UpdateOrderTimeTrackingDTO,
  AddOrderExpenseDTO,
  UpdateOrderExpenseDTO,
  OrderResponseDTO,
  OrderStatsDTO,
  OrderReportDTO,
  OrderDashboardDTO
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';

export class OrderRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Cria uma nova ordem de serviço
   */
  async create(data: CreateOrderDTO, companyId: string, userId: string): Promise<OrderResponseDTO> {
    try {
      // Gerar número sequencial da ordem
      const lastOrder = await this.prisma.order.findFirst({
        where: { companyId },
        orderBy: { number: 'desc' }
      });

      const nextNumber = lastOrder 
        ? String(parseInt(lastOrder.number) + 1).padStart(6, '0')
        : '000001';

      // Calcular valores dos itens
      const itemsWithCalculations = data.items.map(item => {
        const subtotal = item.quantity * item.unitPrice;
        const discountValue = item.discountType === 'PERCENTAGE' 
          ? (subtotal * item.discount) / 100 
          : item.discount;
        const total = subtotal - discountValue;

        return {
          ...item,
          subtotal,
          discountValue,
          total
        };
      });

      // Calcular totais da ordem
      const subtotal = itemsWithCalculations.reduce((sum, item) => sum + item.subtotal, 0);
      const itemsDiscountValue = itemsWithCalculations.reduce((sum, item) => sum + item.discountValue, 0);
      
      const orderDiscountValue = data.discountType === 'PERCENTAGE'
        ? (subtotal * data.discount) / 100
        : data.discount;
      
      const totalValue = subtotal - itemsDiscountValue - orderDiscountValue;

      const order = await this.prisma.order.create({
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
          actualStartDate: data.actualStartDate ? new Date(data.actualStartDate) : null,
          actualEndDate: data.actualEndDate ? new Date(data.actualEndDate) : null,
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
              observations: item.observations
            }))
          }
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
                  code: true
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

      return this.formatOrderResponse(order);
    } catch (error) {
      throw new AppError('Erro ao criar ordem de serviço', 500);
    }
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
                  code: true
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
    } catch (error) {
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
      const where: any = {
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
          where.createdAt.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.createdAt.lte = new Date(filters.endDate);
        }
      }

      if (filters.expectedStartDate || filters.expectedEndDate) {
        where.expectedStartDate = {};
        if (filters.expectedStartDate) {
          where.expectedStartDate.gte = new Date(filters.expectedStartDate);
        }
        if (filters.expectedEndDate) {
          where.expectedStartDate.lte = new Date(filters.expectedEndDate);
        }
      }

      if (filters.minValue !== undefined || filters.maxValue !== undefined) {
        where.totalValue = {};
        if (filters.minValue !== undefined) {
          where.totalValue.gte = filters.minValue;
        }
        if (filters.maxValue !== undefined) {
          where.totalValue.lte = filters.maxValue;
        }
      }

      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          where,
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
                    code: true
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
          },
          orderBy: {
            [filters.sortBy]: filters.sortOrder
          },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit
        }),
        this.prisma.order.count({ where })
      ]);

      return {
        orders: orders.map(order => this.formatOrderResponse(order)),
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      };
    } catch (error) {
      throw new AppError('Erro ao listar ordens de serviço', 500);
    }
  }

  /**
   * Atualiza uma ordem
   */
  async update(id: string, data: UpdateOrderDTO, companyId: string): Promise<OrderResponseDTO> {
    try {
      // Verificar se a ordem existe
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          id,
          companyId,
          deletedAt: null
        }
      });

      if (!existingOrder) {
        throw new AppError('Ordem de serviço não encontrada', 404);
      }

      // Verificar se pode ser editada
      if (existingOrder.status === 'COMPLETED' || existingOrder.status === 'CANCELLED') {
        throw new AppError('Não é possível editar uma ordem finalizada ou cancelada', 400);
      }

      let updateData: any = {
        customerId: data.customerId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        expectedStartDate: data.expectedStartDate ? new Date(data.expectedStartDate) : undefined,
        expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : undefined,
        actualStartDate: data.actualStartDate ? new Date(data.actualStartDate) : undefined,
        actualEndDate: data.actualEndDate ? new Date(data.actualEndDate) : undefined,
        paymentTerms: data.paymentTerms,
        observations: data.observations,
        discount: data.discount,
        discountType: data.discountType
      };

      // Se há itens para atualizar, recalcular totais
      if (data.items) {
        // Remover itens existentes
        await this.prisma.orderItem.deleteMany({
          where: { orderId: id }
        });

        // Calcular valores dos novos itens
        const itemsWithCalculations = data.items.map(item => {
          const subtotal = item.quantity * item.unitPrice;
          const discountValue = item.discountType === 'PERCENTAGE' 
            ? (subtotal * item.discount) / 100 
            : item.discount;
          const total = subtotal - discountValue;

          return {
            ...item,
            subtotal,
            discountValue,
            total
          };
        });

        // Calcular totais da ordem
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
      }

      const order = await this.prisma.order.update({
        where: { id },
        data: updateData,
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
                  code: true
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

      return this.formatOrderResponse(order);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Erro ao atualizar ordem de serviço', 500);
    }
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
                  code: true
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

      // Validar transição de status
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

      let updateData: any = {
        status: data.status
      };

      // Atualizar datas baseado no status
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
                  code: true
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
                  code: true
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
        // Total de ordens
        this.prisma.order.count({
          where: {
            companyId,
            deletedAt: null
          }
        }),
        // Por status
        this.prisma.order.groupBy({
          by: ['status'],
          where: {
            companyId,
            deletedAt: null
          },
          _count: true
        }),
        // Por prioridade
        this.prisma.order.groupBy({
          by: ['priority'],
          where: {
            companyId,
            deletedAt: null
          },
          _count: true
        }),
        // Valor total
        this.prisma.order.aggregate({
          where: {
            companyId,
            deletedAt: null
          },
          _sum: {
            totalValue: true
          },
          _avg: {
            totalValue: true
          }
        }),
        // Este mês
        this.prisma.order.aggregate({
          where: {
            companyId,
            deletedAt: null,
            createdAt: {
              gte: startOfMonth
            }
          },
          _count: true,
          _sum: {
            totalValue: true
          }
        }),
        // Mês passado
        this.prisma.order.aggregate({
          where: {
            companyId,
            deletedAt: null,
            createdAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            }
          },
          _count: true,
          _sum: {
            totalValue: true
          }
        }),
        // Atrasadas
        this.prisma.order.count({
          where: {
            companyId,
            deletedAt: null,
            status: {
              in: ['PENDING', 'IN_PROGRESS']
            },
            expectedEndDate: {
              lt: now
            }
          }
        }),
        // Total de horas
        this.prisma.orderTimeTracking.aggregate({
          where: {
            order: {
              companyId,
              deletedAt: null
            },
            endTime: {
              not: null
            }
          },
          _sum: {
            duration: true
          }
        }),
        // Total de despesas
        this.prisma.orderExpense.aggregate({
          where: {
            order: {
              companyId,
              deletedAt: null
            }
          },
          _sum: {
            amount: true
          }
        })
      ]);

      // Calcular tempo médio de conclusão
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

      // Contar ordens concluídas este mês e mês passado
      const [thisMonthCompleted, lastMonthCompleted] = await Promise.all([
        this.prisma.order.aggregate({
          where: {
            companyId,
            deletedAt: null,
            status: 'COMPLETED',
            actualEndDate: {
              gte: startOfMonth
            }
          },
          _count: true,
          _sum: {
            totalValue: true
          }
        }),
        this.prisma.order.aggregate({
          where: {
            companyId,
            deletedAt: null,
            status: 'COMPLETED',
            actualEndDate: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            }
          },
          _count: true,
          _sum: {
            totalValue: true
          }
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
    } catch (error) {
      throw new AppError('Erro ao obter estatísticas das ordens de serviço', 500);
    }
  }

  /**
   * Busca ordens para relatório
   */
  async findForReport(filters: OrderFiltersDTO, companyId: string): Promise<OrderReportDTO[]> {
    try {
      const where: any = {
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
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
      }

      const orders = await this.prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              name: true,
              document: true
            }
          },
          items: true,
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
            where: {
              endTime: { not: null }
            }
          },
          expenses: true
        },
        orderBy: {
          [filters.sortBy]: filters.sortOrder
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
    } catch (error) {
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
        productCode: item.product.code,
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