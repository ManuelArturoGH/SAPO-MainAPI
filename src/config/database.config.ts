import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI?.trim() || 'mongodb://localhost:27017',
  name: process.env.MONGODB_DB?.trim() || 'sapo',
  options: {
    maxPoolSize: 20,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
    retryReads: true,
    retryWrites: true,
  },
}));
