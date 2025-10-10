/*
 * Script de migración para establecer 'position' = 'sin asignar' donde falte.
 * Uso: npm run migrate:position
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import path from 'path';
import { connectMongo } from '../src/database/mongodb';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  const db = await connectMongo();
  const col = db.collection('employees');
  const filter = { $or: [ { position: { $exists: false } }, { position: '' }, { position: null } ] };
  const update = { $set: { position: 'sin asignar' } };
  const res = await col.updateMany(filter, update);
  console.log(`[migrate-add-position] Matched: ${res.matchedCount}, Modified: ${res.modifiedCount}`);
  process.exit(0);
}

run().catch(err => {
  console.error('[migrate-add-position] Error:', err);
  process.exit(1);
});

