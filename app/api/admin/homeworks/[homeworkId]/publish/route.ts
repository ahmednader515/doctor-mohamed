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

        if (user?.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { isPublished } = await req.json();

        const homework = await db.homework.findUnique({
            where: { id: resolvedParams.homeworkId },
        });

        if (!homework) {
            return new NextResponse("Homework not found", { status: 404 });
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
        console.log("[ADMIN_HOMEWORK_PUBLISH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

