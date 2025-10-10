import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { EmployeeRepository } from '../domain/interfaces/employeeRepository';
import { Employee } from '../domain/models/employee';
import { CacheService } from '../infrastructure/services/cache.service';

@Injectable()
export class SoftDeleteEmployeeUseCase {
  private readonly logger = new Logger(SoftDeleteEmployeeUseCase.name);
  constructor(
    @Inject('EmployeeRepository') private readonly repo: EmployeeRepository,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async execute(id: string): Promise<Employee | null> {
    try {
      const deleted = await this.repo.softDeleteEmployee(id);
      if (deleted) this.cacheService?.invalidateEmployeeLists();
      return deleted;
    } catch (e) {
      this.logger.error('Error soft deleting employee', e as Error);
      return null;
    }
  }
}
