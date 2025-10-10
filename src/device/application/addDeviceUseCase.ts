import { Inject, Injectable, Logger } from '@nestjs/common';
import type { DeviceRepository } from '../domain/interfaces/deviceRepository';
import { Device } from '../domain/models/device';

@Injectable()
export class AddDeviceUseCase {
  private readonly logger = new Logger(AddDeviceUseCase.name);
  constructor(
    @Inject('DeviceRepository') private readonly repo: DeviceRepository,
  ) {}

  async execute(device: Device): Promise<Device | null> {
    try {
      return await this.repo.addDevice(device);
    } catch (e) {
      this.logger.error('Error adding device', e as Error);
      return null;
    }
  }
}
