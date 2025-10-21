import { Injectable } from '@nestjs/common';
import { Collection, Db, ObjectId } from 'mongodb';
import { connectMongo } from '../../../database/mongodb';
import { Device } from '../../domain/models/device';
import type { DeviceRepository } from '../../domain/interfaces/deviceRepository';

interface DeviceDocument {
  _id: ObjectId;
  ip: string;
  port: number;
  machineNumber: number;
  createdAt: Date;
}

@Injectable()
export class MongoDeviceRepository implements DeviceRepository {
  private getCollection(db: Db): Collection<DeviceDocument> {
    return db.collection<DeviceDocument>('devices');
  }

  async addDevice(device: Device): Promise<Device | null> {
    const db = await connectMongo();
    const col = this.getCollection(db);
    const exists = await col.findOne({
      ip: device.ip,
      port: device.port,
      machineNumber: device.machineNumber,
    });
    if (exists) return null; // Unicidad ip+port+machineNumber
    const _id = new ObjectId();
    const doc: DeviceDocument = {
      _id,
      ip: device.ip,
      port: device.port,
      machineNumber: device.machineNumber,
      createdAt: new Date(),
    };
    const res = await col.insertOne(doc);
    if (!res.insertedId) return null;
    return new Device(
      doc._id.toHexString(),
      doc.ip,
      doc.port,
      doc.machineNumber,
      doc.createdAt,
    );
  }

  async getDevices(params: {
    page: number;
    limit: number;
    ip?: string;
    port?: number;
    machineNumber?: number;
  }) {
    const { page, limit, ip, port, machineNumber } = params;
    const db = await connectMongo();
    const col = this.getCollection(db);
    const filter: Record<string, unknown> = {};
    if (ip) filter.ip = ip;
    if (port !== undefined) filter.port = port;
    if (machineNumber !== undefined) filter.machineNumber = machineNumber;
    const skip = (page - 1) * limit;
    const cursor = col
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const docs = await cursor.toArray();
    const total = await col.countDocuments(filter);
    return {
      data: docs.map(
        (d) =>
          new Device(
            d._id.toHexString(),
            d.ip,
            d.port,
            d.machineNumber,
            d.createdAt,
          ),
      ),
      total,
      page,
      limit,
    };
  }

  async getDeviceById(id: string): Promise<Device | null> {
    if (!ObjectId.isValid(id)) return null;
    const db = await connectMongo();
    const col = this.getCollection(db);
    const doc = await col.findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return new Device(
      doc._id.toHexString(),
      doc.ip,
      doc.port,
      doc.machineNumber,
      doc.createdAt,
    );
  }

  async deleteDevice(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const db = await connectMongo();
    const col = this.getCollection(db);
    const res = await col.deleteOne({ _id: new ObjectId(id) });
    return res.deletedCount === 1;
  }
}
