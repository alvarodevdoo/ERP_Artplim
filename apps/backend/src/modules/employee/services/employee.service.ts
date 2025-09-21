import {
  EmployeeRepository
} from '../repositories';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeFiltersDto,
  EmployeeResponseDto,
  EmployeeListResponseDto,
  EmployeeStatsDto
} from '../dtos';
import { AppError } from '../../../shared/errors/AppError';
import { validateCPF } from '../../../shared/utils/validators';
import { RoleService } from '../../role/services';

/**
 * Service para gerenciamento de funcionários
 * Implementa regras de negócio e validações específicas
 */
export class EmployeeService {
  private employeeRepository: EmployeeRepository;
  private roleService: RoleService;

  constructor(
    roleService?: RoleService
  ) {
    this.employeeRepository = new EmployeeRepository();
    this.roleService = roleService || new RoleService();
  }

  /**
   * Cria um novo funcionário
   * @param data Dados do funcionário
   * @param companyId ID da empresa
   * @param userId ID do usuário que está criando
   * @returns Funcionário criado
   */
  async create(
    data: CreateEmployeeDto,
    companyId: string,
    userId: string
  ): Promise<EmployeeResponseDto> {
    // Validar permissão
    await this.validatePermission(userId, 'employee', 'create');

    // Validar CPF
    if (!validateCPF(data.cpf)) {
      throw new AppError('CPF inválido', 400);
    }

    // Verificar se CPF já existe na empresa
    const existingCpf = await this.employeeRepository.cpfExists(
      data.cpf,
      companyId
    );
    if (existingCpf) {
      throw new AppError('CPF já cadastrado na empresa', 409);
    }

    // Verificar se email já existe na empresa (se fornecido)
    if (data.email) {
      const existingEmail = await this.employeeRepository.emailExists(
        data.email,
        companyId
      );
      if (existingEmail) {
        throw new AppError('Email já cadastrado na empresa', 409);
      }
    }

    // Validar data de nascimento (deve ser maior de 16 anos)
    const birthDate = new Date(data.birthDate);
    const minAge = new Date();
    minAge.setFullYear(minAge.getFullYear() - 16);
    
    if (birthDate > minAge) {
      throw new AppError('Funcionário deve ter pelo menos 16 anos', 400);
    }

    // Validar data de admissão (não pode ser futura)
    const hireDate = new Date(data.hireDate);
    if (hireDate > new Date()) {
      throw new AppError('Data de admissão não pode ser futura', 400);
    }

    // Validar salário
    if (data.salary <= 0) {
      throw new AppError('Salário deve ser maior que zero', 400);
    }

    try {
      const employee = await this.employeeRepository.create({
        ...data,
        companyId
      });

      return this.formatEmployeeResponse(employee);
    } catch (error) {
      throw new AppError('Erro ao criar funcionário', 500);
    }
  }

  /**
   * Busca funcionário por ID
   * @param id ID do funcionário
   * @param companyId ID da empresa
   * @param userId ID do usuário que está buscando
   * @returns Funcionário encontrado
   */
  async findById(
    id: string,
    companyId: string,
    userId: string
  ): Promise<EmployeeResponseDto> {
    // Validar permissão
    await this.validatePermission(userId, 'employee', 'read');

    const employee = await this.employeeRepository.findById(id, companyId);
    if (!employee) {
      throw new AppError('Funcionário não encontrado', 404);
    }

    return this.formatEmployeeResponse(employee);
  }

