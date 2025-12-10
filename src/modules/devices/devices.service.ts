import { Injectable, Logger } from '@nestjs/common';
import { DevicesRepository } from './devices.repository';
import { Device } from './entities/device.entity';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly repository: DevicesRepository) {}

  async addDevice(device: Device): Promise<Device | null> {
    try {
      return await this.repository.addDevice(device);
    } catch (e) {
      this.logger.error('Error adding device', e as Error);
      return null;
    }
  }

  async getDevices(params: {
    page: number;
    limit: number;
    ip?: string;
    port?: number;
    machineNumber?: number;
  }) {
    return this.repository.getDevices(params);
  }

  async getDeviceById(id: string): Promise<Device | null> {
    try {
      return await this.repository.getDeviceById(id);
    } catch (e) {
      this.logger.error('Error getting device by id', e as Error);
      return null;
    }
  }

  async deleteDevice(id: string): Promise<boolean> {
    try {
      return await this.repository.deleteDevice(id);
    } catch (e) {
      this.logger.error('Error deleting device', e as Error);
      return false;
    }
  }
}
