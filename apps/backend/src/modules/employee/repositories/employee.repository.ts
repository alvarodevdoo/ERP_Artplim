import { PrismaClient, Employee, Prisma } from '@prisma/client';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeFiltersDto,
  EmployeeStatsDto
} from '../dtos';
import { prisma } from '../../../database/connection';

/**
 * Repositório para operações de funcionários
 * Implementa padrão Repository para isolamento da camada de dados
 */
export class EmployeeRepository {
  constructor() {}

  /**
   * Cria um novo funcionário
   * @param data Dados do funcionário
   * @returns Funcionário criado
   */
  async create(data: CreateEmployeeDto) {
    return prisma.employee.create({
      data: {
        userId: data.userId,
        roleId: data.roleId, // Usar o roleId fornecido no DTO
        employeeNumber: `EMP${Date.now()}`, // Gerar número único
        department: data.department || null,
        position: data.position || null,
        salary: data.salary || null,
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
        isActive: data.isActive ?? true,
        companyId: data.companyId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        },
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Busca funcionário por ID
   * @param id ID do funcionário
   * @param companyId ID da empresa (para isolamento multi-tenant)
   * @returns Funcionário encontrado ou null
   */
  async findById(id: string, companyId: string) {
    return prisma.employee.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        },
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Busca funcionários com filtros e paginação
   * @param filters Filtros de busca
   * @returns Lista paginada de funcionários
   */
  async findMany(filters: EmployeeFiltersDto) {
    const {
      page,
      limit,
      position,
      department,
      isActive,
      hireDateFrom,
      hireDateTo,
      sortBy,
      sortOrder,
      companyId
    } = filters;

    const skip = (page - 1) * limit;

    // Construir condições de filtro
    const where: Prisma.EmployeeWhereInput = {
      companyId,
      ...(position && {
        position: {
          contains: position,
          mode: 'insensitive'
        }
      }),
      ...(department && {
        department: {
          contains: department,
          mode: 'insensitive'
        }
      }),
      ...(isActive !== undefined && { isActive }),
      ...(hireDateFrom || hireDateTo) && {
        hireDate: {
          ...(hireDateFrom && { gte: new Date(hireDateFrom) }),
          ...(hireDateTo && { lte: new Date(hireDateTo) })
        }
      }
    };
    where.isActive = true;

    // Executar consultas em paralelo
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          company: {
            select: {
              id: true,
              name: true
            }
          },
          role: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.employee.count({ where })
    ]);

    return {
      data: employees,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };
  }

  /**
   * Atualiza funcionário
   * @param id ID do funcionário
   * @param data Dados para atualização
   * @param companyId ID da empresa (para isolamento multi-tenant)
   * @returns Funcionário atualizado
   */
  async update(id: string, data: UpdateEmployeeDto, companyId: string) {
    return prisma.employee.update({
      where: {
        id,
        companyId
      },
      data: {
        ...(data.userId !== undefined && { userId: data.userId }),
        ...(data.position && { position: data.position }),
        ...(data.department && { department: data.department }),
        ...(data.salary !== undefined && { salary: data.salary }),
        ...(data.hireDate && { hireDate: new Date(data.hireDate) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        },
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Soft delete de funcionário
   * @param id ID do funcionário
   * @param companyId ID da empresa (para isolamento multi-tenant)
   * @returns Funcionário deletado
   */
  async delete(id: string, companyId: string) {
    return prisma.employee.update({
      where: {
        id,
        companyId
      },
      data: {
        isActive: false
      }
    });
  }

  /**
   * Restaura funcionário deletado
   * @param id ID do funcionário
   * @param companyId ID da empresa (para isolamento multi-tenant)
   * @returns Funcionário restaurado
   */
  async restore(id: string, companyId: string) {
    return prisma.employee.update({
      where: {
        id,
        companyId
      },
      data: {
        isActive: true
      }
    });
  }

  /**
   * Verifica se funcionário já existe por userId
   * @param userId ID do usuário para verificar
   * @param companyId ID da empresa
   * @param excludeId ID para excluir da verificação (útil em updates)
   * @returns True se funcionário existe
   */
  async employeeExists(userId: string, companyId: string, excludeId?: string): Promise<boolean> {
    const employee = await prisma.employee.findFirst({
      where: {
        userId,
        companyId,
        ...(excludeId && { id: { not: excludeId } })
      }
    });
    return !!employee;
  }

  /**
   * Busca funcionários por empresa
   * @param companyId ID da empresa
   * @param onlyActive Se deve retornar apenas funcionários ativos
   * @returns Lista de funcionários
   */
  async findByCompany(companyId: string, onlyActive: boolean = true) {
    return prisma.employee.findMany({
      where: {
        companyId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  /**
   * Busca funcionário por ID do usuário
   * @param userId ID do usuário
   * @param companyId ID da empresa
   * @returns Funcionário encontrado ou null
   */
  async findByUserId(userId: string, companyId: string) {
    return prisma.employee.findFirst({
      where: {
        userId,
        companyId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Busca funcionários por departamento
   * @param department Departamento
   * @param companyId ID da empresa
   * @returns Lista de funcionários do departamento
   */
  async findByDepartment(department: string, companyId: string) {
    return prisma.employee.findMany({
      where: {
        department: {
          contains: department,
          mode: 'insensitive'
        },
        companyId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  /**
   * Busca funcionários por cargo
   * @param position Cargo
   * @param companyId ID da empresa
   * @returns Lista de funcionários do cargo
   */
  async findByPosition(position: string, companyId: string) {
    return prisma.employee.findMany({
      where: {
        position: {
          contains: position,
          mode: 'insensitive'
        },
        companyId,

        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  /**
   * Busca funcionários com aniversário no mês
   * @param month Mês (1-12)
   * @param companyId ID da empresa
   * @returns Lista de funcionários aniversariantes
   */
  async findBirthdaysInMonth(month: number, companyId: string) {
    return prisma.employee.findMany({
      where: {
        companyId,
        isActive: true
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        id: true,
        userId: true,
        companyId: true,
        roleId: true,
        employeeNumber: true,
        department: true,
        position: true,
        salary: true,
        hireDate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            tradeName: true
          }
        },
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Busca funcionários contratados recentemente
   * @param days Número de dias para considerar "recente"
   * @param companyId ID da empresa
   * @returns Lista de funcionários contratados recentemente
   */
  async findRecentHires(days: number, companyId: string) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    return prisma.employee.findMany({
      where: {
        companyId,
        hireDate: {
          gte: dateLimit
        }
      },
      select: {
        id: true,
        userId: true,
        companyId: true,
        roleId: true,
        employeeNumber: true,
        department: true,
        position: true,
        salary: true,
        hireDate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            tradeName: true
          }
        },
        role: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        hireDate: 'desc'
      },
      take: 10
    });
  }

  /**
   * Obtém estatísticas dos funcionários
   * @param companyId ID da empresa
   * @returns Estatísticas dos funcionários
   */
  async getStats(companyId: string): Promise<EmployeeStatsDto> {
    const [employees, recentHires, upcomingBirthdays] = await Promise.all([
      prisma.employee.findMany({
        where: {
          companyId
        },
        select: {
          isActive: true,
          department: true,
          position: true,
          salary: true,
          hireDate: true
        }
      }),
      this.findRecentHires(30, companyId),
      this.findBirthdaysInMonth(new Date().getMonth() + 1, companyId)
    ]);

    // Calcular estatísticas
    const total = employees.length;
    const active = employees.filter(emp => emp.isActive === true).length;
    const inactive = employees.filter(emp => emp.isActive === false).length;

    // Agrupar por departamento
    const byDepartment: Record<string, number> = {};
    employees.forEach(emp => {
      if (emp.department) {
        byDepartment[emp.department] = (byDepartment[emp.department] || 0) + 1;
      }
    });

    // Agrupar por cargo
    const byPosition: Record<string, number> = {};
    employees.forEach(emp => {
      if (emp.position) {
        byPosition[emp.position] = (byPosition[emp.position] || 0) + 1;
      }
    });

    // Calcular salários
    const salaries = employees.filter(emp => emp.salary !== null).map(emp => Number(emp.salary));
    const averageSalary = salaries.length > 0 ? salaries.reduce((sum, salary) => sum + salary, 0) / salaries.length : 0;
    const totalPayroll = salaries.reduce((sum, salary) => sum + salary, 0);

    // Converter os tipos para corresponder ao DTO
    const convertedRecentHires = recentHires.map(hire => ({
      ...hire,
      salary: hire.salary ? Number(hire.salary) : null,
      hireDate: hire.hireDate.toISOString(),
      createdAt: hire.createdAt.toISOString(),
      updatedAt: hire.updatedAt.toISOString()
    }));

    const convertedUpcomingBirthdays = upcomingBirthdays.map(birthday => ({
      ...birthday,
      salary: birthday.salary ? Number(birthday.salary) : null,
      hireDate: birthday.hireDate.toISOString(),
      createdAt: birthday.createdAt.toISOString(),
      updatedAt: birthday.updatedAt.toISOString()
    }));

    return {
      total,
      active,
      inactive,
      onVacation: 0,
      onLeave: 0,
      byDepartment,
      byPosition,
      byEmploymentType: {},
      averageSalary,
      totalPayroll,
      recentHires: convertedRecentHires,
      upcomingBirthdays: convertedUpcomingBirthdays
    };
  }

  /**
   * Busca funcionários para relatórios
   * @param companyId ID da empresa
   * @param filters Filtros opcionais
   * @returns Lista de funcionários para relatório
   */
  async findForReport(companyId: string, filters?: {
    department?: string;
    position?: string;
    isActive?: boolean;
  }) {
    return prisma.employee.findMany({
      where: {
        companyId,
        ...(filters?.department && {
          department: {
            contains: filters.department,
            mode: 'insensitive'
          }
        }),
        ...(filters?.position && {
          position: {
            contains: filters.position,
            mode: 'insensitive'
          }
        }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        role: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }
}