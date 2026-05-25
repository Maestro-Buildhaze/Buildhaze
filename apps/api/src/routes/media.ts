import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { verifyToken } from '../lib/jwt';

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? 'admin-secret-change-me';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';

// Middleware to allow both client and admin access
function requireAuthOrAdmin(req: any, res: any, next: any): void {
  const header = req.headers.authorization;
  
  // Check for admin token
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = verifyToken(token);
      if (ADMIN_EMAIL && payload.email === ADMIN_EMAIL) {
        req.isAdmin = true;
        // For admin, clientId must be provided in query or body
        req.clientId = req.query.clientId || req.body?.clientId;
        if (!req.clientId) {
          return res.status(400).json({ error: 'clientId required for admin access' });
        }
        next();
        return;
      }
      // Valid client token
      req.clientId = payload.clientId;
      next();
      return;
    } catch {
      // fall through
    }
  }
  
  res.status(401).json({ error: 'Unauthorized' });
}

export const mediaRouter: Router = Router();
mediaRouter.use(requireAuthOrAdmin);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

function getS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  });
}

mediaRouter.get('/', async (req, res) => {
  const clientId = (req as any).clientId;
  const files = await prisma.mediaFile.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(files);
});

mediaRouter.post('/upload', upload.single('file'), async (req, res) => {
  const clientId = (req as any).clientId;
  if (!req.file) throw new AppError(400, 'No file provided');

  const s3 = getS3Client();
  const bucket = process.env.R2_BUCKET ?? 'cms-media';
  const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
  const r2Key = `clients/${clientId}/media/${Date.now()}${ext}`;

  let buffer = req.file.buffer;
  let width: number | undefined;
  let height: number | undefined;

  if (req.file.mimetype !== 'image/svg+xml') {
    const meta = await sharp(buffer).metadata();
    width = meta.width;
    height = meta.height;
    if (req.file.size > 500_000) {
      buffer = await sharp(buffer).webp({ quality: 85 }).toBuffer();
    }
  }

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: r2Key,
    Body: buffer,
    ContentType: req.file.mimetype,
    CacheControl: 'public, max-age=31536000',
  }));

  const publicUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`;

  const media = await prisma.mediaFile.create({
    data: {
      clientId,
      name: req.file.originalname,
      url: publicUrl,
      r2Key,
      mimeType: req.file.mimetype,
      size: buffer.length,
      width: width ?? null,
      height: height ?? null,
    },
  });

  res.status(201).json(media);
});

mediaRouter.delete('/:id', async (req, res) => {
  const clientId = (req as any).clientId;
  const file = await prisma.mediaFile.findFirst({ where: { id: req.params.id, clientId } });
  if (!file) throw new AppError(404, 'File not found');

  const s3 = getS3Client();
  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET ?? 'cms-media',
    Key: file.r2Key,
  }));

  await prisma.mediaFile.delete({ where: { id: file.id } });
  res.json({ success: true });
});
