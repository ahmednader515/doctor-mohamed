import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { userId } = await auth();
        const { courseId } = resolvedParams;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: {
                id: courseId,
                isPublished: true,
            },
            include: {
                chapters: {
                    where: {
                        isPublished: true,
                    },
                    orderBy: {
                        position: "asc",
                    },
                },
                attachments: {
                    orderBy: {
                        createdAt: "desc",
                    },
                },
                purchases: {
                    where: {
                        userId,
                    },
                },
            },
        });

        if (!course) {
            return new NextResponse("Not found", { status: 404 });
        }

        return NextResponse.json(course);
    } catch (error) {
        console.error("[COURSE_ID]", error);
        if (error instanceof Error) {
            return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const values = await req.json();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const whereClause = user?.role === "ADMIN"
            ? { id: resolvedParams.courseId }
            : { id: resolvedParams.courseId, userId };

        // Filter out undefined values and only include fields that are being updated
        const updateData: any = {};
        if (values.grade !== undefined) updateData.grade = values.grade;
        if (values.subject !== undefined) updateData.subject = values.subject;
        if (values.semester !== undefined) updateData.semester = values.semester;
        if (values.title !== undefined) updateData.title = values.title;
        if (values.description !== undefined) updateData.description = values.description;
        if (values.imageUrl !== undefined) updateData.imageUrl = values.imageUrl;
        if (values.price !== undefined) updateData.price = values.price;
        if (values.isPublished !== undefined) updateData.isPublished = values.isPublished;

        const course = await db.course.update({
            where: whereClause,
            data: updateData
        });

        return NextResponse.json(course);
    } catch (error) {
        console.error("[COURSE_ID]", error);
        if (error instanceof Error) {
            return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
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
            }
        });

        if (!course) {
            return new NextResponse("Not found", { status: 404 });
        }

        // Only owner or admin can delete
        if (user?.role !== "ADMIN" && course.userId !== userId) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const deletedCourse = await db.course.delete({
            where: {
                id: resolvedParams.courseId,
            },
        });

        return NextResponse.json(deletedCourse);
    } catch (error) {
        console.log("[COURSE_ID_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}