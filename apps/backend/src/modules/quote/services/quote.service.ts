import { PrismaClient } from '@prisma/client';
import { 
  CreateQuoteDTO, 
  UpdateQuoteDTO, 
  QuoteFiltersDTO, 
  UpdateQuoteStatusDTO,
  DuplicateQuoteDTO,
  ConvertToOrderRequestDTO,
  QuoteResponseDTO,
  QuoteStatsDTO,
  QuoteReportDTO,
  ConvertToOrderDTO
} from '../dtos';
import { QuoteRepository } from '../repositories';
import { RoleService } from '../../role/services/role.service';
import { AppError } from '../../../shared/errors/AppError';

export class QuoteService {
  private quoteRepository: QuoteRepository;
  private roleService: RoleService;

  constructor(
    private prisma: PrismaClient,
    roleService?: RoleService
  ) {
    this.quoteRepository = new QuoteRepository(prisma);
    this.roleService = roleService || new RoleService(prisma);
  }

  /**
   * Cria um novo orçamento
   */
  async create(data: CreateQuoteDTO, userId: string, companyId: string): Promise<QuoteResponseDTO> {
    // Verifica permissões
    await this.roleService.checkPermission(userId, 'quotes', 'create');

    // Validações de negócio
    await this.validateQuoteData(data, companyId);

    // Normaliza dados
    const normalizedData = this.normalizeQuoteData(data);

    return await this.quoteRepository.create(normalizedData, userId, companyId);
  }

  /**
   * Busca orçamento por ID
   */
  async findById(id: string, userId: string, companyId: string): Promise<QuoteResponseDTO> {
    // Verifica permissões
    await this.roleService.checkPermission(userId, 'quotes', 'read');

    const quote = await this.quoteRepository.findById(id, companyId);
    if (!quote) {
      throw new AppError('Orçamento não encontrado', 404);
    }

    return quote;
  }

