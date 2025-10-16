// src/database/mongodb.ts
import { MongoClient, Db, MongoClientOptions, ClientSession } from 'mongodb';

interface MongoConfig {
  uri?: string;
  dbName?: string;
  options?: MongoClientOptions;
}

// Lazy readers para evitar capturar valores antes de que dotenv cargue.
function resolveUri(): string {
  const raw = process.env.MONGODB_URI || '';
  return raw.trim() || 'mongodb://localhost:27017';
}
function resolveDb(): string {
  const raw = process.env.MONGODB_DB || '';
  return raw.trim() || 'test';
}

let client: MongoClient | null = null;
let db: Db | null = null;
let connecting: Promise<Db> | null = null;
export async function connectMongo(config: MongoConfig = {}): Promise<Db> {
  if (db) return db;
  if (connecting) return connecting;

  const uri = (config.uri || resolveUri()).trim();
  const dbName = (config.dbName || resolveDb()).trim();
  const options: MongoClientOptions = {
    maxPoolSize: 20,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
    retryReads: true,
    retryWrites: true,
    ...config.options,
  };

  connecting = (async () => {
    client = new MongoClient(uri, options);
    await client.connect();
    db = client.db(dbName);
    return db;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export function getMongoDb(): Db {
  if (!db) throw new Error('MongoDB not connected. Call connectMongo() first.');
  return db;
}

export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const database = await connectMongo();
  return fn(database);
}

export async function closeMongo(force = false): Promise<void> {
  if (client) {
    await client.close(force);
    client = null;
    db = null;
  }
}

export function hasActiveClient(): boolean {
  return !!client;
}
export function supportsTransactions(): boolean {
  return !!client;
}

export async function runTransaction<T>(
  work: (session: ClientSession, database: Db) => Promise<T>,
  opts: {
    maxRetries?: number;
    config?: MongoConfig;
    useIfAvailableOnly?: boolean;
  } = {},
): Promise<T> {
  const { maxRetries = 3, config, useIfAvailableOnly = false } = opts;
  const database = await connectMongo(config);
  if (!client) throw new Error('Client not initialized.');
  const session = client.startSession();
  type InternalClient = MongoClient & {
    topology?: { description?: { type?: string } };
  };
  const internal = client as InternalClient;
  const descriptionType = internal.topology?.description?.type;
  const canTx = !!(descriptionType && descriptionType !== 'Single');
  if (!canTx) {
    if (useIfAvailableOnly) {
      await session.endSession();
      throw new Error('Transactions not supported on this deployment.');
    }
    try {
      return await work(session, database);
    } finally {
      await session.endSession();
    }
  }
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await work(session, database);
      });
      if (result === undefined)
        throw new Error('Transaction completed without result');
      return result;
    } catch (err: unknown) {
      const errorObj = err as { errorLabels?: string[] };
      const transient =
        Array.isArray(errorObj.errorLabels) &&
        errorObj.errorLabels.includes('TransientTransactionError');
      if (transient && attempt < maxRetries) continue;
      throw err;
    }
  }
}

export async function oneOff<T>(
  fn: (db: Db, client: MongoClient) => Promise<T>,
  config: MongoConfig = {},
): Promise<T> {
  const uri = config.uri || resolveUri();
  const dbName = config.dbName || resolveDb();
  const localClient = new MongoClient(uri, {
    maxPoolSize: 1,
    ...config.options,
  });
  await localClient.connect();
  try {
    return await fn(localClient.db(dbName), localClient);
  } finally {
    await localClient.close();
  }
}

// Example usage:
//
// await connectMongo();
// const users = await withDb(db => db.collection('users').find().toArray());
//
// const created = await runTransaction(async (session, db) => {
//   const usersCol = db.collection('users');
//   await usersCol.insertOne({ name: 'Alice' }, { session });
//   return 'ok';
// });
//
// await closeMongo();
