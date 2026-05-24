#!/usr/bin/env node
/**
 * Upload template to Cloudflare R2
 * Usage: node upload-template-to-r2.js <template-folder> <r2-prefix>
 * Example: node upload-template-to-r2.js templates/lawyer-premium templates/lawyer-premium
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// R2 Config - ia din env sau .env
require('dotenv').config({ path: path.join(__dirname, '../apps/api/.env') });

const R2_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || 'cms-sites';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
  console.error('❌ Missing R2 credentials. Set CF_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

async function uploadFile(localPath, r2Key) {
  const content = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType = contentTypes[ext] || 'application/octet-stream';

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
    Body: content,
    ContentType: contentType,
  }));

  console.log(`✅ Uploaded: ${r2Key}`);
}

async function uploadDir(localDir, r2Prefix) {
  const files = fs.readdirSync(localDir, { recursive: true });
  
  for (const file of files) {
    const localPath = path.join(localDir, file);
    const stat = fs.statSync(localPath);
    
    if (stat.isDirectory()) continue;
    
    const r2Key = path.posix.join(r2Prefix, file).replace(/\\/g, '/');
    await uploadFile(localPath, r2Key);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node upload-template-to-r2.js <local-folder> <r2-prefix>');
    console.log('Example: node upload-template-to-r2.js ../templates/lawyer-premium templates/lawyer-premium');
    process.exit(1);
  }

  const [localFolder, r2Prefix] = args;
  const localPath = path.resolve(localFolder);

  if (!fs.existsSync(localPath)) {
    console.error(`❌ Folder not found: ${localPath}`);
    process.exit(1);
  }

  console.log(`\n📁 Uploading: ${localPath}`);
  console.log(`🎯 To R2: ${r2Prefix}\n`);

  await uploadDir(localPath, r2Prefix);

  console.log(`\n✨ Done! Template uploaded to R2 at: ${r2Prefix}`);
  console.log(`\nNext steps:`);
  console.log(`1. Register in CMS: POST /api/publish/templates with r2Key: "${r2Prefix}"`);
  console.log(`2. Assign to client and publish`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