  /**
   * Lista orçamentos com filtros e paginação
   */
  async findMany(filters: QuoteFiltersDTO, userId: string, companyId: string): Promise<{
    quotes: QuoteResponseDTO[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    // Verifica permissões
    await this.roleService.checkPermission(userId, 'quotes', 'read');

    return await this.quoteRepository.findMany(filters, companyId);
  }

  /**
   * Atualiza orçamento
   */
  async update(id: string, data: UpdateQuoteDTO, userId: string, companyId: string): Promise<QuoteResponseDTO> {
    // Verifica permissões
    await this.roleService.checkPermission(userId, 'quotes', 'update');

    // Verifica se o orçamento existe
    const existingQuote = await this.quoteRepository.findById(id, companyId);
    if (!existingQuote) {
      throw new AppError('Orçamento não encontrado', 404);
    }

    // Verifica se pode ser editado
    this.validateQuoteForEdit(existingQuote);

    // Validações de negócio
    if (data.customerId || data.items) {
      await this.validateQuoteData(data as CreateQuoteDTO, companyId);
    }

    // Normaliza dados
    const normalizedData = this.normalizeQuoteData(data);

    return await this.quoteRepository.update(id, normalizedData, companyId);
  }

  /**
   * Exclui orçamento (soft delete)
   */
  async delete(id: string, userId: string, companyId: string): Promise<void> {
    // Verifica permissões
    await this.roleService.checkPermission(userId, 'quotes', 'delete');

    // Verifica se o orçamento existe
    const quote = await this.quoteRepository.findById(id, companyId);
    if (!quote) {
      throw new AppError('Orçamento não encontrado', 404);
    }

    // Verifica se pode ser excluído
    this.validateQuoteForDeletion(quote);

    await this.quoteRepository.delete(id, companyId);
  }

  /**
   * Restaura orçamento
   */
  async restore(id: string, userId: string, companyId: string): Promise<QuoteResponseDTO> {
    // Verifica permissões
    await this.roleService.checkPermission(userId, 'quotes', 'update');

    return await this.quoteRepository.restore(id, companyId);
  }

  /**
   * Atualiza status do orçamento
   */
  async updateStatus(id: string, data: UpdateQuoteStatusDTO, userId: string, companyId: string): Promise<QuoteResponseDTO> {
    // Verifica permissões
    await this.roleService.checkPermission(userId, 'quotes', 'update');

    // Verifica se o orçamento existe
    const quote = await this.quoteRepository.findById(id, companyId);
    if (!quote) {
      throw new AppError('Orçamento não encontrado', 404);
    }

    // Valida transição de status
    this.validateStatusTransition(quote.status, data.status);

    // Verifica se está expirado
    if (data.status === 'APPROVED' && new Date() > new Date(quote.validUntil)) {
      throw new AppError('Não é possível aprovar um orçamento expirado', 400);
    }

    return await this.quoteRepository.updateStatus(id, data.status, companyId);
  }

  /**
   * Duplica orçamento
   */
  async duplicate(id: string, data: DuplicateQuoteDTO, userId: string, companyId: string): Promise<QuoteResponseDTO> {
    // Verifica permissões
    await this.roleService.checkPermission(userId, 'quotes', 'create');

    // Verifica se o orçamento original existe
    const originalQuote = await this.quoteRepository.findById(id, companyId);
    if (!originalQuote) {
      throw new AppError('Orçamento original não encontrado', 404);
    }

    // Valida cliente se fornecido
    if (data.customerId) {
      const customerExists = await this.prisma.partner.findFirst({
        where: {
          id: data.customerId,
          companyId,
          type: 'CUSTOMER',
          deletedAt: null
        }
      });

      if (!customerExists) {
        throw new AppError('Cliente não encontrado', 404);
      }
    }

    return await this.quoteRepository.duplicate(id, data, userId, companyId);
  }

  /**
   * Converte orçamento em ordem de serviço
   */
  async convertToOrder(id: string, data: ConvertToOrderRequestDTO, userId: string, companyId: string): Promise<ConvertToOrderDTO> {
    // Verifica permissões
    await this.roleService.checkPermission(userId, 'quotes', 'update');
    await this.roleService.checkPermission(userId, 'orders', 'create');

    // Verifica se o orçamento existe
    const quote = await this.quoteRepository.findById(id, companyId);
    if (!quote) {
      throw new AppError('Orçamento não encontrado', 404);
    }

    // Verifica se pode ser convertido
    if (quote.status !== 'APPROVED') {
      throw new AppError('Apenas orçamentos aprovados podem ser convertidos em OS', 400);
    }

    // Verifica se já foi convertido
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        quoteId: id,
        companyId,
        deletedAt: null
      }
    });

    if (existingOrder) {
      throw new AppError('Este orçamento já foi convertido em OS', 400);
    }

    try {
      // Inicia transação
      const result = await this.prisma.$transaction(async (tx) => {
        // Gera número da OS
        const lastOrder = await tx.order.findFirst({
          where: { companyId },
          orderBy: { number: 'desc' },
          select: { number: true }
        });

        const nextNumber = this.generateNextOrderNumber(lastOrder?.number);

        // Cria a ordem de serviço
        const order = await tx.order.create({
          data: {
            number: nextNumber,
            quoteId: id,
            customerId: quote.customerId,
            title: quote.title,
            description: quote.description,
            priority: data.priority || 'MEDIUM',
            expectedStartDate: data.expectedStartDate ? new Date(data.expectedStartDate) : undefined,
            expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : undefined,
            paymentTerms: quote.paymentTerms,
            observations: quote.observations,
            discount: quote.discount,
            discountType: quote.discountType,
            subtotal: quote.subtotal,
            discountValue: quote.discountValue,
            totalValue: quote.totalValue,
            status: 'PENDING',
            createdBy: userId,
            companyId,
            items: {
              create: quote.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                discountType: item.discountType,
                subtotal: item.subtotal,
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
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    code: true
                  }
                }
              }
            }
          }
        });

        // Atualiza status do orçamento para convertido
        await tx.quote.update({
          where: { id },
          data: { status: 'CONVERTED' }
        });

        return order;
      });

      return {
        orderId: result.id,
        orderNumber: result.number,
        message: 'Orçamento convertido em OS com sucesso'
      };
    } catch {
      throw new AppError('Erro ao converter orçamento em OS', 500);
    }
  }

  /**
   * Obtém estatísticas de orçamentos
   */
  async getStats(userId: string, companyId: string): Promise<QuoteStatsDTO> {
    // Verifica permissões
    await this.roleService.checkPermission(userId, 'quotes', 'read');

    return await this.quoteRepository.getStats(companyId);
  }

  /**
   * Gera relatório de orçamentos
   */
  async generateReport(filters: QuoteFiltersDTO, format: 'json' | 'csv', userId: string, companyId: string): Promise<QuoteReportDTO[] | string> {
    // Verifica permissões
    await this.roleService.checkPermission(userId, 'quotes', 'read');

    const data = await this.quoteRepository.findForReport(filters, companyId);

    if (format === 'csv') {
      return this.generateCSVReport(data);
    }

    return data;
  }

  /**
   * Valida dados do orçamento
   */
  private async validateQuoteData(data: CreateQuoteDTO | UpdateQuoteDTO, companyId: string): Promise<void> {
    // Valida cliente
    if ('customerId' in data && data.customerId) {
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

      if (customer.status === 'BLOCKED') {
        throw new AppError('Cliente está bloqueado', 400);
      }
    }

    // Valida itens
    if ('items' in data && data.items && data.items.length > 0) {
      for (const item of data.items) {
        // Verifica se o produto existe
        const product = await this.prisma.product.findFirst({
          where: {
            id: item.productId,
            companyId,
            deletedAt: null
          }
        });

        if (!product) {
          throw new AppError(`Produto ${item.productId} não encontrado`, 404);
        }

        if (product.status === 'INACTIVE') {
          throw new AppError(`Produto ${product.name} está inativo`, 400);
        }

        // Valida quantidade
        if (item.quantity <= 0) {
          throw new AppError('Quantidade deve ser maior que zero', 400);
        }

        // Valida preço
        if (item.unitPrice < 0) {
          throw new AppError('Preço unitário não pode ser negativo', 400);
        }

        // Valida desconto
        if (item.discount < 0) {
          throw new AppError('Desconto não pode ser negativo', 400);
        }

        if (item.discountType === 'PERCENTAGE' && item.discount > 100) {
          throw new AppError('Desconto percentual não pode ser maior que 100%', 400);
        }
      }
    }

    // Valida data de validade
    if ('validUntil' in data && data.validUntil) {
      const validUntil = new Date(data.validUntil);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (validUntil < today) {
        throw new AppError('Data de validade não pode ser anterior a hoje', 400);
      }
    }

    // Valida desconto geral
    if ('discount' in data && data.discount !== undefined) {
      if (data.discount < 0) {
        throw new AppError('Desconto não pode ser negativo', 400);
      }

      if (data.discountType === 'PERCENTAGE' && data.discount > 100) {
        throw new AppError('Desconto percentual não pode ser maior que 100%', 400);
      }
    }
  }

  /**
   * Normaliza dados do orçamento
   */
  private normalizeQuoteData(data: CreateQuoteDTO | UpdateQuoteDTO): CreateQuoteDTO | UpdateQuoteDTO {
    const normalized = { ...data };

    // Normaliza strings
    if (normalized.title) {
      normalized.title = normalized.title.trim();
    }

    if (normalized.description) {
      normalized.description = normalized.description.trim();
    }

    if (normalized.paymentTerms) {
      normalized.paymentTerms = normalized.paymentTerms.trim();
    }

    if (normalized.deliveryTerms) {
      normalized.deliveryTerms = normalized.deliveryTerms.trim();
    }

    if (normalized.observations) {
      normalized.observations = normalized.observations.trim();
    }

    // Normaliza itens
    if ('items' in normalized && normalized.items) {
      normalized.items = normalized.items.map(item => ({
        ...item,
        observations: item.observations?.trim()
      }));
    }

    return normalized;
  }

  /**
   * Valida se o orçamento pode ser editado
   */
  private validateQuoteForEdit(quote: QuoteResponseDTO): void {
    if (quote.status === 'CONVERTED') {
      throw new AppError('Orçamentos convertidos em OS não podem ser editados', 400);
    }
  }

  /**
   * Valida se o orçamento pode ser excluído
   */
  private validateQuoteForDeletion(quote: QuoteResponseDTO): void {
    if (quote.status === 'CONVERTED') {
      throw new AppError('Orçamentos convertidos em OS não podem ser excluídos', 400);
    }

    if (quote.status === 'APPROVED') {
      throw new AppError('Orçamentos aprovados não podem ser excluídos', 400);
    }
  }

  /**
   * Valida transição de status
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['SENT', 'EXPIRED'],
      'SENT': ['APPROVED', 'REJECTED', 'EXPIRED'],
      'APPROVED': ['CONVERTED'],
      'REJECTED': ['SENT'],
      'EXPIRED': ['SENT'],
      'CONVERTED': [] // Não pode mudar de convertido
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new AppError(`Transição de status inválida: ${currentStatus} -> ${newStatus}`, 400);
    }
  }

  /**
   * Gera próximo número da OS
   */
  private generateNextOrderNumber(lastNumber?: string): string {
    if (!lastNumber) {
      return 'OS-000001';
    }

    const numberPart = lastNumber.split('-')[1];
    const nextNumber = (parseInt(numberPart) + 1).toString().padStart(6, '0');
    return `OS-${nextNumber}`;
  }

  /**
   * Gera relatório em CSV
   */
  private generateCSVReport(data: QuoteReportDTO[]): string {
    const headers = [
      'Número',
      'Cliente',
      'Documento',
      'Título',
      'Status',
      'Válido até',
      'Subtotal',
      'Desconto',
      'Total',
      'Itens',
      'Criado em',
      'Criado por'
    ];

    const rows = data.map(quote => [
      quote.number,
      quote.customerName,
      quote.customerDocument,
      quote.title,
      quote.status,
      new Date(quote.validUntil).toLocaleDateString('pt-BR'),
      quote.subtotal.toFixed(2),
      quote.discountValue.toFixed(2),
      quote.totalValue.toFixed(2),
      quote.itemsCount.toString(),
      new Date(quote.createdAt).toLocaleDateString('pt-BR'),
      quote.createdByName
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }
}