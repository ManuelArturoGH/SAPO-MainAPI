import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CloudinaryService } from '../../shared';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateEmployeePositionDto } from './dto/update-employee-position.dto';
import { UpdateEmployeeDepartmentDto } from './dto/update-employee-department.dto';
import { UpdateEmployeeIsActiveDto } from './dto/update-employee-isactive.dto';
import { ExternalEmployeeSyncService } from './services/external-sync.service';

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly syncService: ExternalEmployeeSyncService,
  ) {}

  // POST /employees/sync - Sincronización manual de empleados desde dispositivos
  @Post('sync')
  @ApiOperation({
    summary:
      'Disparar sincronización manual de empleados desde dispositivos de control de asistencias (opcional: machineNumber)',
  })
  @ApiQuery({
    name: 'machineNumber',
    required: false,
    type: Number,
    description:
      'Número de máquina específico (1-254). Si no se indica, sincroniza todos los dispositivos.',
  })
  @ApiResponse({ status: 200, description: 'Sincronización ejecutada' })
  @ApiResponse({ status: 400, description: 'machineNumber inválido' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado' })
  async sync(@Query('machineNumber') machineNumber?: string) {
    const mn =
      machineNumber !== undefined ? parseInt(machineNumber, 10) : undefined;
    if (machineNumber !== undefined && (Number.isNaN(mn) || mn === undefined)) {
      throw new BadRequestException('machineNumber debe ser un número válido');
    }
    const result = await this.syncService.triggerManual(mn);
    return {
      message: 'Employee sync triggered',
      machineNumber: mn ?? 'all',
      stats: result.stats,
      employeesCount: result.employees.length,
    };
  }

  // GET /employees - Listar todos los empleados
  @Get()
  @ApiOperation({ summary: 'Listar empleados con paginación y filtros' })
  async getAll() {
    const result = await this.employeesService.getAllEmployees();
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

  // POST /employees - Crear un nuevo empleado
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo empleado' })
  @ApiResponse({ status: 201, description: 'Empleado creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(@Body() dto: CreateEmployeeDto) {
    const employeeDomain = Employee.createNew(
      dto.name,
      dto.department,
      dto.isActive ?? true,
      dto.position || 'sin asignar',
    );
    const newEmployee = await this.employeesService.addEmployee(employeeDomain);
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

  // GET /employees/:id - Obtener empleado por ID
  @Get(':id')
  @ApiOperation({ summary: 'Obtener empleado por ID' })
  @ApiResponse({ status: 200, description: 'Empleado encontrado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async getById(@Param('id') id: string) {
    const emp = await this.employeesService.getEmployeeById(id);
    if (!emp) throw new NotFoundException('Employee not found');
    return {
      id: emp.id,
      name: emp.name,
      isActive: emp.isActive,
      department: emp.department,
      position: emp.position,
      profileImageUrl: emp.profile,
      createdAt: emp.createdAt,
    };
  }

  // PATCH /employees/:id - Actualizar un empleado
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un empleado' })
  @ApiResponse({ status: 200, description: 'Empleado actualizado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    const updated = await this.employeesService.updateEmployee(id, dto);
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
        profileImageUrl: updated.profile,
        createdAt: updated.createdAt,
      },
    };
  }

  // PATCH /employees/:id/position - Actualizar posición
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

    const updated = await this.employeesService.updateEmployee(id, payload);
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
        profileImageUrl: updated.profile,
        createdAt: updated.createdAt,
      },
    };
  }

  // PATCH /employees/:id/profile-image - Actualizar foto de perfil
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

    const imageUrl = await this.cloudinaryService.uploadImage(file);
    if (!imageUrl) throw new BadRequestException('Image upload failed');

    const updated = await this.employeesService.updateEmployee(id, {
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
        profileImageUrl: updated.profile,
        createdAt: updated.createdAt,
      },
    };
  }

  // PATCH /employees/:id/department - Actualizar departamento
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
    const updated = await this.employeesService.updateEmployee(id, {
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
        profileImageUrl: updated.profile,
        createdAt: updated.createdAt,
      },
    };
  }

  // PATCH /employees/:id/isactive - Actualizar estado activo
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
    const updated = await this.employeesService.updateEmployee(id, {
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
        profileImageUrl: updated.profile,
        createdAt: updated.createdAt,
      },
    };
  }

  // DELETE /employees/:id - Soft delete (desactivar)
  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar (soft delete) un empleado' })
  @ApiResponse({ status: 200, description: 'Empleado desactivado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async delete(@Param('id') id: string) {
    const deleted = await this.employeesService.softDeleteEmployee(id);
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
