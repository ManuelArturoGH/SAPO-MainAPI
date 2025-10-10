import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { EmployeeRepository } from '../domain/interfaces/employeeRepository';
import { Employee } from '../domain/models/employee';
import { CacheService } from '../infrastructure/services/cache.service';

@Injectable()
export class UpdateEmployeeUseCase {
  private readonly logger = new Logger(UpdateEmployeeUseCase.name);
  constructor(
    @Inject('EmployeeRepository') private readonly repo: EmployeeRepository,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async execute(
    id: string,
    data: Partial<{
      name: string;
      department: string;
      isActive: boolean;
      position: string;
    }>,
  ): Promise<Employee | null> {
    try {
      const updated = await this.repo.updateEmployee(id, data);
      if (updated) this.cacheService?.invalidateEmployeeLists();
      return updated;
    } catch (e) {
      this.logger.error('Error updating employee', e as Error);
      return null;
    }
  }
}
