import { Global, Module } from '@nestjs/common';
import { RequestQueueService } from './services/request-queue.service';
import { CacheService } from './services/cache.service';
import { CloudinaryService } from './services/cloudinary.service';

@Global()
@Module({
  providers: [RequestQueueService, CacheService, CloudinaryService],
  exports: [RequestQueueService, CacheService, CloudinaryService],
})
export class SharedModule {}
