import { Injectable, Logger } from '@nestjs/common';
import { Collection, Db, ObjectId } from 'mongodb';
import { connectMongo } from '../../../database/mongodb';
import type { AttendanceRepository } from '../../domain/interfaces/attendanceRepository';
import { Attendance } from '../../domain/models/attendance';

interface AttendanceDocument {
  _id: ObjectId;
  attendanceMachineID: number;
  userId: number;
  attendanceTime: Date;
  accessMode: string;
  attendanceStatus: string;
  createdAt: Date;
}

@Injectable()
export class MongoAttendanceRepository implements AttendanceRepository {
  private readonly logger = new Logger(MongoAttendanceRepository.name);

  private getCollection(db: Db): Collection<AttendanceDocument> {
    return db.collection<AttendanceDocument>('attendances');
  }

  private map(doc: AttendanceDocument): Attendance {
    return new Attendance(
      doc._id.toHexString(),
      doc.attendanceMachineID,
      doc.userId,
      new Date(doc.attendanceTime),
      doc.accessMode,
      doc.attendanceStatus,
      doc.createdAt ?? new Date(),
    );
  }

  async addIfNotExists(
    att: Attendance,
  ): Promise<{ inserted: boolean; existingId?: string | null }> {
    const db = await connectMongo();
    const col = this.getCollection(db);
    const when = new Date(att.attendanceTime);
    const doc: AttendanceDocument = {
      _id: new ObjectId(),
      attendanceMachineID: att.attendanceMachineID,
      userId: att.userId,
      attendanceTime: when,
      accessMode: att.accessMode,
      attendanceStatus: att.attendanceStatus,
      createdAt: new Date(),
    };
    const existing = await col.findOne({
      attendanceMachineID: doc.attendanceMachineID,
      userId: doc.userId,
      attendanceTime: doc.attendanceTime,
    });
    if (existing)
      return { inserted: false, existingId: existing._id.toHexString() };
    const res = await col.insertOne(doc);
    if (!res.insertedId) return { inserted: false };
    return { inserted: true, existingId: doc._id.toHexString() };
  }

  async addManyIfNotExists(
    atts: Attendance[],
  ): Promise<{ upserted: number; matched: number }> {
    if (!atts.length) return { upserted: 0, matched: 0 };
    const db = await connectMongo();
    const col = this.getCollection(db);
    const now = new Date();
    const ops = atts.map((att) => {
      const when = new Date(att.attendanceTime);
      const filter = {
        attendanceMachineID: att.attendanceMachineID,
        userId: att.userId,
        attendanceTime: when,
      } as const;
      return {
        updateOne: {
          filter,
          update: {
            $setOnInsert: {
              _id: new ObjectId(),
              attendanceMachineID: filter.attendanceMachineID,
              userId: filter.userId,
              attendanceTime: filter.attendanceTime,
              accessMode: att.accessMode,
              attendanceStatus: att.attendanceStatus,
              createdAt: now,
            },
          },
          upsert: true,
        },
      } as const;
    });
    const res = await (col as any).bulkWrite(ops, { ordered: false });
    // res.upsertedCount: number of inserted new docs; matchedCount counts matches for updateOne
    const upserted = (res.upsertedCount as number) || 0;
    const matched = (res.matchedCount as number) || 0;
    return { upserted, matched };
  }

  async getAttendances(params: {
    page: number;
    limit: number;
    userId?: number;
    machineNumber?: number;
    from?: Date;
    to?: Date;
    sortDir?: 'asc' | 'desc';
  }) {
    const {
      page,
      limit,
      userId,
      machineNumber,
      from,
      to,
      sortDir = 'desc',
    } = params;
    const db = await connectMongo();
    const col = this.getCollection(db);
    const filter: any = {};
    if (userId !== undefined) filter.userId = userId;
    if (machineNumber !== undefined) filter.attendanceMachineID = machineNumber; // map alias
    if (from || to) {
      filter.attendanceTime = {};
      if (from) filter.attendanceTime.$gte = from;
      if (to) filter.attendanceTime.$lte = to;
    }
    const skip = (page - 1) * limit;
    const sortSpec = { attendanceTime: sortDir === 'asc' ? 1 : -1 } as const;
    const cursor = col.find(filter).sort(sortSpec).skip(skip).limit(limit);
    const docs = await cursor.toArray();
    const total = await col.countDocuments(filter);
    return { data: docs.map((d) => this.map(d)), total, page, limit };
  }
}
