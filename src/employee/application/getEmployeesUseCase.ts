import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { EmployeeRepository } from '../domain/interfaces/employeeRepository';
import { Employee } from '../domain/models/employee';
import { CacheService } from '../infrastructure/services/cache.service';

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
export class GetEmployeesUseCase {
  private readonly logger = new Logger(GetEmployeesUseCase.name);
  constructor(
    @Inject('EmployeeRepository')
    private readonly employeeRepository: EmployeeRepository,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async execute(params: GetEmployeesParams): Promise<PaginatedEmployeesResult> {
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
      const cacheKey = this.cacheService?.buildKey({
        scope: 'employees:list',
        page,
        limit,
        department,
        isActive,
        position: params.position,
        sortBy,
        sortDir,
      });
      if (page === 1 && cacheKey) {
        const cached =
          this.cacheService?.get<PaginatedEmployeesResult>(cacheKey);
        if (cached) {
          this.logger.verbose?.('Cache hit employees list');
          return cached;
        }
      }
      const result = await this.employeeRepository.getEmployees({
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

      if (page === 1 && cacheKey) {
        this.cacheService?.set(cacheKey, out);
      }

      return out;
    } catch (error) {
      this.logger.error('Error fetching employees', error);
      throw error;
    }
  }
}
