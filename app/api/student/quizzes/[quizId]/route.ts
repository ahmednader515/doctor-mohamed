import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get all quiz results for this student and quiz
        const quizResults = await db.quizResult.findMany({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            },
            include: {
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        maxAttempts: true,
                        course: {
                            select: {
                                id: true,
                                title: true,
                                imageUrl: true
                            }
                        }
                    }
                },
                answers: {
                    include: {
                        question: {
                            select: {
                                text: true,
                                type: true,
                                points: true,
                                position: true,
                                options: true,
                                correctAnswer: true,
                                imageUrl: true
                            }
                        }
                    },
                    orderBy: {
                        question: {
                            position: 'asc'
                        }
                    }
                }
            },
            orderBy: {
                attemptNumber: 'desc'
            }
        });

        if (quizResults.length === 0) {
            return new NextResponse("No quiz results found", { status: 404 });
        }

        return NextResponse.json(quizResults);
    } catch (error) {
        console.log("[STUDENT_QUIZ_DETAIL_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

