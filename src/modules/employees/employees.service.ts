import { Injectable, Logger } from '@nestjs/common';
import { EmployeesRepository } from './employees.repository';
import { Employee } from './entities/employee.entity';
import { CacheService } from '../../shared';

export interface GetEmployeesParams {
  page?: number;
  limit?: number;
  department?: string;
  isActive?: boolean;
  position?: string;
  sortBy?: 'name' | 'department' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedEmployeesResult {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly repository: EmployeesRepository,
    private readonly cacheService: CacheService,
  ) {}

  // Consolidación de getAllEmployeeUseCase
  async getAllEmployees(): Promise<Employee[] | null> {
    try {
      return await this.repository.getAllEmployees();
    } catch (error) {
      this.logger.error('Error getting employees:', error);
      return null;
    }
  }

  // Consolidación de addEmployeeUseCase
  async addEmployee(employee: Employee): Promise<Employee | null> {
    try {
      this.logger.debug(
        `Adding employee ${employee.name} (${employee.department})`,
      );
      const created = await this.repository.addEmployee(employee);
      if (!created) {
        this.logger.warn('Employee repository returned null on add');
      } else {
        this.cacheService.invalidateEmployeeLists();
      }
      return created;
    } catch (error) {
      this.logger.error('Error adding employee', error as Error);
      return null;
    }
  }

  // Consolidación de getEmployeesUseCase (con paginación)
  async getEmployees(
    params: GetEmployeesParams,
  ): Promise<PaginatedEmployeesResult> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 200;
    const {
      department,
      isActive,
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = params;

    try {
      this.logger.debug(
        `Fetching employees page=${page} limit=${limit} dept=${department ?? '-'} active=${isActive ?? '-'} sort=${sortBy}:${sortDir}`,
      );

      const cacheKey = this.cacheService.buildKey({
        scope: 'employees:list',
        page,
        limit,
        department,
        isActive,
        position: params.position,
        sortBy,
        sortDir,
      });

      if (page === 1) {
        const cached =
          this.cacheService.get<PaginatedEmployeesResult>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const result = await this.repository.getEmployees({
        page,
        limit,
        department,
        isActive,
        position: params.position,
        sortBy,
        sortDir,
      });

      // Post-filter by position if repository doesn't implement it
      let data = result.data;
      if (params.position) {
        data = data.filter((e) => e.position === params.position);
      }

      const out: PaginatedEmployeesResult = {
        data,
        total: params.position ? data.length : result.total,
        page: result.page,
        limit: result.limit,
      };

      if (page === 1) {
        this.cacheService.set(cacheKey, out);
      }

      return out;
    } catch (error) {
      this.logger.error('Error fetching employees', error);
      throw error;
    }
  }

  // Consolidación de getEmployeeByIdUseCase
  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      return await this.repository.getEmployeeById(id);
    } catch (error) {
      this.logger.error('Error getting employee by id', error);
      return null;
    }
  }

  // Consolidación de updateEmployeeUseCase
  async updateEmployee(
    id: string,
    data: Partial<{
      name: string;
      department: string;
      isActive: boolean;
      position: string;
      profileImageUrl: string;
    }>,
  ): Promise<Employee | null> {
    try {
      const updated = await this.repository.updateEmployee(id, data);
      if (updated) {
        this.cacheService.invalidateEmployeeLists();
      }
      return updated;
    } catch (e) {
      this.logger.error('Error updating employee', e as Error);
      return null;
    }
  }

  // Consolidación de softDeleteEmployeeUseCase
  async softDeleteEmployee(id: string): Promise<Employee | null> {
    try {
      const deleted = await this.repository.softDeleteEmployee(id);
      if (deleted) {
        this.cacheService.invalidateEmployeeLists();
      }
      return deleted;
    } catch (e) {
      this.logger.error('Error soft deleting employee', e as Error);
      return null;
    }
  }
}
