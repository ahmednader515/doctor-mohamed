import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get chapter to check maxViews
    const chapter = await db.chapter.findUnique({
      where: {
        id: resolvedParams.chapterId,
      },
      select: {
        maxViews: true,
        courseId: true,
      }
    });

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    // Check if user has access to the course
    const purchase = await db.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: chapter.courseId
        }
      }
    });

    if (!purchase) {
      return new NextResponse("Course access required", { status: 403 });
    }

    // Check maxViews before recording completion and view
    // maxViews of null, undefined, or 0 means unlimited views
    if (chapter.maxViews !== null && chapter.maxViews !== undefined && chapter.maxViews > 0) {
      const viewCount = await db.chapterView.count({
        where: {
          studentId: userId,
          chapterId: resolvedParams.chapterId
        }
      });

      if (viewCount >= chapter.maxViews) {
        return new NextResponse("Maximum views reached for this chapter", { status: 403 });
      }

      // Record the view when marking as complete
      await db.chapterView.create({
        data: {
          studentId: userId,
          chapterId: resolvedParams.chapterId
        }
      });
    }

    const userProgress = await db.userProgress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
      update: {
        isCompleted: true,
      },
      create: {
        userId,
        chapterId: resolvedParams.chapterId,
        isCompleted: true,
      },
    });

    return NextResponse.json(userProgress);
  } catch (error) {
    console.log("[CHAPTER_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // First check if the record exists
    const existingProgress = await db.userProgress.findUnique({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
    });

    if (!existingProgress) {
      return new NextResponse("Not Found", { status: 404 });
    }

    await db.userProgress.delete({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[CHAPTER_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 