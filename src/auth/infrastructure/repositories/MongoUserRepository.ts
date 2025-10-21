import { Injectable } from '@nestjs/common';
import { Collection, ObjectId, WithId } from 'mongodb';
import { User } from '../../domain/models/user';
import type { UserRepository } from '../../domain/interfaces/userRepository';
import { connectMongo } from '../../../database/mongodb';

@Injectable()
export class MongoUserRepository implements UserRepository {
  private async getCollection(): Promise<Collection> {
    const db = await connectMongo();
    return db.collection('users');
  }

  async create(user: User): Promise<User> {
    const collection = await this.getCollection();
    const doc = {
      name: user.name,
      email: user.email,
      password: user.password,
      createdAt: user.createdAt,
    };

    const result = await collection.insertOne(doc);
    return new User(
      result.insertedId.toString(),
      user.name,
      user.email,
      user.password,
      user.createdAt,
    );
  }

  async findById(id: string): Promise<User | null> {
    const collection = await this.getCollection();
    const doc = (await collection.findOne({
      _id: new ObjectId(id),
    })) as WithId<User>;
    if (!doc) return null;

    return new User(
      doc._id.toString(),
      doc.name,
      doc.email,
      doc.password,
      doc.createdAt,
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const collection = await this.getCollection();
    const doc = (await collection.findOne({ email })) as WithId<User>;
    if (!doc) return null;

    return new User(
      doc._id.toString(),
      doc.name,
      doc.email,
      doc.password,
      doc.createdAt,
    );
  }

  async findAll(): Promise<User[]> {
    const collection = await this.getCollection();
    const docs = (await collection.find().toArray()) as WithId<User>[];
    return docs.map(
      (doc) =>
        new User(
          doc._id.toString(),
          doc.name,
          doc.email,
          doc.password,
          doc.createdAt,
        ),
    );
  }

  async update(id: string, user: User): Promise<User | null> {
    const collection = await this.getCollection();
    const updateDoc: Partial<User> = {};
    if (user.name) updateDoc.name = user.name;
    if (user.email) updateDoc.email = user.email;
    if (user.password) updateDoc.password = user.password;

    const result = (await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateDoc },
      { returnDocument: 'after' },
    )) as WithId<User>;

    if (!result) return null;

    return new User(
      result._id.toString(),
      result.name,
      result.email,
      result.password,
      result.createdAt,
    );
  }

  async delete(id: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}
