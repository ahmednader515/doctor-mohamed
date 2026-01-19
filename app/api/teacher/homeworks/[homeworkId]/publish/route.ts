import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ homeworkId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { isPublished } = await req.json();

        // Verify access: admin or owner teacher
        const homework = await db.homework.findFirst({
            where: user?.role === "ADMIN"
                ? { id: resolvedParams.homeworkId }
                : {
                    id: resolvedParams.homeworkId,
                    course: { userId: userId },
                },
        });

        if (!homework) {
            return new NextResponse("Homework not found or unauthorized", { status: 404 });
        }

        const updatedHomework = await db.homework.update({
            where: {
                id: resolvedParams.homeworkId
            },
            data: {
                isPublished
            }
        });

        return NextResponse.json(updatedHomework);
    } catch (error) {
        console.log("[HOMEWORK_PUBLISH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

