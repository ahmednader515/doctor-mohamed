import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const resolvedParams = await params;
        let userId = null;
        try {
            const authResult = await auth();
            userId = authResult.userId;
        } catch (error) {
            // User is not authenticated, which is fine for content listing
        }

        // Get chapters
        const chapters = await db.chapter.findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                userProgress: {
                    select: {
                        isCompleted: true
                    }
                }
            },
            orderBy: {
                position: "asc"
            }
        });

        // Get published quizzes
        const quizzes = await db.quiz.findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                quizResults: userId ? {
                    where: {
                        studentId: userId
                    },
                    select: {
                        id: true,
                        score: true,
                        totalPoints: true,
                        percentage: true
                    }
                } : false
            },
            orderBy: {
                position: "asc"
            }
        });

        // Get published homeworks
        const homeworks = await db.homework.findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                homeworkResults: userId ? {
                    where: {
                        studentId: userId
                    },
                    select: {
                        id: true,
                        score: true,
                        totalPoints: true,
                        percentage: true
                    }
                } : false
            },
            orderBy: {
                position: "asc"
            }
        });

        // Combine and sort by position
        const allContent = [
            ...chapters.map(chapter => ({
                ...chapter,
                type: 'chapter' as const
            })),
            ...quizzes.map(quiz => ({
                ...quiz,
                type: 'quiz' as const
            })),
            ...homeworks.map(homework => ({
                ...homework,
                type: 'homework' as const
            }))
        ].sort((a, b) => a.position - b.position);

        return NextResponse.json(allContent);
    } catch (error) {
        console.log("[COURSE_CONTENT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 