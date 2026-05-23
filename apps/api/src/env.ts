import 'dotenv/config';

export const env = {
  PORT: process.env.PORT ?? '4000',
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? 'change-me',
  ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY ?? 'admin-secret-change-me',
  CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID ?? '',
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ?? '',
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ?? '',
  R2_BUCKET: process.env.R2_BUCKET ?? 'cms-sites',
  R2_MEDIA_BUCKET: process.env.R2_MEDIA_BUCKET ?? 'cms-media',
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL ?? '',
  UI_URL: process.env.UI_URL ?? 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};
