/**
 * Run this script to debug S3 connectivity:
 *   npx ts-node scripts/test-s3.ts
 */
import 'dotenv/config';
import { S3Client, PutObjectCommand, ListBucketsCommand } from '@aws-sdk/client-s3';

const accessKeyId     = process.env.AWS_ACCESS_KEY_ID     ?? '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? '';
const region          = process.env.AWS_REGION            ?? '';
const bucket          = process.env.AWS_S3_BUCKET_NAME    ?? '';

console.log('\n─── AWS S3 Debug ────────────────────────');
console.log('Region      :', region  || '❌ MISSING');
console.log('Bucket      :', bucket  || '❌ MISSING');
console.log('Key ID      :', accessKeyId     ? accessKeyId.slice(0, 8) + '...' : '❌ MISSING');
console.log('Secret      :', secretAccessKey ? secretAccessKey.slice(0, 4) + '...(hidden)' : '❌ MISSING');
console.log('─────────────────────────────────────────\n');

if (!accessKeyId || !secretAccessKey || !region || !bucket) {
  console.error('❌ One or more env vars missing. Check backend/.env');
  process.exit(1);
}

const client = new S3Client({
  region,
  credentials: { accessKeyId, secretAccessKey },
  followRegionRedirects: true,
});

async function run() {
  // Step 1: List buckets (tests auth)
  console.log('Step 1: Testing authentication (ListBuckets)...');
  try {
    const res = await client.send(new ListBucketsCommand({}));
    const names = res.Buckets?.map(b => b.Name) ?? [];
    console.log('✅ Auth OK. Buckets visible to this key:', names.join(', ') || '(none)');
    if (!names.includes(bucket)) {
      console.warn(`⚠️  Bucket "${bucket}" NOT in the list above.`);
      console.warn('   Possible causes: wrong bucket name, bucket is in a different account, or key lacks s3:ListAllMyBuckets.');
    }
  } catch (err: any) {
    console.error('❌ ListBuckets failed:', err.name, '-', err.message);
    if (err.name === 'InvalidAccessKeyId') {
      console.error('   → The Access Key ID is wrong or does not exist in AWS.');
    } else if (err.name === 'SignatureDoesNotMatch') {
      console.error('   → The Secret Access Key is wrong.');
    }
    process.exit(1);
  }

  // Step 2: Try uploading a small test file
  console.log(`\nStep 2: Uploading test object to bucket "${bucket}"...`);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: 'debug/test-upload.txt',
        Body: Buffer.from('S3 upload test from SnapPad debug script'),
        ContentType: 'text/plain',
      }),
    );
    const url = `https://${bucket}.s3.${region}.amazonaws.com/debug/test-upload.txt`;
    console.log('✅ Upload succeeded!');
    console.log('   Object URL:', url);
    console.log('\n   If you can open that URL in your browser, public read is also working.');
    console.log('   If you get AccessDenied in the browser, add a bucket policy (see implementation_plan.md).');
  } catch (err: any) {
    console.error('❌ PutObject failed:', err.name, '-', err.message);
    if (err.name === 'AccessDenied' || err.name === 'NoSuchBucket') {
      console.error('   → IAM user lacks s3:PutObject permission OR bucket name is wrong.');
      console.error('   → Attach "AmazonS3FullAccess" policy to your IAM user in the AWS console.');
    }
    process.exit(1);
  }
}

run();
