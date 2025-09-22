import { PrismaClient, Partner, PartnerContact, PartnerType, Prisma } from '@prisma/client';
import { 
  CreatePartnerDTO, 
  UpdatePartnerDTO, 
  PartnerFiltersDTO, 
  PartnerResponseDTO,
  PartnerStatsDTO,
  PartnerReportDTO
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';

export class PartnerRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Cria um novo parceiro
   */
  async create(data: CreatePartnerDTO, companyId: string): Promise<PartnerResponseDTO> {
    try {
      const partner = await this.prisma.partner.create({
        data: {
          ...data,
          companyId,
          address: data.address ? JSON.stringify(data.address) : undefined
        },
        include: {
          contacts: true
        }
      });

      return this.formatPartnerResponse(partner);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError('Já existe um parceiro com este documento', 409);
        }
      }
      throw new AppError('Erro ao criar parceiro', 500);
    }
  }

  /**
   * Busca parceiro por ID
   */
  async findById(id: string, companyId: string): Promise<PartnerResponseDTO | null> {
    try {
      const partner = await this.prisma.partner.findFirst({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        include: {
          contacts: {
            orderBy: {
              isPrimary: 'desc'
            }
          }
        }
      });

      return partner ? this.formatPartnerResponse(partner) : null;
    } catch {
      throw new AppError('Erro ao buscar parceiro', 500);
    }
  }

  /**
   * Lista parceiros com filtros e paginação
   */
  async findMany(filters: PartnerFiltersDTO, companyId: string): Promise<{
    partners: PartnerResponseDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const where: Prisma.PartnerWhereInput = {
        companyId,
        deletedAt: null,
        ...(filters.name && {
          name: {
            contains: filters.name,
            mode: 'insensitive'
          }
        }),
        ...(filters.email && {
          email: {
            contains: filters.email,
            mode: 'insensitive'
          }
        }),
        ...(filters.document && {
          document: {
            contains: filters.document,
            mode: 'insensitive'
          }
        }),
        ...(filters.type && { type: filters.type }),
        // status filter removido - não existe mais no schema
        ...(filters.salesRepresentative && {
          salesRepresentative: {
            contains: filters.salesRepresentative,
            mode: 'insensitive'
          }
        }),
        ...(filters.createdAfter && {
          createdAt: {
            gte: new Date(filters.createdAfter)
          }
        }),
        ...(filters.createdBefore && {
          createdAt: {
            lte: new Date(filters.createdBefore)
          }
        })
      };

      // Filtros de endereço
      if (filters.city || filters.state) {
        const addressFilters: { path?: string[]; string_contains?: string } = {};
        if (filters.city) {
          addressFilters.path = ['city'];
          addressFilters.string_contains = filters.city;
        }
        if (filters.state) {
          addressFilters.path = ['state'];
          addressFilters.string_contains = filters.state;
        }
        where.address = {
          path: addressFilters.path,
          string_contains: addressFilters.string_contains
        };
      }

      const [partners, total] = await Promise.all([
        this.prisma.partner.findMany({
          where,
          include: {
            contacts: {
              where: { isPrimary: true },
              take: 1
            }
          },
          orderBy: {
            [filters.sortBy]: filters.sortOrder
          },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit
        }),
        this.prisma.partner.count({ where })
      ]);

      return {
        partners: partners.map(partner => this.formatPartnerResponse(partner)),
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit)
      };
    } catch {
      throw new AppError('Erro ao listar parceiros', 500);
    }
  }

  /**
   * Atualiza parceiro
   */
  async update(id: string, data: UpdatePartnerDTO, companyId: string): Promise<PartnerResponseDTO> {
    try {
      const partner = await this.prisma.partner.update({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        data: {
          ...data,
          address: data.address ? JSON.stringify(data.address) : undefined,
          updatedAt: new Date()
        },
        include: {
          contacts: true
        }
      });

      return this.formatPartnerResponse(partner);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('Parceiro não encontrado', 404);
        }
        if (error.code === 'P2002') {
          throw new AppError('Já existe um parceiro com este documento', 409);
        }
      }
      throw new AppError('Erro ao atualizar parceiro', 500);
    }
  }

  /**
   * Remove parceiro (soft delete)
   */
  async delete(id: string, companyId: string): Promise<void> {
    try {
      await this.prisma.partner.update({
        where: {
          id,
          companyId,
          deletedAt: null
        },
        data: {
          deletedAt: new Date(),
          isActive: false
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('Parceiro não encontrado', 404);
        }
      }
      throw new AppError('Erro ao excluir parceiro', 500);
    }
  }

  /**
   * Restaura parceiro
   */
  async restore(id: string, companyId: string): Promise<PartnerResponseDTO> {
    try {
      const partner = await this.prisma.partner.update({
        where: {
          id,
          companyId
        },
        data: {
          deletedAt: null,
          isActive: true,
          updatedAt: new Date()
        },
        include: {
          contacts: true
        }
      });

      return this.formatPartnerResponse(partner);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new AppError('Parceiro não encontrado', 404);
        }
      }
      throw new AppError('Erro ao restaurar parceiro', 500);
    }
  }

  /**
   * Verifica se documento já existe
   */
  async documentExists(document: string, companyId: string, excludeId?: string): Promise<boolean> {
    try {
      const partner = await this.prisma.partner.findFirst({
        where: {
          document,
          companyId,
          deletedAt: null,
          ...(excludeId && { id: { not: excludeId } })
        }
      });

      return !!partner;
    } catch {
      throw new AppError('Erro ao verificar documento', 500);
    }
  }

  /**
   * Busca parceiros por tipo
   */
  async findByType(type: PartnerType, companyId: string): Promise<PartnerResponseDTO[]> {
    try {
      const partners = await this.prisma.partner.findMany({
        where: {
          type,
          companyId,
          deletedAt: null,
          isActive: true
        },
        include: {
          contacts: {
            where: { isPrimary: true },
            take: 1
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      return partners.map(partner => this.formatPartnerResponse(partner));
    } catch {
      throw new AppError('Erro ao buscar parceiros por tipo', 500);
    }
  }

  /**
   * Obtém estatísticas dos parceiros
   */
  async getStats(companyId: string): Promise<PartnerStatsDTO> {
    try {
      const [stats, topCustomers, topSuppliers] = await Promise.all([
        this.prisma.partner.groupBy({
          by: ['isActive', 'type'],
          where: {
            companyId,
            deletedAt: null
          },
          _count: true,
          _sum: {
            creditLimit: true
          }
        }),
        // Top customers (simulado - seria baseado em pedidos)
        this.prisma.partner.findMany({
          where: {
            type: { in: [PartnerType.CUSTOMER, PartnerType.BOTH] },
            companyId,
            deletedAt: null,
            isActive: true
          },
          select: {
            id: true,
            name: true
          },
          take: 5,
          orderBy: {
            name: 'asc'
          }
        }),
        // Top suppliers (simulado - seria baseado em compras)
        this.prisma.partner.findMany({
          where: {
            type: { in: [PartnerType.SUPPLIER, PartnerType.BOTH] },
            companyId,
            deletedAt: null,
            isActive: true
          },
          select: {
            id: true,
            name: true
          },
          take: 5,
          orderBy: {
            name: 'asc'
          }
        })
      ]);

      const result: PartnerStatsDTO = {
        total: 0,
        active: 0,
        inactive: 0,
        blocked: 0,
        customers: 0,
        suppliers: 0,
        both: 0,
        totalCreditLimit: 0,
        averageCreditLimit: 0,
        topCustomers: topCustomers.map(c => ({
          id: c.id,
          name: c.name,
          totalOrders: 0, // Seria calculado com base nos pedidos
          totalValue: 0   // Seria calculado com base nos pedidos
        })),
        topSuppliers: topSuppliers.map(s => ({
          id: s.id,
          name: s.name,
          totalPurchases: 0, // Seria calculado com base nas compras
          totalValue: 0      // Seria calculado com base nas compras
        }))
      };

      stats.forEach(stat => {
        result.total += stat._count;
        result.totalCreditLimit += stat._sum.creditLimit || 0;

        if (stat.isActive === true) result.active += stat._count;
        if (stat.isActive === false) result.inactive += stat._count;
        // blocked status não existe mais, mantendo para compatibilidade

        if (stat.type === PartnerType.CUSTOMER) result.customers += stat._count;
        if (stat.type === PartnerType.SUPPLIER) result.suppliers += stat._count;
        if (stat.type === PartnerType.BOTH) result.both += stat._count;
      });

      result.averageCreditLimit = result.total > 0 ? result.totalCreditLimit / result.total : 0;

      return result;
    } catch {
      throw new AppError('Erro ao obter estatísticas', 500);
    }
  }

  /**
   * Busca parceiros para relatório
   */
  async findForReport(filters: PartnerFiltersDTO, companyId: string): Promise<PartnerReportDTO[]> {
    try {
      const where: Prisma.PartnerWhereInput = {
        companyId,
        deletedAt: null,
        ...(filters.type && { type: filters.type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.createdAfter && {
          createdAt: {
            gte: new Date(filters.createdAfter)
          }
        }),
        ...(filters.createdBefore && {
          createdAt: {
            lte: new Date(filters.createdBefore)
          }
        })
      };

      const partners = await this.prisma.partner.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          document: true,
          type: true,
          isActive: true,
          address: true,
          creditLimit: true,
          createdAt: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      return partners.map(partner => {
        const address = partner.address ? JSON.parse(partner.address as string) : null;
        return {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          document: partner.document,
          type: partner.type,
          isActive: partner.isActive,
          city: address?.city,
          state: address?.state,
          creditLimit: partner.creditLimit,
          totalOrders: 0,    // Seria calculado com base nos pedidos
          totalValue: 0,     // Seria calculado com base nos pedidos
          lastOrderDate: undefined, // Seria calculado com base nos pedidos
          createdAt: partner.createdAt
        };
      });
    } catch {
      throw new AppError('Erro ao gerar relatório', 500);
    }
  }

  /**
   * Formata resposta do parceiro
   */
  private formatPartnerResponse(partner: Partner & { contacts?: PartnerContact[] }): PartnerResponseDTO {
    const address = partner.address ? JSON.parse(partner.address as string) : undefined;
    
    return {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      phone: partner.phone,
      document: partner.document,
      type: partner.type,
      isActive: partner.isActive,
      notes: partner.notes,
      address,
      creditLimit: partner.creditLimit,
      paymentTerms: partner.paymentTerms,
      salesRepresentative: partner.salesRepresentative,
      discount: partner.discount,
      metadata: partner.metadata as Record<string, unknown>,
      contacts: partner.contacts?.map(contact => ({
        id: contact.id,
        partnerId: contact.partnerId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        department: contact.department,
        isPrimary: contact.isPrimary,
        notes: contact.notes,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt
      })),
      companyId: partner.companyId,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
      deletedAt: partner.deletedAt
    };
  }
}