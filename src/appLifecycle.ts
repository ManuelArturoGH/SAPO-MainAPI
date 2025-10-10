import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { closeMongo, hasActiveClient } from './database/mongodb';

@Injectable()
export class AppLifecycle implements OnApplicationShutdown {
  async onApplicationShutdown(signal?: string) {
    if (hasActiveClient()) {
      await closeMongo();

      console.log('[AppLifecycle] Mongo connection closed on shutdown', signal);
    }
  }
}
