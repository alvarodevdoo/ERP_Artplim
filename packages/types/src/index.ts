// Tipos base
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantEntity extends BaseEntity {
  companyId: string;
}

// Enums
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export enum PartnerType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  BOTH = 'BOTH'
}

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export enum StockMovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT'
}

export enum FinancialEntryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum FinancialEntryStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

// Interfaces das entidades
export interface Company extends BaseEntity {
  name: string;
  cnpj: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isActive: boolean;
  users: User[];
  employees: Employee[];
  products: Product[];
  partners: Partner[];
  quotes: Quote[];
  orders: Order[];
  stockMovements: StockMovement[];
  financialEntries: FinancialEntry[];
}

export interface User extends BaseEntity {
  email: string;
  password: string;
  name: string;
  isActive: boolean;
  companyId: string;
  company: Company;
  employee?: Employee;
  createdQuotes: Quote[];
  createdOrders: Order[];
  createdStockMovements: StockMovement[];
  createdFinancialEntries: FinancialEntry[];
}

export interface Role extends TenantEntity {
  name: string;
  description?: string;
  permissions: string[];
  employees: Employee[];
}

export interface Employee extends TenantEntity {
  userId: string;
  roleId: string;
  employeeNumber: string;
  department?: string;
  position?: string;
  salary?: number;
  hireDate: Date;
  isActive: boolean;
  user: User;
  role: Role;
}

export interface Product extends TenantEntity {
  name: string;
  description?: string;
  sku: string;
  category?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
  currentStock: number;
  isActive: boolean;
  variants: Variant[];
  quoteItems: QuoteItem[];
  orderItems: OrderItem[];
  stockMovements: StockMovement[];
}

export interface Variant extends TenantEntity {
  productId: string;
  name: string;
  sku: string;
  attributes: Record<string, string>;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  isActive: boolean;
  product: Product;
  quoteItems: QuoteItem[];
  orderItems: OrderItem[];
  stockMovements: StockMovement[];
}

export interface InputItem extends TenantEntity {
  name: string;
  description?: string;
  unit: string;
  costPrice: number;
  supplier?: string;
  minStock: number;
  currentStock: number;
  isActive: boolean;
  stockMovements: StockMovement[];
}

export interface Finish extends TenantEntity {
  name: string;
  description?: string;
  type: string;
  color?: string;
  texture?: string;
  additionalCost: number;
  isActive: boolean;
}

export interface Partner extends TenantEntity {
  name: string;
  type: PartnerType;
  document: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
  quotes: Quote[];
  orders: Order[];
  financialEntries: FinancialEntry[];
}

export interface Quote extends TenantEntity {
  partnerId: string;
  userId: string;
  number: string;
  status: QuoteStatus;
  description?: string;
  validUntil: Date;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string;
  partner: Partner;
  user: User;
  items: QuoteItem[];
  orders: Order[];
}

export interface QuoteItem extends TenantEntity {
  quoteId: string;
  productId?: string;
  variantId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  quote: Quote;
  product?: Product;
  variant?: Variant;
}

export interface Order extends TenantEntity {
  partnerId: string;
  userId: string;
  quoteId?: string;
  number: string;
  status: OrderStatus;
  description?: string;
  deliveryDate?: Date;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string;
  partner: Partner;
  user: User;
  quote?: Quote;
  items: OrderItem[];
  financialEntries: FinancialEntry[];
}

export interface OrderItem extends TenantEntity {
  orderId: string;
  productId?: string;
  variantId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  order: Order;
  product?: Product;
  variant?: Variant;
}

export interface StockMovement extends TenantEntity {
  productId?: string;
  variantId?: string;
  inputItemId?: string;
  userId: string;
  type: StockMovementType;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  reason: string;
  reference?: string;
  notes?: string;
  product?: Product;
  variant?: Variant;
  inputItem?: InputItem;
  user: User;
}

export interface FinancialEntry extends TenantEntity {
  type: FinancialEntryType;
  status: FinancialEntryStatus;
  category: string;
  description: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  partnerId?: string;
  orderId?: string;
  userId: string;
  reference?: string;
  notes?: string;
  partner?: Partner;
  order?: Order;
  user: User;
}

// Tipos para DTOs e responses
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface DashboardStats {
  totalQuotes: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
  overduePayments: number;
  recentQuotes: Quote[];
  recentOrders: Order[];
  topProducts: Array<{
    product: Product;
    totalSold: number;
    revenue: number;
  }>;
}

export interface StockAlert {
  id: string;
  type: 'product' | 'variant' | 'inputItem';
  name: string;
  sku?: string;
  currentStock: number;
  minStock: number;
  unit: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  pendingReceivables: number;
  pendingPayables: number;
  overdueReceivables: number;
  overduePayables: number;
}

// Tipos para relatórios
export interface SalesReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{
    product: Product;
    quantity: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    partner: Partner;
    orders: number;
    revenue: number;
  }>;
  salesByMonth: Array<{
    month: string;
    sales: number;
    orders: number;
  }>;
}

export interface StockReport {
  totalProducts: number;
  totalVariants: number;
  totalInputItems: number;
  lowStockItems: StockAlert[];
  stockValue: number;
  movementsSummary: {
    totalIn: number;
    totalOut: number;
    totalAdjustments: number;
  };
}

export interface FinancialReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: FinancialSummary;
  incomeByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  expenseByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthlyFlow: Array<{
    month: string;
    income: number;
    expense: number;
    profit: number;
  }>;
}

// Tipos para Socket.IO
export interface SocketEvents {
  // Eventos de autenticação
  'auth:login': (data: { userId: string; companyId: string }) => void;
  'auth:logout': () => void;

  // Eventos de orçamentos
  'quote:created': (quote: Quote) => void;
  'quote:updated': (quote: Quote) => void;
  'quote:status_changed': (data: { quoteId: string; status: QuoteStatus }) => void;

  // Eventos de ordens de serviço
  'order:created': (order: Order) => void;
  'order:updated': (order: Order) => void;
  'order:status_changed': (data: { orderId: string; status: OrderStatus }) => void;

  // Eventos de estoque
  'stock:movement': (movement: StockMovement) => void;
  'stock:low_alert': (alert: StockAlert) => void;

  // Eventos financeiros
  'financial:entry_created': (entry: FinancialEntry) => void;
  'financial:payment_received': (data: { entryId: string; amount: number }) => void;
  'financial:overdue_alert': (entries: FinancialEntry[]) => void;

  // Eventos de notificações
  'notification:new': (notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) => void;
}

// Tipos para configurações
export interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'production' | 'test';
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
  };
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
}

// Tipos para middlewares
export interface AuthenticatedRequest {
  user: User;
  company: Company;
}

export interface JWTPayload {
  userId: string;
  companyId: string;
  email: string;
  iat: number;
  exp: number;
}

// Tipos para filtros e ordenação
export interface QueryFilters {
  search?: string;
  status?: string;
  category?: string;
  partnerId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface QueryOptions {
  filters?: QueryFilters;
  sort?: SortOptions;
  pagination?: PaginationOptions;
  include?: string[];
}