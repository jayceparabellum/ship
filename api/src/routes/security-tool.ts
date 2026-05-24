import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Router, Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { authMiddleware, superAdminMiddleware } from '../middleware/auth.js';

type RouterType = ReturnType<typeof Router>;
const router: RouterType = Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-2',
});

async function readS3Json(bucket: string, key: string): Promise<unknown> {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = await response.Body?.transformToString();
  if (!body) {
    throw new Error(`Empty S3 object: s3://${bucket}/${key}`);
  }
  return JSON.parse(body);
}

async function readLocalJson(fileName: string): Promise<unknown> {
  const candidates = [
    path.resolve(process.cwd(), '..', 'docs', 'security-tool', fileName),
    path.resolve(process.cwd(), 'docs', 'security-tool', fileName),
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(await fs.readFile(candidate, 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  throw new Error(`Local security report not found: ${fileName}`);
}

async function readReport(fileName: string): Promise<{ source: 's3' | 'local'; data: unknown }> {
  const bucket = process.env.SECURITY_TOOL_REPORT_BUCKET;
  const prefix = process.env.SECURITY_TOOL_REPORT_PREFIX || 'latest';

  if (bucket) {
    return {
      source: 's3',
      data: await readS3Json(bucket, `${prefix.replace(/\/$/, '')}/${fileName}`),
    };
  }

  return {
    source: 'local',
    data: await readLocalJson(fileName),
  };
}

router.get('/latest', authMiddleware, superAdminMiddleware, async (_req: Request, res: Response) => {
  try {
    const [probeReport, staticReport] = await Promise.all([
      readReport('latest-probe-report.json'),
      readReport('latest-security-report.json'),
    ]);

    res.json({
      success: true,
      data: {
        probeReport: probeReport.data,
        staticReport: staticReport.data,
        source: {
          probe: probeReport.source,
          static: staticReport.source,
          bucket: process.env.SECURITY_TOOL_REPORT_BUCKET || null,
          prefix: process.env.SECURITY_TOOL_REPORT_PREFIX || 'latest',
        },
      },
    });
  } catch (error) {
    console.error('Security tool report fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SECURITY_TOOL_REPORT_UNAVAILABLE',
        message: 'Security tool reports are unavailable',
      },
    });
  }
});

export default router;
