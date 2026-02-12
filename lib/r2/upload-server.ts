import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "./config";
import * as fs from "fs";
import * as path from "path";

/**
 * Upload a file to R2 (Server-only)
 * Use this function in API routes or server components
 */
export async function uploadToR2(
  filePath: string,
  key: string,
  contentType?: string
): Promise<string> {
  const fileContent = fs.readFileSync(filePath);
  
  // Detect content type from extension if not provided
  if (!contentType) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const mimeTypes: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      ogg: "video/ogg",
      mov: "video/quicktime",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
    };
    contentType = mimeTypes[ext] || "application/octet-stream";
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await r2Client.send(command);

  // Return public URL
  const url = R2_PUBLIC_URL.endsWith("/")
    ? `${R2_PUBLIC_URL}${key}`
    : `${R2_PUBLIC_URL}/${key}`;

  return url;
}

/**
 * Check if a file exists in R2 (Server-only)
 */
export async function fileExistsInR2(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

