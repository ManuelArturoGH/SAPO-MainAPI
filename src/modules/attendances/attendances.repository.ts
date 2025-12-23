import { Injectable } from '@nestjs/common';
import { Collection, Db, ObjectId } from 'mongodb';
import { connectMongo } from '../../database/mongodb.provider';
import type { AttendanceRepository } from './interfaces/attendance-repository.interface';
import { Attendance } from './entities/attendance.entity';
import { Filter } from 'mongodb';

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
export class AttendancesRepository implements AttendanceRepository {
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
      const dated = new Date(att.attendanceTime);
      const correctedDate = new Date(
        dated.getFullYear(),
        dated.getMonth(),
        dated.getDate(),
        dated.getHours() - 6,
        dated.getMinutes(),
        dated.getSeconds(),
      );
      const filter = {
        attendanceMachineID: att.attendanceMachineID,
        userId: att.userId,
        attendanceTime: correctedDate,
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
    const res = await col.bulkWrite(ops, { ordered: false });
    // res.upsertedCount: number of inserted new docs; matchedCount counts matches for updateOne
    const upserted = res.upsertedCount || 0;
    const matched = res.matchedCount || 0;
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
    const filter: Filter<AttendanceDocument> = {};

    if (userId !== undefined) filter.userId = userId;
    if (machineNumber !== undefined) filter.attendanceMachineID = machineNumber;
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
