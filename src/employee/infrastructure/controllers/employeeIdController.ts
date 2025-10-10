import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { GetEmployeeByIdUseCase } from '../../application/getEmployeeByIdUseCase';
import { UpdateEmployeeUseCase } from '../../application/updateEmployeeUseCase';
import { SoftDeleteEmployeeUseCase } from '../../application/softDeleteEmployeeUseCase';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { UpdateEmployeePositionDto } from '../dto/update-employee-position.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('employees')
@Controller('employees')
export class EmployeeIdController {
  constructor(
    private readonly getById: GetEmployeeByIdUseCase,
    private readonly update: UpdateEmployeeUseCase,
    private readonly softDelete: SoftDeleteEmployeeUseCase,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Obtener empleado por ID' })
  @ApiResponse({ status: 200, description: 'Empleado encontrado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async get(@Param('id') id: string) {
    const emp = await this.getById.execute(id);
    if (!emp) throw new NotFoundException('Employee not found');
    return {
      id: emp.id,
      name: emp.name,
      isActive: emp.isActive,
      department: emp.department,
      position: emp.position,
      createdAt: emp.createdAt,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un empleado' })
  @ApiResponse({ status: 200, description: 'Empleado actualizado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async patch(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    const updated = await this.update.execute(id, dto);
    if (!updated)
      throw new NotFoundException('Employee not found or not updated');
    return {
      message: 'Employee updated',
      employee: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
        department: updated.department,
        position: updated.position,
        createdAt: updated.createdAt,
      },
    };
  }

  @Patch(':id/position')
  @ApiOperation({
    summary: 'Actualizar solo el puesto (position) de un empleado',
  })
  @ApiResponse({ status: 200, description: 'Puesto actualizado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async updatePosition(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeePositionDto,
  ) {
    const updated = await this.update.execute(id, { position: dto.position });
    if (!updated)
      throw new NotFoundException('Employee not found or not updated');
    return {
      message: 'Employee position updated',
      employee: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
        department: updated.department,
        position: updated.position,
        createdAt: updated.createdAt,
      },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar (soft delete) un empleado' })
  @ApiResponse({ status: 200, description: 'Empleado desactivado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async delete(@Param('id') id: string) {
    const deleted = await this.softDelete.execute(id);
    if (!deleted) throw new NotFoundException('Employee not found');
    return {
      message: 'Employee deactivated',
      employee: {
        id: deleted.id,
        name: deleted.name,
        isActive: deleted.isActive,
        department: deleted.department,
        position: deleted.position,
      },
    };
  }
}
