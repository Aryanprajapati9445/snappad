import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { getS3Client, S3_BUCKET } from '../config/s3';

export interface S3UploadResult {
  url: string;
  key: string;
  bytes: number;
}

/**
 * Upload a file buffer to AWS S3.
 * Key pattern: knowledge_vault/<userId>/<uuid><ext>
 */
export const uploadToS3 = async (
  buffer: Buffer,
  userId: string,
  mimeType: string,
  originalName: string,
): Promise<S3UploadResult> => {
  const bucket = S3_BUCKET();
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET_NAME is not configured in environment variables.');
  }

  const ext = path.extname(originalName) || '';
  const key = `knowledge_vault/${userId}/${uuidv4()}${ext}`;
  const region = process.env.AWS_REGION ?? 'us-east-1';

  try {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        // No ACL — use a bucket policy for public read access instead.
        // AWS blocks public ACLs by default since April 2023.
      }),
    );
  } catch (err: any) {
    console.error('❌ S3 upload error:', err?.name, err?.message);
    throw err;
  }

  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { url, key, bytes: buffer.byteLength };
};

/**
 * Delete an object from S3 by its key.
 * Silently ignores errors so a missing object never blocks a content delete.
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
  const bucket = S3_BUCKET();
  if (!bucket) return;
  try {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  } catch (err) {
    console.error('S3 delete failed (non-fatal):', err);
  }
};

/**
 * Extract the S3 object key from a full S3 URL.
 * Returns null if the URL is not an S3 URL.
 */
export const keyFromUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('amazonaws.com')) return null;
    const key = parsed.pathname.replace(/^\//, '');
    return key || null;
  } catch {
    return null;
  }
};

/**
 * Generate a presigned GET URL for a private S3 object.
 * The URL is valid for `expiresIn` seconds (default 1 hour).
 *
 * Use this any time the frontend needs to view or download a file —
 * never expose the raw S3 URL to the client when the bucket is private.
 */
export const getPresignedUrl = async (
  key: string,
  expiresIn = 3600,
  downloadName?: string,
): Promise<string> => {
  const bucket = S3_BUCKET();
  if (!bucket) throw new Error('AWS_S3_BUCKET_NAME is not configured.');

  const commandConfig: any = { Bucket: bucket, Key: key };
  if (downloadName) {
    commandConfig.ResponseContentDisposition = `attachment; filename="${downloadName}"`;
  }

  const command = new GetObjectCommand(commandConfig);
  return awsGetSignedUrl(getS3Client(), command, { expiresIn });
};
