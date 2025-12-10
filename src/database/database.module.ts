import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { connectMongo, closeMongo } from './mongodb.provider';
import { Logger } from '@nestjs/common';

@Global()
@Module({
  providers: [],
  exports: [],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('DatabaseModule');

  async onModuleInit() {
    try {
      await connectMongo();
      this.logger.log('MongoDB connection initialized');
    } catch (error) {
      this.logger.error('Failed to initialize MongoDB connection', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await closeMongo();
      this.logger.log('MongoDB connection closed');
    } catch (error) {
      this.logger.error('Error closing MongoDB connection', error);
    }
  }
}
