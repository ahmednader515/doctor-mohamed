import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get all homework results for this student
        const homeworkResults = await db.homeworkResult.findMany({
            where: {
                studentId: userId
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
                }
            },
            orderBy: {
                submittedAt: "desc"
            }
        });

        // Group by homeworkId and get the best attempt for each homework
        const homeworkMap = new Map();
        
        homeworkResults.forEach(result => {
            const homeworkId = result.homeworkId;
            if (!homeworkMap.has(homeworkId)) {
                homeworkMap.set(homeworkId, {
                    homework: result.homework,
                    bestResult: result,
                    allAttempts: [result]
                });
            } else {
                const existing = homeworkMap.get(homeworkId);
                existing.allAttempts.push(result);
                // Update best result if this one is better
                if (result.percentage > existing.bestResult.percentage) {
                    existing.bestResult = result;
                }
            }
        });

        // Convert map to array
        const homeworks = Array.from(homeworkMap.values()).map(item => ({
            homework: item.homework,
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

        // Also get all published homeworks from purchased courses that don't have results yet
        const allHomeworks = await db.homework.findMany({
            where: {
                isPublished: true,
                course: {
                    purchases: {
                        some: {
                            userId,
                            status: "ACTIVE"
                        }
                    }
                }
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        imageUrl: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Add homeworks without results
        const homeworkIdsWithResults = new Set(homeworks.map(h => h.homework.id));
        allHomeworks.forEach(homework => {
            if (!homeworkIdsWithResults.has(homework.id)) {
                homeworks.push({
                    homework: {
                        id: homework.id,
                        title: homework.title,
                        course: homework.course
                    },
                    bestResult: null,
                    totalAttempts: 0
                });
            }
        });

        return NextResponse.json(homeworks);
    } catch (error) {
        console.log("[STUDENT_HOMEWORKS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

