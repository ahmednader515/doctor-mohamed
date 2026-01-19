import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions } from "@/lib/utils";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ homeworkId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get all homework results for this student and homework
        const homeworkResults = await db.homeworkResult.findMany({
            where: {
                studentId: userId,
                homeworkId: resolvedParams.homeworkId
            },
            include: {
                homework: {
                    select: {
                        id: true,
                        title: true,
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
                submittedAt: "desc"
            }
        });

        // Parse options for multiple choice questions
        const parsedResults = homeworkResults.map(result => ({
            ...result,
            answers: result.answers.map(answer => ({
                ...answer,
                question: {
                    ...answer.question,
                    options: answer.question.options ? parseQuizOptions(answer.question.options) : null
                }
            }))
        }));

        return NextResponse.json(parsedResults);
    } catch (error) {
        console.log("[STUDENT_HOMEWORK_RESULTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

