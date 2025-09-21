import { PrismaClient } from '@prisma/client';
import {
  CreateTransactionDTO,
  UpdateTransactionDTO,
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
  FinancialReportDTO
} from '../dtos';

export class FinancialRepository {
  constructor(private prisma: PrismaClient) {}

  // Métodos para transações financeiras
  async createTransaction(data: CreateTransactionDTO & { companyId: string, userId: string }): Promise<TransactionResponseDTO> {
    try {
      const transaction = await this.prisma.financialTransaction.create({
        data: {
          ...data,
          createdBy: data.userId
        },
        include: {
          category: true,
          account: true,
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return this.mapTransactionToResponse(transaction);
    } catch (error) {
      throw new Error(`Erro ao criar transação: ${error}`);
    }
  }

  async findTransactionById(id: string, companyId: string): Promise<TransactionResponseDTO | null> {
    try {
      const transaction = await this.prisma.financialTransaction.findFirst({
        where: { id, companyId },
        include: {
          category: true,
          account: true,
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return transaction ? this.mapTransactionToResponse(transaction) : null;
    } catch (error) {
      throw new Error(`Erro ao buscar transação: ${error}`);
    }
  }

  async findTransactions(filters: TransactionFiltersDTO & { companyId: string }): Promise<{
    transactions: TransactionResponseDTO[];
    total: number;
    totalPages: number;
  }> {
    try {
      const where: any = {
        companyId: filters.companyId
      };

      if (filters.type) where.type = filters.type;
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.accountId) where.accountId = filters.accountId;
      if (filters.status) where.status = filters.status;
      if (filters.referenceType) where.referenceType = filters.referenceType;
      
      if (filters.startDate || filters.endDate) {
        where.dueDate = {};
        if (filters.startDate) where.dueDate.gte = new Date(filters.startDate);
        if (filters.endDate) where.dueDate.lte = new Date(filters.endDate);
      }

      if (filters.minAmount || filters.maxAmount) {
        where.amount = {};
        if (filters.minAmount) where.amount.gte = filters.minAmount;
        if (filters.maxAmount) where.amount.lte = filters.maxAmount;
      }

      if (filters.search) {
        where.OR = [
          { description: { contains: filters.search, mode: 'insensitive' } },
          { notes: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      if (filters.tags && filters.tags.length > 0) {
        where.tags = {
          hasSome: filters.tags
        };
      }

      const [transactions, total] = await Promise.all([
        this.prisma.financialTransaction.findMany({
          where,
          include: {
            category: true,
            account: true,
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            [filters.sortBy]: filters.sortOrder
          },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit
        }),
        this.prisma.financialTransaction.count({ where })
      ]);

      return {
        transactions: transactions.map(this.mapTransactionToResponse),
        total,
        totalPages: Math.ceil(total / filters.limit)
      };
    } catch (error) {
      throw new Error(`Erro ao buscar transações: ${error}`);
    }
  }

  async updateTransaction(id: string, data: UpdateTransactionDTO, companyId: string): Promise<TransactionResponseDTO> {
    try {
      const transaction = await this.prisma.financialTransaction.update({
        where: { id, companyId },
        data,
        include: {
          category: true,
          account: true,
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return this.mapTransactionToResponse(transaction);
    } catch (error) {
      throw new Error(`Erro ao atualizar transação: ${error}`);
    }
  }

  async deleteTransaction(id: string, companyId: string): Promise<void> {
    try {
      await this.prisma.financialTransaction.delete({
        where: { id, companyId }
      });
    } catch (error) {
      throw new Error(`Erro ao excluir transação: ${error}`);
    }
  }

  // Métodos para categorias
  async createCategory(data: CreateCategoryDTO & { companyId: string }): Promise<CategoryResponseDTO> {
    try {
      const category = await this.prisma.financialCategory.create({
        data,
        include: {
          parent: true,
          subcategories: true,
          _count: {
            select: {
              transactions: true
            }
          }
        }
      });

      return this.mapCategoryToResponse(category);
    } catch (error) {
      throw new Error(`Erro ao criar categoria: ${error}`);
    }
  }

  async findCategoryById(id: string, companyId: string): Promise<CategoryResponseDTO | null> {
    try {
      const category = await this.prisma.financialCategory.findFirst({
        where: { id, companyId },
        include: {
          parent: true,
          subcategories: true,
          _count: {
            select: {
              transactions: true
            }
          }
        }
      });

      return category ? this.mapCategoryToResponse(category) : null;
    } catch (error) {
      throw new Error(`Erro ao buscar categoria: ${error}`);
    }
  }

  async findCategories(filters: CategoryFiltersDTO & { companyId: string }): Promise<{
    categories: CategoryResponseDTO[];
    total: number;
    totalPages: number;
  }> {
    try {
      const where: any = {
        companyId: filters.companyId
      };

      if (filters.type) where.type = filters.type;
      if (filters.parentId) where.parentId = filters.parentId;
      
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const [categories, total] = await Promise.all([
        this.prisma.financialCategory.findMany({
          where,
          include: {
            parent: true,
            subcategories: true,
            _count: {
              select: {
                transactions: true
              }
            }
          },
          orderBy: {
            [filters.sortBy]: filters.sortOrder
          },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit
        }),
        this.prisma.financialCategory.count({ where })
      ]);

      return {
        categories: categories.map(this.mapCategoryToResponse),
        total,
        totalPages: Math.ceil(total / filters.limit)
      };
    } catch (error) {
      throw new Error(`Erro ao buscar categorias: ${error}`);
    }
  }

  async updateCategory(id: string, data: UpdateCategoryDTO, companyId: string): Promise<CategoryResponseDTO> {
    try {
      const category = await this.prisma.financialCategory.update({
        where: { id, companyId },
        data,
        include: {
          parent: true,
          subcategories: true,
          _count: {
            select: {
              transactions: true
            }
          }
        }
      });

      return this.mapCategoryToResponse(category);
    } catch (error) {
      throw new Error(`Erro ao atualizar categoria: ${error}`);
    }
  }

  async deleteCategory(id: string, companyId: string): Promise<void> {
    try {
      await this.prisma.financialCategory.delete({
        where: { id, companyId }
      });
    } catch (error) {
      throw new Error(`Erro ao excluir categoria: ${error}`);
    }
  }

  // Métodos para contas
  async createAccount(data: CreateAccountDTO & { companyId: string }): Promise<AccountResponseDTO> {
    try {
      const account = await this.prisma.financialAccount.create({
        data: {
          ...data,
          balance: data.initialBalance
        },
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        }
      });

      return this.mapAccountToResponse(account);
    } catch (error) {
      throw new Error(`Erro ao criar conta: ${error}`);
    }
  }

  async findAccountById(id: string, companyId: string): Promise<AccountResponseDTO | null> {
    try {
      const account = await this.prisma.financialAccount.findFirst({
        where: { id, companyId },
        include: {
          _count: {
            select: {
              transactions: true
            }
          },
          transactions: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1,
            select: {
              createdAt: true
            }
          }
        }
      });

      return account ? this.mapAccountToResponse(account) : null;
    } catch (error) {
      throw new Error(`Erro ao buscar conta: ${error}`);
    }
  }

  async findAccounts(filters: AccountFiltersDTO & { companyId: string }): Promise<{
    accounts: AccountResponseDTO[];
    total: number;
    totalPages: number;
  }> {
    try {
      const where: any = {
        companyId: filters.companyId
      };

      if (filters.type) where.type = filters.type;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { bank: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const [accounts, total] = await Promise.all([
        this.prisma.financialAccount.findMany({
          where,
          include: {
            _count: {
              select: {
                transactions: true
              }
            },
            transactions: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 1,
              select: {
                createdAt: true
              }
            }
          },
          orderBy: {
            [filters.sortBy]: filters.sortOrder
          },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit
        }),
        this.prisma.financialAccount.count({ where })
      ]);

      return {
        accounts: accounts.map(this.mapAccountToResponse),
        total,
        totalPages: Math.ceil(total / filters.limit)
      };
    } catch (error) {
      throw new Error(`Erro ao buscar contas: ${error}`);
    }
  }

  async updateAccount(id: string, data: UpdateAccountDTO, companyId: string): Promise<AccountResponseDTO> {
    try {
      const account = await this.prisma.financialAccount.update({
        where: { id, companyId },
        data,
        include: {
          _count: {
            select: {
              transactions: true
            }
          },
          transactions: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1,
            select: {
              createdAt: true
            }
          }
        }
      });

      return this.mapAccountToResponse(account);
    } catch (error) {
      throw new Error(`Erro ao atualizar conta: ${error}`);
    }
  }

  async deleteAccount(id: string, companyId: string): Promise<void> {
    try {
      await this.prisma.financialAccount.delete({
        where: { id, companyId }
      });
    } catch (error) {
      throw new Error(`Erro ao excluir conta: ${error}`);
    }
  }

  // Métodos para transferências
  async createTransfer(data: CreateTransferDTO & { companyId: string, userId: string }): Promise<TransferResponseDTO> {
    try {
      const transfer = await this.prisma.financialTransfer.create({
        data: {
          ...data,
          createdBy: data.userId
        },
        include: {
          fromAccount: true,
          toAccount: true
        }
      });

      return this.mapTransferToResponse(transfer);
    } catch (error) {
      throw new Error(`Erro ao criar transferência: ${error}`);
    }
  }

  async findTransfers(filters: TransferFiltersDTO & { companyId: string }): Promise<{
    transfers: TransferResponseDTO[];
    total: number;
    totalPages: number;
  }> {
    try {
      const where: any = {
        companyId: filters.companyId
      };

      if (filters.fromAccountId) where.fromAccountId = filters.fromAccountId;
      if (filters.toAccountId) where.toAccountId = filters.toAccountId;
      
      if (filters.startDate || filters.endDate) {
        where.transferDate = {};
        if (filters.startDate) where.transferDate.gte = new Date(filters.startDate);
        if (filters.endDate) where.transferDate.lte = new Date(filters.endDate);
      }

      if (filters.minAmount || filters.maxAmount) {
        where.amount = {};
        if (filters.minAmount) where.amount.gte = filters.minAmount;
        if (filters.maxAmount) where.amount.lte = filters.maxAmount;
      }

      if (filters.search) {
        where.OR = [
          { description: { contains: filters.search, mode: 'insensitive' } },
          { notes: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const [transfers, total] = await Promise.all([
        this.prisma.financialTransfer.findMany({
          where,
          include: {
            fromAccount: true,
            toAccount: true
          },
          orderBy: {
            [filters.sortBy]: filters.sortOrder
          },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit
        }),
        this.prisma.financialTransfer.count({ where })
      ]);

      return {
        transfers: transfers.map(this.mapTransferToResponse),
        total,
        totalPages: Math.ceil(total / filters.limit)
      };
    } catch (error) {
      throw new Error(`Erro ao buscar transferências: ${error}`);
    }
  }

  // Métodos para estatísticas e relatórios
  async getStats(companyId: string, startDate?: string, endDate?: string): Promise<FinancialStatsDTO> {
    try {
      const dateFilter: any = {};
      if (startDate || endDate) {
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);
      }

      const [transactions, accounts, categories] = await Promise.all([
        this.prisma.financialTransaction.findMany({
          where: {
            companyId,
            ...(Object.keys(dateFilter).length > 0 && { dueDate: dateFilter })
          },
          include: {
            category: true
          }
        }),
        this.prisma.financialAccount.findMany({
          where: { companyId, isActive: true }
        }),
        this.prisma.financialCategory.findMany({
          where: { companyId },
          include: {
            _count: {
              select: {
                transactions: true
              }
            }
          }
        })
      ]);

      // Calcular estatísticas básicas
      const totalIncome = transactions
        .filter(t => t.type === 'INCOME' && t.status === 'PAID')
        .reduce((sum, t) => sum + (t.paidAmount || t.amount), 0);

      const totalExpense = transactions
        .filter(t => t.type === 'EXPENSE' && t.status === 'PAID')
        .reduce((sum, t) => sum + (t.paidAmount || t.amount), 0);

      const pendingIncome = transactions
        .filter(t => t.type === 'INCOME' && t.status === 'PENDING')
        .reduce((sum, t) => sum + t.amount, 0);

      const pendingExpense = transactions
        .filter(t => t.type === 'EXPENSE' && t.status === 'PENDING')
        .reduce((sum, t) => sum + t.amount, 0);

      const overdueIncome = transactions
        .filter(t => t.type === 'INCOME' && t.status === 'OVERDUE')
        .reduce((sum, t) => sum + t.amount, 0);

      const overdueExpense = transactions
        .filter(t => t.type === 'EXPENSE' && t.status === 'OVERDUE')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
      const totalCreditLimit = accounts.reduce((sum, a) => sum + (a.creditLimit || 0), 0);

      // Calcular transações do mês atual
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const thisMonthTransactions = transactions.filter(t => 
        new Date(t.createdAt) >= currentMonth
      );

      const incomeThisMonth = thisMonthTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + (t.paidAmount || t.amount), 0);

      const expenseThisMonth = thisMonthTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + (t.paidAmount || t.amount), 0);

      // Top categorias
      const incomeByCategory = new Map<string, { name: string; amount: number }>();
      const expenseByCategory = new Map<string, { name: string; amount: number }>();

      transactions.forEach(t => {
        const amount = t.paidAmount || t.amount;
        if (t.type === 'INCOME') {
          const existing = incomeByCategory.get(t.categoryId) || { name: t.category.name, amount: 0 };
          incomeByCategory.set(t.categoryId, { ...existing, amount: existing.amount + amount });
        } else {
          const existing = expenseByCategory.get(t.categoryId) || { name: t.category.name, amount: 0 };
          expenseByCategory.set(t.categoryId, { ...existing, amount: existing.amount + amount });
        }
      });

      const topIncomeCategories = Array.from(incomeByCategory.entries())
        .map(([categoryId, data]) => ({
          categoryId,
          categoryName: data.name,
          amount: data.amount,
          percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const topExpenseCategories = Array.from(expenseByCategory.entries())
        .map(([categoryId, data]) => ({
          categoryId,
          categoryName: data.name,
          amount: data.amount,
          percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        totalIncome,
        totalExpense,
        netIncome: totalIncome - totalExpense,
        pendingIncome,
        pendingExpense,
        overdueIncome,
        overdueExpense,
        totalAccounts: accounts.length,
        totalBalance,
        totalCreditLimit,
        transactionsThisMonth: thisMonthTransactions.length,
        incomeThisMonth,
        expenseThisMonth,
        topIncomeCategories,
        topExpenseCategories
      };
    } catch (error) {
      throw new Error(`Erro ao obter estatísticas: ${error}`);
    }
  }

  async getCashFlow(companyId: string, startDate: string, endDate: string): Promise<CashFlowDTO[]> {
    try {
      const transactions = await this.prisma.financialTransaction.findMany({
        where: {
          companyId,
          dueDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        orderBy: {
          dueDate: 'asc'
        }
      });

      const cashFlowMap = new Map<string, { income: number; expense: number }>();
      
      transactions.forEach(transaction => {
        const date = transaction.dueDate.toISOString().split('T')[0];
        const existing = cashFlowMap.get(date) || { income: 0, expense: 0 };
        
        if (transaction.type === 'INCOME') {
          existing.income += transaction.paidAmount || transaction.amount;
        } else {
          existing.expense += transaction.paidAmount || transaction.amount;
        }
        
        cashFlowMap.set(date, existing);
      });

      let cumulativeBalance = 0;
      const cashFlow: CashFlowDTO[] = [];

      for (const [date, data] of cashFlowMap.entries()) {
        const balance = data.income - data.expense;
        cumulativeBalance += balance;
        
        cashFlow.push({
          date,
          income: data.income,
          expense: data.expense,
          balance,
          cumulativeBalance
        });
      }

      return cashFlow.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      throw new Error(`Erro ao obter fluxo de caixa: ${error}`);
    }
  }

  async findForReport(companyId: string, filters: any): Promise<FinancialReportDTO[]> {
    try {
      const where: any = { companyId };
      
      if (filters.type) where.type = filters.type;
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.accountId) where.accountId = filters.accountId;
      if (filters.status) where.status = filters.status;
      
      if (filters.startDate || filters.endDate) {
        where.dueDate = {};
        if (filters.startDate) where.dueDate.gte = new Date(filters.startDate);
        if (filters.endDate) where.dueDate.lte = new Date(filters.endDate);
      }

      const transactions = await this.prisma.financialTransaction.findMany({
        where,
        include: {
          category: true,
          account: true,
          createdByUser: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          dueDate: 'asc'
        }
      });

      return transactions.map(transaction => ({
        id: transaction.id,
        type: transaction.type,
        categoryName: transaction.category.name,
        accountName: transaction.account.name,
        amount: transaction.amount,
        paidAmount: transaction.paidAmount,
        description: transaction.description,
        dueDate: transaction.dueDate.toISOString(),
        paymentDate: transaction.paymentDate?.toISOString(),
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        tags: transaction.tags?.join(', '),
        notes: transaction.notes,
        referenceType: transaction.referenceType,
        userName: transaction.createdByUser.name
      }));
    } catch (error) {
      throw new Error(`Erro ao buscar dados para relatório: ${error}`);
    }
  }

  // Métodos auxiliares para mapeamento
  private mapTransactionToResponse(transaction: any): TransactionResponseDTO {
    return {
      id: transaction.id,
      type: transaction.type,
      categoryId: transaction.categoryId,
      categoryName: transaction.category.name,
      categoryColor: transaction.category.color,
      accountId: transaction.accountId,
      accountName: transaction.account.name,
      amount: transaction.amount,
      paidAmount: transaction.paidAmount,
      description: transaction.description,
      dueDate: transaction.dueDate.toISOString(),
      paymentDate: transaction.paymentDate?.toISOString(),
      status: transaction.status,
      installments: transaction.installments,
      currentInstallment: transaction.currentInstallment,
      tags: transaction.tags,
      attachments: transaction.attachments,
      notes: transaction.notes,
      referenceId: transaction.referenceId,
      referenceType: transaction.referenceType,
      paymentMethod: transaction.paymentMethod,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      companyId: transaction.companyId
    };
  }

  private mapCategoryToResponse(category: any): CategoryResponseDTO {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      color: category.color,
      description: category.description,
      parentId: category.parentId,
      parentName: category.parent?.name,
      subcategories: category.subcategories?.map(this.mapCategoryToResponse) || [],
      transactionsCount: category._count?.transactions || 0,
      totalAmount: 0, // Será calculado no service se necessário
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
      companyId: category.companyId
    };
  }

  private mapAccountToResponse(account: any): AccountResponseDTO {
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      bank: account.bank,
      agency: account.agency,
      accountNumber: account.accountNumber,
      balance: account.balance,
      initialBalance: account.initialBalance,
      creditLimit: account.creditLimit,
      availableBalance: account.balance + (account.creditLimit || 0),
      description: account.description,
      isActive: account.isActive,
      transactionsCount: account._count?.transactions || 0,
      lastTransactionDate: account.transactions?.[0]?.createdAt?.toISOString(),
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      companyId: account.companyId
    };
  }

  private mapTransferToResponse(transfer: any): TransferResponseDTO {
    return {
      id: transfer.id,
      fromAccountId: transfer.fromAccountId,
      fromAccountName: transfer.fromAccount.name,
      toAccountId: transfer.toAccountId,
      toAccountName: transfer.toAccount.name,
      amount: transfer.amount,
      description: transfer.description,
      transferDate: transfer.transferDate.toISOString(),
      fee: transfer.fee,
      notes: transfer.notes,
      createdAt: transfer.createdAt.toISOString(),
      updatedAt: transfer.updatedAt.toISOString(),
      companyId: transfer.companyId
    };
  }
}