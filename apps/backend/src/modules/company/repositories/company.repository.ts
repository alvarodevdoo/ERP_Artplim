import { PrismaClient, Company, Prisma } from '@prisma/client';
import { prisma } from '../../../database/connection';
import { logger } from '../../../shared/logger/index';
import { CreateCompanyDto, UpdateCompanyDto, CompanyFiltersDto } from '../dtos';

/**
 * Repositório para operações de empresa
 * Implementa o padrão Repository para isolamento da camada de dados
 */
export class CompanyRepository {
  private db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  /**
   * Cria uma nova empresa
   * @param data Dados da empresa
   * @returns Empresa criada
   */
  async create(data: CreateCompanyDto): Promise<Company> {
    try {
      const company = await prisma.company.create({
       data: {
         name: data.name,
         tradeName: data.tradeName || null,
         cnpj: data.cnpj,
         email: data.email,
         phone: data.phone || null,
         address: data.address || null,
         city: data.city || null,
         state: data.state || null,
         zipCode: data.zipCode || null,
         description: data.description || null,
         website: data.website || null,
         logo: data.logo || null,
         isActive: true,
       },
     });

      logger.info(`Empresa criada: ${company.name} (${company.cnpj})`);
      return company;
    } catch (error) {
      logger.error(error, 'Erro ao criar empresa');
      throw new Error('Falha ao criar empresa');
    }
  }

  /**
   * Busca empresa por ID
   * @param id ID da empresa
   * @returns Empresa encontrada ou null
   */
  async findById(id: string): Promise<Company | null> {
    try {
      return await this.db.company.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error(error, 'Erro ao buscar empresa por ID');
      throw new Error('Falha ao buscar empresa');
    }
  }

  /**
   * Busca empresa por documento
   * @param document Documento da empresa
   * @returns Empresa encontrada ou null
   */
  async findByDocument(cnpj: string): Promise<Company | null> {
    try {
      return await this.db.company.findUnique({
        where: { cnpj },
      });
    } catch (error) {
      logger.error(error, 'Erro ao buscar empresa por documento');
      throw new Error('Falha ao buscar empresa por documento');
    }
  }

  /**
   * Busca empresa por email
   * @param email Email da empresa
   * @returns Empresa encontrada ou null
   */
  async findByEmail(email: string): Promise<Company | null> {
    try {
      const company = await prisma.company.findFirst({
        where: {
          email,
        },
      });

      return company;
    } catch (error) {
      logger.error(error, 'CompanyRepository.findByEmail');
      throw error;
    }
  }

  /**
   * Lista empresas com filtros e paginação
   * @param filters Filtros de busca
   * @returns Lista paginada de empresas
   */
  async findMany(filters: CompanyFiltersDto): Promise<{
    data: Company[];
    total: number;
  }> {
    try {
      const {
        name,
        cnpj,
        email,
        city,
        state,
        isActive,
        page,
        limit,
        sortBy,
        sortOrder,
      } = filters;

      // Construir filtros WHERE
      const where: Prisma.CompanyWhereInput = {};

      if (name) {
        where.name = {
          contains: name,
          mode: 'insensitive',
        };
      }

      if (cnpj) {
        where.cnpj = {
          contains: cnpj,
          mode: 'insensitive',
        };
      }

      if (email) {
        where.email = {
          contains: email,
          mode: 'insensitive',
        };
      }

      if (city) {
        where.city = {
          contains: city,
          mode: 'insensitive',
        };
      }

      if (state) {
        where.state = {
          contains: state,
          mode: 'insensitive',
        };
      }

      if (typeof isActive === 'boolean') {
        where.isActive = isActive;
      }

      // Configurar ordenação
      const orderBy: Prisma.CompanyOrderByWithRelationInput = {
        [sortBy]: sortOrder,
      };

      // Calcular offset para paginação
      const skip = (page - 1) * limit;

      // Buscar empresas e total
      const [data, total] = await Promise.all([
        this.db.company.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        this.db.company.count({ where }),
      ]);

      return { data, total };
    } catch (error) {
      logger.error(error, 'Erro ao listar empresas');
      throw new Error('Falha ao listar empresas');
    }
  }

