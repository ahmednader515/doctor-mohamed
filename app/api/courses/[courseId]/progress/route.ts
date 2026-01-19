import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get total content (chapters + quizzes + homeworks) in the course
    const [totalChapters, totalQuizzes, totalHomeworks] = await Promise.all([
      db.chapter.count({
        where: {
          courseId: resolvedParams.courseId,
          isPublished: true,
        }
      }),
      db.quiz.count({
        where: {
          courseId: resolvedParams.courseId,
          isPublished: true,
        }
      }),
      db.homework.count({
        where: {
          courseId: resolvedParams.courseId,
          isPublished: true,
        }
      })
    ]);

    const totalContent = totalChapters + totalQuizzes + totalHomeworks;

    // Get completed chapters
    const completedChapters = await db.userProgress.count({
      where: {
        userId,
        chapter: {
          courseId: resolvedParams.courseId,
        },
        isCompleted: true
      }
    });

        // Get completed quizzes (quizzes that the student has taken at least once)
    const completedQuizResults = await db.quizResult.findMany({
        where: {
            studentId: userId,
            quiz: {
                courseId: resolvedParams.courseId,
                isPublished: true,
            }
        },
        select: {
            quizId: true
        }
    });

    // Count unique quizIds
    const uniqueQuizIds = new Set(completedQuizResults.map(result => result.quizId));
    const completedQuizzes = uniqueQuizIds.size;

    // Get completed homeworks (homeworks that the student has submitted at least once)
    const completedHomeworkResults = await db.homeworkResult.findMany({
        where: {
            studentId: userId,
            homework: {
                courseId: resolvedParams.courseId,
                isPublished: true,
            }
        },
        select: {
            homeworkId: true
        }
    });

    // Count unique homeworkIds
    const uniqueHomeworkIds = new Set(completedHomeworkResults.map(result => result.homeworkId));
    const completedHomeworks = uniqueHomeworkIds.size;

    const completedContent = completedChapters + completedQuizzes + completedHomeworks;

    // Calculate progress percentage
    const progress = totalContent > 0 
      ? Math.round((completedContent / totalContent) * 100)
      : 0;

    return NextResponse.json({ progress });
  } catch (error) {
    console.log("[PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 