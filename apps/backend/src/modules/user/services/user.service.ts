import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { UserRepository } from '../repositories';
import { CompanyRepository } from '../../company/repositories';
import { logger } from '../../../shared/logger/index';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  UserFiltersDto,
  UserResponseDto,
  UserListResponseDto,
  UserProfileDto,
  UserStatsDto,
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';
import { validateCPF } from '../../../shared/utils/validators';

/**
 * Service para operações de usuário
 * Implementa regras de negócio e validações
 */
export class UserService {
  private userRepository: UserRepository;
  private companyRepository: CompanyRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.companyRepository = new CompanyRepository();
  }

  /**
   * Cria um novo usuário
   * @param data Dados do usuário
   * @returns Usuário criado
   */
  async create(data: CreateUserDto): Promise<UserResponseDto> {
    try {
      // Validar se empresa existe
      const company = await this.companyRepository.findById(data.companyId);
      if (!company) {
        throw new AppError('Empresa não encontrada', 404);
      }

      // Validar se email já existe
      const emailExists = await this.userRepository.emailExists(data.email);
      if (emailExists) {
        throw new AppError('Email já está em uso', 409);
      }

      // Validar CPF se fornecido
      if (data.cpf && !validateCPF(data.cpf)) {
        throw new AppError('CPF inválido', 400);
      }

      // Hash da senha
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      // Criar usuário
      const user = await this.userRepository.create({
        ...data,
        password: hashedPassword,
      });

      logger.info(`Usuário criado com sucesso: ${user.name} (${user.email})`);

      return this.mapToUserResponse(user);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erro ao criar usuário:', error);
      throw new AppError('Falha ao criar usuário', 500);
    }
  }

  /**
   * Busca usuário por ID
   * @param id ID do usuário
   * @returns Usuário encontrado
   */
  async findById(id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new AppError('Usuário não encontrado', 404);
      }

      return this.mapToUserResponse(user);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erro ao buscar usuário:', error);
      throw new AppError('Falha ao buscar usuário', 500);
    }
  }

  /**
   * Busca usuário por email
   * @param email Email do usuário
   * @returns Usuário encontrado
   */
  async findByEmail(email: string): Promise<UserResponseDto | null> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return null;
      }

      return this.mapToUserResponse(user);
    } catch (error) {
      logger.error('Erro ao buscar usuário por email:', error);
      throw new AppError('Falha ao buscar usuário por email', 500);
    }
  }

  /**
   * Lista usuários com filtros e paginação
   * @param filters Filtros de busca
   * @returns Lista paginada de usuários
   */
  async findMany(filters: UserFiltersDto): Promise<UserListResponseDto> {
    try {
      const result = await this.userRepository.findMany(filters);

      const data = result.data.map(user => this.mapToUserResponse(user));

      return {
        data,
        total: result.total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(result.total / filters.limit),
      };
    } catch (error) {
      logger.error('Erro ao listar usuários:', error);
      throw new AppError('Falha ao listar usuários', 500);
    }
  }

  /**
   * Atualiza usuário
   * @param id ID do usuário
   * @param data Dados para atualização
   * @returns Usuário atualizado
   */
  async update(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
    try {
      // Verificar se usuário existe
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        throw new AppError('Usuário não encontrado', 404);
      }

      // Validar email se foi alterado
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await this.userRepository.emailExists(data.email, id);
        if (emailExists) {
          throw new AppError('Email já está em uso', 409);
        }
      }

      // Validar CPF se fornecido
      if (data.cpf && !validateCPF(data.cpf)) {
        throw new AppError('CPF inválido', 400);
      }

      // Atualizar usuário
      const user = await this.userRepository.update(id, data);

      logger.info(`Usuário atualizado: ${user.name} (${user.email})`);

      return this.mapToUserResponse(user);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erro ao atualizar usuário:', error);
      throw new AppError('Falha ao atualizar usuário', 500);
    }
  }

  /**
   * Altera senha do usuário
   * @param id ID do usuário
   * @param data Dados da alteração de senha
   * @returns Sucesso da operação
   */
  async changePassword(id: string, data: ChangePasswordDto): Promise<{ message: string }> {
    try {
      // Buscar usuário
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new AppError('Usuário não encontrado', 404);
      }

      // Verificar senha atual
      const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new AppError('Senha atual incorreta', 400);
      }

      // Verificar se nova senha é diferente da atual
      const isSamePassword = await bcrypt.compare(data.newPassword, user.password);
      if (isSamePassword) {
        throw new AppError('A nova senha deve ser diferente da senha atual', 400);
      }

      // Hash da nova senha
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(data.newPassword, saltRounds);

      // Atualizar senha
      await this.userRepository.updatePassword(id, hashedPassword);

      logger.info(`Senha alterada para usuário: ${user.email}`);

      return { message: 'Senha alterada com sucesso' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erro ao alterar senha:', error);
      throw new AppError('Falha ao alterar senha', 500);
    }
  }

  /**
   * Remove usuário (soft delete)
   * @param id ID do usuário
   * @returns Sucesso da operação
   */
  async delete(id: string): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new AppError('Usuário não encontrado', 404);
      }

      await this.userRepository.delete(id);

      logger.info(`Usuário removido: ${user.name} (${user.email})`);

      return { message: 'Usuário removido com sucesso' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erro ao remover usuário:', error);
      throw new AppError('Falha ao remover usuário', 500);
    }
  }

  /**
   * Restaura usuário removido
   * @param id ID do usuário
   * @returns Usuário restaurado
   */
  async restore(id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.restore(id);

      logger.info(`Usuário restaurado: ${user.name} (${user.email})`);

      // Buscar usuário completo após restauração
      const restoredUser = await this.userRepository.findById(id);
      if (!restoredUser) {
        throw new AppError('Erro ao buscar usuário restaurado', 500);
      }

      return this.mapToUserResponse(restoredUser);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erro ao restaurar usuário:', error);
      throw new AppError('Falha ao restaurar usuário', 500);
    }
  }

  /**
   * Busca perfil do usuário
   * @param id ID do usuário
   * @returns Perfil do usuário
   */
  async getProfile(id: string): Promise<UserProfileDto> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new AppError('Usuário não encontrado', 404);
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        cpf: user.cpf,
        lastLogin: user.lastLogin,
        company: user.company,
        roles: user.roles,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erro ao buscar perfil:', error);
      throw new AppError('Falha ao buscar perfil', 500);
    }
  }

  /**
   * Busca estatísticas do usuário
   * @param id ID do usuário
   * @returns Estatísticas do usuário
   */
  async getStats(id: string): Promise<UserStatsDto> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new AppError('Usuário não encontrado', 404);
      }

      const stats = await this.userRepository.getStats(id);

      return {
        totalLogins: stats.totalLogins,
        lastLogin: stats.lastLogin,
        totalOrders: stats.totalOrders,
        totalQuotes: stats.totalQuotes,
        accountAge: Math.floor(
          (new Date().getTime() - stats.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
        createdAt: stats.createdAt,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erro ao buscar estatísticas:', error);
      throw new AppError('Falha ao buscar estatísticas', 500);
    }
  }

  /**
   * Busca usuários por empresa
   * @param companyId ID da empresa
   * @returns Lista de usuários da empresa
   */
  async findByCompany(companyId: string): Promise<UserResponseDto[]> {
    try {
      // Verificar se empresa existe
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new AppError('Empresa não encontrada', 404);
      }

      const users = await this.userRepository.findByCompany(companyId);

      return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        cpf: user.cpf,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        company: {
          id: companyId,
          name: company.name,
          document: company.document,
        },
        roles: user.roles,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erro ao buscar usuários por empresa:', error);
      throw new AppError('Falha ao buscar usuários por empresa', 500);
    }
  }

  /**
   * Atualiza último login do usuário
   * @param id ID do usuário
   * @returns Sucesso da operação
   */
  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.userRepository.updateLastLogin(id);
    } catch (error) {
      logger.error('Erro ao atualizar último login:', error);
      // Não lançar erro para não interromper o fluxo de login
    }
  }

  /**
   * Mapeia entidade User para UserResponseDto
   * @param user Entidade do usuário
   * @returns DTO de resposta do usuário
   */
  private mapToUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      cpf: user.cpf,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      company: user.company,
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}