  /**
   * Atualiza empresa
   * @param id ID da empresa
   * @param data Dados para atualização
   * @returns Empresa atualizada
   */
  async update(id: string, data: UpdateCompanyDto): Promise<Company> {
    try {
      const updateData: any = {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.address && { address: data.address }),
        ...(data.city && { city: data.city }),
        ...(data.state && { state: data.state }),
        ...(data.zipCode && { zipCode: data.zipCode }),
        ...(data.tradeName && { tradeName: data.tradeName }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.website && { website: data.website }),
        ...(data.logo && { logo: data.logo }),
        ...(data.description && { description: data.description }),
      };
      
      const company = await prisma.company.update({
        where: { id },
        data: updateData,
      });

      logger.info(`Empresa atualizada: ${company.name} (${company.cnpj})`);
      return company;
    } catch (error) {
      logger.error(error, 'CompanyRepository.update');
      throw error;
    }
  }

  /**
   * Remove empresa (hard delete)
   * @param id ID da empresa
   */
  async delete(id: string): Promise<void> {
    try {
      await prisma.company.delete({
        where: { id },
      });
    } catch (error) {
      logger.error(error, 'CompanyRepository.delete');
      throw error;
    }
  }

  /**
   * Restaura empresa removida
   * @param id ID da empresa
   * @returns Empresa restaurada
   */
  async restore(id: string): Promise<Company> {
    try {
      const company = await this.db.company.update({
        where: { id },
        data: {
          isActive: true,
        },
      });

      logger.info(`Empresa restaurada: ${company.name} (${company.cnpj})`);
      return company;
    } catch (error) {
      logger.error(error, 'Erro ao restaurar empresa');
      throw new Error('Falha ao restaurar empresa');
    }
  }

  /**
   * Verifica se documento já existe
   * @param document Documento para verificar
   * @param excludeId ID para excluir da verificação (para updates)
   * @returns true se existe, false caso contrário
   */
  async documentExists(cnpj: string, excludeId?: string): Promise<boolean> {
    try {
      const where: Prisma.CompanyWhereInput = { cnpj };
      
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const company = await this.db.company.findFirst({
        where,
        select: { id: true },
      });
      
      return !!company;
    } catch (error) {
      logger.error(error, 'Erro ao verificar se documento existe');
      throw new Error('Falha ao verificar documento');
    }
  }

  /**
   * Verifica se email já existe
   * @param email Email para verificar
   * @param excludeId ID para excluir da verificação (para updates)
   * @returns true se existe, false caso contrário
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    try {
      const where: Prisma.CompanyWhereInput = { email };
      
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const company = await this.db.company.findFirst({
        where,
        select: { id: true },
      });
      
      return !!company;
    } catch (error) {
      logger.error(error, 'Erro ao verificar se email existe');
      throw new Error('Falha ao verificar email');
    }
  }

  /**
   * Busca estatísticas da empresa
   * @param id ID da empresa
   * @returns Estatísticas da empresa
   */
  async getStats(id: string): Promise<{
    totalUsers: number;
    totalEmployees: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    activeOrders: number;
  }> {
    try {
      const [totalUsers, totalEmployees, totalProducts, totalOrders, revenue, activeOrders] = await Promise.all([
        this.db.user.count({ where: { companyId: id } }),
        this.db.employee.count({ where: { companyId: id } }),
        this.db.product.count({ where: { companyId: id } }),
        this.db.order.count({ where: { companyId: id } }),
        this.db.order.aggregate({
          where: {
            companyId: id,
            status: 'DELIVERED',
          },
          _sum: {
            total: true,
          },
        }),
        this.db.order.count({
          where: {
            companyId: id,
            status: {
              in: ['PENDING', 'CONFIRMED', 'IN_PRODUCTION'],
            },
          },
        }),
      ]);

      return {
        totalUsers,
        totalEmployees,
        totalProducts,
        totalOrders,
        totalRevenue: Number(revenue._sum.total) || 0,
        activeOrders,
      };
    } catch (error) {
      logger.error(error, 'Erro ao buscar estatísticas da empresa');
      throw new Error('Falha ao buscar estatísticas');
    }
  }
}