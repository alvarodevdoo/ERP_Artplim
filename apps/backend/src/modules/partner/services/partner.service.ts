import { PrismaClient, PartnerType } from '@prisma/client';
import { 
  CreatePartnerDTO, 
  UpdatePartnerDTO, 
  PartnerFiltersDTO, 
  PartnerResponseDTO,
  PartnerStatsDTO,
  PartnerReportDTO
} from '../dtos';
import { PartnerRepository } from '../repositories';
import { AuthService } from '../../auth/services/auth.service';
import { AppError } from '../../../shared/errors/AppError';

export class PartnerService {
  private partnerRepository: PartnerRepository;
  private authService: AuthService;

  constructor(private prisma: PrismaClient) {
    this.partnerRepository = new PartnerRepository(prisma);
    this.authService = new AuthService(prisma);
  }

  /**
   * Cria um novo parceiro
   */
  async create(data: CreatePartnerDTO, userId: string, companyId: string): Promise<PartnerResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:create');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para criar parceiros', 403);
    }

    // Validações de negócio
    await this.validatePartnerData(data, companyId);

    // Verifica se documento já existe
    if (data.document) {
      const documentExists = await this.partnerRepository.documentExists(data.document, companyId);
      if (documentExists) {
        throw new AppError('Já existe um parceiro com este documento', 409);
      }
    }

    // Validações específicas por tipo
    this.validatePartnerByType(data);

    // Normaliza dados
    const normalizedData = this.normalizePartnerData(data);

    return await this.partnerRepository.create(normalizedData, companyId);
  }

  /**
   * Busca parceiro por ID
   */
  async findById(id: string, userId: string, companyId: string): Promise<PartnerResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar parceiros', 403);
    }

    const partner = await this.partnerRepository.findById(id, companyId);
    if (!partner) {
      throw new AppError('Parceiro não encontrado', 404);
    }

    return partner;
  }

  /**
   * Lista parceiros com filtros e paginação
   */
  async findMany(filters: PartnerFiltersDTO, userId: string, companyId: string): Promise<{
    partners: PartnerResponseDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para listar parceiros', 403);
    }

    return await this.partnerRepository.findMany(filters, companyId);
  }

  /**
   * Atualiza parceiro
   */
  async update(id: string, data: UpdatePartnerDTO, userId: string, companyId: string): Promise<PartnerResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para atualizar parceiros', 403);
    }

    // Verifica se parceiro existe
    const existingPartner = await this.partnerRepository.findById(id, companyId);
    if (!existingPartner) {
      throw new AppError('Parceiro não encontrado', 404);
    }

    // Validações de negócio
    if (Object.keys(data).length > 0) {
      await this.validatePartnerData(data, companyId, id);
    }

    // Verifica se documento já existe (se foi alterado)
    if (data.document && data.document !== existingPartner.document) {
      const documentExists = await this.partnerRepository.documentExists(data.document, companyId, id);
      if (documentExists) {
        throw new AppError('Já existe um parceiro com este documento', 409);
      }
    }

    // Validações específicas por tipo
    if (data.type) {
      this.validatePartnerByType({ ...existingPartner, ...data });
    }

    // Normaliza dados
    const normalizedData = this.normalizePartnerData(data);

    return await this.partnerRepository.update(id, normalizedData, companyId);
  }

  /**
   * Remove parceiro (soft delete)
   */
  async delete(id: string, userId: string, companyId: string): Promise<void> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:delete');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para excluir parceiros', 403);
    }

    // Verifica se parceiro existe
    const partner = await this.partnerRepository.findById(id, companyId);
    if (!partner) {
      throw new AppError('Parceiro não encontrado', 404);
    }

    // Verifica se pode ser excluído (regras de negócio)
    await this.validatePartnerDeletion(id, companyId);

    await this.partnerRepository.delete(id, companyId);
  }

  /**
   * Restaura parceiro
   */
  async restore(id: string, userId: string, companyId: string): Promise<PartnerResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para restaurar parceiros', 403);
    }

    return await this.partnerRepository.restore(id, companyId);
  }

  /**
   * Busca parceiros por tipo
   */
  async findByType(type: PartnerType, userId: string, companyId: string): Promise<PartnerResponseDTO[]> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar parceiros', 403);
    }

    return await this.partnerRepository.findByType(type, companyId);
  }

  /**
   * Obtém estatísticas dos parceiros
   */
  async getStats(userId: string, companyId: string): Promise<PartnerStatsDTO> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar estatísticas', 403);
    }

    return await this.partnerRepository.getStats(companyId);
  }

  /**
   * Verifica disponibilidade de documento
   */
  async checkDocumentAvailability(document: string, userId: string, companyId: string, excludeId?: string): Promise<{ available: boolean }> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para verificar documentos', 403);
    }

    const exists = await this.partnerRepository.documentExists(document, companyId, excludeId);
    return { available: !exists };
  }

  /**
   * Gera relatório de parceiros
   */
  async generateReport(filters: PartnerFiltersDTO, userId: string, companyId: string, format: 'json' | 'csv' = 'json'): Promise<PartnerReportDTO[] | string> {
    // Verifica permissões
    const hasPermission = await this.roleService.hasPermission(userId, 'partner:read');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para gerar relatórios', 403);
    }

    const partners = await this.partnerRepository.findForReport(filters, companyId);

    if (format === 'csv') {
      return this.generateCSVReport(partners);
    }

    return partners;
  }

  /**
   * Atualiza status ativo/inativo do parceiro
   */
  async updateStatus(id: string, isActive: boolean, userId: string, companyId: string): Promise<PartnerResponseDTO> {
    // Verifica permissões
    const hasPermission = await this.authService.hasPermission(userId, 'partner:update');
    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para atualizar status', 403);
    }

    // Verifica se parceiro existe
    const partner = await this.partnerRepository.findById(id, companyId);
    if (!partner) {
      throw new AppError('Parceiro não encontrado', 404);
    }

    // Validações específicas de status
    if (!isActive) {
      // Verifica se pode desativar (ex: não tem pedidos em aberto)
      await this.validatePartnerBlocking(id, companyId);
    }

    return await this.partnerRepository.update(id, { isActive }, companyId);
  }

  /**
   * Valida dados do parceiro
   */
  private async validatePartnerData(data: CreatePartnerDTO | UpdatePartnerDTO, _companyId: string, _excludeId?: string): Promise<void> {
    // _companyId e _excludeId não são usados atualmente, mas podem ser necessários para validações futuras
    // Validação de nome
    if (data.name && data.name.trim().length < 2) {
      throw new AppError('Nome deve ter pelo menos 2 caracteres', 400);
    }

    // Validação de email
    if (data.email && !this.isValidEmail(data.email)) {
      throw new AppError('Email inválido', 400);
    }

    // Validação de documento (CPF/CNPJ)
    if (data.document && !this.isValidDocument(data.document)) {
      throw new AppError('Documento inválido', 400);
    }

    // Validação de limite de crédito
    if (data.creditLimit !== undefined && data.creditLimit < 0) {
      throw new AppError('Limite de crédito deve ser positivo', 400);
    }

    // Validação de desconto
    if (data.discount !== undefined && (data.discount < 0 || data.discount > 100)) {
      throw new AppError('Desconto deve estar entre 0 e 100%', 400);
    }

    // Validação de endereço
    if (data.address) {
      this.validateAddress(data.address);
    }
  }

  /**
   * Validações específicas por tipo de parceiro
   */
  private validatePartnerByType(data: CreatePartnerDTO | (UpdatePartnerDTO & { type?: PartnerType })): void {
    if (!data.type) return;

    // Clientes devem ter limite de crédito definido
    if ((data.type === PartnerType.CUSTOMER || data.type === PartnerType.BOTH) && data.creditLimit === undefined) {
      // Pode ser definido posteriormente
    }

    // Fornecedores devem ter termos de pagamento
    if ((data.type === PartnerType.SUPPLIER || data.type === PartnerType.BOTH) && !data.paymentTerms) {
      // Pode ser definido posteriormente
    }
  }

  /**
   * Normaliza dados do parceiro
   */
  private normalizePartnerData(data: CreatePartnerDTO | UpdatePartnerDTO): CreatePartnerDTO | UpdatePartnerDTO {
    const normalized = { ...data };

    // Normaliza nome
    if (normalized.name) {
      normalized.name = normalized.name.trim();
    }

    // Normaliza email
    if (normalized.email) {
      normalized.email = normalized.email.toLowerCase().trim();
    }

    // Normaliza documento (remove caracteres especiais)
    if (normalized.document) {
      normalized.document = normalized.document.replace(/[^0-9]/g, '');
    }

    // Normaliza telefone
    if (normalized.phone) {
      normalized.phone = normalized.phone.replace(/[^0-9]/g, '');
    }

    return normalized;
  }

  /**
   * Valida se parceiro pode ser excluído
   */
  private async validatePartnerDeletion(_partnerId: string, _companyId: string): Promise<void> {
    // _partnerId e _companyId serão usados quando as verificações com outros módulos forem implementadas
    // Verifica se tem pedidos associados
    // TODO: Implementar verificação com módulo de pedidos
    
    // Verifica se tem movimentações financeiras
    // TODO: Implementar verificação com módulo financeiro
    
    // Por enquanto, permite exclusão
  }

  /**
   * Valida se parceiro pode ser bloqueado
   */
  private async validatePartnerBlocking(_partnerId: string, _companyId: string): Promise<void> {
    // _partnerId e _companyId serão usados quando as verificações com outros módulos forem implementadas
    // Verifica se tem pedidos em aberto
    // TODO: Implementar verificação com módulo de pedidos
    
    // Por enquanto, permite bloqueio
  }

  /**
   * Valida endereço
   */
  private validateAddress(address: Record<string, unknown>): void {
    if (address.zipCode && !this.isValidZipCode(address.zipCode)) {
      throw new AppError('CEP inválido', 400);
    }
  }

  /**
   * Valida email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida documento (CPF/CNPJ)
   */
  private isValidDocument(document: string): boolean {
    const cleanDocument = document.replace(/[^0-9]/g, '');
    
    // CPF (11 dígitos)
    if (cleanDocument.length === 11) {
      return this.isValidCPF(cleanDocument);
    }
    
    // CNPJ (14 dígitos)
    if (cleanDocument.length === 14) {
      return this.isValidCNPJ(cleanDocument);
    }
    
    return false;
  }

  /**
   * Valida CPF
   */
  private isValidCPF(cpf: string): boolean {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;

    return parseInt(cpf[9]) === digit1 && parseInt(cpf[10]) === digit2;
  }

  /**
   * Valida CNPJ
   */
  private isValidCNPJ(cnpj: string): boolean {
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
      return false;
    }

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj[i]) * weights1[i];
    }
    const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj[i]) * weights2[i];
    }
    const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    return parseInt(cnpj[12]) === digit1 && parseInt(cnpj[13]) === digit2;
  }

  /**
   * Valida CEP
   */
  private isValidZipCode(zipCode: string): boolean {
    const cleanZipCode = zipCode.replace(/[^0-9]/g, '');
    return cleanZipCode.length === 8;
  }

  /**
   * Gera relatório em CSV
   */
  private generateCSVReport(partners: PartnerReportDTO[]): string {
    const headers = [
      'ID',
      'Nome',
      'Email',
      'Telefone',
      'Documento',
      'Tipo',
      'Status',
      'Cidade',
      'Estado',
      'Limite de Crédito',
      'Total de Pedidos',
      'Valor Total',
      'Último Pedido',
      'Data de Criação'
    ];

    const csvContent = [headers.join(',')];

    partners.forEach(partner => {
      const row = [
        partner.id,
        `"${partner.name}"`,
        partner.email || '',
        partner.phone || '',
        partner.document || '',
        partner.type,
        partner.status,
        partner.city || '',
        partner.state || '',
        partner.creditLimit || 0,
        partner.totalOrders || 0,
        partner.totalValue || 0,
        partner.lastOrderDate ? partner.lastOrderDate.toISOString().split('T')[0] : '',
        partner.createdAt.toISOString().split('T')[0]
      ];
      csvContent.push(row.join(','));
    });

    return csvContent.join('\n');
  }
}