import { z } from 'zod';
import { validateCPF } from '../../../shared/utils/validators';

// ========== EMPLOYEE DTOs ==========

/**
 * DTO para criação de funcionário
 */
export const createEmployeeDto = z.object({
  userId: z.string()
    .uuid('ID do usuário deve ser um UUID válido'),
  
  companyId: z.string()
    .uuid('ID da empresa deve ser um UUID válido'),
  
  roleId: z.string()
    .uuid('ID do cargo deve ser um UUID válido'),
  
  department: z.string().optional(),
  position: z.string().optional(),
  salary: z.number().positive().optional(),
  hireDate: z.string().datetime().optional(),
  
  isActive: z.boolean().default(true)
});

/**
 * DTO para atualização de funcionário
 */
export const updateEmployeeDto = createEmployeeDto.partial().omit({ companyId: true });

/**
 * DTO para filtros de funcionários
 */
export const employeeFiltersDto = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  position: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
  hireDateFrom: z.string().datetime().optional(),
  hireDateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'hireDate', 'department', 'position']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  companyId: z.string().uuid()
});

/**
 * DTO para resposta de funcionário
 */
export const employeeResponseDto = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid(),
  roleId: z.string().uuid(),
  employeeNumber: z.string(),
  department: z.string().nullable(),
  position: z.string().nullable(),
  salary: z.number().nullable(),
  hireDate: z.string().datetime(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string()
  }).optional(),
  company: z.object({
    id: z.string().uuid(),
    name: z.string(),
    tradeName: z.string().nullable()
  }).optional(),
  role: z.object({
    id: z.string().uuid(),
    name: z.string()
  }).optional()
});

/**
 * DTO para lista de funcionários
 */
export const employeeListResponseDto = z.object({
  data: z.array(employeeResponseDto),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number()
});

/**
 * DTO para estatísticas de funcionários
 */
export const employeeStatsDto = z.object({
  total: z.number(),
  active: z.number(),
  inactive: z.number(),
  onVacation: z.number().default(0),
  onLeave: z.number().default(0),
  byDepartment: z.record(z.string(), z.number()).default({}),
  byPosition: z.record(z.string(), z.number()).default({}),
  byEmploymentType: z.record(z.string(), z.number()).default({}),
  averageSalary: z.number().default(0),
  totalPayroll: z.number().default(0),
  recentHires: z.array(employeeResponseDto),
  upcomingBirthdays: z.array(employeeResponseDto)
});

// ========== TIME ENTRY DTOs ==========

/**
 * DTO para criação de registro de ponto
 */
export const createTimeEntryDto = z.object({
  employeeId: z.string().uuid('ID do funcionário deve ser um UUID válido'),
  date: z.string().datetime('Data deve ser uma data válida'),
  clockIn: z.string().datetime('Hora de entrada deve ser uma data válida'),
  clockOut: z.string().datetime('Hora de saída deve ser uma data válida').optional(),
  breakStart: z.string().datetime('Início do intervalo deve ser uma data válida').optional(),
  breakEnd: z.string().datetime('Fim do intervalo deve ser uma data válida').optional(),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional(),
  type: z.enum(['REGULAR', 'OVERTIME', 'HOLIDAY', 'SICK_LEAVE', 'VACATION'], {
    errorMap: () => ({ message: 'Tipo deve ser REGULAR, OVERTIME, HOLIDAY, SICK_LEAVE ou VACATION' })
  }).default('REGULAR'),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status deve ser PENDING, APPROVED ou REJECTED' })
  }).default('PENDING')
});

/**
 * DTO para atualização de registro de ponto
 */
export const updateTimeEntryDto = createTimeEntryDto.partial().omit({ employeeId: true });

/**
 * DTO para filtros de registros de ponto
 */
