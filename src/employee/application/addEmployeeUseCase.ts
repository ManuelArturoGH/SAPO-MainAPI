import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { EmployeeRepository } from '../domain/interfaces/employeeRepository';
import { Employee } from '../domain/models/employee';
import { CacheService } from '../infrastructure/services/cache.service';

@Injectable()
export class AddEmployeeUseCase {
  private readonly logger = new Logger(AddEmployeeUseCase.name);
  constructor(
    @Inject('EmployeeRepository')
    private readonly employeeRepository: EmployeeRepository,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async execute(_employee: Employee): Promise<Employee | null> {
    try {
      this.logger.debug(
        `Adding employee ${_employee.name} (${_employee.department})`,
      );
      const created = await this.employeeRepository.addEmployee(_employee);
      if (!created) {
        this.logger.warn('Employee repository returned null on add');
      } else {
        this.cacheService?.invalidateEmployeeLists();
      }
      return created;
    } catch (error) {
      this.logger.error('Error adding employee', error as Error);
      return null;
    }
  }
}
