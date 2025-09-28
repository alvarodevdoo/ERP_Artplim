import { PrismaClient, Prisma } from '@prisma/client';
import { 
  TransactionResponseDTO,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionFiltersDTO
} from '../dtos';

// Tipo para transação com includes do Prisma
type TransactionWithIncludes = Prisma.FinancialEntryGetPayload<{
  include: {
    company: true;
    partner: true;
    order: true;
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

export class FinancialRepository {
  constructor(private prisma: PrismaClient) {}

  // Métodos para transações financeiras
  async createTransaction(data: CreateTransactionDTO): Promise<TransactionResponseDTO> {
    try {
      const transaction = await this.prisma.financialEntry.create({
        data: {
          type: data.type,
          status: 'PENDING',
          category: data.categoryId || 'Geral',
          description: data.description,
          amount: data.amount,
          dueDate: new Date(data.dueDate),
          paidDate: data.paymentDate ? new Date(data.paymentDate) : null,
          userId: data.userId,
          reference: data.referenceId || null,
          notes: data.notes || null,
          companyId: data.companyId
        },
        include: {
          company: true,
          partner: true,
          order: true,
          user: {
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
      throw new Error(`Erro ao criar transação: ${(error as Error).message}`);
    }
  }

  async findTransactionById(id: string, companyId: string): Promise<TransactionResponseDTO | null> {
    try {
      const transaction = await this.prisma.financialEntry.findFirst({
        where: { id, companyId },
        include: {
          company: true,
          partner: true,
          order: true,
          user: {
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
      throw new Error(`Erro ao buscar transação: ${(error as Error).message}`);
    }
  }

  async findTransactions(filters: TransactionFiltersDTO, companyId: string): Promise<{ transactions: TransactionResponseDTO[]; total: number; }> {
    try {
      interface WhereClause {
        companyId: string;
        type?: 'INCOME' | 'EXPENSE';
        status?: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
        dueDate?: {
          gte?: Date;
          lte?: Date;
        };
        amount?: {
          gte?: number;
          lte?: number;
        };
        OR?: Array<{
          description?: { contains: string; mode: 'insensitive' };
          notes?: { contains: string; mode: 'insensitive' };
        }>;
      }

      const where: WhereClause = {
        companyId
      };

      if (filters.type) where.type = filters.type as 'INCOME' | 'EXPENSE';
      if (filters.status) where.status = filters.status as 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
      
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

      const [transactions, total] = await Promise.all([
        this.prisma.financialEntry.findMany({
          where,
          include: {
            company: true,
            partner: true,
            order: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: filters.sortOrder === 'asc' ? 'asc' : 'desc'
          },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit
        }),
        this.prisma.financialEntry.count({ where })
      ]);

      return {
        transactions: transactions.map((t) => this.mapTransactionToResponse(t)),
        total
      };
    } catch (error) {
      throw new Error(`Erro ao buscar transações: ${(error as Error).message}`);
    }
  }

  async updateTransaction(id: string, data: UpdateTransactionDTO, companyId: string): Promise<TransactionResponseDTO> {
    try {
      const updateData: Prisma.FinancialEntryUpdateInput = {};
      if (data.type) updateData.type = data.type;
      if (data.status) updateData.status = data.status;
      if (data.description) updateData.description = data.description;
      if (data.amount) updateData.amount = data.amount;
      if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
      if (data.paymentDate) updateData.paidDate = new Date(data.paymentDate);
      if (data.notes) updateData.notes = data.notes;
      if (data.categoryId) updateData.category = data.categoryId;
      
      const transaction = await this.prisma.financialEntry.update({
        where: { id, companyId },
        data: updateData,
        include: {
          company: true,
          partner: true,
          order: true,
          user: {
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
      throw new Error(`Erro ao atualizar transação: ${(error as Error).message}`);
    }
  }

  async deleteTransaction(id: string, companyId: string): Promise<void> {
    try {
      await this.prisma.financialEntry.delete({
        where: { id, companyId }
      });
    } catch (error) {
      throw new Error(`Erro ao deletar transação: ${(error as Error).message}`);
    }
  }

  // Métodos para categorias - removidos pois não existem no schema

  // Métodos para contas - removidos pois não existem no schema

  // Métodos para transferências - removidos pois não existem no schema

  // Métodos para estatísticas e relatórios - removidos pois usam modelos inexistentes

  // Método auxiliar para mapeamento
  private mapTransactionToResponse(transaction: TransactionWithIncludes): TransactionResponseDTO {
    const amount = typeof transaction.amount === 'object' ? transaction.amount.toNumber() : transaction.amount;
    
    return {
      id: transaction.id,
      type: transaction.type as 'INCOME' | 'EXPENSE',
      categoryId: transaction.category || '',
      categoryName: transaction.category || 'Sem categoria',
      categoryColor: '#6B7280',
      accountId: '',
      accountName: '',
      amount,
      paidAmount: amount,
      description: transaction.description,
      dueDate: transaction.dueDate.toISOString(),
      paymentDate: transaction.paidDate?.toISOString(),
      status: transaction.status as 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED',
      installments: 1,
      currentInstallment: 1,
      tags: [],
      attachments: [],
      notes: transaction.notes || '',
      referenceId: transaction.reference || '',
      referenceType: 'OTHER',
      paymentMethod: 'CASH',
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      companyId: transaction.companyId
    };
  }
}