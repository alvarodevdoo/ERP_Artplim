import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Prisma, PrismaClient } from '@prisma/client';
import { AuthRepository } from '../repositories/auth.repository';
import { config } from '../../../config';
import { logger } from '../../../shared/logger';
import { AppError } from '../../../shared/errors/AppError';
import {
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  RegisterResponseDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from '../dtos';
import { User } from '@artplim/types';

/**
 * Serviço de autenticação
 * Gerencia login, registro, tokens JWT e operações relacionadas à autenticação
 */
export class AuthService {
  private authRepository: AuthRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.authRepository = new AuthRepository();
  }
  async login(data: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = data;

    try {
      // Buscar usuário com relacionamentos
      const user = await this.authRepository.findUserByEmail(email);

      if (!user) {
        throw new Error('Invalid credentials');
      }

      if (!user.isActive) {
        throw new Error('Account is inactive');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.companyId);

      // TODO: Implementar atualização de último login

      logger.info(`User ${user.email} logged in successfully`);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          companyId: user.companyId,
          company: {
            id: user.company.id,
            name: user.company.name,
            cnpj: user.company.cnpj,
          },
          employee: user.employee ? {
            id: user.employee.id,
            role: {
              id: user.employee.role.id,
              name: user.employee.role.name,
            },
          } : undefined,
        },
        tokens,
      };
    } catch (error) {
      logger.error(error, 'AuthService.login');
      throw error;
    }
  }

  async register(data: RegisterDto): Promise<RegisterResponseDto> {
    const { name, email, password, companyName, companyDocument } = data;

    try {
      // Verificar se usuário já existe
      const emailExists = await this.authRepository.emailExists(email);
      if (emailExists) {
        throw new Error('Email já está em uso');
      }

      // Verificar se empresa já existe
      const cnpjExists = await this.authRepository.companyCnpjExists(companyDocument);
      if (cnpjExists) {
        throw new Error('CNPJ da empresa já está em uso');
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 12);

      // Criar usuário e empresa usando repositório
      const result = await this.authRepository.createUserWithCompany(
        { name, email, password: hashedPassword },
        { name: companyName, cnpj: companyDocument }
      );

      // Generate tokens
      const tokens = await this.generateTokens(result.id, result.companyId);

      logger.info(`New company ${companyName} and admin user ${email} registered`);

      return {
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
          companyId: result.companyId,
          company: {
            id: result.company.id,
            name: result.company.name,
            cnpj: result.company.cnpj,
          },
          employee: result.employee ? {
            id: result.employee.id,
            role: {
              id: result.employee.role.id,
              name: result.employee.role.name,
            },
          } : undefined,
        },
        tokens,
      };
    } catch (error) {
      logger.error(error, 'AuthService.register');
      throw error;
    }
  }

  async refreshToken(data: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    const { refreshToken } = data;

    try {
      // Verificar e decodificar refresh token
      const decoded = jwt.verify(refreshToken, config.JWT_SECRET as string) as any;
      
      // Buscar usuário
      const user = await this.authRepository.findUserById(decoded.userId);

      if (!user || !user.isActive) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, user.companyId);

      return tokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<void> {
    const { email } = data;

    try {
      // Buscar usuário
      const user = await this.authRepository.findUserByEmail(email);

      if (!user) {
        // Don't reveal if email exists
        return;
      }

      // TODO: Implementar sistema de reset de senha
      // Por enquanto, apenas log da solicitação
      logger.info(`Password reset requested for ${email}`);
    } catch (error) {
      logger.error(error, 'AuthService.forgotPassword');
      throw error;
    }
  }

  async resetPassword(data: ResetPasswordDto): Promise<void> {
    // TODO: Implementar sistema de reset de senha
    throw new Error('Reset password functionality not implemented yet');
  }

  async changePassword(userId: string, data: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = data;

    const user = await this.authRepository.findUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.authRepository.updateUser(userId, {
      password: hashedPassword,
    });

    logger.info(`Password changed for user ${user.email}`);
  }

  async updateProfile(userId: string, data: UpdateProfileDto): Promise<any> {
    try {
      // Converte undefined para null para compatibilidade com Prisma
      const updateData: Prisma.UserUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      
      const user = await this.authRepository.updateUser(userId, updateData);
      logger.info(`Perfil atualizado para usuário ${user.email}`);
      return user;
    } catch (error) {
      logger.error(error, 'AuthService.updateProfile');
      throw new Error('Falha ao atualizar perfil');
    }
  }

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const user = await this.authRepository.findUserById(userId);
      
      if (!user || !user.isActive) {
        return false;
      }

      // Se o usuário não tem employee (é admin da empresa), tem todas as permissões
      if (!user.employee) {
        return true;
      }

      // Verificar permissões do role do employee
      const role = user.employee.role;
      if (!role || !role.permissions) {
        return false;
      }

      // Verificar se a permissão está na lista de permissões do role
      return role.permissions.includes(permission);
    } catch (error) {
      logger.error(error, 'AuthService.hasPermission');
      return false;
    }
  }

  private async generateTokens(userId: string, companyId: string): Promise<RefreshTokenResponseDto> {
    const payload = { userId, companyId };

    const accessTokenOptions: SignOptions = {
      expiresIn: config.JWT_EXPIRES_IN,
    };

    const refreshTokenOptions: SignOptions = {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
    };

    const accessToken = jwt.sign(payload, config.JWT_SECRET, accessTokenOptions);
    const refreshToken = jwt.sign(payload, config.JWT_SECRET, refreshTokenOptions);

    return {
      accessToken,
      refreshToken,
    };
  }
}