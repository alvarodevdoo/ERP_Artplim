// Status de orçamentos
export const QUOTE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CONVERTED: 'converted',
} as const;

// Status de ordens de serviço
export const ORDER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  IN_PRODUCTION: 'in_production',
  FINISHED: 'finished',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

// Tipos de movimentação de estoque
export const STOCK_MOVEMENT_TYPE = {
  IN: 'in',
  OUT: 'out',
  ADJUSTMENT: 'adjustment',
  LOSS: 'loss',
  RESERVE: 'reserve',
} as const;

// Tipos de lançamentos financeiros
export const FINANCIAL_ENTRY_TYPE = {
  INCOME: 'income',
  EXPENSE: 'expense',
  PROVISION: 'provision',
} as const;

// Tipos de parceiros
export const PARTNER_TYPE = {
  CLIENT: 'client',
  SUPPLIER: 'supplier',
  SERVICE_PROVIDER: 'service_provider',
} as const;

// Tipos de registro de ponto
export const TIMECLOCK_TYPE = {
  IN: 'in',
  OUT: 'out',
  BREAK_START: 'break_start',
  BREAK_END: 'break_end',
} as const;

// Unidades de medida para insumos
export const UNITS = {
  KG: 'kg',
  SHEETS: 'folhas',
  LITERS: 'litros',
  METERS: 'metros',
  UNITS: 'unidades',
  BOXES: 'caixas',
} as const;

// Permissões do sistema
export const PERMISSIONS = {
  // Usuários
  USERS_CREATE: 'users:create',
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  
  // Funcionários
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_READ: 'employees:read',
  EMPLOYEES_UPDATE: 'employees:update',
  EMPLOYEES_DELETE: 'employees:delete',
  
  // Produtos
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_READ: 'products:read',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',
  
  // Insumos
  INPUTS_CREATE: 'inputs:create',
  INPUTS_READ: 'inputs:read',
  INPUTS_UPDATE: 'inputs:update',
  INPUTS_DELETE: 'inputs:delete',
  
  // Orçamentos
  QUOTES_CREATE: 'quotes:create',
  QUOTES_READ: 'quotes:read',
  QUOTES_UPDATE: 'quotes:update',
  QUOTES_DELETE: 'quotes:delete',
  QUOTES_APPROVE: 'quotes:approve',
  
  // Ordens de Serviço
  ORDERS_CREATE: 'orders:create',
  ORDERS_READ: 'orders:read',
  ORDERS_UPDATE: 'orders:update',
  ORDERS_DELETE: 'orders:delete',
  ORDERS_APPROVE: 'orders:approve',
  
  // Estoque
  STOCK_READ: 'stock:read',
  STOCK_ADJUST: 'stock:adjust',
  STOCK_MOVE: 'stock:move',
  
  // Financeiro
  FINANCE_READ: 'finance:read',
  FINANCE_CREATE: 'finance:create',
  FINANCE_UPDATE: 'finance:update',
  FINANCE_DELETE: 'finance:delete',
  
  // Relatórios
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',
  
  // Sistema
  SYSTEM_SETTINGS: 'system:settings',
  SYSTEM_BACKUP: 'system:backup',
  SYSTEM_LOGS: 'system:logs',
} as const;

// Roles padrão do sistema
export const DEFAULT_ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  OPERATOR: 'Operador',
  EMPLOYEE: 'Funcionário',
} as const;

// Configurações de paginação
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Configurações de arquivos
export const FILE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
} as const;

// Configurações de cache (em segundos)
export const CACHE_TTL = {
  SHORT: 300,    // 5 minutos
  MEDIUM: 1800,  // 30 minutos
  LONG: 3600,    // 1 hora
  VERY_LONG: 86400, // 24 horas
} as const;

// Eventos Socket.IO
export const SOCKET_EVENTS = {
  // Conexão
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Ordens de Serviço
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  
  // Estoque
  STOCK_LOW: 'stock:low',
  STOCK_MOVEMENT: 'stock:movement',
  
  // Notificações
  NOTIFICATION: 'notification',
  
  // Sistema
  SYSTEM_ALERT: 'system:alert',
} as const;

export type QuoteStatus = typeof QUOTE_STATUS[keyof typeof QUOTE_STATUS];
export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
export type StockMovementType = typeof STOCK_MOVEMENT_TYPE[keyof typeof STOCK_MOVEMENT_TYPE];
export type FinancialEntryType = typeof FINANCIAL_ENTRY_TYPE[keyof typeof FINANCIAL_ENTRY_TYPE];
export type PartnerType = typeof PARTNER_TYPE[keyof typeof PARTNER_TYPE];
export type TimeclockType = typeof TIMECLOCK_TYPE[keyof typeof TIMECLOCK_TYPE];
export type Unit = typeof UNITS[keyof typeof UNITS];
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type DefaultRole = typeof DEFAULT_ROLES[keyof typeof DEFAULT_ROLES];
export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];