import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Upload a file to the R2 storage bucket
 */
export async function uploadToR2(
  fileBuffer: Buffer, 
  fileName: string, 
  contentType: string
): Promise<{ url: string, signedUrl?: string }> {
  // Check for required environment variables
  const bucketName = process.env.R2_BUCKET_NAME || 'doodad-videos';
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicUrl = process.env.R2_PUBLIC_URL || 'https://pub-67ca5e2b9cc8442aae3f9058614ea98.r2.dev';
  
  if (!r2AccessKeyId || !r2SecretAccessKey) {
    throw new Error('R2 credentials not configured');
  }
  
  // Create an S3 client configured for Cloudflare R2
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });
  
  // Upload parameters
  const keyPath = `${contentType.startsWith('audio') ? 'audio' : 'videos'}/${fileName}`;
  const params = {
    Bucket: bucketName,
    Key: keyPath,
    Body: fileBuffer,
    ContentType: contentType,
  };
  
  try {
    // Upload the file
    const command = new PutObjectCommand(params);
    const response = await s3Client.send(command);
    console.log(`Successfully uploaded to R2: ${keyPath}`, response);
    
    // Return the public URL
    return {
      url: `${publicUrl}/${keyPath}`,
      // Add signedUrl if needed
      signedUrl: `${publicUrl}/${keyPath}?t=${Date.now()}`
    };
  } catch (err) {
    console.error('Error uploading to R2:', err);
    throw err;
  }
} 