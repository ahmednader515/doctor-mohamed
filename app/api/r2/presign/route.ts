import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2/config";
import { generateR2Key, getFolderByType } from "@/lib/r2/upload";
import {
  COURSE_ATTACHMENT_MAX_SIZE,
  formatMaxSizeMB,
  getDefaultMaxSize,
} from "@/lib/r2/limits";

type UploadEndpoint = "courseImage" | "courseAttachment" | "chapterVideo";

function detectContentType(fileName: string, providedType?: string): string {
  if (providedType && providedType !== "application/octet-stream") {
    return providedType;
  }

  const ext = fileName.toLowerCase().split(".").pop();
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
  };

  return mimeTypes[ext || ""] || "application/octet-stream";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!R2_BUCKET_NAME || !R2_PUBLIC_URL) {
      return NextResponse.json(
        { error: "R2 storage is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;
    const endpoint = body.endpoint as UploadEndpoint | undefined;
    const folder = typeof body.folder === "string" ? body.folder : null;
    const contentType = detectContentType(fileName, body.contentType);

    if (!fileName || fileSize <= 0) {
      return NextResponse.json(
        { error: "fileName and fileSize are required" },
        { status: 400 }
      );
    }

    const maxSize =
      getDefaultMaxSize(endpoint) ?? COURSE_ATTACHMENT_MAX_SIZE;

    if (fileSize > maxSize) {
      return NextResponse.json(
        {
          error: `File size exceeds the ${formatMaxSizeMB(maxSize)}MB limit`,
        },
        { status: 413 }
      );
    }

    const uploadFolder = folder || getFolderByType(fileName, contentType);
    const key = generateR2Key(fileName, uploadFolder);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 60 * 10, // 10 minutes
    });

    const publicUrl = R2_PUBLIC_URL.endsWith("/")
      ? `${R2_PUBLIC_URL}${key}`
      : `${R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      name: fileName,
      contentType,
    });
  } catch (error: any) {
    console.error("[R2_PRESIGN]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create upload URL" },
      { status: 500 }
    );
  }
}
