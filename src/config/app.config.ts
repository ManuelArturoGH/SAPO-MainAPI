import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  externalApiUrl: process.env.EXTERNAL_EMP_API_URL || '',
  externalApiTimeout: parseInt(
    process.env.EXTERNAL_EMP_API_TIMEOUT_MS || '30000',
    10,
  ),
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  attendanceSync: {
    enabled: process.env.ATT_SYNC_ENABLED !== 'false',
    intervalMinutes: parseInt(
      process.env.ATT_SYNC_INTERVAL_MINUTES || '120',
      10,
    ),
    runAtStart: process.env.ATT_SYNC_RUN_AT_START !== 'false',
  },
}));
