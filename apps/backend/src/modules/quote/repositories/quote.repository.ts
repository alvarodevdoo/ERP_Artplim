import { PrismaClient } from '@prisma/client';
import { 
  CreateQuoteDTO, 
  UpdateQuoteDTO, 
  QuoteFiltersDTO, 
  QuoteResponseDTO,
  QuoteStatsDTO,
  QuoteReportDTO
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';

export class QuoteRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Cria um novo orçamento
   */
  async create(data: CreateQuoteDTO, userId: string, companyId: string): Promise<QuoteResponseDTO> {
    try {
      // Gera número sequencial do orçamento
      const lastQuote = await this.prisma.quote.findFirst({
        where: { companyId },
        orderBy: { number: 'desc' },
        select: { number: true }
      });

      const nextNumber = this.generateNextNumber(lastQuote?.number);

      const quote = await this.prisma.quote.create({
        data: {
          number: nextNumber,
          customerId: data.customerId,
          title: data.title,
          description: data.description,
          validUntil: new Date(data.validUntil),
          paymentTerms: data.paymentTerms,
          deliveryTerms: data.deliveryTerms,
          observations: data.observations,
          discount: data.discount,
          discountType: data.discountType,
          status: 'DRAFT',
          createdBy: userId,
          companyId,
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              discountType: item.discountType,
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
          createdByUser: {
            select: {
              name: true
            }
          }
        }
      });

      return this.mapToResponseDTO(quote);
    } catch (error) {
      throw new AppError('Erro ao criar orçamento', 500);
    }
  }

  /**
   * Busca orçamento por ID
   */
  async findById(id: string, companyId: string): Promise<QuoteResponseDTO | null> {
    try {
      const quote = await this.prisma.quote.findFirst({
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
          createdByUser: {
            select: {
              name: true
            }
          }
        }
      });

      return quote ? this.mapToResponseDTO(quote) : null;
    } catch (error) {
      throw new AppError('Erro ao buscar orçamento', 500);
    }
  }

  /**
   * Lista orçamentos com filtros e paginação
   */
  async findMany(filters: QuoteFiltersDTO, companyId: string): Promise<{
    quotes: QuoteResponseDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const {
        search,
        customerId,
        status,
        startDate,
        endDate,
        minValue,
        maxValue,
        page,
        limit,
        sortBy,
        sortOrder
      } = filters;

      const where: any = {
        companyId,
        deletedAt: null
      };

      // Filtro de busca
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { number: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          {
            customer: {
              name: { contains: search, mode: 'insensitive' }
            }
          }
        ];
      }

      // Filtro por cliente
      if (customerId) {
        where.customerId = customerId;
      }

      // Filtro por status
      if (status) {
        where.status = status;
      }

      // Filtro por período
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      // Filtro por valor
      if (minValue !== undefined || maxValue !== undefined) {
        where.totalValue = {};
        if (minValue !== undefined) where.totalValue.gte = minValue;
        if (maxValue !== undefined) where.totalValue.lte = maxValue;
      }

      const [quotes, total] = await Promise.all([
        this.prisma.quote.findMany({
          where,
          include: {
            customer: {
              select: {
                name: true,
                document: true
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
            createdByUser: {
              select: {
                name: true
              }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.quote.count({ where })
      ]);

      return {
        quotes: quotes.map(quote => this.mapToResponseDTO(quote)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new AppError('Erro ao listar orçamentos', 500);
    }
  }

  /**
   * Atualiza orçamento
   */
  async update(id: string, data: UpdateQuoteDTO, companyId: string): Promise<QuoteResponseDTO> {
    try {
      const quote = await this.prisma.quote.update({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        data: {
          customerId: data.customerId,
          title: data.title,
          description: data.description,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
          paymentTerms: data.paymentTerms,
          deliveryTerms: data.deliveryTerms,
          observations: data.observations,
          discount: data.discount,
          discountType: data.discountType,
          updatedAt: new Date(),
          // Atualiza itens se fornecidos
          ...(data.items && {
            items: {
              deleteMany: {}, // Remove todos os itens existentes
              create: data.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                discountType: item.discountType,
                observations: item.observations
              }))
            }
          })
        },
        include: {
          customer: {
            select: {
              name: true,
              document: true
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
          createdByUser: {
            select: {
              name: true
            }
          }
        }
      });

      return this.mapToResponseDTO(quote);
    } catch (error) {
      throw new AppError('Erro ao atualizar orçamento', 500);
    }
  }

  /**
   * Exclui orçamento (soft delete)
   */
  async delete(id: string, companyId: string): Promise<void> {
    try {
      await this.prisma.quote.update({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        data: {
          deletedAt: new Date()
        }
      });
    } catch (error) {
      throw new AppError('Erro ao excluir orçamento', 500);
    }
  }

  /**
   * Restaura orçamento
   */
  async restore(id: string, companyId: string): Promise<QuoteResponseDTO> {
    try {
      const quote = await this.prisma.quote.update({
        where: {
          id,
          companyId
        },
        data: {
          deletedAt: null,
          updatedAt: new Date()
        },
        include: {
          customer: {
            select: {
              name: true,
              document: true
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
          createdByUser: {
            select: {
              name: true
            }
          }
        }
      });

      return this.mapToResponseDTO(quote);
    } catch (error) {
      throw new AppError('Erro ao restaurar orçamento', 500);
    }
  }

  /**
   * Atualiza status do orçamento
   */
  async updateStatus(id: string, status: string, companyId: string): Promise<QuoteResponseDTO> {
    try {
      const quote = await this.prisma.quote.update({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        data: {
          status: status as any,
          updatedAt: new Date()
        },
        include: {
          customer: {
            select: {
              name: true,
              document: true
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
          createdByUser: {
            select: {
              name: true
            }
          }
        }
      });

      return this.mapToResponseDTO(quote);
    } catch (error) {
      throw new AppError('Erro ao atualizar status do orçamento', 500);
    }
  }

  /**
   * Duplica orçamento
   */
  async duplicate(id: string, data: any, userId: string, companyId: string): Promise<QuoteResponseDTO> {
    try {
      const originalQuote = await this.prisma.quote.findFirst({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        include: {
          items: true
        }
      });

      if (!originalQuote) {
        throw new AppError('Orçamento não encontrado', 404);
      }

      // Gera novo número
      const lastQuote = await this.prisma.quote.findFirst({
        where: { companyId },
        orderBy: { number: 'desc' },
        select: { number: true }
      });

      const nextNumber = this.generateNextNumber(lastQuote?.number);

      const quote = await this.prisma.quote.create({
        data: {
          number: nextNumber,
          customerId: data.customerId || originalQuote.customerId,
          title: data.title || `${originalQuote.title} (Cópia)`,
          description: originalQuote.description,
          validUntil: data.validUntil ? new Date(data.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          paymentTerms: originalQuote.paymentTerms,
          deliveryTerms: originalQuote.deliveryTerms,
          observations: originalQuote.observations,
          discount: originalQuote.discount,
          discountType: originalQuote.discountType,
          status: 'DRAFT',
          createdBy: userId,
          companyId,
          items: {
            create: originalQuote.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              discountType: item.discountType,
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
          createdByUser: {
            select: {
              name: true
            }
          }
        }
      });

      return this.mapToResponseDTO(quote);
    } catch (error) {
      throw new AppError('Erro ao duplicar orçamento', 500);
    }
  }

  /**
   * Obtém estatísticas de orçamentos
   */
  async getStats(companyId: string): Promise<QuoteStatsDTO> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const [total, byStatus, totalValue, thisMonth, lastMonth] = await Promise.all([
        this.prisma.quote.count({
          where: { companyId, deletedAt: null }
        }),
        this.prisma.quote.groupBy({
          by: ['status'],
          where: { companyId, deletedAt: null },
          _count: true
        }),
        this.prisma.quote.aggregate({
          where: { companyId, deletedAt: null },
          _sum: { totalValue: true },
          _avg: { totalValue: true }
        }),
        this.prisma.quote.aggregate({
          where: {
            companyId,
            deletedAt: null,
            createdAt: { gte: startOfMonth }
          },
          _count: true,
          _sum: { totalValue: true }
        }),
        this.prisma.quote.aggregate({
          where: {
            companyId,
            deletedAt: null,
            createdAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            }
          },
          _count: true,
          _sum: { totalValue: true }
        })
      ]);

      const [thisMonthApproved, lastMonthApproved, sentQuotes] = await Promise.all([
        this.prisma.quote.aggregate({
          where: {
            companyId,
            deletedAt: null,
            status: 'APPROVED',
            createdAt: { gte: startOfMonth }
          },
          _count: true,
          _sum: { totalValue: true }
        }),
        this.prisma.quote.aggregate({
          where: {
            companyId,
            deletedAt: null,
            status: 'APPROVED',
            createdAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            }
          },
          _count: true,
          _sum: { totalValue: true }
        }),
        this.prisma.quote.count({
          where: {
            companyId,
            deletedAt: null,
            status: { in: ['SENT', 'APPROVED', 'REJECTED'] }
          }
        })
      ]);

      const statusMap = byStatus.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = item._count;
        return acc;
      }, {} as any);

      const conversionRate = sentQuotes > 0 ? (statusMap.approved || 0) / sentQuotes * 100 : 0;

      return {
        total,
        byStatus: {
          draft: statusMap.draft || 0,
          sent: statusMap.sent || 0,
          approved: statusMap.approved || 0,
          rejected: statusMap.rejected || 0,
          expired: statusMap.expired || 0,
          converted: statusMap.converted || 0
        },
        totalValue: totalValue._sum.totalValue || 0,
        averageValue: totalValue._avg.totalValue || 0,
        conversionRate,
        thisMonth: {
          total: thisMonth._count,
          totalValue: thisMonth._sum.totalValue || 0,
          approved: thisMonthApproved._count,
          approvedValue: thisMonthApproved._sum.totalValue || 0
        },
        lastMonth: {
          total: lastMonth._count,
          totalValue: lastMonth._sum.totalValue || 0,
          approved: lastMonthApproved._count,
          approvedValue: lastMonthApproved._sum.totalValue || 0
        }
      };
    } catch (error) {
      throw new AppError('Erro ao obter estatísticas', 500);
    }
  }

  /**
   * Busca orçamentos para relatório
   */
  async findForReport(filters: QuoteFiltersDTO, companyId: string): Promise<QuoteReportDTO[]> {
    try {
      const where: any = {
        companyId,
        deletedAt: null
      };

      // Aplica filtros similares ao findMany
      if (filters.customerId) where.customerId = filters.customerId;
      if (filters.status) where.status = filters.status;
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
      }

      const quotes = await this.prisma.quote.findMany({
        where,
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          validUntil: true,
          subtotal: true,
          discountValue: true,
          totalValue: true,
          createdAt: true,
          customer: {
            select: {
              name: true,
              document: true
            }
          },
          items: {
            select: {
              id: true
            }
          },
          createdByUser: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return quotes.map(quote => ({
        id: quote.id,
        number: quote.number,
        customerName: quote.customer.name,
        customerDocument: quote.customer.document,
        title: quote.title,
        status: quote.status,
        validUntil: quote.validUntil.toISOString(),
        subtotal: quote.subtotal || 0,
        discountValue: quote.discountValue || 0,
        totalValue: quote.totalValue || 0,
        itemsCount: quote.items.length,
        createdAt: quote.createdAt.toISOString(),
        createdByName: quote.createdByUser.name
      }));
    } catch (error) {
      throw new AppError('Erro ao gerar relatório', 500);
    }
  }

  /**
   * Gera próximo número sequencial
   */
  private generateNextNumber(lastNumber?: string): string {
    if (!lastNumber) {
      return 'ORC-000001';
    }

    const numberPart = lastNumber.split('-')[1];
    const nextNumber = (parseInt(numberPart) + 1).toString().padStart(6, '0');
    return `ORC-${nextNumber}`;
  }

  /**
   * Mapeia entidade para DTO de resposta
   */
  private mapToResponseDTO(quote: any): QuoteResponseDTO {
    // Calcula valores dos itens
    const items = quote.items.map((item: any) => {
      const subtotal = item.quantity * item.unitPrice;
      const discountValue = item.discountType === 'PERCENTAGE' 
        ? subtotal * (item.discount / 100)
        : item.discount;
      const total = subtotal - discountValue;

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productCode: item.product.code,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        subtotal,
        total,
        observations: item.observations
      };
    });

    // Calcula totais do orçamento
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const itemsDiscountValue = items.reduce((sum, item) => sum + (item.subtotal - item.total), 0);
    const quoteDiscountValue = quote.discountType === 'PERCENTAGE'
      ? subtotal * (quote.discount / 100)
      : quote.discount;
    const totalValue = subtotal - itemsDiscountValue - quoteDiscountValue;

    return {
      id: quote.id,
      number: quote.number,
      customerId: quote.customerId,
      customerName: quote.customer.name,
      customerDocument: quote.customer.document,
      title: quote.title,
      description: quote.description,
      status: quote.status,
      validUntil: quote.validUntil,
      paymentTerms: quote.paymentTerms,
      deliveryTerms: quote.deliveryTerms,
      observations: quote.observations,
      discount: quote.discount,
      discountType: quote.discountType,
      subtotal,
      discountValue: quoteDiscountValue,
      totalValue,
      items,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      createdBy: quote.createdBy,
      createdByName: quote.createdByUser.name
    };
  }
}