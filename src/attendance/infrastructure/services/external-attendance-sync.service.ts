/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await, prettier/prettier */
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import type { DeviceRepository } from '../../../device/domain/interfaces/deviceRepository';
import type { AttendanceRepository } from '../../domain/interfaces/attendanceRepository';
import { CronJob } from 'cron';
import { Attendance } from '../../domain/models/attendance';
import { RequestQueueService } from '../../../shared/request-queue.service';

interface ExternalAttendanceDto {
  attendanceMachineID: number | string;
  userId: number | string;
  attendanceTime: string | number | Date;
  accessMode: string;
  attendanceStatus: string;
}

@Injectable()
export class ExternalAttendanceSyncService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ExternalAttendanceSyncService.name);
  private axios: AxiosInstance;
  private cronJobs: CronJob[] = [];
  private running = false;

  constructor(
    @Inject('AttendanceRepository') private readonly repo: AttendanceRepository,
    @Inject('DeviceRepository') private readonly deviceRepo: DeviceRepository,
    @Optional() private readonly queue?: RequestQueueService,
  ) {
    const rawBase =
      process.env.EXTERNAL_EMP_API_URL || 'http://localhost:4000/api';
    const baseNormalized = rawBase.replace(/\/?$/, '');
    const finalBase = /\/attendance$/i.test(baseNormalized)
      ? baseNormalized
      : `${baseNormalized}/attendance`;
    const rawTimeout = Number(process.env.EXTERNAL_EMP_API_TIMEOUT_MS ?? 60000);
    const timeout = Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 60000;
    this.axios = axios.create({
      baseURL: finalBase,
      timeout,
    });
    this.logger.log(
      `[AttendanceSync] Using external attendance endpoint base: ${finalBase}`,
    );
  }

  async onModuleInit(): Promise<void> {
    if ((process.env.ATT_SYNC_ENABLED ?? 'true').toLowerCase() !== 'true')
      return;
    const minutes = parseInt(
      process.env.ATT_SYNC_INTERVAL_MINUTES || '120',
      10,
    );
    const ms = minutes * 60 * 1000;
    setInterval(() => {
      void this.safeRun('interval');
    }, ms);
    if ((process.env.ATT_SYNC_RUN_AT_START ?? 'true').toLowerCase() === 'true')
      void this.safeRun('startup');
  }
  onModuleDestroy(): void {
    for (const j of this.cronJobs) j.stop();
    this.cronJobs = [];
  }

  async triggerManual(machineNumber?: number, from?: string, to?: string) {
    await this.safeRun('manual', machineNumber, from, to);
    return { ok: true };
  }

  private async safeRun(
    trigger: string,
    machineNumberFilter?: number,
    from?: string,
    to?: string,
  ): Promise<void> {
    if (this.running) {
      this.logger.warn(
        `Attendance sync skipped (${trigger}) - already running`,
      );
      return;
    }
    if (
      machineNumberFilter !== undefined &&
      (machineNumberFilter < 1 || machineNumberFilter > 254)
    )
      throw new BadRequestException('machineNumber fuera de rango (1-254)');
    this.running = true;
    try {
      await this.runSync(machineNumberFilter, from, to);
    } catch (e) {
      this.logger.error('Attendance sync failed: ' + (e as Error).message);
    } finally {
      this.running = false;
    }
  }

  private async fetchAllDevices(): Promise<
    Array<{ ip: string; port: number; machineNumber: number }>
  > {
    const pageSize = 50;
    let page = 1;
    const out: Array<{ ip: string; port: number; machineNumber: number }> = [];
    while (true) {
      const batch = await this.deviceRepo.getDevices({ page, limit: pageSize });
      for (const d of batch.data)
        out.push({
          ip: (d as any).ip,
          port: (d as any).port,
          machineNumber: (d as any).machineNumber,
        });
      if (batch.data.length < pageSize) break;
      page++;
      if (page > 1000) break;
    }
    return out;
  }
  private async fetchDeviceByMachineNumber(machineNumber: number) {
    const res = await this.deviceRepo.getDevices({
      page: 1,
      limit: 1,
      machineNumber,
    });
    if (!res.data.length)
      throw new NotFoundException(`Device ${machineNumber} no encontrado`);
    const d = res.data[0] as any;
    return { ip: d.ip, port: d.port, machineNumber: d.machineNumber };
  }

  private getPerRequestDelayMs(): number {
    if (process.env.NODE_ENV === 'test') return 0;
    const raw = Number(process.env.ATT_SYNC_DELAY_MS ?? 60000);
    const val = Number.isFinite(raw) && raw >= 0 ? raw : 60000;
    return val;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseNumberLike(v: unknown): number | null {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      if (Number.isFinite(n)) return n;
      // last resort: parseInt leading digits
      const m = /^-?\d+/.exec(trimmed);
      if (m) {
        const nn = parseInt(m[0], 10);
        return Number.isFinite(nn) ? nn : null;
      }
    }
    return null;
  }

  private pickFirst<T = any>(obj: any, keys: string[]): T | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
      // try snake/camel variations
      const alt1 = k.replace(/_[a-z]/g, (m) => m[1].toUpperCase()); // snake -> camel
      const alt2 = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`); // camel -> snake
      if (obj[alt1] !== undefined && obj[alt1] !== null) return obj[alt1] as T;
      if (obj[alt2] !== undefined && obj[alt2] !== null) return obj[alt2] as T;
    }
    return undefined;
  }

  private mapExternalItem(item: any): Attendance | null {
    // Try to resolve machine number
    const machineRaw = this.pickFirst(item, [
      'attendanceMachineID',
      'AttendanceMachineID',
      'machineNumber',
      'machineNo',
      'deviceId',
      'deviceID',
    ]);
    const machine = this.parseNumberLike(machineRaw);

    // Resolve user id
    const userRaw = this.pickFirst(item, [
      'userId',
      'userID',
      'UserID',
      'UserId',
      'user_id',
      'uid',
      'pin',
      'employeeId',
      'enrollId',
      'empId',
      // new aliases
      'PIN',
      'Pin',
      'EnrollNumber',
      'enrollNumber',
      'enroll_no',
      'enrollNo',
      'empCode',
      'employeeCode',
      'cardNo',
      'cardNumber',
    ]);
    let userId = this.parseNumberLike(userRaw);
    // Fallback: extract first number sequence anywhere in the string (e.g., 'E123' -> 123)
    if (userId === null && typeof userRaw === 'string') {
      const m = /-?\d+/.exec(userRaw);
      if (m) {
        const n = parseInt(m[0], 10);
        if (Number.isFinite(n)) {
          userId = n;
        }
      }
    }

    // Resolve attendance time
    const timeRaw = this.pickFirst(item, [
      'attendanceTime',
      'AttendanceTime',
      'timestamp',
      'time',
      'dateTime',
      'datetime',
      'checkTime',
      'attTime',
      'punch_time',
    ]);
    const attendanceTime = this.normalizeDate(timeRaw as any);

    if (!Number.isFinite(machine as any) || !Number.isFinite(userId as any) || !attendanceTime)
      return null;

    const accessMode = String(
      this.pickFirst(item, ['accessMode', 'AccessMode', 'mode', 'verifyType', 'ioMode']) ?? '',
    );
    const attendanceStatus = String(
      this.pickFirst(item, [
        'attendanceStatus',
        'AttendanceStatus',
        'status',
        'inOutMode',
        'io',
        'direction',
      ]) ?? '',
    );

    return Attendance.createNew({
      attendanceMachineID: machine!,
      userId: userId!,
      attendanceTime: attendanceTime!,
      accessMode,
      attendanceStatus,
    });
  }

  // Try to extract the attendance list from multiple common response shapes
  private extractAttendanceList(raw: any): ExternalAttendanceDto[] {
    // Direct array
    if (Array.isArray(raw)) return raw as ExternalAttendanceDto[];

    // { data: [] }
    if (raw && Array.isArray(raw.data)) return raw.data as ExternalAttendanceDto[];

    // { data: { items|records|attendances|rows: [] } }
    const nested = raw?.data;
    const candidateKeys = ['items', 'records', 'attendances', 'rows', 'result', 'results'];
    if (nested && typeof nested === 'object') {
      for (const k of candidateKeys) {
        const v = (nested as any)[k];
        if (Array.isArray(v)) return v as ExternalAttendanceDto[];
      }
    }

    // Top-level { items|records|attendances|rows: [] }
    if (raw && typeof raw === 'object') {
      for (const k of candidateKeys) {
        const v = (raw as any)[k];
        if (Array.isArray(v)) return v as ExternalAttendanceDto[];
      }
    }

    return [];
  }

  private normalizeDate(value: string | number | Date): Date | null {
    try {
      if (value instanceof Date) {
        const t = value.getTime();
        return Number.isFinite(t) ? value : null;
      }
      if (typeof value === 'number') {
        // Heuristic: treat < 1e12 as seconds; otherwise milliseconds
        const ms = value < 1e12 ? value * 1000 : value;
        const d = new Date(ms);
        return Number.isFinite(d.getTime()) ? d : null;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        // Try ISO parse first
        const d1 = new Date(trimmed);
        if (Number.isFinite(d1.getTime())) return d1;
        // Try numeric string
        const num = Number(trimmed);
        if (Number.isFinite(num)) {
          const ms = num < 1e12 ? num * 1000 : num;
          const d2 = new Date(ms);
          return Number.isFinite(d2.getTime()) ? d2 : null;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  private isDebug(): boolean {
    return (process.env.ATT_SYNC_DEBUG ?? '').toLowerCase() === 'true';
  }

  private describeShape(value: unknown): string {
    if (Array.isArray(value)) return `array(len=${value.length})`;
    if (value === null) return 'null';
    const t = typeof value;
    if (t !== 'object') return t;
    const keys = Object.keys(value as Record<string, unknown>).slice(0, 20);
    return `object(keys=[${keys.join(', ')}]${keys.length === 20 ? ', ...' : ''})`;
  }

  private sampleItemKeys(arr: any[]): string {
    if (!arr.length) return '[]';
    const it = arr[0] ?? {};
    const keys = Object.keys(it).slice(0, 20);
    const previews: string[] = [];
    for (const k of keys) {
      const v = (it as any)[k];
      const type = Array.isArray(v) ? `array(len=${v.length})` : typeof v;
      previews.push(`${k}:${type}`);
    }
    return `{ ${previews.join(', ')}${keys.length === 20 ? ', ...' : ''} }`;
  }

  private async runSync(
    machineNumberFilter?: number,
    from?: string,
    to?: string,
  ): Promise<void> {
    let devices: Array<{ ip: string; port: number; machineNumber: number }> =
      [];
    if (machineNumberFilter !== undefined)
      devices = [await this.fetchDeviceByMachineNumber(machineNumberFilter)];
    else devices = await this.fetchAllDevices();

    const delayMs = this.getPerRequestDelayMs();
    const bulkSize = Math.max(
      1,
      parseInt(process.env.ATT_SYNC_BULK_SIZE || '500', 10) || 500,
    );

    for (let i = 0; i < devices.length; i++) {
      const dev = devices[i];
      let attempted = false;
      let upsertedTotal = 0;
      let matchedTotal = 0;
      let looseUserDigitsCount = 0;
      const invalidUserSamples: string[] = [];
      const startedDev = Date.now();
      try {
        const params = {
          machineNumber: dev.machineNumber,
          ipAddress: dev.ip,
          port: dev.port,
          from,
          to,
        } as const;
        const resp = (this.queue
          ? await this.queue.enqueue(
              () =>
                this.axios.get<
                  ExternalAttendanceDto[] | { data: ExternalAttendanceDto[] }
                >('', {
                  params,
                  paramsSerializer: (p) =>
                    ['machineNumber', 'ipAddress', 'port', 'from', 'to']
                      .filter(
                        (k) =>
                          (p as any)[k] !== undefined && (p as any)[k] !== null,
                      )
                      .map((k) => `${k}=${encodeURIComponent((p as any)[k])}`)
                      .join('&'),
                }),
              {
                delayMs,
                label: `attendance ${dev.ip}:${dev.port}#${dev.machineNumber}`,
              },
            )
          : await this.axios.get<
              ExternalAttendanceDto[] | { data: ExternalAttendanceDto[] }
            >('', {
              params,
              paramsSerializer: (p) =>
                ['machineNumber', 'ipAddress', 'port', 'from', 'to']
                  .filter(
                    (k) =>
                      (p as any)[k] !== undefined && (p as any)[k] !== null,
                  )
                  .map((k) => `${k}=${encodeURIComponent((p as any)[k])}`)
                  .join('&'),
            })) as any;
        attempted = true;
        let raw: unknown = resp.data as any;
        let parsedFromString = false;
        if (typeof raw === 'string') {
          const preview = raw.slice(0, 200).replace(/\s+/g, ' ');
          this.logger.warn(
            `[AttendanceSync] External returned a STRING (len=${(raw as string).length}) for ${dev.ip}:${dev.port}#${dev.machineNumber}. Preview: ${preview}...`,
          );
          try {
            raw = JSON.parse(raw as string);
            parsedFromString = true;
            this.logger.log(
              `[AttendanceSync] Parsed string as JSON successfully for ${dev.ip}:${dev.port}#${dev.machineNumber}`,
            );
          } catch (e) {
            this.logger.warn(
              `[AttendanceSync] Could not parse string response as JSON for ${dev.ip}:${dev.port}#${dev.machineNumber}: ${(e as Error).message}`,
            );
          }
        }
        if (this.isDebug()) {
          this.logger.log(
            `[AttendanceSync][debug] Response shape: ${this.describeShape(raw)} (parsedFromString=${parsedFromString}) for ${dev.ip}:${dev.port}#${dev.machineNumber}`,
          );
          if (Array.isArray(raw)) {
            this.logger.log(
              `[AttendanceSync][debug] First item keys/types: ${this.sampleItemKeys(raw as any[])}`,
            );
          } else if (raw && typeof raw === 'object') {
            const dataObj = (raw as any).data;
            if (Array.isArray(dataObj))
              this.logger.log(
                `[AttendanceSync][debug] data is array, first item keys/types: ${this.sampleItemKeys(dataObj as any[])}`,
              );
            else if (dataObj && typeof dataObj === 'object')
              this.logger.log(
                `[AttendanceSync][debug] data shape: ${this.describeShape(dataObj)}`,
              );
          }
        }
        const list: ExternalAttendanceDto[] = this.extractAttendanceList(raw);
        if (!list.length) {
          this.logger.warn(
            `[AttendanceSync] External returned 0 registros for ${dev.ip}:${dev.port}#${dev.machineNumber}; shape=${this.describeShape(raw)}`,
          );
          if (this.isDebug() && raw && typeof raw === 'object') {
            const dataObj = (raw as any).data;
            const nestedShape = this.describeShape(dataObj);
            this.logger.warn(
              `[AttendanceSync][debug] nested data shape: ${nestedShape}`,
            );
          }
          continue;
        }
        if (this.isDebug() && Array.isArray(list)) {
          this.logger.log(
            `[AttendanceSync][debug] Extracted list length=${list.length}, first item keys/types: ${this.sampleItemKeys(list as any[])}`,
          );
        }
        this.logger.log(
          `[AttendanceSync] External returned ${list.length} registros for ${dev.ip}:${dev.port}#${dev.machineNumber}`,
        );
        const buffer: Attendance[] = [];
        let skippedInvalidMachine = 0;
        let skippedInvalidUser = 0;
        let skippedInvalidTime = 0;
        for (const item of list) {
          const parsed = this.mapExternalItem(item);
          if (!parsed) {
            // Diagnose which field failed
            const machine = this.parseNumberLike(
              this.pickFirst(item, [
                'attendanceMachineID',
                'machineNumber',
                'machineNo',
                'deviceId',
                'deviceID',
              ]),
            );
            const userId = this.parseNumberLike(
              this.pickFirst(item, [
                'userId',
                'userID',
                'user_id',
                'uid',
                'pin',
                'employeeId',
                'enrollId',
                'empId',
                'UserID',
                'UserId',
                'PIN',
                'Pin',
                'EnrollNumber',
                'enrollNumber',
                'enroll_no',
                'enrollNo',
                'empCode',
                'employeeCode',
                'cardNo',
                'cardNumber',
              ]),
            );
            const attendanceTime = this.normalizeDate(
              this.pickFirst(item, [
                'attendanceTime',
                'timestamp',
                'time',
                'dateTime',
                'datetime',
                'checkTime',
                'attTime',
                'punch_time',
              ]) as any,
            );
            if (!Number.isFinite(machine as any)) skippedInvalidMachine++;
            else if (!Number.isFinite(userId as any)) {
              skippedInvalidUser++;
              if (this.isDebug() && invalidUserSamples.length < 3) {
                try {
                  const candKeys = Object.keys(item).filter((k) =>
                    /user|pin|emp|enroll|card/i.test(k),
                  );
                  const snap = candKeys
                    .slice(0, 6)
                    .map((k) => {
                      const v = (item as any)[k];
                      const pv = typeof v === 'string' ? v.slice(0, 60) : v;
                      return `${k}=${JSON.stringify(pv)}`;
                    })
                    .join(', ');
                  invalidUserSamples.push(snap || '(no user-like keys)');
                } catch {
                  // ignore
                }
              }
            } else if (!attendanceTime) skippedInvalidTime++;
            continue;
          }

          // Count if user id came via loose digit extraction
          if (typeof (item as any)?.userId === 'string') {
            const rawStr = String((item as any).userId);
            if (!/^\s*-?\d+\s*$/.test(rawStr) && /-?\d+/.test(rawStr)) {
              looseUserDigitsCount++;
            }
          }

          buffer.push(parsed);
          if (!this.repo.addManyIfNotExists && buffer.length >= 1) {
            const one = buffer.shift()!;
            const res = await this.repo.addIfNotExists(one);
            if (res.inserted) upsertedTotal += 1;
            else matchedTotal += 1;
          }
          if (this.repo.addManyIfNotExists && buffer.length >= bulkSize) {
            const chunk = buffer.splice(0, buffer.length);
            const t0 = Date.now();
            const res = await this.repo.addManyIfNotExists!(chunk);
            const tookChunk = Date.now() - t0;
            upsertedTotal += res.upserted;
            matchedTotal += res.matched;
            this.logger.log(
              `[AttendanceSync] Chunk saved for ${dev.ip}:${dev.port}#${dev.machineNumber}: size=${chunk.length}, upserted=${res.upserted}, matched=${res.matched} (took ${tookChunk}ms)`,
            );
          }
        }
        if (buffer.length) {
          if (this.repo.addManyIfNotExists) {
            const t0 = Date.now();
            const res = await this.repo.addManyIfNotExists!(buffer);
            const tookChunk = Date.now() - t0;
            upsertedTotal += res.upserted;
            matchedTotal += res.matched;
            this.logger.log(
              `[AttendanceSync] Chunk saved (final) for ${dev.ip}:${dev.port}#${dev.machineNumber}: size=${buffer.length}, upserted=${res.upserted}, matched=${res.matched} (took ${tookChunk}ms)`,
            );
          } else {
            for (const it of buffer) {
              const res = await this.repo.addIfNotExists(it);
              if (res.inserted) upsertedTotal += 1;
              else matchedTotal += 1;
            }
          }
        }
        const took = Date.now() - startedDev;
        if (skippedInvalidMachine || skippedInvalidUser || skippedInvalidTime) {
          this.logger.warn(
            `[AttendanceSync] Skipped items for ${dev.ip}:${dev.port}#${dev.machineNumber}: invalidMachine=${skippedInvalidMachine}, invalidUser=${skippedInvalidUser}, invalidTime=${skippedInvalidTime}`,
          );
          if (this.isDebug() && invalidUserSamples.length) {
            this.logger.warn(
              `[AttendanceSync][debug] Example user-like fields from invalid items for ${dev.ip}:${dev.port}#${dev.machineNumber}: ${invalidUserSamples.join(' | ')}`,
            );
          }
        }
        if (this.isDebug() && looseUserDigitsCount > 0) {
          this.logger.warn(
            `[AttendanceSync][debug] Extracted userId from alphanumeric values using digits-only fallback ${looseUserDigitsCount} times for ${dev.ip}:${dev.port}#${dev.machineNumber}`,
          );
        }
        this.logger.log(
          `[AttendanceSync] Saved for ${dev.ip}:${dev.port}#${dev.machineNumber}: upserted=${upsertedTotal}, matched=${matchedTotal} (took ${took}ms)`,
        );
      } catch (e) {
        this.logger.warn(
          `[AttendanceSync] Device ${dev.ip}:${dev.port}#${dev.machineNumber} failed: ${(e as Error).message}`,
        );
      } finally {
        if (!this.queue && attempted && i < devices.length - 1 && delayMs > 0) {
          this.logger.log(
            `[AttendanceSync] Waiting ${Math.round(delayMs / 1000)}s before next request...`,
          );
          await this.sleep(delayMs);
        }
      }
    }
  }
}
