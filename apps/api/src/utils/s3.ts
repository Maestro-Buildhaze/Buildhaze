/// <reference types="node" />
import { S3Client } from '@aws-sdk/client-s3';

export function getS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  });
}

export function getBucketName(): string {
  return process.env.R2_BUCKET ?? 'buildhaze-cms';
}
