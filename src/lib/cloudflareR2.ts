import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs/promises";
import path from "path";
import fsOriginal from "fs";

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.warn("[cloudflareR2] R2 environment variables are not fully configured. Uploads will be skipped.");
  // Optionally throw an error if R2 is critical and not just optional
  // throw new Error("R2 environment variables are not fully configured.");
}

const s3Client = new S3Client({
  region: "auto", // For R2, "auto" is typically used or a specific region if known
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * Uploads a file to Cloudflare R2 and generates a pre-signed URL for GET access.
 * @param localFilePath The path to the local file to upload.
 * @param fileNameInBucket The desired file name (key) in the R2 bucket.
 * @param contentType The MIME type of the file (e.g., 'video/mp4').
 * @param expiresInSeconds The duration for which the pre-signed URL will be valid (default 24 hours).
 * @returns A promise that resolves to the pre-signed URL, or null if R2 is not configured or upload fails.
 */
export async function uploadToR2AndGetSignedUrl(
  localFilePath: string,
  fileNameInBucket: string,
  contentType: string,
  expiresInSeconds: number = 24 * 60 * 60 // 24 hours
): Promise<string | null> {
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.log("[cloudflareR2] Skipping R2 upload as not configured.");
    return null;
  }

  try {
    const fileContent = await fs.readFile(localFilePath);

    const putObjectParams = {
      Bucket: R2_BUCKET_NAME,
      Key: fileNameInBucket,
      Body: fileContent,
      ContentType: contentType,
    };

    console.log(`[cloudflareR2] Uploading ${localFilePath} to R2 bucket ${R2_BUCKET_NAME} as ${fileNameInBucket}`);
    await s3Client.send(new PutObjectCommand(putObjectParams));
    console.log("[cloudflareR2] File uploaded successfully to R2.");

    const getObjectParams = {
      Bucket: R2_BUCKET_NAME,
      Key: fileNameInBucket,
    };
    
    const signedUrl = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams), {
      expiresIn: expiresInSeconds,
    });
    
    console.log(`[cloudflareR2] Generated pre-signed URL (expires in ${expiresInSeconds}s): ${signedUrl}`);
    return signedUrl;

  } catch (error) {
    console.error("[cloudflareR2] Error during R2 upload or pre-signing URL:", error);
    return null; // Or re-throw if you want to handle it more strictly upstream
  }
}

/**
 * Downloads a file from Cloudflare R2 to a local path.
 * @param r2Key The key (path) of the file in the R2 bucket.
 * @param localDownloadPath The local path where the file should be saved.
 * @returns A promise that resolves if download is successful, or rejects on error.
 */
export async function downloadFromR2(
  r2Key: string,
  localDownloadPath: string
): Promise<void> {
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.warn("[cloudflareR2] R2 environment variables not fully configured. Download will be skipped.");
    throw new Error("R2 not configured, cannot download file.");
  }

  console.log(`[cloudflareR2] Attempting to download '${r2Key}' from bucket '${R2_BUCKET_NAME}' to '${localDownloadPath}'`);

  try {
    const getObjectParams = {
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
    };
    const command = new GetObjectCommand(getObjectParams);
    const { Body } = await s3Client.send(command);

    if (!Body) {
      throw new Error(`File body not found in R2 for key: ${r2Key}`);
    }

    // Ensure directory exists for localDownloadPath
    const dirName = path.dirname(localDownloadPath);
    await fs.mkdir(dirName, { recursive: true });

    // Stream the body to a file
    const writableStream = fsOriginal.createWriteStream(localDownloadPath);
    // Readable.fromWeb() is available in Node.js v18+
    // For earlier versions, or if Body is already a Node.js Readable, adapt accordingly.
    // Assuming Body is a ReadableStream<Uint8Array> (web stream)
    if (typeof (Body as any).pipe === 'function') { // Check if it's already a Node.js stream
        (Body as NodeJS.ReadableStream).pipe(writableStream);
    } else if (typeof (Body as any).getReader === 'function') { // Web stream
        const reader = (Body as ReadableStream<Uint8Array>).getReader();
        let chunk = await reader.read();
        while (!chunk.done) {
            writableStream.write(chunk.value);
            chunk = await reader.read();
        }
        writableStream.end();
    } else {
        throw new Error('Unsupported R2 Body type for streaming to file.');
    }
    
    await new Promise<void>((resolve, reject) => {
      writableStream.on('finish', () => resolve());
      writableStream.on('error', (err) => reject(err));
    });

    console.log(`[cloudflareR2] Successfully downloaded '${r2Key}' to '${localDownloadPath}'`);
  } catch (error) {
    console.error(`[cloudflareR2] Error downloading '${r2Key}' from R2:`, error);
    // Attempt to clean up partially downloaded file if it exists
    await fs.unlink(localDownloadPath).catch(cleanupError => {
      console.warn(`[cloudflareR2] Could not delete partially downloaded file ${localDownloadPath}:`, cleanupError);
    });
    throw error; // Re-throw the error to be handled by the caller
  }
} 