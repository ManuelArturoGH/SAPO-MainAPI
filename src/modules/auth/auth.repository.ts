import { Injectable } from '@nestjs/common';
import { connectMongo } from '../../database/mongodb.provider';
import { Collection, ObjectId, Db } from 'mongodb';
import { User } from './entities/user.entity';
import type { IUserRepository } from './interfaces/user-repository.interface';

interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class AuthRepository implements IUserRepository {
  private getCollection(db: Db): Collection<UserDocument> {
    return db.collection<UserDocument>('users');
  }

  private mapDoc(doc: UserDocument): User {
    return new User(
      doc._id.toHexString(),
      doc.email,
      doc.passwordHash,
      doc.name,
      doc.role,
      doc.isActive,
      doc.createdAt,
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const db = await connectMongo();
    const collection = this.getCollection(db);
    const doc = await collection.findOne({ email: email.toLowerCase() });
    if (!doc) return null;
    return this.mapDoc(doc);
  }

  async findById(id: string): Promise<User | null> {
    const db = await connectMongo();
    const collection = this.getCollection(db);

    if (!ObjectId.isValid(id)) return null;

    const doc = await collection.findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    return this.mapDoc(doc);
  }

  async create(user: User): Promise<User | null> {
    const db = await connectMongo();
    const collection = this.getCollection(db);
    const generatedId = new ObjectId();
    const now = new Date();

    const doc: UserDocument = {
      _id: generatedId,
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: now,
    };

    const result = await collection.insertOne(doc);
    if (!result.insertedId) return null;
    return this.mapDoc(doc);
  }

  async findAll(): Promise<User[]> {
    const db = await connectMongo();
    const collection = this.getCollection(db);
    const docs = await collection.find({}).toArray();
    return docs.map((doc) => this.mapDoc(doc));
  }

  async ensureIndexes(): Promise<void> {
    const db = await connectMongo();
    const collection = this.getCollection(db);
    await collection.createIndex({ email: 1 }, { unique: true });
  }
}
