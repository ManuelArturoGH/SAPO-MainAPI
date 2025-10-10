/*
  Migration: Shift attendance.attendanceTime by ATTENDANCE_DB_TIME_OFFSET_MINUTES

  Usage (Windows CMD):
    set ATTENDANCE_DB_TIME_OFFSET_MINUTES=360 && set DRY_RUN=false && npx ts-node scripts/migrate-attendance-time-offset.ts

  Notes:
  - Positive minutes move times earlier (subtract). Example: 360 subtracts 6 hours from attendanceTime.
  - DRY_RUN defaults to true (no writes). Set DRY_RUN=false to apply changes.
  - Optional environment FROM and TO (ISO string) to restrict by attendanceTime range.
*/
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import path from 'path';
import { connectMongo } from '../src/database/mongodb';
import { Db } from 'mongodb';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function getOffsetMinutes(): number {
  const raw = Number(process.env.ATTENDANCE_DB_TIME_OFFSET_MINUTES ?? 0);
  if (!Number.isFinite(raw)) return 0;
  return raw;
}

function getDateEnv(name: string): Date | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return undefined;
  return d;
}

async function run() {
  const offset = getOffsetMinutes();
  const dryRun = (process.env.DRY_RUN ?? 'true').toLowerCase() !== 'false';
  if (!offset) {
    console.log('ATTENDANCE_DB_TIME_OFFSET_MINUTES is 0 or invalid. Nothing to do.');
    return;
  }
  console.log(`Offset minutes: ${offset} (times will be shifted earlier by ${offset} minutes)`);
  console.log(`DRY_RUN=${dryRun}`);

  const from = getDateEnv('FROM');
  const to = getDateEnv('TO');
  if (from) console.log('Filtering FROM:', from.toISOString());
  if (to) console.log('Filtering TO  :', to.toISOString());

  const db: Db = await connectMongo();
  const col = db.collection('attendances');

  const filter: any = {};
  if (from || to) {
    filter.attendanceTime = {} as any;
    if (from) filter.attendanceTime.$gte = from;
    if (to) filter.attendanceTime.$lte = to;
  }

  const cursor = col.find(filter, { projection: { _id: 1, attendanceTime: 1 } });
  const batchSize = 1000;
  let batch: any[] = [];
  let total = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) break;
    const when: Date = doc.attendanceTime instanceof Date
      ? doc.attendanceTime
      : new Date(doc.attendanceTime);
    if (!Number.isFinite(when.getTime())) continue;
    const shifted = new Date(when.getTime() - offset * 60_000);
    batch.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { attendanceTime: shifted } },
      },
    });
    if (batch.length >= batchSize) {
      if (!dryRun) await (col as any).bulkWrite(batch, { ordered: false });
      total += batch.length;
      console.log(`Processed ${total} updates...`);
      batch = [];
    }
  }
  if (batch.length) {
    if (!dryRun) await (col as any).bulkWrite(batch, { ordered: false });
    total += batch.length;
  }

  console.log(`Done. ${dryRun ? 'Simulated' : 'Applied'} updates: ${total}`);
}

run().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
