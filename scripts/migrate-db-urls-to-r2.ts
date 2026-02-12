import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface UploadMapping {
  uploadthingUrl: string;
  r2Url: string;
  r2Key: string;
  fileName: string;
}

async function migrateDatabaseUrls() {
  try {
    // Load mapping file
    const mappingPath = path.join(
      process.cwd(),
      "uploadthing-to-r2-mapping.json"
    );

    if (!fs.existsSync(mappingPath)) {
      console.error(`❌ Mapping file not found: ${mappingPath}`);
      console.log("   Please run 'npm run upload-to-r2' first");
      process.exit(1);
    }

    const mappingData = fs.readFileSync(mappingPath, "utf-8");
    const mapping: UploadMapping[] = JSON.parse(mappingData);

    console.log("🔄 Starting database URL migration...");
    console.log(`   Loaded ${mapping.length} URL mappings`);

    // Create a map for quick lookup
    const urlMap = new Map<string, string>();
    const keyMap = new Map<string, string>();

    for (const item of mapping) {
      urlMap.set(item.uploadthingUrl, item.r2Url);
      // Also map by key (in case URLs are stored differently)
      const keyFromUrl = extractKeyFromUrl(item.uploadthingUrl);
      if (keyFromUrl) {
        keyMap.set(keyFromUrl, item.r2Key);
      }
    }

    let updatedCount = 0;

    // Update User images
    console.log("\n📝 Updating User images...");
    const users = await prisma.user.findMany({
      where: { image: { not: null } },
    });
    for (const user of users) {
      if (user.image) {
        const newUrl = findNewUrl(user.image, urlMap, keyMap);
        if (newUrl && newUrl !== user.image) {
          await prisma.user.update({
            where: { id: user.id },
            data: { image: newUrl },
          });
          updatedCount++;
          console.log(`   ✅ Updated user ${user.id}`);
        }
      }
    }

    // Update Course images
    console.log("\n📝 Updating Course images...");
    const courses = await prisma.course.findMany({
      where: { imageUrl: { not: null } },
    });
    for (const course of courses) {
      if (course.imageUrl) {
        const newUrl = findNewUrl(course.imageUrl, urlMap, keyMap);
        if (newUrl && newUrl !== course.imageUrl) {
          await prisma.course.update({
            where: { id: course.id },
            data: { imageUrl: newUrl },
          });
          updatedCount++;
          console.log(`   ✅ Updated course ${course.id}`);
        }
      }
    }

    // Update Chapter videos
    console.log("\n📝 Updating Chapter videos...");
    const chapters = await prisma.chapter.findMany({
      where: { videoUrl: { not: null } },
    });
    for (const chapter of chapters) {
      if (chapter.videoUrl) {
        const newUrl = findNewUrl(chapter.videoUrl, urlMap, keyMap);
        if (newUrl && newUrl !== chapter.videoUrl) {
          await prisma.chapter.update({
            where: { id: chapter.id },
            data: { videoUrl: newUrl },
          });
          updatedCount++;
          console.log(`   ✅ Updated chapter ${chapter.id}`);
        }
      }
    }

    // Update Attachments
    console.log("\n📝 Updating Attachments...");
    const attachments = await prisma.attachment.findMany();
    for (const attachment of attachments) {
      const newUrl = findNewUrl(attachment.url, urlMap, keyMap);
      if (newUrl && newUrl !== attachment.url) {
        await prisma.attachment.update({
          where: { id: attachment.id },
          data: { url: newUrl },
        });
        updatedCount++;
        console.log(`   ✅ Updated attachment ${attachment.id}`);
      }
    }

    // Update Question images
    console.log("\n📝 Updating Question images...");
    const questions = await prisma.question.findMany({
      where: { imageUrl: { not: null } },
    });
    for (const question of questions) {
      if (question.imageUrl) {
        const newUrl = findNewUrl(question.imageUrl, urlMap, keyMap);
        if (newUrl && newUrl !== question.imageUrl) {
          await prisma.question.update({
            where: { id: question.id },
            data: { imageUrl: newUrl },
          });
          updatedCount++;
          console.log(`   ✅ Updated question ${question.id}`);
        }
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Total records updated: ${updatedCount}`);
  } catch (error: any) {
    console.error("❌ Error migrating database URLs:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function findNewUrl(
  oldUrl: string,
  urlMap: Map<string, string>,
  keyMap: Map<string, string>
): string | null {
  // Try direct URL match
  if (urlMap.has(oldUrl)) {
    return urlMap.get(oldUrl) || null;
  }

  // Try to extract key from URL and match
  const key = extractKeyFromUrl(oldUrl);
  if (key && keyMap.has(key)) {
    const r2Key = keyMap.get(key);
    if (r2Key) {
      // Reconstruct URL from R2 key
      const r2PublicUrl = process.env.R2_PUBLIC_URL || "";
      return r2PublicUrl.endsWith("/")
        ? `${r2PublicUrl}${r2Key}`
        : `${r2PublicUrl}/${r2Key}`;
    }
  }

  return null;
}

function extractKeyFromUrl(url: string): string | null {
  // Extract key from UploadThing URL
  // UploadThing URLs typically look like: https://utfs.io/f/[key]
  const utfsMatch = url.match(/utfs\.io\/f\/([^/?]+)/);
  if (utfsMatch) {
    return utfsMatch[1];
  }

  // Try other UploadThing URL patterns
  const ufsMatch = url.match(/ufs\.sh\/([^/?]+)/);
  if (ufsMatch) {
    return ufsMatch[1];
  }

  return null;
}

migrateDatabaseUrls();

