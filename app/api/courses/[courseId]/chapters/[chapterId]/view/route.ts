import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { courseId, chapterId } = resolvedParams;
    
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user has access to the course
    const purchase = await db.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: courseId
        }
      }
    });

    if (!purchase) {
      return new NextResponse("Course access required", { status: 403 });
    }

    // Get chapter to check maxViews
    const chapter = await db.chapter.findUnique({
      where: {
        id: chapterId,
        courseId: courseId,
      },
      select: {
        maxViews: true,
        isPublished: true
      }
    });

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    if (!chapter.isPublished) {
      return new NextResponse("Chapter is not published", { status: 403 });
    }

    // Check if user has exceeded maxViews
    // maxViews of null, undefined, or 0 means unlimited views
    if (chapter.maxViews !== null && chapter.maxViews !== undefined && chapter.maxViews > 0) {
      const viewCount = await db.chapterView.count({
        where: {
          studentId: userId,
          chapterId: chapterId
        }
      });

      if (viewCount >= chapter.maxViews) {
        return new NextResponse("Maximum views reached for this chapter", { status: 403 });
      }
    }

    // Record the view
    await db.chapterView.create({
      data: {
        studentId: userId,
        chapterId: chapterId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CHAPTER_VIEW]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

