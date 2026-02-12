import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface BackupData {
  timestamp: string;
  users: Array<{ id: string; image: string | null }>;
  courses: Array<{ id: string; imageUrl: string | null }>;
  chapters: Array<{ id: string; videoUrl: string | null }>;
  attachments: Array<{ id: string; url: string }>;
  questions: Array<{ id: string; imageUrl: string | null }>;
}

async function backupDatabaseUrls() {
  try {
    console.log("📦 Starting database URL backup...");

    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      users: [],
      courses: [],
      chapters: [],
      attachments: [],
      questions: [],
    };

    // Backup User images
    const users = await prisma.user.findMany({
      select: { id: true, image: true },
      where: { image: { not: null } },
    });
    backupData.users = users.map((u) => ({ id: u.id, image: u.image }));

    // Backup Course images
    const courses = await prisma.course.findMany({
      select: { id: true, imageUrl: true },
      where: { imageUrl: { not: null } },
    });
    backupData.courses = courses.map((c) => ({
      id: c.id,
      imageUrl: c.imageUrl,
    }));

    // Backup Chapter videos
    const chapters = await prisma.chapter.findMany({
      select: { id: true, videoUrl: true },
      where: { videoUrl: { not: null } },
    });
    backupData.chapters = chapters.map((ch) => ({
      id: ch.id,
      videoUrl: ch.videoUrl,
    }));

    // Backup Attachments
    const attachments = await prisma.attachment.findMany({
      select: { id: true, url: true },
    });
    backupData.attachments = attachments;

    // Backup Question images
    const questions = await prisma.question.findMany({
      select: { id: true, imageUrl: true },
      where: { imageUrl: { not: null } },
    });
    backupData.questions = questions.map((q) => ({
      id: q.id,
      imageUrl: q.imageUrl,
    }));

    // Save backup to file
    const backupPath = path.join(
      process.cwd(),
      `db-urls-backup-${Date.now()}.json`
    );
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

    console.log(`✅ Backup completed!`);
    console.log(`   Users: ${backupData.users.length}`);
    console.log(`   Courses: ${backupData.courses.length}`);
    console.log(`   Chapters: ${backupData.chapters.length}`);
    console.log(`   Attachments: ${backupData.attachments.length}`);
    console.log(`   Questions: ${backupData.questions.length}`);
    console.log(`   Saved to: ${backupPath}`);
  } catch (error: any) {
    console.error("❌ Error backing up database URLs:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabaseUrls();

