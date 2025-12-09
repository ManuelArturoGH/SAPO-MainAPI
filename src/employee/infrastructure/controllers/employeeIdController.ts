// typescript
import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Delete,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetEmployeeByIdUseCase } from '../../application/getEmployeeByIdUseCase';
import { UpdateEmployeeUseCase } from '../../application/updateEmployeeUseCase';
import { SoftDeleteEmployeeUseCase } from '../../application/softDeleteEmployeeUseCase';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { UpdateEmployeePositionDto } from '../dto/update-employee-position.dto';
import { UpdateEmployeeDepartmentDto } from '../dto/update-employee-department.dto';
import { UpdateEmployeeIsActiveDto } from '../dto/update-employee-isactive.dto';
import {
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';
import { CloudinaryService } from '../services/cloudinary.service';

@ApiTags('employees')
@Controller('employees')
export class EmployeeIdController {
  constructor(
    private readonly getById: GetEmployeeByIdUseCase,
    private readonly update: UpdateEmployeeUseCase,
    private readonly softDelete: SoftDeleteEmployeeUseCase,
    private readonly cloudinary: CloudinaryService,
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
      profileImageUrl: emp.profileImageUrl,
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
        profileImageUrl: updated.profileImageUrl,
        createdAt: updated.createdAt,
      },
    };
  }

  @Patch(':id/position')
  @ApiOperation({
    summary:
      'Actualizar puesto (position). También puede actualizar department e isActive en la misma petición (patch parcial).',
  })
  @ApiResponse({ status: 200, description: 'Puesto actualizado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async updatePosition(
    @Param('id') id: string,
    @Body()
    dto: Partial<
      UpdateEmployeePositionDto &
        UpdateEmployeeDepartmentDto &
        UpdateEmployeeIsActiveDto &
        UpdateEmployeeDto
    >,
  ) {
    const payload: Partial<{
      position: string;
      department: string;
      isActive: boolean;
    }> = {};

    if (dto.position !== undefined) payload.position = dto.position;
    if (dto.department !== undefined) payload.department = dto.department;
    if (dto.isActive !== undefined) payload.isActive = dto.isActive;

    if (Object.keys(payload).length === 0)
      throw new BadRequestException('No fields provided to update');

    const updated = await this.update.execute(id, payload);
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
        profileImageUrl: updated.profileImageUrl,
        createdAt: updated.createdAt,
      },
    };
  }

  @Patch(':id/profile-image')
  @ApiOperation({ summary: 'Actualizar foto de perfil' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Imagen de perfil',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async updateProfileImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');

    const imageUrl = await this.cloudinary.uploadImage(file);
    if (!imageUrl) throw new BadRequestException('Image upload failed');

    const updated = await this.update.execute(id, {
      profileImageUrl: imageUrl,
    });
    if (!updated)
      throw new NotFoundException('Employee not found or not updated');
    return {
      message: 'Employee profile image updated',
      employee: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
        department: updated.department,
        position: updated.position,
        profileImageUrl: updated.profileImageUrl,
        createdAt: updated.createdAt,
      },
    };
  }

  @Patch(':id/department')
  @ApiOperation({
    summary: 'Actualizar solo el departamento de un empleado',
  })
  @ApiResponse({ status: 200, description: 'Departamento actualizado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDepartmentDto,
  ) {
    const updated = await this.update.execute(id, {
      department: dto.department,
    });
    if (!updated)
      throw new NotFoundException('Employee not found or not updated');
    return {
      message: 'Employee department updated',
      employee: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
        department: updated.department,
        position: updated.position,
        profileImageUrl: updated.profileImageUrl,
        createdAt: updated.createdAt,
      },
    };
  }

  @Patch(':id/isactive')
  @ApiOperation({
    summary: 'Actualizar solo el estado activo de un empleado',
  })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async updateIsActive(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeIsActiveDto,
  ) {
    const updated = await this.update.execute(id, {
      isActive: dto.isActive,
    });
    if (!updated)
      throw new NotFoundException('Employee not found or not updated');
    return {
      message: 'Employee active status updated',
      employee: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
        department: updated.department,
        position: updated.position,
        profileImageUrl: updated.profileImageUrl,
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
