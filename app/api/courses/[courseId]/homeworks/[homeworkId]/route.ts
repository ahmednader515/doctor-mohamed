import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string; homeworkId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if user has access to the course
        const purchase = await db.purchase.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId: resolvedParams.courseId
                }
            }
        });

        if (!purchase) {
            return new NextResponse("Course access required", { status: 403 });
        }

        // Get the homework
        const homework = await db.homework.findFirst({
            where: {
                id: resolvedParams.homeworkId,
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                questions: {
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        options: true,
                        points: true,
                        imageUrl: true
                    },
                    orderBy: {
                        position: 'asc'
                    }
                }
            }
        });

        if (!homework) {
            return new NextResponse("Homework not found", { status: 404 });
        }

        // Check if user has already taken this homework and if they can take it again
        const existingResults = await db.homeworkResult.findMany({
            where: {
                studentId: userId,
                homeworkId: resolvedParams.homeworkId
            },
            orderBy: {
                attemptNumber: 'desc'
            }
        });

        const currentAttemptNumber = existingResults.length + 1;

        // Add attempt information to the homework response
        const homeworkWithAttemptInfo = {
            ...homework,
            currentAttempt: currentAttemptNumber,
            maxAttempts: homework.maxAttempts,
            previousAttempts: existingResults.length,
            canAttempt: existingResults.length < homework.maxAttempts
        };

        return NextResponse.json(homeworkWithAttemptInfo);
    } catch (error) {
        console.log("[HOMEWORK_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; homeworkId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verify the course exists and user has permission
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

        // Admin, teacher, or owner can delete homeworks
        if (user?.role !== "ADMIN" && user?.role !== "TEACHER" && course.userId !== userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Delete the homework and all related data
        await db.homework.delete({
            where: {
                id: resolvedParams.homeworkId,
                courseId: resolvedParams.courseId
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[HOMEWORK_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