export const timeEntryFiltersDto = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  employeeId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  type: z.enum(['REGULAR', 'OVERTIME', 'HOLIDAY', 'SICK_LEAVE', 'VACATION']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  sortBy: z.enum(['date', 'clockIn', 'clockOut', 'createdAt', 'updatedAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

/**
 * DTO para resposta de registro de ponto
 */
export const timeEntryResponseDto = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  date: z.string().datetime(),
  clockIn: z.string().datetime(),
  clockOut: z.string().datetime().nullable(),
  breakStart: z.string().datetime().nullable(),
  breakEnd: z.string().datetime().nullable(),
  totalHours: z.number().nullable(),
  regularHours: z.number().nullable(),
  overtimeHours: z.number().nullable(),
  breakHours: z.number().nullable(),
  notes: z.string().nullable(),
  type: z.enum(['REGULAR', 'OVERTIME', 'HOLIDAY', 'SICK_LEAVE', 'VACATION']),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  employee: z.object({
    id: z.string().uuid(),
    user: z.object({
      name: z.string()
    }).optional()
  }).optional()
});

/**
 * DTO para lista de registros de ponto
 */
export const timeEntryListResponseDto = z.object({
  data: z.array(timeEntryResponseDto),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number()
});

// ========== PAYROLL DTOs ==========

/**
 * DTO para criação de folha de pagamento
 */
export const createPayrollDto = z.object({
  employeeId: z.string().uuid('ID do funcionário deve ser um UUID válido'),
  referenceMonth: z.number().int().min(1).max(12),
  referenceYear: z.number().int().min(2020).max(2050),
  baseSalary: z.number().positive('Salário base deve ser positivo'),
  grossSalary: z.number().positive('Salário bruto deve ser positivo'),
  netSalary: z.number().positive('Salário líquido deve ser positivo'),
  workedHours: z.number().min(0, 'Horas trabalhadas deve ser maior ou igual a 0'),
  overtimeHours: z.number().min(0, 'Horas extras deve ser maior ou igual a 0').default(0),
  bonuses: z.number().min(0, 'Bônus deve ser maior ou igual a 0').default(0),
  deductions: z.number().min(0, 'Descontos deve ser maior ou igual a 0').default(0),
  inss: z.number().min(0, 'INSS deve ser maior ou igual a 0').default(0),
  irrf: z.number().min(0, 'IRRF deve ser maior ou igual a 0').default(0),
  fgts: z.number().min(0, 'FGTS deve ser maior ou igual a 0').default(0),
  vacationDays: z.number().int().min(0).max(30).default(0),
  sickDays: z.number().int().min(0).max(30).default(0),
  status: z.enum(['DRAFT', 'CALCULATED', 'APPROVED', 'PAID'], {
    errorMap: () => ({ message: 'Status deve ser DRAFT, CALCULATED, APPROVED ou PAID' })
  }).default('DRAFT'),
  paymentDate: z.string().datetime().optional(),
  notes: z.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional()
});

/**
 * DTO para atualização de folha de pagamento
 */
export const updatePayrollDto = createPayrollDto.partial().omit({ employeeId: true });

/**
 * DTO para filtros de folha de pagamento
 */
export const payrollFiltersDto = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  employeeId: z.string().uuid().optional(),
  referenceMonth: z.number().int().min(1).max(12).optional(),
  referenceYear: z.number().int().min(2020).max(2050).optional(),
  status: z.enum(['DRAFT', 'CALCULATED', 'APPROVED', 'PAID']).optional(),
  paymentDateFrom: z.string().datetime().optional(),
  paymentDateTo: z.string().datetime().optional(),
  sortBy: z.enum(['referenceMonth', 'referenceYear', 'grossSalary', 'netSalary', 'paymentDate', 'createdAt', 'updatedAt']).default('referenceYear'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

/**
 * DTO para resposta de folha de pagamento
 */
export const payrollResponseDto = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  referenceMonth: z.number(),
  referenceYear: z.number(),
  baseSalary: z.number(),
  grossSalary: z.number(),
  netSalary: z.number(),
  workedHours: z.number(),
  overtimeHours: z.number(),
  bonuses: z.number(),
  deductions: z.number(),
  inss: z.number(),
  irrf: z.number(),
  fgts: z.number(),
  vacationDays: z.number(),
  sickDays: z.number(),
  status: z.enum(['DRAFT', 'CALCULATED', 'APPROVED', 'PAID']),
  paymentDate: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  employee: z.object({
    id: z.string().uuid(),
    user: z.object({
      name: z.string()
    }).optional()
  }).optional()
});

/**
 * DTO para lista de folhas de pagamento
 */
export const payrollListResponseDto = z.object({
  data: z.array(payrollResponseDto),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number()
});

// ========== TIPOS TYPESCRIPT ==========

export type CreateEmployeeDto = z.infer<typeof createEmployeeDto>;
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeDto>;
export type EmployeeFiltersDto = z.infer<typeof employeeFiltersDto>;
export type EmployeeResponseDto = z.infer<typeof employeeResponseDto>;
export type EmployeeListResponseDto = z.infer<typeof employeeListResponseDto>;
export type EmployeeStatsDto = z.infer<typeof employeeStatsDto>;

export type CreateTimeEntryDto = z.infer<typeof createTimeEntryDto>;
export type UpdateTimeEntryDto = z.infer<typeof updateTimeEntryDto>;
export type TimeEntryFiltersDto = z.infer<typeof timeEntryFiltersDto>;
export type TimeEntryResponseDto = z.infer<typeof timeEntryResponseDto>;
export type TimeEntryListResponseDto = z.infer<typeof timeEntryListResponseDto>;

export type CreatePayrollDto = z.infer<typeof createPayrollDto>;
export type UpdatePayrollDto = z.infer<typeof updatePayrollDto>;
export type PayrollFiltersDto = z.infer<typeof payrollFiltersDto>;
export type PayrollResponseDto = z.infer<typeof payrollResponseDto>;
export type PayrollListResponseDto = z.infer<typeof payrollListResponseDto>;