import { Inject, Injectable } from '@nestjs/common';
import type { DeviceRepository } from '../domain/interfaces/deviceRepository';

@Injectable()
export class GetDevicesUseCase {
  constructor(
    @Inject('DeviceRepository') private readonly repo: DeviceRepository,
  ) {}
  async execute(params: {
    page: number;
    limit: number;
    ip?: string;
    port?: number;
    machineNumber?: number;
  }) {
    return this.repo.getDevices(params);
  }
}
