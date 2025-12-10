import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { connectMongo } from '../../../database/mongodb.provider';

@Injectable()
export class IndexInitializerService implements OnModuleInit {
  private readonly logger = new Logger(IndexInitializerService.name);

  async onModuleInit(): Promise<void> {
    if (
      process.env.NODE_ENV === 'test' ||
      (process.env.SKIP_INDEX_INIT ?? '').toLowerCase() === 'true'
    ) {
      return;
    }
    try {
      const db = await connectMongo();
      const collection = db.collection('employees');
      const res = await collection.createIndexes([
        { key: { createdAt: -1 }, name: 'idx_createdAt_desc' },
        {
          key: { department: 1, isActive: 1 },
          name: 'idx_department_isActive',
        },
        {
          key: { name: 1 },
          name: 'idx_name_asc',
          collation: { locale: 'en', strength: 2 },
        },
        {
          key: { externalId: 1 },
          name: 'uniq_externalId',
          unique: true,
          sparse: true,
        },
        { key: { position: 1 }, name: 'idx_position_asc' },
      ]);
      this.logger.log(`Employee indexes ensured: ${res.join(', ')}`);
    } catch (err) {
      this.logger.warn(
        `Could not ensure indexes (non-fatal): ${(err as Error).message}`,
      );
    }
  }
}
