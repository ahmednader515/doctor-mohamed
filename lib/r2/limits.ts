/** Shared upload size limits (bytes) */
export const MB = 1024 * 1024;

export const COURSE_IMAGE_MAX_SIZE = 4 * MB;
export const COURSE_ATTACHMENT_MAX_SIZE = 100 * MB;
export const CHAPTER_VIDEO_MAX_SIZE = 512 * MB;

export function getDefaultMaxSize(
  endpoint?: "courseImage" | "courseAttachment" | "chapterVideo"
): number | undefined {
  if (endpoint === "courseImage") return COURSE_IMAGE_MAX_SIZE;
  if (endpoint === "courseAttachment") return COURSE_ATTACHMENT_MAX_SIZE;
  if (endpoint === "chapterVideo") return CHAPTER_VIDEO_MAX_SIZE;
  return undefined;
}

export function formatMaxSizeMB(bytes: number): number {
  return Math.round(bytes / MB);
}
