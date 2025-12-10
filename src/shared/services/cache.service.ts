import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expires: number;
}

@Injectable()
export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs: number;
  private readonly enabled: boolean;

  constructor() {
    this.ttlMs = parseInt(process.env.CACHE_TTL_MS ?? '30000', 10);
    this.enabled =
      (process.env.CACHE_ENABLED ?? 'true').toLowerCase() === 'true';
  }

  buildKey(parts: Record<string, unknown>): string {
    return Object.entries(parts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([k, v]) =>
          `${k}:${v === undefined ? '-' : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v as unknown)}`,
      )
      .join('|');
  }

  get<T>(key: string): T | null {
    if (!this.enabled) return null;
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    if (!this.enabled) return;
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }

  stats() {
    return { size: this.store.size, ttlMs: this.ttlMs, enabled: this.enabled };
  }

  clear() {
    this.store.clear();
  }

  clearByPrefix(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  remove(key: string) {
    this.store.delete(key);
  }

  invalidateEmployeeLists() {
    for (const key of this.store.keys()) {
      if (key.includes('scope:employees:list')) this.store.delete(key);
    }
  }
}
