import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { Logger } from '@nestjs/common';

interface MongoConnection {
  client: MongoClient;
  db: Db;
}

class MongoDBConnection {
  private static instance: MongoDBConnection;
  private connection: MongoConnection | null = null;
  private connecting: Promise<MongoConnection> | null = null;
  private readonly logger = new Logger('MongoDB');

  private constructor() {}

  static getInstance(): MongoDBConnection {
    if (!MongoDBConnection.instance) {
      MongoDBConnection.instance = new MongoDBConnection();
    }
    return MongoDBConnection.instance;
  }

  private getUri(): string {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    return uri;
  }

  private getDbName(): string {
    const dbName = process.env.MONGODB_DB?.trim();
    if (!dbName) {
      throw new Error('MONGODB_DB environment variable is not set');
    }
    return dbName;
  }

  private getOptions(): MongoClientOptions {
    return {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 20,
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE) || 5,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
      writeConcern: { w: 'majority', wtimeout: 5000 },
      readPreference: 'primaryPreferred',
    };
  }

  async connect(): Promise<MongoConnection> {
    if (this.connection) {
      return this.connection;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = this.establishConnection();

    try {
      this.connection = await this.connecting;
      return this.connection;
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB', error);
      throw error;
    } finally {
      this.connecting = null;
    }
  }

  private async establishConnection(): Promise<MongoConnection> {
    const uri = this.getUri();
    const dbName = this.getDbName();
    const options = this.getOptions();

    const client = new MongoClient(uri, options);

    try {
      await client.connect();

      // Verificar la conexión
      await client.db('admin').command({ ping: 1 });

      const db = client.db(dbName);

      this.logger.log(`Connected to MongoDB database: ${dbName}`);

      return { client, db };
    } catch (error) {
      await client.close();
      throw error;
    }
  }

  getDb(): Db {
    if (!this.connection) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.connection.db;
  }

  getClient(): MongoClient {
    if (!this.connection) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.connection.client;
  }

  async close(force = false): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.client.close(force);
        this.logger.log('MongoDB connection closed');
      } catch (error) {
        this.logger.error('Error closing MongoDB connection', error);
      } finally {
        this.connection = null;
      }
    }
  }

  isConnected(): boolean {
    return !!this.connection;
  }
}

// Funciones públicas para mantener compatibilidad
const mongoInstance = MongoDBConnection.getInstance();

export async function connectMongo(): Promise<Db> {
  const connection = await mongoInstance.connect();
  return connection.db;
}

export function getMongoDb(): Db {
  return mongoInstance.getDb();
}

export function getMongoClient(): MongoClient {
  return mongoInstance.getClient();
}

export async function closeMongo(force = false): Promise<void> {
  await mongoInstance.close(force);
}

export function hasActiveClient(): boolean {
  return mongoInstance.isConnected();
}

// Utilidad para ejecutar operaciones con manejo de errores
export async function withDb<T>(operation: (db: Db) => Promise<T>): Promise<T> {
  const db = await connectMongo();
  return operation(db);
}

// Utilidad para transacciones (solo para replica sets)
export async function withTransaction<T>(
  operation: (db: Db) => Promise<T>,
): Promise<T> {
  const client = getMongoClient();
  const session = client.startSession();

  try {
    let result: T;

    await session.withTransaction(async () => {
      const db = getMongoDb();
      result = await operation(db);
    });

    return result!;
  } finally {
    await session.endSession();
  }
}
