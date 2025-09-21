import { z } from 'zod';

// Validadores básicos
export const emailSchema = z.string().email('Email inválido');
export const phoneSchema = z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos');
export const cnpjSchema = z.string().length(14, 'CNPJ deve ter 14 dígitos');
export const cpfSchema = z.string().length(11, 'CPF deve ter 11 dígitos');
export const cepSchema = z.string().length(8, 'CEP deve ter 8 dígitos');

// Validador de paginação
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Validadores de Company
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cnpj: cnpjSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: cepSchema.optional(),
  isActive: z.boolean().default(true),
});

export const updateCompanySchema = createCompanySchema.partial();

// Validadores de User
export const createUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(1, 'Nome é obrigatório'),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

// Validadores de Role
export const createRoleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

export const updateRoleSchema = createRoleSchema.partial();

// Validadores de Employee
export const createEmployeeSchema = z.object({
  userId: z.string().uuid('ID do usuário inválido'),
  roleId: z.string().uuid('ID do cargo inválido'),
  employeeNumber: z.string().min(1, 'Número do funcionário é obrigatório'),
  department: z.string().optional(),
  position: z.string().optional(),
  salary: z.number().positive('Salário deve ser positivo').optional(),
  hireDate: z.date().default(() => new Date()),
  isActive: z.boolean().default(true),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

// Validadores de Product
export const createProductSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  sku: z.string().min(1, 'SKU é obrigatório'),
  category: z.string().optional(),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  costPrice: z.number().positive('Preço de custo deve ser positivo'),
  salePrice: z.number().positive('Preço de venda deve ser positivo'),
  minStock: z.number().int().min(0, 'Estoque mínimo deve ser maior ou igual a 0').default(0),
  currentStock: z.number().int().min(0, 'Estoque atual deve ser maior ou igual a 0').default(0),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

// Validadores de Variant
export const createVariantSchema = z.object({
  productId: z.string().uuid('ID do produto inválido'),
  name: z.string().min(1, 'Nome é obrigatório'),
  sku: z.string().min(1, 'SKU é obrigatório'),
  attributes: z.record(z.string()).default({}),
  costPrice: z.number().positive('Preço de custo deve ser positivo'),
  salePrice: z.number().positive('Preço de venda deve ser positivo'),
  currentStock: z.number().int().min(0, 'Estoque atual deve ser maior ou igual a 0').default(0),
  isActive: z.boolean().default(true),
});

export const updateVariantSchema = createVariantSchema.partial();

// Validadores de InputItem
export const createInputItemSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  costPrice: z.number().positive('Preço de custo deve ser positivo'),
  supplier: z.string().optional(),
  minStock: z.number().int().min(0, 'Estoque mínimo deve ser maior ou igual a 0').default(0),
  currentStock: z.number().int().min(0, 'Estoque atual deve ser maior ou igual a 0').default(0),
  isActive: z.boolean().default(true),
});

export const updateInputItemSchema = createInputItemSchema.partial();

// Validadores de Finish
export const createFinishSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  type: z.string().min(1, 'Tipo é obrigatório'),
  color: z.string().optional(),
  texture: z.string().optional(),
  additionalCost: z.number().min(0, 'Custo adicional deve ser maior ou igual a 0').default(0),
  isActive: z.boolean().default(true),
});

export const updateFinishSchema = createFinishSchema.partial();

// Validadores de Partner
export const createPartnerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH'], {
    errorMap: () => ({ message: 'Tipo deve ser CUSTOMER, SUPPLIER ou BOTH' }),
  }),
  document: z.string().min(1, 'Documento é obrigatório'),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: cepSchema.optional(),
  contactPerson: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updatePartnerSchema = createPartnerSchema.partial();

// Validadores de Quote
export const quoteItemSchema = z.object({
  productId: z.string().uuid('ID do produto inválido').optional(),
  variantId: z.string().uuid('ID da variante inválido').optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  unitPrice: z.number().positive('Preço unitário deve ser positivo'),
  discount: z.number().min(0).max(100, 'Desconto deve estar entre 0 e 100').default(0),
  total: z.number().positive('Total deve ser positivo'),
});

export const createQuoteSchema = z.object({
  partnerId: z.string().uuid('ID do parceiro inválido'),
  number: z.string().min(1, 'Número é obrigatório'),
  description: z.string().optional(),
  validUntil: z.date(),
  items: z.array(quoteItemSchema).min(1, 'Pelo menos um item é obrigatório'),
  subtotal: z.number().positive('Subtotal deve ser positivo'),
  discount: z.number().min(0).max(100, 'Desconto deve estar entre 0 e 100').default(0),
  total: z.number().positive('Total deve ser positivo'),
  notes: z.string().optional(),
});

