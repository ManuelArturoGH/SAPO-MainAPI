import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AddDeviceUseCase } from '../../application/addDeviceUseCase';
import { GetDevicesUseCase } from '../../application/getDevicesUseCase';
import { DeleteDeviceUseCase } from '../../application/deleteDeviceUseCase';
import { GetDeviceByIdUseCase } from '../../application/getDeviceByIdUseCase';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { GetDevicesQueryDto } from '../dto/get-devices-query.dto';
import { Device } from '../../domain/models/device';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('devices')
@Controller('devices')
export class DeviceController {
  constructor(
    private readonly addDevice: AddDeviceUseCase,
    private readonly listDevices: GetDevicesUseCase,
    private readonly deleteDevice: DeleteDeviceUseCase,
    private readonly getDeviceById: GetDeviceByIdUseCase,
  ) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Device created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async create(@Body() dto: CreateDeviceDto) {
    const device = Device.createNew(dto.ip, dto.port, dto.machineNumber);
    const created = await this.addDevice.execute(device);
    if (!created)
      return { message: 'Device already exists or could not be created' };
    return {
      message: 'Device created',
      device: {
        id: created.id,
        ip: created.ip,
        port: created.port,
        machineNumber: created.machineNumber,
      },
    };
  }

  @Get()
  async list(@Query() query: GetDevicesQueryDto) {
    const { page, limit, ip, port, machineNumber } = query;
    return this.listDevices.execute({ page, limit, ip, port, machineNumber });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const device = await this.getDeviceById.execute(id);
    if (!device) return { message: 'Not found' };
    return {
      id: device.id,
      ip: device.ip,
      port: device.port,
      machineNumber: device.machineNumber,
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const ok = await this.deleteDevice.execute(id);
    return { success: ok };
  }
}
