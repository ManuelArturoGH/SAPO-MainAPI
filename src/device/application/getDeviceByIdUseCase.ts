import { Inject, Injectable } from '@nestjs/common';
import type { DeviceRepository } from '../domain/interfaces/deviceRepository';

@Injectable()
export class GetDeviceByIdUseCase {
  constructor(
    @Inject('DeviceRepository') private readonly repo: DeviceRepository,
  ) {}
  async execute(id: string) {
    return this.repo.getDeviceById(id);
  }
}
