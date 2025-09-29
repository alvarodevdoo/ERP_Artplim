import { PrismaClient } from '@prisma/client';
import {
  CreateTransactionDTO,
  UpdateTransactionDTO,
  PayTransactionDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CreateAccountDTO,
  UpdateAccountDTO,
  CreateTransferDTO,
  TransactionFiltersDTO,
  CategoryFiltersDTO,
  AccountFiltersDTO,
  TransferFiltersDTO,
  TransactionResponseDTO,
  CategoryResponseDTO,
  AccountResponseDTO,
  TransferResponseDTO,
  FinancialStatsDTO,
  CashFlowDTO,
  FinancialReportDTO,
  FinancialDashboardDTO
} from '../dtos';
import { FinancialRepository } from '../repositories';
import { RoleService } from '../../role/services';
import { AppError } from '../../../shared/errors/AppError';

export class FinancialService {
  private financialRepository: FinancialRepository;
  private roleService: RoleService;

  constructor(private prisma: PrismaClient) {
    this.financialRepository = new FinancialRepository(prisma);
    this.roleService = new RoleService(prisma);
  }

  // Métodos para transações financeiras
  async createTransaction(
    data: CreateTransactionDTO,
    userId: string,
    companyId: string
  ): Promise<TransactionResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'create'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para criar transações financeiras', 403);
    }

    // Validar se a categoria existe e pertence à empresa
    const category = await this.prisma.financialCategory.findFirst({
      where: {
        id: data.categoryId,
        companyId
      }
    });

    if (!category) {
      throw new AppError('Categoria não encontrada', 404);
    }

    // Validar se a conta existe e pertence à empresa
    const account = await this.prisma.financialAccount.findFirst({
      where: {
        id: data.accountId,
        companyId,
        isActive: true
      }
    });

    if (!account) {
      throw new AppError('Conta não encontrada ou inativa', 404);
    }

    // Validar se o tipo da categoria corresponde ao tipo da transação
    if (category.type !== data.type) {
      throw new AppError('Tipo da categoria não corresponde ao tipo da transação', 400);
    }

    try {
      // Criar transação usando transação do banco
      const result = await this.prisma.$transaction(async (tx) => {
        // Criar a transação
        const transaction = await this.financialRepository.createTransaction({
          ...data,
          companyId,
          userId
        });

        // Se for parcelado, criar as parcelas
        if (data.installments > 1) {
          await this.createInstallments(tx, transaction.id, data, companyId, userId);
        }

        return transaction;
      });

      return result;
    } catch (error) {
      throw new AppError(`Erro ao criar transação: ${error}`, 500);
    }
  }

  async findTransactionById(
    id: string,
    userId: string,
    companyId: string
  ): Promise<TransactionResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'read'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar transações financeiras', 403);
    }

    const transaction = await this.financialRepository.findTransactionById(id, companyId);

    if (!transaction) {
      throw new AppError('Transação não encontrada', 404);
    }

    return transaction;
  }

  async findTransactions(
    filters: TransactionFiltersDTO,
    userId: string,
    companyId: string
  ): Promise<{
    transactions: TransactionResponseDTO[];
    total: number;
    totalPages: number;
  }> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'read'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar transações financeiras', 403);
    }

    return this.financialRepository.findTransactions({ ...filters, companyId });
  }

  async updateTransaction(
    id: string,
    data: UpdateTransactionDTO,
    userId: string,
    companyId: string
  ): Promise<TransactionResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'update'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para atualizar transações financeiras', 403);
    }

    // Verificar se a transação existe
    const existingTransaction = await this.financialRepository.findTransactionById(id, companyId);
    if (!existingTransaction) {
      throw new AppError('Transação não encontrada', 404);
    }

    // Validações adicionais se necessário
    if (data.categoryId) {
      const category = await this.prisma.financialCategory.findFirst({
        where: {
          id: data.categoryId,
          companyId
        }
      });

      if (!category) {
        throw new AppError('Categoria não encontrada', 404);
      }
    }

    if (data.accountId) {
      const account = await this.prisma.financialAccount.findFirst({
        where: {
          id: data.accountId,
          companyId,
          isActive: true
        }
      });

      if (!account) {
        throw new AppError('Conta não encontrada ou inativa', 404);
      }
    }

    return this.financialRepository.updateTransaction(id, data, companyId);
  }

  async payTransaction(
    id: string,
    data: PayTransactionDTO,
    userId: string,
    companyId: string
  ): Promise<TransactionResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'update'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para pagar transações financeiras', 403);
    }

    // Verificar se a transação existe e está pendente
    const transaction = await this.financialRepository.findTransactionById(id, companyId);
    if (!transaction) {
      throw new AppError('Transação não encontrada', 404);
    }

    if (transaction.status !== 'PENDING') {
      throw new AppError('Transação não está pendente', 400);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Atualizar a transação
        const updatedTransaction = await this.financialRepository.updateTransaction(
          id,
          {
            status: 'PAID',
            paymentDate: data.paymentDate,
            paidAmount: data.paidAmount,
            paymentMethod: data.paymentMethod,
            notes: data.notes
          },
          companyId
        );

        // Atualizar saldo da conta
        await this.updateAccountBalance(
          tx,
          transaction.accountId,
          transaction.type === 'INCOME' ? data.paidAmount : -data.paidAmount
        );

        return updatedTransaction;
      });
    } catch (error) {
      throw new AppError(`Erro ao pagar transação: ${error}`, 500);
    }
  }

  async deleteTransaction(
    id: string,
    userId: string,
    companyId: string
  ): Promise<void> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'delete'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para excluir transações financeiras', 403);
    }

    // Verificar se a transação existe
    const transaction = await this.financialRepository.findTransactionById(id, companyId);
    if (!transaction) {
      throw new AppError('Transação não encontrada', 404);
    }

    // Se a transação foi paga, reverter o saldo da conta
    if (transaction.status === 'PAID' && transaction.paidAmount) {
      await this.prisma.$transaction(async (tx) => {
        await this.updateAccountBalance(
          tx,
          transaction.accountId,
          transaction.type === 'INCOME' ? -transaction.paidAmount! : transaction.paidAmount!
        );

        await this.financialRepository.deleteTransaction(id, companyId);
      });
    } else {
      await this.financialRepository.deleteTransaction(id, companyId);
    }
  }

  // Métodos para categorias
  async createCategory(
    data: CreateCategoryDTO,
    userId: string,
    companyId: string
  ): Promise<CategoryResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'create'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para criar categorias financeiras', 403);
    }

    // Verificar se já existe uma categoria com o mesmo nome
    const existingCategory = await this.prisma.financialCategory.findFirst({
      where: {
        name: data.name,
        type: data.type,
        companyId
      }
    });

    if (existingCategory) {
      throw new AppError('Já existe uma categoria com este nome para este tipo', 400);
    }

    // Validar categoria pai se fornecida
    if (data.parentId) {
      const parentCategory = await this.prisma.financialCategory.findFirst({
        where: {
          id: data.parentId,
          type: data.type,
          companyId
        }
      });

      if (!parentCategory) {
        throw new AppError('Categoria pai não encontrada ou tipo incompatível', 404);
      }
    }

    return this.financialRepository.createCategory({ ...data, companyId });
  }

  async findCategoryById(
    id: string,
    userId: string,
    companyId: string
  ): Promise<CategoryResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'read'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar categorias financeiras', 403);
    }

    const category = await this.financialRepository.findCategoryById(id, companyId);

    if (!category) {
      throw new AppError('Categoria não encontrada', 404);
    }

    return category;
  }

  async findCategories(
    filters: CategoryFiltersDTO,
    userId: string,
    companyId: string
  ): Promise<{
    categories: CategoryResponseDTO[];
    total: number;
    totalPages: number;
  }> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'read'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar categorias financeiras', 403);
    }

    return this.financialRepository.findCategories({ ...filters, companyId });
  }

  async updateCategory(
    id: string,
    data: UpdateCategoryDTO,
    userId: string,
    companyId: string
  ): Promise<CategoryResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'update'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para atualizar categorias financeiras', 403);
    }

    // Verificar se a categoria existe
    const existingCategory = await this.financialRepository.findCategoryById(id, companyId);
    if (!existingCategory) {
      throw new AppError('Categoria não encontrada', 404);
    }

    // Verificar duplicação de nome se fornecido
    if (data.name) {
      const duplicateCategory = await this.prisma.financialCategory.findFirst({
        where: {
          name: data.name,
          type: data.type || existingCategory.type,
          companyId,
          id: { not: id }
        }
      });

      if (duplicateCategory) {
        throw new AppError('Já existe uma categoria com este nome para este tipo', 400);
      }
    }

    return this.financialRepository.updateCategory(id, data, companyId);
  }

  async deleteCategory(
    id: string,
    userId: string,
    companyId: string
  ): Promise<void> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'delete'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para excluir categorias financeiras', 403);
    }

    // Verificar se a categoria existe
    const category = await this.financialRepository.findCategoryById(id, companyId);
    if (!category) {
      throw new AppError('Categoria não encontrada', 404);
    }

    // Verificar se há transações vinculadas
    const transactionsCount = await this.prisma.financialTransaction.count({
      where: {
        categoryId: id,
        companyId
      }
    });

    if (transactionsCount > 0) {
      throw new AppError('Não é possível excluir categoria com transações vinculadas', 400);
    }

    // Verificar se há subcategorias
    const subcategoriesCount = await this.prisma.financialCategory.count({
      where: {
        parentId: id,
        companyId
      }
    });

    if (subcategoriesCount > 0) {
      throw new AppError('Não é possível excluir categoria com subcategorias', 400);
    }

    await this.financialRepository.deleteCategory(id, companyId);
  }

  // Métodos para contas
  async createAccount(
    data: CreateAccountDTO,
    userId: string,
    companyId: string
  ): Promise<AccountResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'create'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para criar contas financeiras', 403);
    }

    // Verificar se já existe uma conta com o mesmo nome
    const existingAccount = await this.prisma.financialAccount.findFirst({
      where: {
        name: data.name,
        companyId
      }
    });

    if (existingAccount) {
      throw new AppError('Já existe uma conta com este nome', 400);
    }

    return this.financialRepository.createAccount({ ...data, companyId });
  }

  async findAccountById(
    id: string,
    userId: string,
    companyId: string
  ): Promise<AccountResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'read'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar contas financeiras', 403);
    }

    const account = await this.financialRepository.findAccountById(id, companyId);

    if (!account) {
      throw new AppError('Conta não encontrada', 404);
    }

    return account;
  }

  async findAccounts(
    filters: AccountFiltersDTO,
    userId: string,
    companyId: string
  ): Promise<{
    accounts: AccountResponseDTO[];
    total: number;
    totalPages: number;
  }> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'read'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar contas financeiras', 403);
    }

    return this.financialRepository.findAccounts({ ...filters, companyId });
  }

  async updateAccount(
    id: string,
    data: UpdateAccountDTO,
    userId: string,
    companyId: string
  ): Promise<AccountResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'update'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para atualizar contas financeiras', 403);
    }

    // Verificar se a conta existe
    const existingAccount = await this.financialRepository.findAccountById(id, companyId);
    if (!existingAccount) {
      throw new AppError('Conta não encontrada', 404);
    }

    // Verificar duplicação de nome se fornecido
    if (data.name) {
      const duplicateAccount = await this.prisma.financialAccount.findFirst({
        where: {
          name: data.name,
          companyId,
          id: { not: id }
        }
      });

      if (duplicateAccount) {
        throw new AppError('Já existe uma conta com este nome', 400);
      }
    }

    return this.financialRepository.updateAccount(id, data, companyId);
  }

  async deleteAccount(
    id: string,
    userId: string,
    companyId: string
  ): Promise<void> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'delete'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para excluir contas financeiras', 403);
    }

    // Verificar se a conta existe
    const account = await this.financialRepository.findAccountById(id, companyId);
    if (!account) {
      throw new AppError('Conta não encontrada', 404);
    }

    // Verificar se há transações vinculadas
    const transactionsCount = await this.prisma.financialTransaction.count({
      where: {
        accountId: id,
        companyId
      }
    });

    if (transactionsCount > 0) {
      throw new AppError('Não é possível excluir conta com transações vinculadas', 400);
    }

    // Verificar se há transferências vinculadas
    const transfersCount = await this.prisma.financialTransfer.count({
      where: {
        OR: [
          { fromAccountId: id },
          { toAccountId: id }
        ],
        companyId
      }
    });

    if (transfersCount > 0) {
      throw new AppError('Não é possível excluir conta com transferências vinculadas', 400);
    }

    await this.financialRepository.deleteAccount(id, companyId);
  }

  // Métodos para transferências
  async createTransfer(
    data: CreateTransferDTO,
    userId: string,
    companyId: string
  ): Promise<TransferResponseDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'create'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para criar transferências', 403);
    }

    // Validar se as contas são diferentes
    if (data.fromAccountId === data.toAccountId) {
      throw new AppError('Conta de origem e destino devem ser diferentes', 400);
    }

    // Validar se as contas existem e estão ativas
    const [fromAccount, toAccount] = await Promise.all([
      this.prisma.financialAccount.findFirst({
        where: { id: data.fromAccountId, companyId, isActive: true }
      }),
      this.prisma.financialAccount.findFirst({
        where: { id: data.toAccountId, companyId, isActive: true }
      })
    ]);

    if (!fromAccount) {
      throw new AppError('Conta de origem não encontrada ou inativa', 404);
    }

    if (!toAccount) {
      throw new AppError('Conta de destino não encontrada ou inativa', 404);
    }

    // Verificar se há saldo suficiente na conta de origem
    const availableBalance = fromAccount.balance + (fromAccount.creditLimit || 0);
    if (availableBalance < (data.amount + data.fee)) {
      throw new AppError('Saldo insuficiente na conta de origem', 400);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Criar a transferência
        const transfer = await this.financialRepository.createTransfer({
          ...data,
          companyId,
          userId
        });

        // Atualizar saldos das contas
        await this.updateAccountBalance(tx, data.fromAccountId, -(data.amount + data.fee));
        await this.updateAccountBalance(tx, data.toAccountId, data.amount);

        return transfer;
      });
    } catch (error) {
      throw new AppError(`Erro ao criar transferência: ${error}`, 500);
    }
  }

  async findTransfers(
    filters: TransferFiltersDTO,
    userId: string,
    companyId: string
  ): Promise<{
    transfers: TransferResponseDTO[];
    total: number;
    totalPages: number;
  }> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'read'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar transferências', 403);
    }

    return this.financialRepository.findTransfers({ ...filters, companyId });
  }

  // Métodos para estatísticas e relatórios
  async getStats(
    userId: string,
    companyId: string,
    startDate?: string,
    endDate?: string
  ): Promise<FinancialStatsDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'read'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar estatísticas financeiras', 403);
    }

    return this.financialRepository.getStats(companyId, startDate, endDate);
  }

  async getCashFlow(
    userId: string,
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<CashFlowDTO[]> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'read'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar fluxo de caixa', 403);
    }

    return this.financialRepository.getCashFlow(companyId, startDate, endDate);
  }

  async generateReport(
    filters: Record<string, unknown>,
    userId: string,
    companyId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<FinancialReportDTO[] | string> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'read'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para gerar relatórios financeiros', 403);
    }

    const data = await this.financialRepository.findForReport(companyId, filters);

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  async getDashboard(
    userId: string,
    companyId: string
  ): Promise<FinancialDashboardDTO> {
    // Verificar permissões
    const hasPermission = await this.roleService.checkPermission(
      userId,
      companyId,
      'financial',
      'read'
    );

    if (!hasPermission) {
      throw new AppError('Usuário não tem permissão para visualizar dashboard financeiro', 403);
    }

    try {
      const [stats, recentTransactions, overdueTransactions, upcomingTransactions, accounts] = await Promise.all([
        this.financialRepository.getStats(companyId),
        this.financialRepository.findTransactions({
          companyId,
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }),
        this.financialRepository.findTransactions({
          companyId,
          status: 'OVERDUE',
          page: 1,
          limit: 10,
          sortBy: 'dueDate',
          sortOrder: 'asc'
        }),
        this.financialRepository.findTransactions({
          companyId,
          status: 'PENDING',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Próximos 30 dias
          page: 1,
          limit: 10,
          sortBy: 'dueDate',
          sortOrder: 'asc'
        }),
        this.financialRepository.findAccounts({
          companyId,
          isActive: true,
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc'
        })
      ]);

      // Calcular fluxo de caixa dos últimos 12 meses
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
      const cashFlow = await this.financialRepository.getCashFlow(
        companyId,
        startDate.toISOString(),
        new Date().toISOString()
      );

      // Calcular comparação mensal
      const monthlyComparison = await this.calculateMonthlyComparison(companyId);

      return {
        stats,
        cashFlow,
        recentTransactions: recentTransactions.transactions,
        overdueTransactions: overdueTransactions.transactions,
        upcomingTransactions: upcomingTransactions.transactions,
        accountsBalance: accounts.accounts.map(account => ({
          accountId: account.id,
          accountName: account.name,
          balance: account.balance,
          type: account.type
        })),
        monthlyComparison
      };
    } catch (error) {
      throw new AppError(`Erro ao obter dashboard: ${error}`, 500);
    }
  }

  // Métodos auxiliares
  private async createInstallments(
    tx: Record<string, unknown>,
    transactionId: string,
    data: CreateTransactionDTO,
    companyId: string,
    userId: string
  ): Promise<void> {
    const installmentAmount = data.amount / data.installments;
    const dueDate = new Date(data.dueDate);

    for (let i = 2; i <= data.installments; i++) {
      const installmentDueDate = new Date(dueDate);
      installmentDueDate.setMonth(installmentDueDate.getMonth() + (i - 1));

      await tx.financialTransaction.create({
        data: {
          type: data.type,
          categoryId: data.categoryId,
          accountId: data.accountId,
          amount: installmentAmount,
          description: `${data.description} - Parcela ${i}/${data.installments}`,
          dueDate: installmentDueDate,
          status: 'PENDING',
          installments: data.installments,
          currentInstallment: i,
          tags: data.tags,
          notes: data.notes,
          referenceId: data.referenceId,
          referenceType: data.referenceType,
          companyId,
          createdBy: userId
        }
      });
    }
  }

  private async updateAccountBalance(
    tx: Record<string, unknown>,
    accountId: string,
    amount: number
  ): Promise<void> {
    await tx.financialAccount.update({
      where: { id: accountId },
      data: {
        balance: {
          increment: amount
        }
      }
    });
  }

  private async calculateMonthlyComparison(companyId: string): Promise<Array<{
    month: string;
    income: number;
    expense: number;
    netIncome: number;
  }>> {
    const months = [];
    const currentDate = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);

      const nextMonth = new Date(date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const transactions = await this.prisma.financialTransaction.findMany({
        where: {
          companyId,
          status: 'PAID',
          paymentDate: {
            gte: date,
            lt: nextMonth
          }
        }
      });

      const income = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + (t.paidAmount || t.amount), 0);

      const expense = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + (t.paidAmount || t.amount), 0);

      months.push({
        month: date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' }),
        income,
        expense,
        netIncome: income - expense
      });
    }

    return months;
  }

  private convertToCSV(data: FinancialReportDTO[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }
}