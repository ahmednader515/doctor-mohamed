import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions } from "@/lib/utils";

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

        // Get the latest homework result for this student
        const homeworkResult = await db.homeworkResult.findFirst({
            where: {
                studentId: userId,
                homeworkId: resolvedParams.homeworkId
            },
            include: {
                homework: {
                    select: {
                        id: true,
                        title: true,
                        maxAttempts: true
                    }
                },
                answers: {
                    include: {
                        question: {
                            select: {
                                id: true,
                                text: true,
                                type: true,
                                options: true,
                                correctAnswer: true,
                                points: true,
                                imageUrl: true,
                                position: true
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
                submittedAt: 'desc'
            }
        });

        if (!homeworkResult) {
            return new NextResponse("No result found", { status: 404 });
        }

        // Parse options for multiple choice questions
        const parsedResult = {
            id: homeworkResult.id,
            score: homeworkResult.score,
            totalPoints: homeworkResult.totalPoints,
            percentage: homeworkResult.percentage,
            attemptNumber: homeworkResult.attemptNumber,
            submittedAt: homeworkResult.submittedAt,
            answers: homeworkResult.answers.map(answer => ({
                questionId: answer.questionId,
                studentAnswer: answer.studentAnswer,
                correctAnswer: answer.correctAnswer,
                isCorrect: answer.isCorrect,
                pointsEarned: answer.pointsEarned,
                question: {
                    text: answer.question.text,
                    type: answer.question.type,
                    points: answer.question.points,
                    options: answer.question.options ? parseQuizOptions(answer.question.options) : null,
                    imageUrl: answer.question.imageUrl,
                    position: answer.question.position
                }
            }))
        };

        return NextResponse.json(parsedResult);
    } catch (error) {
        console.log("[HOMEWORK_RESULT_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
