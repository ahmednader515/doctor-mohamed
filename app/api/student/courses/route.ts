import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get all purchased courses for this student
        const purchases = await db.purchase.findMany({
            where: {
                userId: userId,
                status: "ACTIVE"
            },
            include: {
                course: {
                    include: {
                        chapters: {
                            where: {
                                isPublished: true
                            },
                            select: {
                                id: true
                            }
                        },
                        quizzes: {
                            where: {
                                isPublished: true
                            },
                            select: {
                                id: true
                            }
                        },
                        homeworks: {
                            where: {
                                isPublished: true
                            },
                            select: {
                                id: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // Calculate progress for each course
        const coursesWithProgress = await Promise.all(
            purchases.map(async (purchase) => {
                const course = purchase.course;
                const totalChapters = course.chapters.length;
                const totalQuizzes = course.quizzes.length;
                const totalHomeworks = course.homeworks.length;
                const totalContent = totalChapters + totalQuizzes + totalHomeworks;

                // Get completed chapters
                const completedChapters = await db.userProgress.count({
                    where: {
                        userId: userId,
                        chapterId: {
                            in: course.chapters.map(ch => ch.id)
                        },
                        isCompleted: true
                    }
                });

                // Get unique completed quizzes
                const completedQuizResults = await db.quizResult.findMany({
                    where: {
                        studentId: userId,
                        quizId: {
                            in: course.quizzes.map(q => q.id)
                        }
                    },
                    select: {
                        quizId: true
                    }
                });

                const uniqueQuizIds = new Set(completedQuizResults.map(result => result.quizId));
                const completedQuizzes = uniqueQuizIds.size;

                // Get unique completed homeworks
                const completedHomeworkResults = await db.homeworkResult.findMany({
                    where: {
                        studentId: userId,
                        homeworkId: {
                            in: course.homeworks.map(h => h.id)
                        }
                    },
                    select: {
                        homeworkId: true
                    }
                });

                const uniqueHomeworkIds = new Set(completedHomeworkResults.map(result => result.homeworkId));
                const completedHomeworks = uniqueHomeworkIds.size;

                const completedContent = completedChapters + completedQuizzes + completedHomeworks;
                const progress = totalContent > 0 ? (completedContent / totalContent) * 100 : 0;

                return {
                    ...course,
                    progress
                };
            })
        );

        return NextResponse.json(coursesWithProgress);
    } catch (error) {
        console.log("[STUDENT_COURSES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

