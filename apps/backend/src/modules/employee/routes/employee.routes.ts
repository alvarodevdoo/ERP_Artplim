import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EmployeeService } from '../services';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeFiltersDto,
  createEmployeeDto,
  updateEmployeeDto,
  employeeFiltersDto
} from '../dtos';
import { authMiddleware } from '../../../shared/middlewares/auth';
import { tenantMiddleware } from '../../../shared/middlewares/tenant';
import { createValidation } from '../../../shared/middlewares/validation';
import { AppError } from '../../../shared/errors/AppError';

/**
 * Rotas para gerenciamento de funcionários
 * Implementa endpoints CRUD e funcionalidades específicas
 */
export async function employeeRoutes(fastify: FastifyInstance) {
  const employeeService = new EmployeeService();

  // Registrar middlewares globais
  await fastify.register(authMiddleware);
  await fastify.register(tenantMiddleware);

  /**
   * Criar funcionário
   * POST /employees
   */
  fastify.post<{
    Body: CreateEmployeeDto;
  }>('/employees', {
    preHandler: [createValidation({ body: createEmployeeDto })],
    handler: async (request: FastifyRequest<{ Body: CreateEmployeeDto }>, reply: FastifyReply) => {
      try {
        const { companyId, id: userId } = request.user!;
        const employee = await employeeService.create(
          request.body,
          companyId,
          userId
        );
        
        reply.code(201).send({
          success: true,
          data: employee,
          message: 'Funcionário criado com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Erro interno do servidor'
          });
        }
      }
    }
  });

  /**
   * Listar funcionários
   * GET /employees
   */
  fastify.get<{
    Querystring: EmployeeFiltersDto;
  }>('/employees', {
    preHandler: [createValidation({ querystring: employeeFiltersDto })],
    handler: async (request: FastifyRequest<{ Querystring: EmployeeFiltersDto }>, reply: FastifyReply) => {
      try {
        const { companyId, id: userId } = request.user!;
        const employees = await employeeService.findMany(
          request.query,
          companyId,
          userId
        );
        
        reply.send({
          success: true,
          data: employees
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Erro interno do servidor'
          });
        }
      }
    }
  });

  /**
   * Buscar funcionário por ID
   * GET /employees/:id
   */
  fastify.get<{
    Params: { id: string };
  }>('/employees/:id', {
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, id: userId } = request.user!;
        const employee = await employeeService.findById(
          request.params.id,
          companyId,
          userId
        );
        
        reply.send({
          success: true,
          data: employee
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Erro interno do servidor'
          });
        }
      }
    }
  });

  /**
   * Atualizar funcionário
   * PUT /employees/:id
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateEmployeeDto;
  }>('/employees/:id', {
    preHandler: [createValidation({ body: updateEmployeeDto })],
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateEmployeeDto }>, reply: FastifyReply) => {
      try {
        const { companyId, id: userId } = request.user!;
        const employee = await employeeService.update(
          request.params.id,
          request.body,
          companyId,
          userId
        );
        
        reply.send({
          success: true,
          data: employee,
          message: 'Funcionário atualizado com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Erro interno do servidor'
          });
        }
      }
    }
  });

  /**
   * Deletar funcionário (soft delete)
   * DELETE /employees/:id
   */
  fastify.delete<{
    Params: { id: string };
  }>('/employees/:id', {
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, id: userId } = request.user!;
        await employeeService.delete(
          request.params.id,
          companyId,
          userId
        );
        
        reply.send({
          success: true,
          message: 'Funcionário removido com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Erro interno do servidor'
          });
        }
      }
    }
  });

  /**
   * Restaurar funcionário
   * POST /employees/:id/restore
   */
  fastify.post<{
    Params: { id: string };
  }>('/employees/:id/restore', {
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, id: userId } = request.user!;
        const employee = await employeeService.restore(
          request.params.id,
          companyId,
          userId
        );
        
        reply.send({
          success: true,
          data: employee,
          message: 'Funcionário restaurado com sucesso'
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Erro interno do servidor'
          });
        }
      }
    }
  });

  /**
   * Buscar funcionários por departamento
   * GET /employees/department/:department
   */
  fastify.get<{
    Params: { department: string };
    Querystring: { page?: number; limit?: number };
  }>('/employees/department/:department', {
    handler: async (request: FastifyRequest<{ 
      Params: { department: string };
      Querystring: { page?: number; limit?: number };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, id: userId } = request.user!;
        const { page = 1, limit = 20 } = request.query;
        
        const employees = await employeeService.findByDepartment(
          request.params.department,
          { page, limit },
          companyId,
          userId
        );
        
        reply.send({
          success: true,
          data: employees
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Erro interno do servidor'
          });
        }
      }
    }
  });

  /**
   * Buscar funcionários por cargo
   * GET /employees/position/:position
   */
  fastify.get<{
    Params: { position: string };
    Querystring: { page?: number; limit?: number };
  }>('/employees/position/:position', {
    handler: async (request: FastifyRequest<{ 
      Params: { position: string };
      Querystring: { page?: number; limit?: number };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, id: userId } = request.user!;
        const { page = 1, limit = 20 } = request.query;
        
        const employees = await employeeService.findByPosition(
          request.params.position,
          { page, limit },
          companyId,
          userId
        );
        
        reply.send({
          success: true,
          data: employees
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Erro interno do servidor'
          });
        }
      }
    }
  });

  /**
   * Buscar aniversariantes do mês
   * GET /employees/birthdays/:month
   */
  fastify.get<{
    Params: { month: string };
  }>('/employees/birthdays/:month', {
    handler: async (request: FastifyRequest<{ Params: { month: string } }>, reply: FastifyReply) => {
      try {
        const { companyId, id: userId } = request.user!;
        const month = parseInt(request.params.month);
        
        if (month < 1 || month > 12) {
          reply.code(400).send({
            success: false,
            message: 'Mês deve estar entre 1 e 12'
          });
          return;
        }
        
        const employees = await employeeService.findBirthdaysInMonth(
          month,
          companyId,
          userId
        );
        
        reply.send({
          success: true,
          data: employees
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Erro interno do servidor'
          });
        }
      }
    }
  });

  /**
   * Buscar contratações recentes
   * GET /employees/recent-hires
   */
  fastify.get<{
    Querystring: { days?: number; limit?: number };
  }>('/employees/recent-hires', {
    handler: async (request: FastifyRequest<{ 
      Querystring: { days?: number; limit?: number };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, id: userId } = request.user!;
        const { days = 30, limit = 10 } = request.query;
        
        const employees = await employeeService.findRecentHires(
          days,
          limit,
          companyId,
          userId
        );
        
        reply.send({
          success: true,
          data: employees
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Erro interno do servidor'
          });
        }
      }
    }
  });

  /**
   * Obter estatísticas de funcionários
   * GET /employees/stats
   */
  fastify.get('/employees/stats', {
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { companyId, id: userId } = request.user!;
        const stats = await employeeService.getStats(companyId, userId);
        
        reply.send({
          success: true,
          data: stats
        });
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Erro interno do servidor'
          });
        }
      }
    }
  });

  /**
   * Gerar relatório de funcionários
   * GET /employees/report
   */
  fastify.get<{
    Querystring: {
      department?: string;
      position?: string;
      status?: string;
      hiredAfter?: string;
      hiredBefore?: string;
      format?: 'json' | 'csv';
    };
  }>('/employees/report', {
    handler: async (request: FastifyRequest<{ 
      Querystring: {
        department?: string;
        position?: string;
        status?: string;
        hiredAfter?: string;
        hiredBefore?: string;
        format?: 'json' | 'csv';
      };
    }>, reply: FastifyReply) => {
      try {
        const { companyId, id: userId } = request.user!;
        const { format = 'json', ...filters } = request.query;
        
        const report = await employeeService.findForReport(
          filters,
          companyId,
          userId
        );
        
        if (format === 'csv') {
          // Converter para CSV
          const csvHeader = 'Nome,CPF,Email,Cargo,Departamento,Salário,Status,Data Admissão\n';
          const csvData = report.map(emp => 
            `${emp.name},${emp.cpf},${emp.email},${emp.position},${emp.department},${emp.salary},${emp.status},${emp.hiredAt}`
          ).join('\n');
          
          reply
            .header('Content-Type', 'text/csv')
            .header('Content-Disposition', 'attachment; filename="funcionarios.csv"')
            .send(csvHeader + csvData);
        } else {
          reply.send({
            success: true,
            data: report
          });
        }
      } catch (error) {
        if (error instanceof AppError) {
          reply.code(error.statusCode).send({
            success: false,
            message: error.message
          });
        } else {
          reply.code(500).send({
            success: false,
            message: 'Erro interno do servidor'
          });
        }
      }
    }
  });

  /**
   * Verificar disponibilidade de email
   * GET /employees/check-email/:email
   */
  fastify.get<{
    Params: { email: string };
  }>('/employees/check-email/:email', {
    handler: async (request: FastifyRequest<{ Params: { email: string } }>, reply: FastifyReply) => {
      try {
        const { companyId } = request.user!;
        const exists = await employeeService.emailExists(
          request.params.email,
          companyId
        );
        
        reply.send({
          success: true,
          data: { available: !exists }
        });
      } catch {
        reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });

  /**
   * Verificar disponibilidade de CPF
   * GET /employees/check-cpf/:cpf
   */
  fastify.get<{
    Params: { cpf: string };
  }>('/employees/check-cpf/:cpf', {
    handler: async (request: FastifyRequest<{ Params: { cpf: string } }>, reply: FastifyReply) => {
      try {
        const { companyId } = request.user!;
        const exists = await employeeService.cpfExists(
          request.params.cpf,
          companyId
        );
        
        reply.send({
          success: true,
          data: { available: !exists }
        });
      } catch {
        reply.code(500).send({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    }
  });
}