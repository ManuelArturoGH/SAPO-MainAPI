import { Controller, Get } from '@nestjs/common';
import { GetAllEmployeeUseCase } from '../../application/getAllEmployeeUseCase';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('employees')
@Controller('employees')
export class GetAllEmployeeController {
  constructor(private readonly getAllEmployeeUseCase: GetAllEmployeeUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Listar empleados con paginación y filtros' })
  async handle() {
    const result = await this.getAllEmployeeUseCase.execute();
    return {
      meta: {
        message: 'Employees retrieved successfully',
        total: result ? result.length : 0,
      },
      data: {
        employees: result,
      },
    };
  }
}

export default GetAllEmployeeController;
