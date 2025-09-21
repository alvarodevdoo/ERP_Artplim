import { z } from 'zod';

// Schemas de validação
export const createOrderSchema = z.object({
  quoteId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  expectedStartDate: z.string().datetime().optional(),
  expectedEndDate: z.string().datetime().optional(),
  actualStartDate: z.string().datetime().optional(),
  actualEndDate: z.string().datetime().optional(),
  paymentTerms: z.string().optional(),
  observations: z.string().optional(),
  discount: z.number().min(0).default(0),
  discountType: z.enum(['FIXED', 'PERCENTAGE']).default('FIXED'),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
    discountType: z.enum(['FIXED', 'PERCENTAGE']).default('FIXED'),
    observations: z.string().optional()
  })).min(1, 'Pelo menos um item é obrigatório')
});

export const updateOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  expectedStartDate: z.string().datetime().optional(),
  expectedEndDate: z.string().datetime().optional(),
  actualStartDate: z.string().datetime().optional(),
  actualEndDate: z.string().datetime().optional(),
  paymentTerms: z.string().optional(),
  observations: z.string().optional(),
  discount: z.number().min(0).optional(),
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
    discountType: z.enum(['FIXED', 'PERCENTAGE']).default('FIXED'),
    observations: z.string().optional()
  })).optional()
});

export const orderFiltersSchema = z.object({
  search: z.string().optional(),
  customerId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  expectedStartDate: z.string().datetime().optional(),
  expectedEndDate: z.string().datetime().optional(),
  minValue: z.number().min(0).optional(),
  maxValue: z.number().min(0).optional(),
  assignedTo: z.string().uuid().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'number', 'title', 'priority', 'expectedStartDate', 'expectedEndDate', 'totalValue']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']),
  reason: z.string().optional()
});

export const assignOrderSchema = z.object({
  assignedTo: z.string().uuid(),
  notes: z.string().optional()
});

export const addOrderTimeTrackingSchema = z.object({
  employeeId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  description: z.string().optional(),
  billable: z.boolean().default(true)
});

export const updateOrderTimeTrackingSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  description: z.string().optional(),
  billable: z.boolean().optional()
});

export const addOrderExpenseSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  date: z.string().datetime(),
  receipt: z.string().optional(),
  billable: z.boolean().default(true)
});

export const updateOrderExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  date: z.string().datetime().optional(),
  receipt: z.string().optional(),
  billable: z.boolean().optional()
});

// Tipos TypeScript inferidos dos schemas
export type CreateOrderDTO = z.infer<typeof createOrderSchema>;
export type UpdateOrderDTO = z.infer<typeof updateOrderSchema>;
export type OrderFiltersDTO = z.infer<typeof orderFiltersSchema>;
export type UpdateOrderStatusDTO = z.infer<typeof updateOrderStatusSchema>;
export type AssignOrderDTO = z.infer<typeof assignOrderSchema>;
export type AddOrderTimeTrackingDTO = z.infer<typeof addOrderTimeTrackingSchema>;
export type UpdateOrderTimeTrackingDTO = z.infer<typeof updateOrderTimeTrackingSchema>;
export type AddOrderExpenseDTO = z.infer<typeof addOrderExpenseSchema>;
export type UpdateOrderExpenseDTO = z.infer<typeof updateOrderExpenseSchema>;

// Interfaces de resposta
export interface OrderItemResponseDTO {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'FIXED' | 'PERCENTAGE';
  subtotal: number;
  total: number;
  observations?: string;
}

export interface OrderTimeTrackingResponseDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // em minutos
  description?: string;
  billable: boolean;
  createdAt: Date;
}

export interface OrderExpenseResponseDTO {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  receipt?: string;
  billable: boolean;
  createdAt: Date;
}

export interface OrderResponseDTO {
  id: string;
  number: string;
  quoteId?: string;
  quoteNumber?: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  expectedStartDate?: Date;
  expectedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  paymentTerms?: string;
  observations?: string;
  discount: number;
  discountType: 'FIXED' | 'PERCENTAGE';
  subtotal: number;
  discountValue: number;
  totalValue: number;
  assignedTo?: string;
  assignedToName?: string;
  items: OrderItemResponseDTO[];
  timeTracking: OrderTimeTrackingResponseDTO[];
  expenses: OrderExpenseResponseDTO[];
  totalHours: number;
  totalExpenses: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName: string;
}

// Interface para estatísticas
export interface OrderStatsDTO {
  total: number;
  byStatus: {
    pending: number;
    inProgress: number;
    paused: number;
    completed: number;
    cancelled: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  totalValue: number;
  averageValue: number;
  averageCompletionTime: number; // em dias
  thisMonth: {
    total: number;
    totalValue: number;
    completed: number;
    completedValue: number;
  };
  lastMonth: {
    total: number;
    totalValue: number;
    completed: number;
    completedValue: number;
  };
  overdue: number;
  totalHours: number;
  totalExpenses: number;
}

// Interface para relatório
export interface OrderReportDTO {
  id: string;
  number: string;
  customerName: string;
  customerDocument: string;
  title: string;
  status: string;
  priority: string;
  expectedStartDate?: string;
  expectedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  subtotal: number;
  discountValue: number;
  totalValue: number;
  totalHours: number;
  totalExpenses: number;
  itemsCount: number;
  assignedToName?: string;
  createdAt: string;
  createdByName: string;
}

// Interface para dashboard
export interface OrderDashboardDTO {
  stats: OrderStatsDTO;
  recentOrders: OrderResponseDTO[];
  overdueOrders: OrderResponseDTO[];
  upcomingDeadlines: OrderResponseDTO[];
  topCustomers: {
    customerId: string;
    customerName: string;
    ordersCount: number;
    totalValue: number;
  }[];
  productivityMetrics: {
    averageHoursPerOrder: number;
    averageExpensesPerOrder: number;
    completionRate: number;
    onTimeDeliveryRate: number;
  };
}