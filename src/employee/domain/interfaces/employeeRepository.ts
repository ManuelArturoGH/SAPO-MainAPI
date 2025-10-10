import { Employee } from '../models/employee';

export interface EmployeeRepository {
  getAllEmployees(): Promise<Employee[] | null>;
  addEmployee(employee: Employee): Promise<Employee | null>;
  getEmployees(params: {
    page: number;
    limit: number;
    department?: string;
    isActive?: boolean;
    position?: string; // nuevo filtro
    sortBy?: 'name' | 'department' | 'createdAt';
    sortDir?: 'asc' | 'desc';
  }): Promise<{ data: Employee[]; total: number; page: number; limit: number }>;
  getEmployeeById(id: string): Promise<Employee | null>;
  updateEmployee(
    id: string,
    data: Partial<{
      name: string;
      department: string;
      isActive: boolean;
      position: string;
    }>,
  ): Promise<Employee | null>;
  softDeleteEmployee(id: string): Promise<Employee | null>;
}