  /**
   * Lista funcionários com filtros e paginação
   * @param filters Filtros de busca
   * @param companyId ID da empresa
   * @param userId ID do usuário que está buscando
   * @returns Lista paginada de funcionários
   */
  async findMany(
    filters: EmployeeFiltersDto,
    companyId: string,
    userId: string
  ): Promise<EmployeeListResponseDto> {
    // Validar permissão
    await this.validatePermission(userId, 'employee', 'read');

    const result = await this.employeeRepository.findMany(filters, companyId);

    return {
      data: result.data.map(employee => this.formatEmployeeResponse(employee)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    };
  }

  /**
   * Atualiza funcionário
   * @param id ID do funcionário
   * @param data Dados para atualização
   * @param companyId ID da empresa
   * @param userId ID do usuário que está atualizando
   * @returns Funcionário atualizado
   */
  async update(
    id: string,
    data: UpdateEmployeeDto,
    companyId: string,
    userId: string
  ): Promise<EmployeeResponseDto> {
    // Validar permissão
    await this.validatePermission(userId, 'employee', 'update');

    // Verificar se funcionário existe
    const existingEmployee = await this.employeeRepository.findById(id, companyId);
    if (!existingEmployee) {
      throw new AppError('Funcionário não encontrado', 404);
    }

    // Validar CPF se fornecido
    if (data.cpf && !validateCPF(data.cpf)) {
      throw new AppError('CPF inválido', 400);
    }

    // Verificar se CPF já existe (excluindo o funcionário atual)
    if (data.cpf && data.cpf !== existingEmployee.cpf) {
      const existingCpf = await this.employeeRepository.cpfExists(
        data.cpf,
        companyId,
        id
      );
      if (existingCpf) {
        throw new AppError('CPF já cadastrado na empresa', 409);
      }
    }

    // Verificar se email já existe (excluindo o funcionário atual)
    if (data.email && data.email !== existingEmployee.email) {
      const existingEmail = await this.employeeRepository.emailExists(
        data.email,
        companyId,
        id
      );
      if (existingEmail) {
        throw new AppError('Email já cadastrado na empresa', 409);
      }
    }

    // Validar data de nascimento se fornecida
    if (data.birthDate) {
      const birthDate = new Date(data.birthDate);
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 16);
      
      if (birthDate > minAge) {
        throw new AppError('Funcionário deve ter pelo menos 16 anos', 400);
      }
    }

    // Validar salário se fornecido
    if (data.salary !== undefined && data.salary <= 0) {
      throw new AppError('Salário deve ser maior que zero', 400);
    }

    try {
      const employee = await this.employeeRepository.update(id, data, companyId);
      return this.formatEmployeeResponse(employee);
    } catch (error) {
      throw new AppError('Erro ao atualizar funcionário', 500);
    }
  }

  /**
   * Deleta funcionário (soft delete)
   * @param id ID do funcionário
   * @param companyId ID da empresa
   * @param userId ID do usuário que está deletando
   */
  async delete(id: string, companyId: string, userId: string): Promise<void> {
    // Validar permissão
    await this.validatePermission(userId, 'employee', 'delete');

    // Verificar se funcionário existe
    const employee = await this.employeeRepository.findById(id, companyId);
    if (!employee) {
      throw new AppError('Funcionário não encontrado', 404);
    }

    // Verificar se funcionário pode ser deletado
    const canDelete = await this.canDeleteEmployee(id, companyId);
    if (!canDelete.canDelete) {
      throw new AppError(canDelete.reason!, 400);
    }

    try {
      await this.employeeRepository.delete(id, companyId);
    } catch (error) {
      throw new AppError('Erro ao deletar funcionário', 500);
    }
  }

  /**
   * Restaura funcionário deletado
   * @param id ID do funcionário
   * @param companyId ID da empresa
   * @param userId ID do usuário que está restaurando
   * @returns Funcionário restaurado
   */
  async restore(
    id: string,
    companyId: string,
    userId: string
  ): Promise<EmployeeResponseDto> {
    // Validar permissão
    await this.validatePermission(userId, 'employee', 'update');

    try {
      const employee = await this.employeeRepository.restore(id, companyId);
      if (!employee) {
        throw new AppError('Funcionário não encontrado', 404);
      }

      return this.formatEmployeeResponse(employee);
    } catch (error) {
      throw new AppError('Erro ao restaurar funcionário', 500);
    }
  }

  /**
   * Busca funcionários por departamento
   * @param department Departamento
   * @param companyId ID da empresa
   * @param userId ID do usuário
   * @returns Lista de funcionários
   */
  async findByDepartment(
    department: string,
    companyId: string,
    userId: string
  ): Promise<EmployeeResponseDto[]> {
    // Validar permissão
    await this.validatePermission(userId, 'employee', 'read');

    const employees = await this.employeeRepository.findByDepartment(
      department,
      companyId
    );

    return employees.map(employee => this.formatEmployeeResponse(employee));
  }

  /**
   * Busca funcionários por cargo
   * @param position Cargo
   * @param companyId ID da empresa
   * @param userId ID do usuário
   * @returns Lista de funcionários
   */
  async findByPosition(
    position: string,
    companyId: string,
    userId: string
  ): Promise<EmployeeResponseDto[]> {
    // Validar permissão
    await this.validatePermission(userId, 'employee', 'read');

    const employees = await this.employeeRepository.findByPosition(
      position,
      companyId
    );

    return employees.map(employee => this.formatEmployeeResponse(employee));
  }

  /**
   * Busca aniversariantes do mês
   * @param month Mês (1-12)
   * @param companyId ID da empresa
   * @param userId ID do usuário
   * @returns Lista de aniversariantes
   */
  async findBirthdaysInMonth(
    month: number,
    companyId: string,
    userId: string
  ): Promise<EmployeeResponseDto[]> {
    // Validar permissão
    await this.validatePermission(userId, 'employee', 'read');

    if (month < 1 || month > 12) {
      throw new AppError('Mês deve estar entre 1 e 12', 400);
    }

    const employees = await this.employeeRepository.findBirthdaysInMonth(
      month,
      companyId
    );

    return employees.map(employee => this.formatEmployeeResponse(employee));
  }

