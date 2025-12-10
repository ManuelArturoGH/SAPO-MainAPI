import { Device } from '../entities/device.entity';
export interface DeviceRepository {
  addDevice(device: Device): Promise<Device | null>;
  getDevices(params: {
    page: number;
    limit: number;
    ip?: string;
    port?: number;
    machineNumber?: number;
  }): Promise<{ data: Device[]; total: number; page: number; limit: number }>;
  getDeviceById(id: string): Promise<Device | null>;
  deleteDevice(id: string): Promise<boolean>;
}
