import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { CacheService } from './cache.service';
import type { EmployeeRepository } from '../../domain/interfaces/employeeRepository';
import { CronJob } from 'cron';
import type { DeviceRepository } from '../../../device/domain/interfaces/deviceRepository';
import { RequestQueueService } from '../../../shared/request-queue.service';

interface ExternalEmployeeDto {
  id: number;
  name: string;
  fingerPrintId?: number; // ignorado
  privilege?: number; // ignorado
  isActive: boolean;
}

export interface SyncStats {
  // export para evitar TS4053 en controlador
  lastRunAt: Date | null;
  lastTrigger: string | null;
  processed: number;
  devicesQueried: number;
  durationMs: number;
  lastMachineNumber?: number | null;
}

@Injectable()
export class ExternalEmployeeSyncService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ExternalEmployeeSyncService.name);
  private axios: AxiosInstance;
  private intervalRef: ReturnType<typeof setInterval> | null = null;
  private cronJobs: CronJob[] = [];
  private running = false;
  private stats: SyncStats = {
    lastRunAt: null,
    lastTrigger: null,
    processed: 0,
    devicesQueried: 0,
    durationMs: 0,
    lastMachineNumber: null,
  };
  private lastEmployees: Array<{
    externalId: number;
    name: string;
    isActive: boolean;
    machineNumber?: number;
  }> = [];
  private lastRawResponses: Array<{
    machineNumber?: number;
    ip?: string;
    port?: number;
    status?: number;
    rawType: string;
    rawSnippet: string;
    rawLength: number;
  }> = [];

  private readonly debugEnabled =
    (process.env.EXTERNAL_SYNC_DEBUG ?? 'false').toLowerCase() === 'true';
  private debug(msg: string) {
    if (this.debugEnabled) this.logger.log(`[DBG] ${msg}`);
  }

  constructor(
    private readonly cache: CacheService,
    @Inject('EmployeeRepository')
    private readonly employeeRepo: EmployeeRepository,
    @Inject('DeviceRepository') private readonly deviceRepo: DeviceRepository,
    @Optional() private readonly queue?: RequestQueueService,
  ) {
    const rawBase =
      process.env.EXTERNAL_EMP_API_URL || 'http://localhost:4000/api';
    const baseNormalized = rawBase.replace(/\/?$/, ''); // remove trailing slash if any
    // Enforce final /employees segment (avoid duplicating if user already put it)
    const finalBase = /\/employees$/i.test(baseNormalized)
      ? baseNormalized
      : `${baseNormalized}/employees`;
    this.axios = axios.create({ baseURL: finalBase, timeout: Number(process.env.EXTERNAL_EMP_API_TIMEOUT_MS ?? 60000) });
    this.logger.log(
      `[ExternalSync] Using external employees endpoint base: ${finalBase}`,
    );
  }

  getStats(): SyncStats {
    return { ...this.stats };
  }
  getLastEmployees() {
    return [...this.lastEmployees];
  }
  getLastRawResponses() {
    return [...this.lastRawResponses];
  }

  async triggerManual(
    machineNumber?: number,
  ): Promise<{ stats: SyncStats; employees: unknown[] }> {
    if (machineNumber !== undefined) {
      await this.safeRun('manual-device', machineNumber);
    } else {
      await this.safeRun('manual');
    }
    return { stats: this.getStats(), employees: this.getLastEmployees() };
  }

  async onModuleInit(): Promise<void> {
    if ((process.env.API_SYNC_ENABLED ?? 'true').toLowerCase() !== 'true') {
      this.logger.log('External sync disabled via API_SYNC_ENABLED');
      return;
    }
    const times = this.parseTimes(process.env.API_SYNC_TIMES || '');
    if (times.length) {
      this.logger.log(
        `Scheduling external employee sync at fixed times: ${times.map((t) => t.raw).join(', ')}`,
      );
      for (const t of times) {
        const cronExpr = `${t.minute} ${t.hour} * * *`; // min hour daily
        const job = new CronJob(cronExpr, () => {
          void this.safeRun('cron');
        });
        job.start();
        this.cronJobs.push(job);
      }
    } else {
      const minutes = parseInt(
        process.env.API_SYNC_INTERVAL_MINUTES || '90',
        10,
      );
      const ms = minutes * 60 * 1000;
      this.logger.log(
        `Scheduling external employee sync every ${minutes} minutes (interval fallback)`,
      );
      this.intervalRef = setInterval(() => {
        void this.safeRun('interval');
      }, ms);
    }
    if (
      (process.env.API_SYNC_RUN_AT_START ?? 'true').toLowerCase() === 'true'
    ) {
      void this.safeRun('startup');
    }
  }

  onModuleDestroy(): void {
    if (this.intervalRef) clearInterval(this.intervalRef as any);
    for (const job of this.cronJobs) job.stop();
    this.cronJobs = [];
  }

  private parseTimes(
    value: string,
  ): Array<{ hour: number; minute: number; raw: string }> {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((raw) => {
        const m = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
        if (!m) return null;
        return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10), raw };
      })
      .filter((x): x is { hour: number; minute: number; raw: string } => !!x);
  }

  private async safeRun(
    trigger: string,
    machineNumberFilter?: number,
  ): Promise<void> {
    if (this.running) {
      this.logger.warn(
        `External sync skipped (${trigger}) - previous run still in progress`,
      );
      return;
    }
    if (
      machineNumberFilter !== undefined &&
      (machineNumberFilter < 1 || machineNumberFilter > 254)
    ) {
      throw new BadRequestException('machineNumber fuera de rango (1-254)');
    }
    this.running = true;
    const started = Date.now();
    let processed = 0;
    let devices = 0;
    let employeesCollected: Array<{
      externalId: number;
      name: string;
      isActive: boolean;
      machineNumber?: number;
    }> = [];
    this.lastRawResponses = [];
    try {
      const result = await this.runSync(machineNumberFilter);
      processed = result.processed;
      devices = result.devicesQueried;
      employeesCollected = result.employees;
      const ms = Date.now() - started;
      this.logger.log(
        `External sync (${trigger}${machineNumberFilter !== undefined ? `#${machineNumberFilter}` : ''}) upserted ${processed} employees from ${devices} device(s) in ${ms}ms`,
      );
      if (processed > 0) this.cache.invalidateEmployeeLists();
    } catch (err) {
      this.logger.error(
        `External sync (${trigger}) failed: ${(err as Error).message}`,
        err as Error,
      );
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      )
        throw err;
    } finally {
      this.stats = {
        lastRunAt: new Date(),
        lastTrigger: trigger,
        processed,
        devicesQueried: devices,
        durationMs: Date.now() - started,
        lastMachineNumber: machineNumberFilter ?? null,
      };
      this.lastEmployees = employeesCollected;
      this.running = false;
    }
  }

  private async fetchAllDevices(): Promise<
    Array<{ ip: string; port: number; machineNumber: number }>
  > {
    const pageSize = 50;
    let page = 1;
    const result: Array<{ ip: string; port: number; machineNumber: number }> =
      [];
    while (true) {
      const batch = await this.deviceRepo.getDevices({ page, limit: pageSize });
      for (const d of batch.data) {
        result.push({
          ip: (d as any).ip,
          port: (d as any).port,
          machineNumber: (d as any).machineNumber,
        });
      }
      if (batch.data.length < pageSize) break;
      page++;
      if (page > 1000) break; // safety guard
    }
    return result;
  }

  private async fetchDeviceByMachineNumber(
    machineNumber: number,
  ): Promise<{ ip: string; port: number; machineNumber: number }> {
    const res = await this.deviceRepo.getDevices({
      page: 1,
      limit: 1,
      machineNumber,
    });
    if (!res.data.length)
      throw new NotFoundException(
        `Device con machineNumber ${machineNumber} no encontrado`,
      );
    const d = res.data[0] as any;
    return { ip: d.ip, port: d.port, machineNumber: d.machineNumber };
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getPerRequestDelayMs(): number {
    if (process.env.NODE_ENV === 'test') return 0;
    const raw = Number(process.env.API_SYNC_DELAY_MS ?? 60000);
    return Number.isFinite(raw) && raw >= 0 ? raw : 60000;
  }

  private async runSync(machineNumberFilter?: number): Promise<{
    processed: number;
    devicesQueried: number;
    employees: Array<{
      externalId: number;
      name: string;
      isActive: boolean;
      machineNumber?: number;
    }>;
  }> {
    const repoAny = this.employeeRepo as unknown as {
      upsertExternalEmployee?: (d: {
        externalId: number;
        name: string;
        isActive: boolean;
        department: string;
      }) => Promise<unknown>;
      bulkUpsertExternalEmployees?: (
        data: Array<{
          externalId: number;
          name: string;
          isActive: boolean;
          department: string;
        }>,
      ) => Promise<{ upserted: number; matched: number }>;
    };
    if (!repoAny.upsertExternalEmployee && !repoAny.bulkUpsertExternalEmployees) {
      this.logger.warn('Repository does not support external employee upsert');
      return { processed: 0, devicesQueried: 0, employees: [] };
    }

    let devices: Array<{ ip: string; port: number; machineNumber: number }> =
      [];
    if (machineNumberFilter !== undefined) {
      const single = await this.fetchDeviceByMachineNumber(machineNumberFilter);
      devices = [single];
    } else {
      devices = await this.fetchAllDevices();
    }

    const devicesQueried =
      devices.length || (machineNumberFilter !== undefined ? 1 : 0);
    const deviceList = devices.length
      ? devices
      : machineNumberFilter !== undefined
        ? []
        : [{ ip: undefined, port: undefined, machineNumber: undefined } as any];

    let processed = 0;
    const employeesCollected: Array<{
      externalId: number;
      name: string;
      isActive: boolean;
      machineNumber?: number;
    }> = [];
    this.lastRawResponses = [];

    const delayMs = this.getPerRequestDelayMs();
    const bulkSize = Math.max(
      1,
      parseInt(process.env.API_SYNC_BULK_SIZE || '500', 10) || 500,
    );

    for (let i = 0; i < deviceList.length; i++) {
      const dev = deviceList[i];
      let requestAttempted = false;
      try {
        // Skip devices with missing data to avoid 400 Bad Request on external API
        if (
          dev.ip === undefined ||
          dev.port === undefined ||
          dev.machineNumber === undefined
        ) {
          this.debug(
            `Skipping device with incomplete data ip=${dev.ip} port=${dev.port} machineNumber=${dev.machineNumber}`,
          );
          continue;
        }
        const queryParams: Record<string, string | number> = {
          machineNumber: dev.machineNumber,
          ipAddress: dev.ip,
          port: dev.port,
        };
        const orderedKeys = ['machineNumber', 'ipAddress', 'port'];
        const queryString = orderedKeys
          .filter((k) => queryParams[k] !== undefined)
          .map(
            (k) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(String(queryParams[k]))}`,
          )
          .join('&');
        this.debug(
          `[ExternalSync] Request -> ${this.axios.defaults.baseURL}?${queryString}`,
        );
        requestAttempted = true;
        const resp = (this.queue
          ? await this.queue.enqueue(
              () =>
                this.axios.get<
                  ExternalEmployeeDto[] | { data: ExternalEmployeeDto[] }
                >('', {
                  params: queryParams,
                  paramsSerializer: (p) =>
                    orderedKeys
                      .filter((k) => (p as any)[k] !== undefined)
                      .map(
                        (k) =>
                          `${encodeURIComponent(k)}=${encodeURIComponent(String((p as any)[k]))}`,
                      )
                      .join('&'),
                }),
              {
                delayMs,
                label: `employees ${dev.ip}:${dev.port}#${dev.machineNumber}`,
              },
            )
          : await this.axios.get<
              ExternalEmployeeDto[] | { data: ExternalEmployeeDto[] }
            >('', {
              params: queryParams,
              paramsSerializer: (p) =>
                orderedKeys
                  .filter((k) => (p as any)[k] !== undefined)
                  .map(
                    (k) =>
                      `${encodeURIComponent(k)}=${encodeURIComponent(String((p as any)[k]))}`,
                  )
                  .join('&'),
            })) as any;
        this.debug(
          `[ExternalSync] Response status ${resp.status} for device ${dev.ip}:${dev.port}#${dev.machineNumber}`,
        );
        const rawData: unknown = resp.data as unknown;
        const rawType = Array.isArray(rawData) ? 'array' : typeof rawData;
        let rawSnippet: string;
        try {
          rawSnippet =
            typeof rawData === 'string'
              ? rawData.slice(0, 1000)
              : JSON.stringify(rawData).slice(0, 1000);
        } catch {
          rawSnippet = '[unserializable]';
        }
        const rawLength =
          typeof rawData === 'string'
            ? rawData.length
            : Array.isArray(rawData)
              ? rawData.length
              : rawSnippet.length;
        this.debug(
          `[ExternalSync] Raw payload snippet for device ${dev.ip}:${dev.port}#${dev.machineNumber} (type=${rawType}, len=${rawLength}): ${rawSnippet}`,
        );
        const payload = this.parseExternalEmployees(rawData);
        this.lastRawResponses.push({
          machineNumber: dev.machineNumber,
          ip: dev.ip,
          port: dev.port,
          status: (resp as any).status,
          rawType,
          rawSnippet,
          rawLength,
        });
        if (!payload.length) {
          this.debug(
            `[ExternalSync] Empty/invalid payload for device ${dev.ip}:${dev.port}#${dev.machineNumber}`,
          );
        } else {
          const buffer: Array<{
            externalId: number;
            name: string;
            isActive: boolean;
            department: string;
          }> = [];
          let upsertedTotal = 0;
          let matchedTotal = 0;
          for (const item of payload) {
            // Normalizar id si viene como string numérica
            let idNum: number | null = null;
            if (typeof (item as any).id === 'number') idNum = (item as any).id as number;
            else if (typeof (item as any).id === 'string' && /^\d+$/.test((item as any).id))
              idNum = parseInt((item as any).id, 10);
            if (idNum === null) continue;
            const nameVal = (item as any).name;
            if (!nameVal || typeof nameVal !== 'string') continue;
            const activeVal = !!(item as any).isActive;
            const rec = {
              externalId: idNum,
              name: nameVal,
              isActive: activeVal,
              department: 'Bodega',
            };
            if (repoAny.bulkUpsertExternalEmployees) {
              buffer.push(rec);
              if (buffer.length >= bulkSize) {
                const t0 = Date.now();
                const res = await repoAny.bulkUpsertExternalEmployees(buffer.splice(0, buffer.length));
                const tookChunk = Date.now() - t0;
                upsertedTotal += res.upserted;
                matchedTotal += res.matched;
                this.logger.log(
                  `[ExternalSync] Chunk saved for ${dev.ip}:${dev.port}#${dev.machineNumber}: size=${res.upserted + res.matched}, upserted=${res.upserted}, matched=${res.matched} (took ${tookChunk}ms)`,
                );
              }
            } else if (repoAny.upsertExternalEmployee) {
              await repoAny.upsertExternalEmployee(rec);
            }
            processed++;
            employeesCollected.push({
              externalId: idNum,
              name: nameVal,
              isActive: activeVal,
              machineNumber: dev.machineNumber,
            });
          }
          if (buffer.length && repoAny.bulkUpsertExternalEmployees) {
            const t0 = Date.now();
            const res = await repoAny.bulkUpsertExternalEmployees(buffer);
            const tookChunk = Date.now() - t0;
            upsertedTotal += res.upserted;
            matchedTotal += res.matched;
            this.logger.log(
              `[ExternalSync] Chunk saved (final) for ${dev.ip}:${dev.port}#${dev.machineNumber}: size=${res.upserted + res.matched}, upserted=${res.upserted}, matched=${res.matched} (took ${tookChunk}ms)`,
            );
          }
        }
      } catch (error) {
        const anyErr: any = error;
        const status = anyErr?.response?.status;
        const data = anyErr?.response?.data;
        this.logger.warn(
          `Device sync failed for ${dev.ip ?? 'no-ip'}:${dev.port ?? '-'}#${dev.machineNumber ?? '-'} -> ${(error as Error).message}${status ? ` (status ${status})` : ''}${data ? ` body: ${JSON.stringify(data).slice(0, 500)}` : ''}`,
        );
      } finally {
        // Only apply local delay if queue is not available
        if (!this.queue && requestAttempted && i < deviceList.length - 1) {
          if (delayMs > 0) {
            this.logger.log(
              `[ExternalSync] Waiting ${Math.round(delayMs / 1000)}s before next device request...`,
            );
            await this.sleep(delayMs);
          }
        }
      }
    }
    return { processed, devicesQueried, employees: employeesCollected };
  }

  private parseExternalEmployees(raw: unknown): ExternalEmployeeDto[] {
    // Caso 1: array directa
    if (Array.isArray(raw))
      return raw.filter((r) => r && typeof r === 'object');
    // Caso 2: objeto con data (array)
    if (raw && typeof raw === 'object') {
      const maybe = (raw as any).data;
      if (Array.isArray(maybe))
        return maybe.filter((r: any) => r && typeof r === 'object');
    }
    // Caso 3: string que parece JSON válido -> intentar parsear una vez
    if (typeof raw === 'string') {
      const t = raw.trim();
      if (
        (t.startsWith('{') && t.endsWith('}')) ||
        (t.startsWith('[') && t.endsWith(']'))
      ) {
        try {
          return this.parseExternalEmployees(JSON.parse(t));
        } catch {
          /* ignore */
        }
      }
    }
    return [];
  }
}