  /**
   * Busca contratações recentes
   * @param days Número de dias
   * @param companyId ID da empresa
   * @param userId ID do usuário
   * @returns Lista de contratações recentes
   */
  async findRecentHires(
    days: number,
    companyId: string,
    userId: string
  ): Promise<EmployeeResponseDto[]> {
    // Validar permissão
    await this.validatePermission(userId, 'employee', 'read');

    if (days <= 0) {
      throw new AppError('Número de dias deve ser maior que zero', 400);
    }

    const employees = await this.employeeRepository.findRecentHires(
      days,
      companyId
    );

    return employees.map(employee => this.formatEmployeeResponse(employee));
  }

  /**
   * Obtém estatísticas dos funcionários
   * @param companyId ID da empresa
   * @param userId ID do usuário
   * @returns Estatísticas
   */
  async getStats(
    companyId: string,
    userId: string
  ): Promise<EmployeeStatsDto> {
    // Validar permissão
    await this.validatePermission(userId, 'employee', 'read');

    const stats = await this.employeeRepository.getStats(companyId);
    return stats;
  }

  /**
   * Busca funcionários para relatório
   * @param companyId ID da empresa
   * @param userId ID do usuário
   * @param filters Filtros opcionais
   * @returns Lista de funcionários para relatório
   */
  async findForReport(
    companyId: string,
    userId: string,
    filters?: {
      department?: string;
      position?: string;
      status?: string;
      hiredAfter?: string;
      hiredBefore?: string;
    }
  ) {
    // Validar permissão
    await this.validatePermission(userId, 'employee', 'read');

    return this.employeeRepository.findForReport(companyId, filters);
  }

  /**
   * Calcula tempo de empresa
   * @param hireDate Data de admissão
   * @returns Tempo de empresa em anos, meses e dias
   */
  calculateCompanyTime(hireDate: string) {
    const hire = new Date(hireDate);
    const now = new Date();
    
    let years = now.getFullYear() - hire.getFullYear();
    let months = now.getMonth() - hire.getMonth();
    let days = now.getDate() - hire.getDate();

    if (days < 0) {
      months--;
      const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += lastMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months, days };
  }

  /**
   * Calcula idade do funcionário
   * @param birthDate Data de nascimento
   * @returns Idade em anos
   */
  calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const now = new Date();
    
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Verifica se funcionário pode ser deletado
   * @param employeeId ID do funcionário
   * @param companyId ID da empresa
   * @returns Resultado da verificação
   */
  private async canDeleteEmployee(
    employeeId: string,
    companyId: string
  ): Promise<{ canDelete: boolean; reason?: string }> {
    // Por enquanto, permite deletar funcionários
    // TODO: Implementar verificações quando os módulos de ponto e folha forem criados
    return { canDelete: true };
  }

  /**
   * Valida permissão do usuário
   * @param userId ID do usuário
   * @param resource Recurso
   * @param action Ação
   */
  private async validatePermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<void> {
    const hasPermission = await this.roleService.checkPermission(
      userId,
      resource,
      action
    );

    if (!hasPermission) {
      throw new AppError('Acesso negado', 403);
    }
  }

  /**
   * Formata resposta do funcionário
   * @param employee Dados do funcionário
   * @returns Funcionário formatado
   */
  private formatEmployeeResponse(employee: any): EmployeeResponseDto {
    return {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      cpf: employee.cpf,
      rg: employee.rg,
      birthDate: employee.birthDate.toISOString().split('T')[0],
      phone: employee.phone,
      address: employee.address,
      city: employee.city,
      state: employee.state,
      zipCode: employee.zipCode,
      position: employee.position,
      department: employee.department,
      salary: employee.salary,
      hireDate: employee.hireDate.toISOString().split('T')[0],
      terminationDate: employee.terminationDate
        ? employee.terminationDate.toISOString().split('T')[0]
        : null,
      status: employee.status,
      bankAccount: employee.bankAccount,
      emergencyContact: employee.emergencyContact,
      notes: employee.notes,
      userId: employee.userId,
      companyId: employee.companyId,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
      deletedAt: employee.deletedAt?.toISOString() || null,
      // Campos calculados
      age: this.calculateAge(employee.birthDate.toISOString()),
      companyTime: this.calculateCompanyTime(employee.hireDate.toISOString())
    };
  }
}