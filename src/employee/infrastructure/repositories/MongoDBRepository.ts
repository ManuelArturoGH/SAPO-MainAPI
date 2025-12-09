import { Injectable, Logger } from '@nestjs/common';
import { connectMongo } from '../../../database/mongodb';
import { Collection, ObjectId, Db, UpdateResult } from 'mongodb';
import { Employee } from '../../domain/models/employee';
import type { EmployeeRepository } from '../../domain/interfaces/employeeRepository';

interface EmployeeDocument {
  _id: ObjectId;
  profile?: string;
  name: string;
  isActive: boolean;
  department: string;
  createdAt: Date;
  externalId?: number; // Nuevo campo opcional para registros sincronizados
  position?: string; // Nuevo campo para el puesto
  profileImageUrl?: string; // URL de la imagen de perfil en Cloudinary
}

@Injectable()
export class MongoDBRepository implements EmployeeRepository {
  private readonly logger = new Logger(MongoDBRepository.name);

  private getCollection(db: Db): Collection<EmployeeDocument> {
    return db.collection<EmployeeDocument>('employees');
  }

  private mapDoc(doc: EmployeeDocument): Employee {
    return new Employee(
      doc._id.toHexString(),
      doc.profile ? doc.profile : '',
      doc.name,
      doc.isActive,
      doc.department,
      doc.createdAt ?? new Date(),
      doc.externalId,
      doc.position || 'sin asignar',
      doc.profileImageUrl,
    );
  }

  async getAllEmployees(): Promise<Employee[] | null> {
    const db = await connectMongo();
    const collection = this.getCollection(db);
    const employees = await collection.find({}).toArray();
    if (!employees.length) return [];
    return employees.map((emp) => this.mapDoc(emp));
  }

  async addEmployee(employee: Employee): Promise<Employee | null> {
    const db = await connectMongo();
    const collection = this.getCollection(db);
    const generatedId = new ObjectId();
    const now = new Date();
    const doc: EmployeeDocument = {
      _id: generatedId,
      name: employee.name,
      isActive: employee.isActive,
      department: employee.department,
      createdAt: now,
      externalId: employee.externalId,
      position: employee.position || 'sin asignar',
    };
    const result = await collection.insertOne(doc);
    if (!result.insertedId) return null;
    return this.mapDoc(doc);
  }

  async getEmployees(params: {
    page: number;
    limit: number;
    department?: string;
    isActive?: boolean;
    position?: string;
    sortBy?: 'name' | 'department' | 'createdAt';
    sortDir?: 'asc' | 'desc';
  }): Promise<{
    data: Employee[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page,
      limit,
      department,
      isActive,
      position,
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = params;
    const db = await connectMongo();
    const collection = this.getCollection(db);
    const filter: Record<string, unknown> = {};
    if (typeof isActive === 'boolean') filter.isActive = isActive;
    if (department) filter.department = department;
    if (position) filter.position = position;

    const skip = (page - 1) * limit;
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      department: 'department',
      createdAt: 'createdAt',
    };
    const sortField = sortFieldMap[sortBy] ?? 'createdAt';
    const sortSpec: Record<string, 1 | -1> = {
      [sortField]: sortDir === 'asc' ? 1 : -1,
    };

    const cursor = collection
      .find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit);
    const docs = await cursor.toArray();
    const total = await collection.countDocuments(filter);
    return {
      data: docs.map((d) => this.mapDoc(d)),
      total,
      page,
      limit,
    };
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    const db = await connectMongo();
    const collection = this.getCollection(db);
    if (!ObjectId.isValid(id)) return null;
    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return this.mapDoc(doc);
  }

  async updateEmployee(
    id: string,
    data: Partial<{
      name: string;
      department: string;
      isActive: boolean;
      position: string;
      profileImageUrl: string;
    }>,
  ): Promise<Employee | null> {
    const db = await connectMongo();
    const collection = this.getCollection(db);
    if (!ObjectId.isValid(id)) return null;
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.department !== undefined) update.department = data.department;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    if (data.position !== undefined)
      update.position = data.position || 'sin asignar';
    if (data.profileImageUrl !== undefined)
      update.profileImageUrl = data.profileImageUrl;
    if (Object.keys(update).length === 0) return this.getEmployeeById(id);

    const updateResult = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: update },
    );
    if (updateResult.matchedCount === 0) return null;
    return this.getEmployeeById(id);
  }

  async softDeleteEmployee(id: string): Promise<Employee | null> {
    const db = await connectMongo();
    const collection = this.getCollection(db);
    if (!ObjectId.isValid(id)) return null;

    const updateResult = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: false } },
    );
    if (updateResult.matchedCount === 0) return null;
    return this.getEmployeeById(id);
  }

  // Upsert usado por la sincronización externa (no expuesto en interfaz pública)
  async upsertExternalEmployee(data: {
    externalId: number;
    name: string;
    isActive: boolean;
    department: string;
  }): Promise<{
    updated: boolean;
    created: boolean;
    employee: Employee | null;
  }> {
    const db = await connectMongo();
    const collection = this.getCollection(db);
    const now = new Date();
    const res: UpdateResult = await collection.updateOne(
      { externalId: data.externalId },
      {
        $set: {
          name: data.name,
          isActive: data.isActive,
          department: data.department,
        },
        $setOnInsert: {
          createdAt: now,
          externalId: data.externalId,
          position: 'sin asignar',
        },
      },
      { upsert: true },
    );
    const created = !!res.upsertedId;
    const match = await collection.findOne({ externalId: data.externalId });
    return {
      updated: !created,
      created,
      employee: match ? this.mapDoc(match) : null,
    };
  }

  async bulkUpsertExternalEmployees(
    datas: Array<{
      externalId: number;
      name: string;
      isActive: boolean;
      department: string;
    }>,
  ): Promise<{ upserted: number; matched: number }> {
    if (!datas.length) return { upserted: 0, matched: 0 };
    const db = await connectMongo();
    const collection = this.getCollection(db);
    const now = new Date();
    const ops = datas.map((d) => ({
      updateOne: {
        filter: { externalId: d.externalId },
        update: {
          $set: {
            name: d.name,
            isActive: d.isActive,
            department: d.department,
          },
          $setOnInsert: {
            createdAt: now,
            externalId: d.externalId,
            position: 'sin asignar',
          },
        },
        upsert: true,
      },
    }));
    const res = await collection.bulkWrite(ops, { ordered: false });
    const upserted = res.upsertedCount || 0;
    const matched = res.matchedCount || 0;
    return { upserted, matched };
  }
}
