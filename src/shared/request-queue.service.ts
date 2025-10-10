import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RequestQueueService {
  private readonly logger = new Logger(RequestQueueService.name);
  private queue: Array<{
    fn: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
    delayMs?: number;
    label?: string;
  }> = [];
  private processing = false;
  private nextAvailableAt = 0;

  private defaultDelayMs(): number {
    if (process.env.NODE_ENV === 'test') return 0;
    const raw = Number(process.env.REQUEST_QUEUE_DELAY_MS ?? 60000);
    return Number.isFinite(raw) && raw >= 0 ? raw : 60000;
  }

  enqueue<T>(fn: () => Promise<T>, opts?: { delayMs?: number; label?: string }): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, delayMs: opts?.delayMs, label: opts?.label });
      void this.process();
    });
  }

  private async sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        // Respect global cooldown between requests
        const now = Date.now();
        if (now < this.nextAvailableAt) {
          const waitMs = this.nextAvailableAt - now;
          if (waitMs > 0) await this.sleep(waitMs);
        }
        const item = this.queue.shift()!;
        const started = Date.now();
        try {
          const res = await item.fn();
          item.resolve(res);
        } catch (err) {
          item.reject(err);
        }
        const took = Date.now() - started;
        const delay = item.delayMs ?? this.defaultDelayMs();
        // Always set next available time regardless of whether a next job is already queued
        if (delay > 0) {
          this.nextAvailableAt = Date.now() + delay;
          const secs = Math.round(delay / 1000);
          this.logger.log(
            `[Queue] Completed${item.label ? ` (${item.label})` : ''} in ${took}ms. Next request allowed in ${secs}s...`,
          );
        } else {
          this.nextAvailableAt = Date.now();
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
