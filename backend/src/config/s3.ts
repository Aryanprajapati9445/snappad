import { S3Client } from '@aws-sdk/client-s3';

/**
 * S3 client is built fresh on every call from live process.env values.
 * This avoids the "stale cached client" problem where removing an expired
 * session token from .env has no effect until the cached object is discarded.
 *
 * NOTE: AKIA... keys are permanent IAM user keys — NO session token is needed.
 *       Only ASIA... (STS/assume-role) keys require a session token.
 */
export function getS3Client(): S3Client {
  const accessKeyId     = process.env.AWS_ACCESS_KEY_ID     ?? '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? '';
  const sessionToken    = process.env.AWS_SESSION_TOKEN;          // intentionally optional
  const region          = process.env.AWS_REGION            ?? 'us-east-1';

  return new S3Client({
    region,
    credentials:
      accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey,
            // Only pass sessionToken when it is actually set (non-empty string)
            ...(sessionToken && sessionToken.trim() ? { sessionToken: sessionToken.trim() } : {}),
          }
        : undefined,
    // Automatically follow PermanentRedirects to the correct regional endpoint.
    followRegionRedirects: true,
  });
}

/** No-op kept for API compatibility. Client is now stateless — no cache to reset. */
export function resetS3Client(): void { /* no-op */ }

export const S3_BUCKET = (): string => process.env.AWS_S3_BUCKET_NAME ?? '';

export function configureS3(): void {
  const region          = process.env.AWS_REGION;
  const accessKeyId     = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken    = process.env.AWS_SESSION_TOKEN;
  const bucket          = process.env.AWS_S3_BUCKET_NAME;

  if (!region || !accessKeyId || !secretAccessKey || !bucket) {
    console.warn('⚠️  AWS S3 not fully configured (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME required).');
    return;
  }

  const hasPlaceholders = [accessKeyId, secretAccessKey, bucket].some(v =>
    v.includes('your_') || v.includes('here'),
  );
  if (hasPlaceholders) {
    console.warn('⚠️  AWS S3: placeholder credentials detected in .env — uploads will fail. Please fill in real values.');
    return;
  }

  // Diagnostic: log credential type so you can spot session-token issues early
  const keyType = accessKeyId.startsWith('ASIA') ? 'Temporary (STS/role)' : 'Permanent (IAM user)';
  const tokenStatus = sessionToken ? '⚠️  SESSION_TOKEN is SET' : '✅ no session token';
  console.log(`✅ AWS S3 configured — bucket: ${bucket} (${region}) | key type: ${keyType} | ${tokenStatus}`);
}
