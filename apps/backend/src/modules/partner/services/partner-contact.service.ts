import { PrismaClient } from '@prisma/client';
import { 
  CreatePartnerContactDTO, 
  UpdatePartnerContactDTO, 
  PartnerContactResponseDTO
} from '../dtos';
import { PartnerContactRepository } from '../repositories';
import { AuthService } from '../../auth/services/auth.service';
import { AppError } from '../../../shared/errors/AppError';

export class PartnerContactService {
  private partnerContactRepository: PartnerContactRepository;
  private authService: AuthService;

  constructor(private prisma: PrismaClient) {
    this.partnerContactRepository = new PartnerContactRepository(prisma);
    this.authService = new AuthService(prisma);
  }

  /**
   * Cria um novo contato do parceiro
   */
  async create(data: CreatePartnerContactDTO, userId: string, companyId: string): Promise<PartnerContactResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para criar contatos', 403);
    }

    // Validações de negócio
    this.validateContactData(data);

    // Verifica se email já existe para o parceiro
    if (data.email) {
      const emailExists = await this.partnerContactRepository.emailExists(data.email, data.partnerId);
      if (emailExists) {
        throw new AppError('Já existe um contato com este email para este parceiro', 409);
      }
    }

    // Normaliza dados
    const normalizedData = this.normalizeContactData(data);

    return await this.partnerContactRepository.create(normalizedData, companyId);
  }

  /**
   * Busca contato por ID
   */
  async findById(id: string, userId: string, companyId: string): Promise<PartnerContactResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar contatos', 403);
    }

    const contact = await this.partnerContactRepository.findById(id, companyId);
    if (!contact) {
      throw new AppError('Contato não encontrado', 404);
    }

    return contact;
  }

  /**
   * Lista contatos de um parceiro
   */
  async findByPartnerId(partnerId: string, userId: string, companyId: string): Promise<PartnerContactResponseDTO[]> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar contatos', 403);
    }

    return await this.partnerContactRepository.findByPartnerId(partnerId, companyId);
  }

  /**
   * Atualiza contato
   */
  async update(id: string, data: UpdatePartnerContactDTO, userId: string, companyId: string): Promise<PartnerContactResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para atualizar contatos', 403);
    }

    // Verifica se contato existe
    const existingContact = await this.partnerContactRepository.findById(id, companyId);
    if (!existingContact) {
      throw new AppError('Contato não encontrado', 404);
    }

    // Validações de negócio
    if (Object.keys(data).length > 0) {
      this.validateContactData(data);
    }

    // Verifica se email já existe para o parceiro (se foi alterado)
    if (data.email && data.email !== existingContact.email) {
      const emailExists = await this.partnerContactRepository.emailExists(data.email, existingContact.partnerId, id);
      if (emailExists) {
        throw new AppError('Já existe um contato com este email para este parceiro', 409);
      }
    }

    // Normaliza dados
    const normalizedData = this.normalizeContactData(data);

    return await this.partnerContactRepository.update(id, normalizedData, companyId);
  }

  /**
   * Remove contato
   */
  async delete(id: string, userId: string, companyId: string): Promise<void> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para excluir contatos', 403);
    }

    // Verifica se contato existe
    const contact = await this.partnerContactRepository.findById(id, companyId);
    if (!contact) {
      throw new AppError('Contato não encontrado', 404);
    }

    // Verifica se é o único contato primário
    if (contact.isPrimary) {
      const contacts = await this.partnerContactRepository.findByPartnerId(contact.partnerId, companyId);
      if (contacts.length === 1) {
        throw new AppError('Não é possível excluir o único contato do parceiro', 400);
      }
    }

    await this.partnerContactRepository.delete(id, companyId);
  }

  /**
   * Define contato como primário
   */
  async setPrimary(id: string, userId: string, companyId: string): Promise<PartnerContactResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para definir contato primário', 403);
    }

    // Verifica se contato existe
    const contact = await this.partnerContactRepository.findById(id, companyId);
    if (!contact) {
      throw new AppError('Contato não encontrado', 404);
    }

    return await this.partnerContactRepository.setPrimary(id, companyId);
  }

  /**
   * Busca contato primário de um parceiro
   */
  async findPrimaryByPartnerId(partnerId: string, userId: string, companyId: string): Promise<PartnerContactResponseDTO | null> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar contatos', 403);
    }

    return await this.partnerContactRepository.findPrimaryByPartnerId(partnerId, companyId);
  }

  /**
   * Verifica disponibilidade de email
   */
  async checkEmailAvailability(email: string, partnerId: string, userId: string, companyId: string, excludeId?: string): Promise<{ available: boolean }> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para verificar emails', 403);
    }

    const exists = await this.partnerContactRepository.emailExists(email, partnerId, excludeId);
    return { available: !exists };
  }

  /**
   * Cria contato primário automaticamente
   */
  async createPrimaryContact(partnerId: string, partnerName: string, partnerEmail?: string, partnerPhone?: string, companyId: string): Promise<PartnerContactResponseDTO | null> {
    // Se não tem dados suficientes, não cria contato
    if (!partnerEmail && !partnerPhone) {
      return null;
    }

    const contactData: CreatePartnerContactDTO = {
      partnerId,
      name: partnerName,
      email: partnerEmail,
      phone: partnerPhone,
      isPrimary: true,
      position: 'Contato Principal'
    };

    return await this.partnerContactRepository.create(contactData, companyId);
  }

  /**
   * Valida dados do contato
   */
  private validateContactData(data: CreatePartnerContactDTO | UpdatePartnerContactDTO): void {
    // Validação de nome
    if (data.name && data.name.trim().length < 2) {
      throw new AppError('Nome deve ter pelo menos 2 caracteres', 400);
    }

    // Validação de email
    if (data.email && !this.isValidEmail(data.email)) {
      throw new AppError('Email inválido', 400);
    }

    // Validação de telefone
    if (data.phone && data.phone.length < 10) {
      throw new AppError('Telefone deve ter pelo menos 10 dígitos', 400);
    }

    // Deve ter pelo menos email ou telefone
    if (!data.email && !data.phone) {
      throw new AppError('Contato deve ter pelo menos email ou telefone', 400);
    }
  }

  /**
   * Normaliza dados do contato
   */
  private normalizeContactData(data: CreatePartnerContactDTO | UpdatePartnerContactDTO): CreatePartnerContactDTO | UpdatePartnerContactDTO {
    const normalized = { ...data };

    // Normaliza nome
    if (normalized.name) {
      normalized.name = normalized.name.trim();
    }

    // Normaliza email
    if (normalized.email) {
      normalized.email = normalized.email.toLowerCase().trim();
    }

    // Normaliza telefone
    if (normalized.phone) {
      normalized.phone = normalized.phone.replace(/[^0-9]/g, '');
    }

    // Normaliza cargo
    if (normalized.position) {
      normalized.position = normalized.position.trim();
    }

    // Normaliza departamento
    if (normalized.department) {
      normalized.department = normalized.department.trim();
    }

    return normalized;
  }

  /**
   * Valida email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}