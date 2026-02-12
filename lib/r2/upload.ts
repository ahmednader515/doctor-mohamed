/**
 * Generate a unique key for a file based on its original name
 * Client-safe function
 */
export function generateR2Key(originalName: string, folder?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = folder
    ? `${folder}/${timestamp}-${random}-${sanitizedName}`
    : `${timestamp}-${random}-${sanitizedName}`;
  return key;
}

/**
 * Get folder based on file type
 * Client-safe function (no Node.js dependencies)
 */
export function getFolderByType(fileName: string, contentType?: string): string {
  // Extract extension without using path module
  const lastDot = fileName.lastIndexOf('.');
  const ext = lastDot !== -1 ? fileName.substring(lastDot + 1).toLowerCase() : '';
  
  // Determine folder based on content type or extension
  if (contentType?.startsWith("video/") || ["mp4", "webm", "ogg", "mov"].includes(ext)) {
    return "videos";
  }
  if (contentType?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    return "images";
  }
  if (contentType?.startsWith("audio/") || ["mp3", "wav", "ogg"].includes(ext)) {
    return "audio";
  }
  if (contentType === "application/pdf" || ext === "pdf") {
    return "documents";
  }
  return "documents";
}

