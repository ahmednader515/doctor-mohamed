import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ homeworkId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const resolvedParams = await params;
        const { homeworkId } = resolvedParams;

        console.log("[HOMEWORK_PUBLISH] Request:", { homeworkId, userId: session?.user?.id, role: session?.user?.role });

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only teachers and admins can publish/unpublish homeworks
        if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { isPublished } = await req.json();

        // First, check if homework exists
        const homeworkExists = await db.homework.findUnique({
            where: { id: homeworkId },
            include: {
                course: {
                    select: {
                        id: true,
                        userId: true,
                        title: true
                    }
                }
            }
        });

        console.log("[HOMEWORK_PUBLISH] Homework found:", {
            exists: !!homeworkExists,
            courseUserId: homeworkExists?.course?.userId,
            sessionUserId: session.user.id,
            isAdmin: session.user.role === "ADMIN"
        });

        if (!homeworkExists) {
            return new NextResponse("Homework not found", { status: 404 });
        }

        // All teachers and admins can publish/unpublish any homework (no ownership check needed)

        const updatedHomework = await db.homework.update({
            where: {
                id: homeworkId
            },
            data: {
                isPublished
            }
        });

        console.log("[HOMEWORK_PUBLISH] Success:", { homeworkId, isPublished });
        return NextResponse.json(updatedHomework);
    } catch (error) {
        console.error("[HOMEWORK_PUBLISH] Error:", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

