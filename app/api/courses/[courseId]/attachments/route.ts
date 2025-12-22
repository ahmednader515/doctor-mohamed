import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const { url, name } = await req.json();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const resolvedParams = await params;
        const { courseId } = resolvedParams;

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

        // Admin, teacher, or owner can add attachments
        if (user?.role !== "ADMIN" && user?.role !== "TEACHER" && course.userId !== userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const attachment = await db.attachment.create({
            data: {
                url,
                name,
                courseId: courseId,
            }
        });

        return NextResponse.json(attachment);
    } catch (error) {
        console.log("COURSE_ID_ATTACHMENTS", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, user } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const resolvedParams = await params;
        const { courseId } = resolvedParams;

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

        // Admin, teacher, or owner can view attachments
        if (user?.role !== "ADMIN" && user?.role !== "TEACHER" && course.userId !== userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const attachments = await db.attachment.findMany({
            where: {
                courseId: courseId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(attachments);
    } catch (error) {
        console.log("COURSE_ID_ATTACHMENTS", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 