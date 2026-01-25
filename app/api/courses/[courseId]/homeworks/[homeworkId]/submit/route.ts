import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions } from "@/lib/utils";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ courseId: string; homeworkId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;
        const { answers } = await req.json();

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

        // Get the homework with questions
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
                        correctAnswer: true,
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

        if (existingResults.length >= homework.maxAttempts) {
            return new NextResponse("Maximum attempts reached for this homework", { status: 400 });
        }

        // Calculate score
        let totalScore = 0;
        let totalPoints = 0;
        const homeworkAnswers = [];

        for (const question of homework.questions) {
            totalPoints += question.points;
            const studentAnswer = answers.find((a: any) => a.questionId === question.id)?.answer || "";
            
            let isCorrect = false;
            let pointsEarned = 0;

            if (question.type === "MULTIPLE_CHOICE") {
                const options = parseQuizOptions(question.options);
                const correctAnswer = question.correctAnswer.trim();
                
                isCorrect = options.some(option => 
                    option.trim() === correctAnswer && 
                    option.trim() === studentAnswer.trim()
                );
            } else if (question.type === "TRUE_FALSE") {
                isCorrect = studentAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
            } else if (question.type === "SHORT_ANSWER") {
                isCorrect = studentAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
            }

            if (isCorrect) {
                pointsEarned = question.points;
                totalScore += question.points;
            }

            homeworkAnswers.push({
                questionId: question.id,
                studentAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect,
                pointsEarned
            });
        }

        const percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;

        // Create homework result in database
        const homeworkResult = await db.homeworkResult.create({
            data: {
                studentId: userId,
                homeworkId: resolvedParams.homeworkId,
                score: totalScore,
                totalPoints,
                percentage,
                attemptNumber: currentAttemptNumber,
                answers: {
                    create: homeworkAnswers.map(answer => ({
                        questionId: answer.questionId,
                        studentAnswer: answer.studentAnswer,
                        correctAnswer: answer.correctAnswer,
                        isCorrect: answer.isCorrect,
                        pointsEarned: answer.pointsEarned
                    }))
                }
            },
            include: {
                answers: {
                    include: {
                        question: true
                    }
                }
            }
        });

        // Return the result with full question data
        return NextResponse.json({
            id: homeworkResult.id,
            studentId: homeworkResult.studentId,
            homeworkId: homeworkResult.homeworkId,
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
        });
    } catch (error) {
        console.log("[HOMEWORK_SUBMIT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

