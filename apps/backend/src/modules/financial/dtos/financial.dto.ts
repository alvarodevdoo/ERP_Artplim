import { z } from 'zod';

// Schemas de validação para transações financeiras
export const createTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().uuid('ID da categoria deve ser um UUID válido'),
  accountId: z.string().uuid('ID da conta deve ser um UUID válido'),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(1, 'Descrição é obrigatória').max(500, 'Descrição deve ter no máximo 500 caracteres'),
  dueDate: z.string().datetime('Data de vencimento deve ser uma data válida'),
  paymentDate: z.string().datetime('Data de pagamento deve ser uma data válida').optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).default('PENDING'),
  installments: z.number().int().min(1).max(360).default(1),
  tags: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
  notes: z.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional(),
  referenceId: z.string().optional(), // Para vincular a orçamentos, OS, etc.
  referenceType: z.enum(['QUOTE', 'ORDER', 'PURCHASE', 'OTHER']).optional()
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const payTransactionSchema = z.object({
  paymentDate: z.string().datetime('Data de pagamento deve ser uma data válida'),
  paidAmount: z.number().positive('Valor pago deve ser positivo'),
  paymentMethod: z.string().min(1, 'Método de pagamento é obrigatório'),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional()
});

// Schemas para categorias financeiras
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve ser um código hexadecimal válido').optional(),
  description: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
  parentId: z.string().uuid('ID da categoria pai deve ser um UUID válido').optional()
});

export const updateCategorySchema = createCategorySchema.partial();

// Schemas para contas bancárias
export const createAccountSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'OTHER']),
  bank: z.string().max(100, 'Banco deve ter no máximo 100 caracteres').optional(),
  agency: z.string().max(20, 'Agência deve ter no máximo 20 caracteres').optional(),
  accountNumber: z.string().max(30, 'Número da conta deve ter no máximo 30 caracteres').optional(),
  initialBalance: z.number().default(0),
  creditLimit: z.number().min(0).optional(),
  description: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
  isActive: z.boolean().default(true)
});

export const updateAccountSchema = createAccountSchema.partial();

// Schemas para transferências entre contas
export const createTransferSchema = z.object({
  fromAccountId: z.string().uuid('ID da conta de origem deve ser um UUID válido'),
  toAccountId: z.string().uuid('ID da conta de destino deve ser um UUID válido'),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(1, 'Descrição é obrigatória').max(500, 'Descrição deve ter no máximo 500 caracteres'),
  transferDate: z.string().datetime('Data da transferência deve ser uma data válida'),
  fee: z.number().min(0).default(0),
  notes: z.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional()
});

// Schemas para filtros
export const transactionFiltersSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  referenceType: z.enum(['QUOTE', 'ORDER', 'PURCHASE', 'OTHER']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['dueDate', 'paymentDate', 'amount', 'description', 'createdAt']).default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const categoryFiltersSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  parentId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'type', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export const accountFiltersSchema = z.object({
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'OTHER']).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'type', 'balance', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export const transferFiltersSchema = z.object({
  fromAccountId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['transferDate', 'amount', 'description', 'createdAt']).default('transferDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Tipos TypeScript inferidos dos schemas
export type CreateTransactionDTO = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionDTO = z.infer<typeof updateTransactionSchema>;
export type PayTransactionDTO = z.infer<typeof payTransactionSchema>;
export type CreateCategoryDTO = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>;
export type CreateAccountDTO = z.infer<typeof createAccountSchema>;
export type UpdateAccountDTO = z.infer<typeof updateAccountSchema>;
export type CreateTransferDTO = z.infer<typeof createTransferSchema>;
export type TransactionFiltersDTO = z.infer<typeof transactionFiltersSchema>;
export type CategoryFiltersDTO = z.infer<typeof categoryFiltersSchema>;
export type AccountFiltersDTO = z.infer<typeof accountFiltersSchema>;
export type TransferFiltersDTO = z.infer<typeof transferFiltersSchema>;

// Interfaces de resposta
export interface TransactionResponseDTO {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  categoryId: string;
  categoryName: string;
  categoryColor?: string;
  accountId: string;
  accountName: string;
  amount: number;
  paidAmount?: number;
  description: string;
  dueDate: string;
  paymentDate?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  installments: number;
  currentInstallment?: number;
  tags?: string[];
  attachments?: string[];
  notes?: string;
  referenceId?: string;
  referenceType?: 'QUOTE' | 'ORDER' | 'PURCHASE' | 'OTHER';
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
}

export interface CategoryResponseDTO {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color?: string;
  description?: string;
  parentId?: string;
  parentName?: string;
  subcategories?: CategoryResponseDTO[];
  transactionsCount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  companyId: string;
}

export interface AccountResponseDTO {
  id: string;
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER';
  bank?: string;
  agency?: string;
  accountNumber?: string;
  balance: number;
  initialBalance: number;
  creditLimit?: number;
  availableBalance: number;
  description?: string;
  isActive: boolean;
  transactionsCount: number;
  lastTransactionDate?: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
}

export interface TransferResponseDTO {
  id: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  description: string;
  transferDate: string;
  fee: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
}

// DTOs para estatísticas e relatórios
export interface FinancialStatsDTO {
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  pendingIncome: number;
  pendingExpense: number;
  overdueIncome: number;
  overdueExpense: number;
  totalAccounts: number;
  totalBalance: number;
  totalCreditLimit: number;
  transactionsThisMonth: number;
  incomeThisMonth: number;
  expenseThisMonth: number;
  topIncomeCategories: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
  }>;
  topExpenseCategories: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
  }>;
}

export interface CashFlowDTO {
  date: string;
  income: number;
  expense: number;
  balance: number;
  cumulativeBalance: number;
}

export interface FinancialReportDTO {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  categoryName: string;
  accountName: string;
  amount: number;
  paidAmount?: number;
  description: string;
  dueDate: string;
  paymentDate?: string;
  status: string;
  paymentMethod?: string;
  tags?: string;
  notes?: string;
  referenceType?: string;
  userName: string;
}

export interface FinancialDashboardDTO {
  stats: FinancialStatsDTO;
  cashFlow: CashFlowDTO[];
  recentTransactions: TransactionResponseDTO[];
  overdueTransactions: TransactionResponseDTO[];
  upcomingTransactions: TransactionResponseDTO[];
  accountsBalance: Array<{
    accountId: string;
    accountName: string;
    balance: number;
    type: string;
  }>;
  monthlyComparison: Array<{
    month: string;
    income: number;
    expense: number;
    netIncome: number;
  }>;
}