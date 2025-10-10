import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EmployeeRepository } from '../domain/interfaces/employeeRepository';
import { Employee } from '../domain/models/employee';

@Injectable()
export class GetEmployeeByIdUseCase {
  private readonly logger = new Logger(GetEmployeeByIdUseCase.name);
  constructor(
    @Inject('EmployeeRepository') private readonly repo: EmployeeRepository,
  ) {}

  async execute(id: string): Promise<Employee | null> {
    try {
      return await this.repo.getEmployeeById(id);
    } catch (e) {
      this.logger.error('Error fetching employee by id', e as Error);
      return null;
    }
  }
}