export const updateQuoteSchema = createQuoteSchema.partial();

// Validadores de Order
export const orderItemSchema = z.object({
  productId: z.string().uuid('ID do produto inválido').optional(),
  variantId: z.string().uuid('ID da variante inválido').optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  unitPrice: z.number().positive('Preço unitário deve ser positivo'),
  discount: z.number().min(0).max(100, 'Desconto deve estar entre 0 e 100').default(0),
  total: z.number().positive('Total deve ser positivo'),
});

export const createOrderSchema = z.object({
  partnerId: z.string().uuid('ID do parceiro inválido'),
  quoteId: z.string().uuid('ID do orçamento inválido').optional(),
  number: z.string().min(1, 'Número é obrigatório'),
  description: z.string().optional(),
  deliveryDate: z.date().optional(),
  items: z.array(orderItemSchema).min(1, 'Pelo menos um item é obrigatório'),
  subtotal: z.number().positive('Subtotal deve ser positivo'),
  discount: z.number().min(0).max(100, 'Desconto deve estar entre 0 e 100').default(0),
  total: z.number().positive('Total deve ser positivo'),
  notes: z.string().optional(),
});

export const updateOrderSchema = createOrderSchema.partial();

// Validadores de StockMovement
export const createStockMovementSchema = z.object({
  productId: z.string().uuid('ID do produto inválido').optional(),
  variantId: z.string().uuid('ID da variante inválido').optional(),
  inputItemId: z.string().uuid('ID do insumo inválido').optional(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT'], {
    errorMap: () => ({ message: 'Tipo deve ser IN, OUT ou ADJUSTMENT' }),
  }),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  unitCost: z.number().positive('Custo unitário deve ser positivo').optional(),
  totalCost: z.number().positive('Custo total deve ser positivo').optional(),
  reason: z.string().min(1, 'Motivo é obrigatório'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const updateStockMovementSchema = createStockMovementSchema.partial();

// Validadores de FinancialEntry
export const createFinancialEntrySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: 'Tipo deve ser INCOME ou EXPENSE' }),
  }),
  category: z.string().min(1, 'Categoria é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive('Valor deve ser positivo'),
  dueDate: z.date(),
  paidDate: z.date().optional(),
  partnerId: z.string().uuid('ID do parceiro inválido').optional(),
  orderId: z.string().uuid('ID da ordem inválido').optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const updateFinancialEntrySchema = createFinancialEntrySchema.partial();

// Validadores de relatórios
const baseDateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
});

export const reportDateRangeSchema = baseDateRangeSchema.refine((data) => data.startDate <= data.endDate, {
  message: 'Data inicial deve ser menor ou igual à data final',
  path: ['endDate'],
});

export const salesReportSchema = baseDateRangeSchema.extend({
  partnerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  status: z.string().optional(),
}).refine((data) => data.startDate <= data.endDate, {
  message: 'Data inicial deve ser menor ou igual à data final',
  path: ['endDate'],
});

export const stockReportSchema = z.object({
  productId: z.string().uuid().optional(),
  category: z.string().optional(),
  lowStock: z.boolean().default(false),
});

export const financialReportSchema = baseDateRangeSchema.extend({
  type: z.enum(['INCOME', 'EXPENSE', 'BOTH']).default('BOTH'),
  category: z.string().optional(),
  partnerId: z.string().uuid().optional(),
}).refine((data) => data.startDate <= data.endDate, {
  message: 'Data inicial deve ser menor ou igual à data final',
  path: ['endDate'],
});

// Tipos derivados dos schemas
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type CreateInputItemInput = z.infer<typeof createInputItemSchema>;
export type UpdateInputItemInput = z.infer<typeof updateInputItemSchema>;
export type CreateFinishInput = z.infer<typeof createFinishSchema>;
export type UpdateFinishInput = z.infer<typeof updateFinishSchema>;
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
export type UpdateStockMovementInput = z.infer<typeof updateStockMovementSchema>;
export type CreateFinancialEntryInput = z.infer<typeof createFinancialEntrySchema>;
export type UpdateFinancialEntryInput = z.infer<typeof updateFinancialEntrySchema>;
export type ReportDateRangeInput = z.infer<typeof reportDateRangeSchema>;
export type SalesReportInput = z.infer<typeof salesReportSchema>;
export type StockReportInput = z.infer<typeof stockReportSchema>;
export type FinancialReportInput = z.infer<typeof financialReportSchema>;