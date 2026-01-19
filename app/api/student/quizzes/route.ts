import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get all quiz results for this student
        const quizResults = await db.quizResult.findMany({
            where: {
                studentId: userId
            },
            include: {
                quiz: {
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
                }
            },
            orderBy: {
                submittedAt: "desc"
            }
        });

        // Group by quizId and get the best attempt for each quiz
        const quizMap = new Map();
        
        quizResults.forEach(result => {
            const quizId = result.quizId;
            if (!quizMap.has(quizId)) {
                quizMap.set(quizId, {
                    quiz: result.quiz,
                    bestResult: result,
                    allAttempts: [result]
                });
            } else {
                const existing = quizMap.get(quizId);
                existing.allAttempts.push(result);
                // Update best result if this one is better
                if (result.percentage > existing.bestResult.percentage) {
                    existing.bestResult = result;
                }
            }
        });

        // Convert map to array
        const quizzes = Array.from(quizMap.values()).map(item => ({
            quiz: item.quiz,
            bestResult: {
                id: item.bestResult.id,
                score: item.bestResult.score,
                totalPoints: item.bestResult.totalPoints,
                percentage: item.bestResult.percentage,
                submittedAt: item.bestResult.submittedAt,
                attemptNumber: item.bestResult.attemptNumber
            },
            totalAttempts: item.allAttempts.length
        }));

        return NextResponse.json(quizzes);
    } catch (error) {
        console.log("[STUDENT_QUIZZES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

