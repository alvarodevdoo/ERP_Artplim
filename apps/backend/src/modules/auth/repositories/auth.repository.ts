import { PrismaClient, User, Role, Company, Employee, Prisma } from '@prisma/client';
import { prisma } from '../../../database/connection';
import { logger } from '../../../shared/logger/index';
import { RegisterDto, UpdateProfileDto } from '../dtos';

/**
 * Repositório para operações de autenticação e usuários
 * Implementa o padrão Repository para isolamento da camada de dados
 */
export class AuthRepository {
  private db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  /**
   * Busca usuário por email com relacionamentos necessários
   * @param email Email do usuário
   * @returns Usuário com company, roles e permissions ou null
   */
  async findUserByEmail(email: string): Promise<User & {
    company: Company;
    employee?: Employee & {
      role: Role;
    } | null;
  } | null> {
    try {
      return await this.db.user.findUnique({
        where: { email },
        include: {
          company: true,
          employee: {
            include: {
              role: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error(error, 'AuthRepository.findUserByEmail');
      throw new Error('Falha ao buscar usuário');
    }
  }

  /**
   * Busca usuário por ID com relacionamentos necessários
   * @param id ID do usuário
   * @returns Usuário com company, roles e permissions ou null
   */
  async findUserById(id: string): Promise<User & {
    company: Company;
    employee?: Employee & {
      role: Role;
    } | null;
  } | null> {
    try {
      return await this.db.user.findUnique({
        where: { id },
        include: {
          company: true,
          employee: {
            include: {
              role: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error(error, 'AuthRepository.findUserById');
      throw new Error('Falha ao buscar usuário');
    }
  }

  // Método removido - campos resetToken e resetTokenExpiry não existem no schema

  /**
   * Cria novo usuário e empresa em transação
   * @param userData Dados do usuário
   * @param companyData Dados da empresa
   * @returns Usuário criado com relacionamentos
   */
  async createUserWithCompany(
    userData: { name: string; email: string; password: string },
    companyData: { name: string; cnpj: string }
  ): Promise<User & {
    company: Company;
    employee?: Employee & {
      role: Role;
    } | null;
  }> {
    try {
      return await this.db.$transaction(async (tx) => {
        // Criar empresa
        const company = await tx.company.create({
          data: {
            name: companyData.name,
            cnpj: companyData.cnpj,
            email: userData.email,
            isActive: true,
          },
        });

        // Buscar role de admin
        const adminRole = await tx.role.findFirst({
          where: { name: 'admin', companyId: company.id },
        });

        // Criar usuário
        const user = await tx.user.create({
          data: {
            name: userData.name,
            email: userData.email,
            password: userData.password,
            companyId: company.id,
            isActive: true,
          },
          include: {
            company: true,
            employee: {
              include: {
                role: true,
              },
            },
          },
        });

        // Se existe role de admin, criar employee
        if (adminRole) {
          await tx.employee.create({
            data: {
              userId: user.id,
              roleId: adminRole.id,
              employeeNumber: '001',
              companyId: company.id,
              isActive: true,
            },
          });
        }

        logger.info(`Usuário criado com sucesso: ${user.email}`);
        return user;
      });
    } catch (error) {
      logger.error(error, 'AuthRepository.createUserWithCompany');
      throw new Error('Falha ao criar usuário e empresa');
    }
  }

  /**
   * Atualiza dados do usuário
   * @param id ID do usuário
   * @param data Dados para atualização
   * @returns Usuário atualizado
   */
  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      const user = await this.db.user.update({
        where: { id },
        data,
      });

      logger.info(`Usuário atualizado: ${user.email}`);
      return user;
    } catch (error) {
      logger.error(error, 'AuthRepository.updateUser');
      throw new Error('Falha ao atualizar usuário');
    }
  }

  /**
   * Verifica se email já existe
   * @param email Email para verificar
   * @returns true se existe, false caso contrário
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const user = await this.db.user.findUnique({
        where: { email },
        select: { id: true },
      });
      return !!user;
    } catch (error) {
      logger.error(error, 'AuthRepository.emailExists');
      throw new Error('Falha ao verificar email');
    }
  }

  /**
   * Verifica se CNPJ da empresa já existe
   * @param cnpj CNPJ para verificar
   * @returns true se existe, false caso contrário
   */
  async companyCnpjExists(cnpj: string): Promise<boolean> {
    try {
      const company = await this.db.company.findUnique({
        where: { cnpj },
        select: { id: true },
      });
      return !!company;
    } catch (error) {
      logger.error(error, 'AuthRepository.companyCnpjExists');
      throw new Error('Falha ao verificar CNPJ da empresa');
    }
  }

  // Método removido - campo lastLoginAt não existe no schema
}