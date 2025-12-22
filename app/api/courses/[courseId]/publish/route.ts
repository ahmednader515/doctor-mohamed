import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
            },
            include: {
                chapters: true
            }
        });

        if (!course) {
            return new NextResponse("Not found", { status: 404 });
        }

        // Admin, teacher, or owner can publish/unpublish
        if (user?.role !== "ADMIN" && user?.role !== "TEACHER" && course.userId !== userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const hasPublishedChapters = course.chapters.some((chapter) => chapter.isPublished);

        if (!course.title || !course.description || !course.imageUrl || !hasPublishedChapters) {
            return new NextResponse("Missing required fields", { status: 401 });
        }

        const whereClause = (user?.role === "ADMIN" || user?.role === "TEACHER")
            ? { id: resolvedParams.courseId }
            : { id: resolvedParams.courseId, userId };

        const publishedCourse = await db.course.update({
            where: whereClause,
            data: {
                isPublished: !course.isPublished
            }
        });

        return NextResponse.json(publishedCourse);
    } catch (error) {
        console.log("[COURSE_PUBLISH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 