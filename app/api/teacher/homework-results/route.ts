import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions } from "@/lib/utils";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        const { searchParams } = new URL(req.url);
        const homeworkId = searchParams.get('homeworkId');

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Build the where clause (all teachers can see all homework results)
        const whereClause: any = {};

        // Add homeworkId filter if provided
        if (homeworkId) {
            whereClause.homeworkId = homeworkId;
        }

        // Get all homework results
        const homeworkResults = await db.homeworkResult.findMany({
            where: whereClause,
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
                                options: true
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
        const parsedResults = homeworkResults.map((result: any) => ({
            ...result,
            answers: result.answers.map((answer: any) => ({
                ...answer,
                question: {
                    ...answer.question,
                    options: answer.question.options ? parseQuizOptions(answer.question.options) : null
                }
            }))
        }));

        return NextResponse.json(parsedResults);
    } catch (error) {
        console.log("[TEACHER_HOMEWORK_RESULTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

