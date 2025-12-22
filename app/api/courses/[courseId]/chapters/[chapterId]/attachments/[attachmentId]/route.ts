import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string; attachmentId: string }> }
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
            select: {
                userId: true,
            }
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        // Admin, teacher, or owner can delete attachments
        if (user?.role !== "ADMIN" && user?.role !== "TEACHER" && course.userId !== userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Delete the attachment
        await db.chapterAttachment.delete({
            where: {
                id: resolvedParams.attachmentId,
                chapterId: resolvedParams.chapterId,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.log("[CHAPTER_ATTACHMENT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 