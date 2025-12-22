import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; attachmentId: string }> }
) {
    const resolvedParams = await params;
    const { courseId, attachmentId } = resolvedParams;

    try {
        const { userId, user } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: {
                id: courseId,
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

        const attachment = await db.attachment.delete({
            where: {
                courseId: courseId,
                id: attachmentId,
            }
        });

        return NextResponse.json(attachment);
    } catch (error) {
        console.log("ATTACHMENT_ID", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 