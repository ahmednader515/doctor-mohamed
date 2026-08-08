import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getDashboardUrlByRole } from "@/lib/utils";
import { DashboardContent } from "./_components/dashboard-content";
import { Course, Purchase } from "@prisma/client";

type CourseWithProgress = Course & {
  chapters: { id: string }[];
  quizzes: { id: string }[];
  homeworks?: { id: string }[];
  purchases: Purchase[];
  progress: number;
}

type LastWatchedChapter = {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  courseImageUrl: string | null;
  position: number;
}

type StudentStats = {
  totalCourses: number;
  totalChapters: number;
  completedChapters: number;
  totalQuizzes: number;
  completedQuizzes: number;
  totalHomeworks: number;
  completedHomeworks: number;
  averageScore: number;
}

const emptyStats: StudentStats = {
  totalCourses: 0,
  totalChapters: 0,
  completedChapters: 0,
  totalQuizzes: 0,
  completedQuizzes: 0,
  totalHomeworks: 0,
  completedHomeworks: 0,
  averageScore: 0,
};

const CoursesPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return redirect("/");
  }

  // Redirect non-students to their role-specific dashboard
  if (session.user.role !== "USER") {
    const dashboardUrl = getDashboardUrlByRole(session.user.role);
    return redirect(dashboardUrl);
  }

  const userId = session.user.id;

  // Get user's current balance
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { balance: true }
  });

  // Active purchases first — all analytics are scoped to these courses only
  const purchases = await db.purchase.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    select: {
      courseId: true,
    },
  });

  const purchasedCourseIds = purchases.map((p) => p.courseId);
  const totalCourses = purchasedCourseIds.length;

  // No purchases → everything is zero (no leftover progress from unpurchased courses)
  if (totalCourses === 0) {
    return (
      <DashboardContent
        user={user}
        lastWatchedChapter={null}
        studentStats={emptyStats}
        coursesWithProgress={[]}
      />
    );
  }

  const publishedChapters = await db.chapter.findMany({
    where: {
      courseId: { in: purchasedCourseIds },
      isPublished: true,
    },
    select: { id: true },
  });
  const publishedChapterIds = publishedChapters.map((c) => c.id);
  const totalChapters = publishedChapterIds.length;

  const completedChapters = totalChapters === 0
    ? 0
    : await db.userProgress.count({
        where: {
          userId,
          isCompleted: true,
          chapterId: { in: publishedChapterIds },
        },
      });

  const publishedQuizzes = await db.quiz.findMany({
    where: {
      courseId: { in: purchasedCourseIds },
      isPublished: true,
    },
    select: { id: true },
  });
  const publishedQuizIds = publishedQuizzes.map((q) => q.id);
  const totalQuizzes = publishedQuizIds.length;

  const completedQuizResults = totalQuizzes === 0
    ? []
    : await db.quizResult.findMany({
        where: {
          studentId: userId,
          quizId: { in: publishedQuizIds },
        },
        select: {
          quizId: true,
          percentage: true,
        },
        orderBy: {
          percentage: "desc",
        },
      });

  const uniqueQuizIds = new Set(completedQuizResults.map((r) => r.quizId));
  const completedQuizzes = uniqueQuizIds.size;

  // Best attempt per quiz for average score
  const bestAttempts = new Map<string, number>();
  completedQuizResults.forEach((result) => {
    if (!bestAttempts.has(result.quizId)) {
      bestAttempts.set(result.quizId, result.percentage);
    }
  });
  const averageScore = bestAttempts.size > 0
    ? Math.round(
        Array.from(bestAttempts.values()).reduce((sum, p) => sum + p, 0) /
          bestAttempts.size
      )
    : 0;

  const publishedHomeworks = await db.homework.findMany({
    where: {
      courseId: { in: purchasedCourseIds },
      isPublished: true,
    },
    select: { id: true },
  });
  const publishedHomeworkIds = publishedHomeworks.map((h) => h.id);
  const totalHomeworks = publishedHomeworkIds.length;

  const completedHomeworkResults = totalHomeworks === 0
    ? []
    : await db.homeworkResult.findMany({
        where: {
          studentId: userId,
          homeworkId: { in: publishedHomeworkIds },
        },
        select: { homeworkId: true },
      });
  const completedHomeworks = new Set(
    completedHomeworkResults.map((r) => r.homeworkId)
  ).size;

  const studentStats: StudentStats = {
    totalCourses,
    totalChapters,
    completedChapters,
    totalQuizzes,
    completedQuizzes,
    totalHomeworks,
    completedHomeworks,
    averageScore,
  };

  // Last watched chapter only within purchased courses
  const lastWatchedChapter = await db.userProgress.findFirst({
    where: {
      userId,
      isCompleted: false,
      chapter: {
        courseId: { in: purchasedCourseIds },
        isPublished: true,
      },
    },
    include: {
      chapter: {
        include: {
          course: {
            select: {
              title: true,
              imageUrl: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const courses = await db.course.findMany({
    where: {
      id: { in: purchasedCourseIds },
    },
    include: {
      chapters: {
        where: { isPublished: true },
        select: { id: true },
      },
      quizzes: {
        where: { isPublished: true },
        select: { id: true },
      },
      homeworks: {
        where: { isPublished: true },
        select: { id: true },
      },
      purchases: {
        where: { userId },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const coursesWithProgress = await Promise.all(
    courses.map(async (course) => {
      const chapterIds = course.chapters.map((chapter) => chapter.id);
      const quizIds = course.quizzes.map((quiz) => quiz.id);
      const homeworkIds = course.homeworks.map((homework) => homework.id);
      const totalContent = chapterIds.length + quizIds.length + homeworkIds.length;

      if (totalContent === 0) {
        return { ...course, progress: 0 } as CourseWithProgress;
      }

      const courseCompletedChapters = chapterIds.length === 0
        ? 0
        : await db.userProgress.count({
            where: {
              userId,
              chapterId: { in: chapterIds },
              isCompleted: true,
            },
          });

      const courseQuizResults = quizIds.length === 0
        ? []
        : await db.quizResult.findMany({
            where: {
              studentId: userId,
              quizId: { in: quizIds },
            },
            select: { quizId: true },
          });
      const courseCompletedQuizzes = new Set(
        courseQuizResults.map((r) => r.quizId)
      ).size;

      const courseHomeworkResults = homeworkIds.length === 0
        ? []
        : await db.homeworkResult.findMany({
            where: {
              studentId: userId,
              homeworkId: { in: homeworkIds },
            },
            select: { homeworkId: true },
          });
      const courseCompletedHomeworks = new Set(
        courseHomeworkResults.map((r) => r.homeworkId)
      ).size;

      const completedContent =
        courseCompletedChapters + courseCompletedQuizzes + courseCompletedHomeworks;

      return {
        ...course,
        progress: (completedContent / totalContent) * 100,
      } as CourseWithProgress;
    })
  );

  const transformedLastWatchedChapter: LastWatchedChapter | null =
    lastWatchedChapter
      ? {
          id: lastWatchedChapter.chapter.id,
          title: lastWatchedChapter.chapter.title,
          courseId: lastWatchedChapter.chapter.courseId,
          courseTitle: lastWatchedChapter.chapter.course.title,
          courseImageUrl: lastWatchedChapter.chapter.course.imageUrl,
          position: lastWatchedChapter.chapter.position,
        }
      : null;

  return (
    <DashboardContent
      user={user}
      lastWatchedChapter={transformedLastWatchedChapter}
      studentStats={studentStats}
      coursesWithProgress={coursesWithProgress}
    />
  );
};

export default CoursesPage;
