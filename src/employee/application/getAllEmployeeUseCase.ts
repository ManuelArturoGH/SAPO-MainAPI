import { Inject, Injectable } from '@nestjs/common';
import type { EmployeeRepository } from '../domain/interfaces/employeeRepository';
import { Employee } from '../domain/models/employee';

@Injectable()
export class GetAllEmployeeUseCase {
  constructor(
    @Inject('EmployeeRepository')
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  async execute(): Promise<Employee[] | null> {
    try {
      return await this.employeeRepository.getAllEmployees();
    } catch (error) {
      console.error('Error getting employees:', error);
      return null;
    }
  }
}
