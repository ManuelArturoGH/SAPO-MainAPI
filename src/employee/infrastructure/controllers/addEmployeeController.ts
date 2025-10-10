import { AddEmployeeUseCase } from '../../application/addEmployeeUseCase';
import { Body, Controller, Post } from '@nestjs/common';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { Employee } from '../../domain/models/employee';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('employees')
@Controller('employees')
export class AddEmployeeController {
  constructor(private readonly addEmployeeUseCase: AddEmployeeUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo empleado' })
  @ApiResponse({ status: 201, description: 'Empleado creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async handle(@Body() dto: CreateEmployeeDto) {
    const employeeDomain = Employee.createNew(
      dto.name,
      dto.department,
      dto.isActive ?? true,
      dto.position || 'sin asignar',
    );
    const newEmployee = await this.addEmployeeUseCase.execute(employeeDomain);
    if (!newEmployee) {
      return { message: 'Failed to add employee' };
    }
    return {
      message: 'Employee added successfully',
      employee: {
        id: newEmployee.id,
        name: newEmployee.name,
        isActive: newEmployee.isActive,
        department: newEmployee.department,
        position: newEmployee.position,
        createdAt: newEmployee.createdAt,
      },
    };
  }
}

export default AddEmployeeController;
