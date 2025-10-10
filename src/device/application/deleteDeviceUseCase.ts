import { Inject, Injectable } from '@nestjs/common';
import type { DeviceRepository } from '../domain/interfaces/deviceRepository';

@Injectable()
export class DeleteDeviceUseCase {
  constructor(
    @Inject('DeviceRepository') private readonly repo: DeviceRepository,
  ) {}
  async execute(id: string): Promise<boolean> {
    return this.repo.deleteDevice(id);
  }
}
