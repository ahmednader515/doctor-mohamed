import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions } from "@/lib/utils";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ resultId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get the homework result (all teachers can see all homework results)
        const homeworkResult = await db.homeworkResult.findFirst({
            where: {
                id: resolvedParams.resultId
            },
            include: {
                user: {
                    select: {
                        fullName: true,
                        phoneNumber: true,
                        grade: true
                    }
                },
                homework: {
                    select: {
                        title: true,
                        course: {
                            select: {
                                id: true,
                                title: true
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
                                imageUrl: true,
                                options: true,
                                correctAnswer: true
                            }
                        }
                    },
                    orderBy: {
                        question: {
                            position: 'asc'
                        }
                    }
                }
            }
        });

        if (!homeworkResult) {
            return new NextResponse("Homework result not found", { status: 404 });
        }

        // Parse options for multiple choice questions
        const parsedResult = {
            ...homeworkResult,
            answers: homeworkResult.answers.map((answer: any) => ({
                ...answer,
                question: {
                    ...answer.question,
                    options: answer.question.options ? parseQuizOptions(answer.question.options) : null
                }
            }))
        };

        return NextResponse.json(parsedResult);
    } catch (error) {
        console.log("[TEACHER_HOMEWORK_RESULT_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

