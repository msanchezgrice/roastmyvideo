import { S3Client, PutObjectCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize R2 client using AWS SDK (compatible with R2)
let r2Client: S3Client | null = null;

// Initialize the client
async function initializeR2Client() {
  try {
    console.log('[R2] Initializing R2 client');
    console.log('[R2] R2_ENDPOINT_URL:', process.env.R2_ENDPOINT_URL?.substring(0, 20) || 'not set');
    console.log('[R2] R2_ACCESS_KEY_ID available:', !!process.env.R2_ACCESS_KEY_ID);
    console.log('[R2] R2_SECRET_ACCESS_KEY available:', !!process.env.R2_SECRET_ACCESS_KEY);
    console.log('[R2] R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME || 'doodad-videos');
    console.log('[R2] R2_PUBLIC_URL_BASE:', process.env.R2_PUBLIC_URL_BASE || 'not set');

    if (!process.env.R2_ENDPOINT_URL || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      console.error('[R2] Missing required R2 configuration');
      r2Client = null;
    } else {
      r2Client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT_URL,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
      });
      console.log('[R2] R2 client initialized successfully');
      
      // Try to verify connection by listing buckets
      try {
        console.log('[R2] Attempting to verify connection by listing buckets...');
        const command = new ListBucketsCommand({});
        const response = await r2Client.send(command);
        console.log('[R2] Connection verified! Available buckets:', 
          response.Buckets?.map(b => b.Name).join(', ') || 'None');
      } catch (verifyError) {
        console.error('[R2] Failed to verify R2 connection:', verifyError);
        // We don't set r2Client to null here since the issue might be permissions
        // and not connectivity
      }
    }
  } catch (error) {
    console.error('[R2] Error initializing R2 client:', error);
    r2Client = null;
  }
}

// Call the initialization function but don't wait for it to complete
// This allows the module to be imported without blocking
initializeR2Client().catch(err => {
  console.error('[R2] Failed to initialize R2 client:', err);
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'doodad-videos';
const PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL_BASE || '';

/**
 * Uploads a file to R2 storage
 * @param fileBuffer The file buffer to upload
 * @param fileName The name to save the file as
 * @param contentType The MIME type of the file
 * @returns The URL of the uploaded file
 */
export async function uploadToR2(
  fileBuffer: Buffer, 
  fileName: string, 
  contentType: string
): Promise<{ url: string, signedUrl: string }> {
  console.log(`[R2] Starting upload of ${fileName} (${fileBuffer.length} bytes)`);

  if (!r2Client) {
    console.error('[R2] R2 client not initialized, cannot upload');
    throw new Error('R2 client not initialized');
  }
  
  try {
    const fullPath = `audio/${fileName}`;
    console.log(`[R2] Uploading to bucket ${BUCKET_NAME}, path: ${fullPath}`);
    
    // Upload the file to R2
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fullPath,
      Body: fileBuffer,
      ContentType: contentType,
    });
    
    console.log('[R2] Sending PutObjectCommand...');
    try {
      await r2Client.send(putCommand);
      console.log('[R2] File uploaded successfully');
    } catch (uploadError) {
      console.error('[R2] Error during PutObjectCommand:', uploadError);
      if (uploadError instanceof Error) {
        console.error('[R2] Error details:', uploadError.name, uploadError.message, uploadError.stack);
      }
      throw uploadError;
    }
    
    // Create a public URL (if R2 bucket is configured for public access)
    let publicUrl = '';
    if (PUBLIC_URL_BASE) {
      publicUrl = `${PUBLIC_URL_BASE}/${fullPath}`;
    } else {
      publicUrl = `https://${BUCKET_NAME}.r2.cloudflarestorage.com/${fullPath}`;
    }
    console.log(`[R2] Public URL: ${publicUrl}`);
    
    // Create a signed URL that expires in 24 hours (for private buckets)
    console.log('[R2] Generating signed URL...');
    const expireSeconds = 60 * 60 * 24; // 24 hours
    const getCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fullPath,
    });
    
    try {
      const signedUrl = await getSignedUrl(r2Client, getCommand, { expiresIn: expireSeconds });
      console.log(`[R2] Signed URL generated, expires in ${expireSeconds} seconds`);
      console.log(`[R2] Signed URL starts with: ${signedUrl.substring(0, 50)}...`);
      
      return { 
        url: publicUrl,
        signedUrl 
      };
    } catch (signError) {
      console.error('[R2] Error generating signed URL:', signError);
      // Still return the public URL even if signing fails
      return { 
        url: publicUrl,
        signedUrl: publicUrl // Fallback to public URL
      };
    }
  } catch (error) {
    console.error('[R2] Error uploading to R2:', error);
    throw new Error(`Failed to upload file to R2: ${error instanceof Error ? error.message : String(error)}`);
  }
} 