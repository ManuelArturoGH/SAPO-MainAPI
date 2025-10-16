import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ExternalEmployeeSyncService } from '../services/external-sync.service';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { EmployeeFilter } from '../../domain/models/employeeFilter';

class ManualSyncDto {
  @IsInt()
  @Min(1)
  @Max(254)
  @IsOptional()
  machineNumber?: number;
}

@ApiTags('employees')
@Controller('employees/sync')
export class EmployeeSyncController {
  constructor(private readonly syncService: ExternalEmployeeSyncService) {}

  @Post()
  @ApiOperation({
    summary:
      'Disparar sincronización manual externa (opcional: machineNumber para solo un device)',
  })
  @ApiResponse({ status: 200, description: 'Sincronización ejecutada' })
  async runManual(
    @Body() dto: ManualSyncDto,
    @Query('machineNumber') qMachine?: string,
  ) {
    const machineNumber =
      dto.machineNumber ??
      (qMachine !== undefined ? parseInt(qMachine, 10) : undefined);
    if (qMachine !== undefined && Number.isNaN(machineNumber)) {
      throw new BadRequestException('machineNumber inválido');
    }
    const { stats, employees } =
      await this.syncService.triggerManual(machineNumber);
    const filtered =
      machineNumber !== undefined
        ? (employees as EmployeeFilter[]).filter(
            (e: EmployeeFilter) => e.machineNumber === machineNumber,
          )
        : employees;
    const rawResponses = this.syncService.getLastRawResponses();
    return {
      message: 'Manual sync triggered',
      stats,
      employees: filtered,
      rawResponses,
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de la última sincronización externa',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas devueltas' })
  getStats() {
    return this.syncService.getStats();
  }

  @Get('last')
  @ApiOperation({
    summary: 'Obtener últimos empleados sincronizados de un device específico',
  })
  @ApiQuery({
    name: 'machineNumber',
    required: true,
    description: 'Número de máquina (1-254)',
  })
  @ApiResponse({ status: 200, description: 'Listado filtrado devuelto' })
  getLastByMachine(@Query('machineNumber') machineNumberStr: string) {
    const machineNumber = parseInt(machineNumberStr, 10);
    if (
      Number.isNaN(machineNumber) ||
      machineNumber < 1 ||
      machineNumber > 254
    ) {
      throw new BadRequestException('machineNumber fuera de rango (1-254)');
    }
    return this.syncService
      .getLastEmployees()
      .filter((e) => (e as EmployeeFilter).machineNumber === machineNumber);
  }
}
