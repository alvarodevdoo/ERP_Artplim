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
import { OrderRepository } from '../repositories';
import { RoleService } from '../../role/services';
import { AppError } from '../../../shared/errors/AppError';

export class OrderService {
  private orderRepository: OrderRepository;
  private roleService: RoleService;

  constructor(
    private prisma: PrismaClient,
    roleService?: RoleService
  ) {
    this.orderRepository = new OrderRepository(prisma);
    this.roleService = roleService || new RoleService(prisma);
  }

  /**
   * Cria uma nova ordem de serviço
   */
  async create(data: CreateOrderDTO, companyId: string, userId: string): Promise<OrderResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'create');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para criar ordens de serviço', 403);
    }

    // Validar dados da ordem
    await this.validateOrderData(data, companyId);

    return this.orderRepository.create(data, companyId, userId);
  }

  /**
   * Busca uma ordem por ID
   */
  async findById(id: string, companyId: string, userId: string): Promise<OrderResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar ordens de serviço', 403);
    }

    const order = await this.orderRepository.findById(id, companyId);
    if (!order) {
      throw new AppError('Ordem de serviço não encontrada', 404);
    }

    return order;
  }

  /**
   * Lista ordens com filtros e paginação
   */
  async findMany(filters: OrderFiltersDTO, companyId: string, userId: string): Promise<{
    orders: OrderResponseDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para listar ordens de serviço', 403);
    }

    // Normalizar filtros
    const normalizedFilters = this.normalizeFilters(filters);

    return this.orderRepository.findMany(normalizedFilters, companyId);
  }

  /**
   * Atualiza uma ordem
   */
  async update(id: string, data: UpdateOrderDTO, companyId: string, userId: string): Promise<OrderResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para atualizar ordens de serviço', 403);
    }

    // Verificar se a ordem existe
    const existingOrder = await this.orderRepository.findById(id, companyId);
    if (!existingOrder) {
      throw new AppError('Ordem de serviço não encontrada', 404);
    }

    // Validar se pode ser editada
    if (existingOrder.status === 'COMPLETED' || existingOrder.status === 'CANCELLED') {
      throw new AppError('Não é possível editar uma ordem finalizada ou cancelada', 400);
    }

    // Validar dados da ordem se fornecidos
    if (data.customerId || data.items) {
      await this.validateOrderData({
        customerId: data.customerId || existingOrder.customerId,
        items: data.items || existingOrder.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          discountType: item.discountType,
          observations: item.observations
        }))
      } as CreateOrderDTO, companyId);
    }

    return this.orderRepository.update(id, data, companyId);
  }

  /**
   * Exclui uma ordem (soft delete)
   */
  async delete(id: string, companyId: string, userId: string): Promise<void> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'delete');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para excluir ordens de serviço', 403);
    }

    // Verificar se a ordem existe
    const order = await this.orderRepository.findById(id, companyId);
    if (!order) {
      throw new AppError('Ordem de serviço não encontrada', 404);
    }

    // Validar se pode ser excluída
    if (order.status === 'IN_PROGRESS') {
      throw new AppError('Não é possível excluir uma ordem em andamento', 400);
    }

    await this.orderRepository.delete(id, companyId);
  }

  /**
   * Restaura uma ordem excluída
   */
  async restore(id: string, companyId: string, userId: string): Promise<OrderResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'create');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para restaurar ordens de serviço', 403);
    }

    return this.orderRepository.restore(id, companyId);
  }

  /**
   * Atualiza o status de uma ordem
   */
  async updateStatus(id: string, data: UpdateOrderStatusDTO, companyId: string, userId: string): Promise<OrderResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para atualizar status de ordens de serviço', 403);
    }

    // Verificar se a ordem existe
    const order = await this.orderRepository.findById(id, companyId);
    if (!order) {
      throw new AppError('Ordem de serviço não encontrada', 404);
    }

    return this.orderRepository.updateStatus(id, data, companyId);
  }

  /**
   * Atribui uma ordem a um funcionário
   */
  async assign(id: string, data: AssignOrderDTO, companyId: string, userId: string): Promise<OrderResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para atribuir ordens de serviço', 403);
    }

    // Verificar se o funcionário existe e pertence à empresa
    const employee = await this.prisma.user.findFirst({
      where: {
        id: data.assignedTo,
        companyId,
        deletedAt: null
      }
    });

    if (!employee) {
      throw new AppError('Funcionário não encontrado', 404);
    }

    return this.orderRepository.assign(id, data, companyId);
  }

  /**
   * Adiciona registro de tempo à ordem
   */
  async addTimeTracking(orderId: string, data: AddOrderTimeTrackingDTO, companyId: string, userId: string): Promise<void> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para adicionar tempo às ordens de serviço', 403);
    }

    // Verificar se a ordem existe
    const order = await this.orderRepository.findById(orderId, companyId);
    if (!order) {
      throw new AppError('Ordem de serviço não encontrada', 404);
    }

    // Verificar se o funcionário existe
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: data.employeeId,
        companyId,
        deletedAt: null
      }
    });

    if (!employee) {
      throw new AppError('Funcionário não encontrado', 404);
    }

    // Calcular duração se endTime for fornecido
    let duration: number | undefined;
    if (data.endTime) {
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);
      duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // em minutos

      if (duration <= 0) {
        throw new AppError('Hora de fim deve ser posterior à hora de início', 400);
      }
    }

    await this.prisma.orderTimeTracking.create({
      data: {
        orderId,
        employeeId: data.employeeId,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : null,
        duration,
        description: data.description,
        billable: data.billable
      }
    });
  }

  /**
   * Atualiza registro de tempo
   */
  async updateTimeTracking(timeTrackingId: string, data: UpdateOrderTimeTrackingDTO, companyId: string, userId: string): Promise<void> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para atualizar tempo das ordens de serviço', 403);
    }

    // Verificar se o registro existe
    const timeTracking = await this.prisma.orderTimeTracking.findFirst({
      where: {
        id: timeTrackingId,
        order: {
          companyId
        }
      }
    });

    if (!timeTracking) {
      throw new AppError('Registro de tempo não encontrado', 404);
    }

    const updateData: {
      startTime?: Date;
      endTime?: Date;
      description?: string;
      billable?: boolean;
      duration?: number;
    } = {
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      description: data.description,
      billable: data.billable
    };

    // Recalcular duração se necessário
    if (data.startTime || data.endTime) {
      const startTime = data.startTime ? new Date(data.startTime) : timeTracking.startTime;
      const endTime = data.endTime ? new Date(data.endTime) : timeTracking.endTime;

      if (startTime && endTime) {
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        if (duration <= 0) {
          throw new AppError('Hora de fim deve ser posterior à hora de início', 400);
        }
        updateData.duration = duration;
      }
    }

    await this.prisma.orderTimeTracking.update({
      where: { id: timeTrackingId },
      data: updateData
    });
  }

  /**
   * Remove registro de tempo
   */
  async removeTimeTracking(timeTrackingId: string, companyId: string, userId: string): Promise<void> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para remover tempo das ordens de serviço', 403);
    }

    // Verificar se o registro existe
    const timeTracking = await this.prisma.orderTimeTracking.findFirst({
      where: {
        id: timeTrackingId,
        order: {
          companyId
        }
      }
    });

    if (!timeTracking) {
      throw new AppError('Registro de tempo não encontrado', 404);
    }

    await this.prisma.orderTimeTracking.delete({
      where: { id: timeTrackingId }
    });
  }

  /**
   * Adiciona despesa à ordem
   */
  async addExpense(orderId: string, data: AddOrderExpenseDTO, companyId: string, userId: string): Promise<void> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para adicionar despesas às ordens de serviço', 403);
    }

    // Verificar se a ordem existe
    const order = await this.orderRepository.findById(orderId, companyId);
    if (!order) {
      throw new AppError('Ordem de serviço não encontrada', 404);
    }

    await this.prisma.orderExpense.create({
      data: {
        orderId,
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: new Date(data.date),
        receipt: data.receipt,
        billable: data.billable
      }
    });
  }

  /**
   * Atualiza despesa
   */
  async updateExpense(expenseId: string, data: UpdateOrderExpenseDTO, companyId: string, userId: string): Promise<void> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para atualizar despesas das ordens de serviço', 403);
    }

    // Verificar se a despesa existe
    const expense = await this.prisma.orderExpense.findFirst({
      where: {
        id: expenseId,
        order: {
          companyId
        }
      }
    });

    if (!expense) {
      throw new AppError('Despesa não encontrada', 404);
    }

    await this.prisma.orderExpense.update({
      where: { id: expenseId },
      data: {
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: data.date ? new Date(data.date) : undefined,
        receipt: data.receipt,
        billable: data.billable
      }
    });
  }

  /**
   * Remove despesa
   */
  async removeExpense(expenseId: string, companyId: string, userId: string): Promise<void> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para remover despesas das ordens de serviço', 403);
    }

    // Verificar se a despesa existe
    const expense = await this.prisma.orderExpense.findFirst({
      where: {
        id: expenseId,
        order: {
          companyId
        }
      }
    });

    if (!expense) {
      throw new AppError('Despesa não encontrada', 404);
    }

    await this.prisma.orderExpense.delete({
      where: { id: expenseId }
    });
  }

  /**
   * Obtém estatísticas das ordens
   */
  async getStats(companyId: string, userId: string): Promise<OrderStatsDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar estatísticas de ordens de serviço', 403);
    }

    return this.orderRepository.getStats(companyId);
  }

  /**
   * Gera relatório de ordens
   */
  async generateReport(filters: OrderFiltersDTO, format: 'json' | 'csv', companyId: string, userId: string): Promise<OrderReportDTO[] | string> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para gerar relatórios de ordens de serviço', 403);
    }

    const orders = await this.orderRepository.findForReport(filters, companyId);

    if (format === 'json') {
      return orders;
    }

    // Gerar CSV
    const headers = [
      'Número',
      'Cliente',
      'Documento',
      'Título',
      'Status',
      'Prioridade',
      'Data Início Prevista',
      'Data Fim Prevista',
      'Data Início Real',
      'Data Fim Real',
      'Subtotal',
      'Desconto',
      'Total',
      'Horas Totais',
      'Despesas Totais',
      'Qtd Itens',
      'Responsável',
      'Criado em',
      'Criado por'
    ];

    const csvRows = [headers.join(',')];

    orders.forEach(order => {
      const row = [
        order.number,
        `"${order.customerName}"`,
        order.customerDocument,
        `"${order.title}"`,
        order.status,
        order.priority,
        order.expectedStartDate || '',
        order.expectedEndDate || '',
        order.actualStartDate || '',
        order.actualEndDate || '',
        order.subtotal.toFixed(2),
        order.discountValue.toFixed(2),
        order.totalValue.toFixed(2),
        order.totalHours.toString(),
        order.totalExpenses.toFixed(2),
        order.itemsCount.toString(),
        order.assignedToName || '',
        order.createdAt,
        `"${order.createdByName}"`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Obtém dados para dashboard
   */
  async getDashboard(companyId: string, userId: string): Promise<OrderDashboardDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'orders', 'read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar dashboard de ordens de serviço', 403);
    }

    const [stats, recentOrders, overdueOrders, upcomingDeadlines, topCustomers, productivityMetrics] = await Promise.all([
      this.getStats(companyId, userId),
      this.findMany({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }, companyId, userId),
      this.findOverdueOrders(companyId),
      this.findUpcomingDeadlines(companyId),
      this.getTopCustomers(companyId),
      this.getProductivityMetrics(companyId)
    ]);

    return {
      stats,
      recentOrders: recentOrders.orders,
      overdueOrders,
      upcomingDeadlines,
      topCustomers,
      productivityMetrics
    };
  }

  /**
   * Valida dados da ordem
   */
  private async validateOrderData(data: Partial<CreateOrderDTO>, companyId: string): Promise<void> {
    // Verificar se o cliente existe
    if (data.customerId) {
      const customer = await this.prisma.partner.findFirst({
        where: {
          id: data.customerId,
          companyId,
          type: 'CUSTOMER',
          deletedAt: null
        }
      });

      if (!customer) {
        throw new AppError('Cliente não encontrado', 404);
      }
    }

    // Verificar se os produtos existem
    if (data.items && data.items.length > 0) {
      const productIds = data.items.map(item => item.productId);
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          companyId,
          deletedAt: null
        }
      });

      if (products.length !== productIds.length) {
        throw new AppError('Um ou mais produtos não foram encontrados', 404);
      }

      // Validar quantidades e preços
      data.items.forEach(item => {
        if (item.quantity <= 0) {
          throw new AppError('Quantidade deve ser maior que zero', 400);
        }
        if (item.unitPrice < 0) {
          throw new AppError('Preço unitário não pode ser negativo', 400);
        }
        if (item.discount < 0) {
          throw new AppError('Desconto não pode ser negativo', 400);
        }
      });
    }

    // Validar datas
    if (data.expectedStartDate && data.expectedEndDate) {
      const startDate = new Date(data.expectedStartDate);
      const endDate = new Date(data.expectedEndDate);
      
      if (endDate <= startDate) {
        throw new AppError('Data de fim deve ser posterior à data de início', 400);
      }
    }

    // Validar desconto
    if (data.discount !== undefined && data.discount < 0) {
      throw new AppError('Desconto não pode ser negativo', 400);
    }
  }

  /**
   * Normaliza filtros
   */
  private normalizeFilters(filters: OrderFiltersDTO): OrderFiltersDTO {
    return {
      ...filters,
      page: Math.max(1, filters.page || 1),
      limit: Math.min(100, Math.max(1, filters.limit || 20))
    };
  }

  /**
   * Busca ordens atrasadas
   */
  private async findOverdueOrders(companyId: string): Promise<OrderResponseDTO[]> {
    const now = new Date();
    
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        },
        expectedEndDate: {
          lt: now
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
      },
      orderBy: {
        expectedEndDate: 'asc'
      },
      take: 10
    });

    return orders.map(order => this.orderRepository['formatOrderResponse'](order));
  }

  /**
   * Busca ordens com prazos próximos
   */
  private async findUpcomingDeadlines(companyId: string): Promise<OrderResponseDTO[]> {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        },
        expectedEndDate: {
          gte: now,
          lte: nextWeek
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
      },
      orderBy: {
        expectedEndDate: 'asc'
      },
      take: 10
    });

    return orders.map(order => this.orderRepository['formatOrderResponse'](order));
  }

  /**
   * Obtém principais clientes
   */
  private async getTopCustomers(companyId: string) {
    const result = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: {
        companyId,
        deletedAt: null,
        status: {
          not: 'CANCELLED'
        }
      },
      _count: {
        id: true
      },
      _sum: {
        totalValue: true
      },
      orderBy: {
        _sum: {
          totalValue: 'desc'
        }
      },
      take: 5
    });

    const customerIds = result.map(r => r.customerId);
    const customers = await this.prisma.partner.findMany({
      where: {
        id: { in: customerIds },
        companyId
      },
      select: {
        id: true,
        name: true
      }
    });

    return result.map(r => {
      const customer = customers.find(c => c.id === r.customerId);
      return {
        customerId: r.customerId,
        customerName: customer?.name || 'Cliente não encontrado',
        ordersCount: r._count.id,
        totalValue: r._sum.totalValue || 0
      };
    });
  }

  /**
   * Obtém métricas de produtividade
   */
  private async getProductivityMetrics(companyId: string) {
    const [totalOrders, completedOrders, onTimeOrders, totalHours, totalExpenses] = await Promise.all([
      this.prisma.order.count({
        where: {
          companyId,
          deletedAt: null,
          status: { not: 'CANCELLED' }
        }
      }),
      this.prisma.order.count({
        where: {
          companyId,
          deletedAt: null,
          status: 'COMPLETED'
        }
      }),
      this.prisma.order.count({
        where: {
          companyId,
          deletedAt: null,
          status: 'COMPLETED',
          actualEndDate: { not: null },
          expectedEndDate: { not: null },
          AND: {
            actualEndDate: {
              lte: this.prisma.order.fields.expectedEndDate
            }
          }
        }
      }),
      this.prisma.orderTimeTracking.aggregate({
        where: {
          order: {
            companyId,
            deletedAt: null
          },
          endTime: { not: null }
        },
        _sum: {
          duration: true
        }
      }),
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

    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const onTimeDeliveryRate = completedOrders > 0 ? (onTimeOrders / completedOrders) * 100 : 0;
    const averageHoursPerOrder = completedOrders > 0 ? (totalHours._sum.duration || 0) / completedOrders : 0;
    const averageExpensesPerOrder = completedOrders > 0 ? (totalExpenses._sum.amount || 0) / completedOrders : 0;

    return {
      averageHoursPerOrder,
      averageExpensesPerOrder,
      completionRate,
      onTimeDeliveryRate
    };
  }
}