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
                userProgress: userId ? {
                    where: {
                        userId: userId
                    },
                    select: {
                        isCompleted: true
                    }
                } : false
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

        // Debug log for chapters with userProgress
        if (userId) {
            const chaptersWithProgress = allContent.filter(c => {
                if (c.type === 'chapter') {
                    const chapter = c as typeof c & { userProgress?: { isCompleted: boolean }[] };
                    return chapter.userProgress && chapter.userProgress.length > 0;
                }
                return false;
            });
            if (chaptersWithProgress.length > 0) {
                console.log('🔍 Content API - Chapters with progress:', chaptersWithProgress.map(c => {
                    const chapter = c as typeof c & { userProgress?: { isCompleted: boolean }[] };
                    return {
                        id: c.id,
                        title: c.title,
                        userProgress: chapter.userProgress
                    };
                }));
            }
        }

        const response = NextResponse.json(allContent);
        // Disable caching to ensure fresh data
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
    } catch (error) {
        console.log("[COURSE_CONTENT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 