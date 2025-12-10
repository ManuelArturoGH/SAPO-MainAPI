import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { connectMongo } from '../../../database/mongodb.provider';

@Injectable()
export class DeviceIndexInitializerService implements OnModuleInit {
  private readonly logger = new Logger(DeviceIndexInitializerService.name);
  async onModuleInit(): Promise<void> {
    try {
      const db = await connectMongo();
      const col = db.collection('devices');
      const res = await col.createIndexes([
        {
          key: { ip: 1, port: 1, machineNumber: 1 },
          name: 'uniq_ip_port_machine',
          unique: true,
        },
        { key: { createdAt: -1 }, name: 'idx_createdAt_desc' },
      ]);
      this.logger.log(`Device indexes ensured: ${res.join(', ')}`);
    } catch (e) {
      this.logger.warn(
        `Could not ensure device indexes: ${(e as Error).message}`,
      );
    }
  }
}
