import { Controller, Get, Query } from '@nestjs/common';
import { GetEmployeesUseCase } from '../../application/getEmployeesUseCase';
import { GetEmployeesQueryDto } from '../dto/get-employees-query.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('employees')
@Controller('employees')
export class GetAllEmployeeController {
  constructor(private readonly getEmployeesUseCase: GetEmployeesUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Listar empleados con paginación y filtros' })
  async handle(@Query() query: GetEmployeesQueryDto) {
    const result = await this.getEmployeesUseCase.execute({
      page: query.page,
      limit: query.limit,
      department: query.department,
      isActive: query.isActive,
      position: query.position,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    });
    return {
      data: result.data.map((e) => ({
        id: e.id,
        name: e.name,
        isActive: e.isActive,
        department: e.department,
        position: e.position,
        profileImageUrl: e.profileImageUrl,
      })),
      meta: {
        total: Number(result.total),
        page: Number(result.page),
        limit: Number(result.limit),
        totalPages: Number(Math.ceil(result.total / result.limit) || 0),
        hasNext: result.page * result.limit < result.total,
        hasPrev: result.page > 1,
      },
    };
  }
}

export default GetAllEmployeeController;
