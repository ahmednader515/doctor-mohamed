import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CoursesContent } from "./_components/courses-content";

const CoursesPage = async () => {
    const { userId } = await auth();

    if (!userId) {
        return redirect("/");
    }

    const coursesData = await db.course.findMany({
        include: {
            chapters: {
                select: {
                    id: true,
                    isPublished: true,
                }
            },
            quizzes: {
                select: {
                    id: true,
                    isPublished: true,
                }
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    const courses = coursesData.map((course) => {
        const chapters = (course as any).chapters || [];
        const quizzes = (course as any).quizzes || [];
        return {
            ...course,
            price: course.price || 0,
            publishedChaptersCount: chapters.filter((ch: { isPublished: boolean }) => ch.isPublished).length,
            publishedQuizzesCount: quizzes.filter((q: { isPublished: boolean }) => q.isPublished).length,
        };
    });

    const unpublishedCourses = courses.filter(course => !course.isPublished);
    const hasUnpublishedCourses = unpublishedCourses.length > 0;

    return (
        <CoursesContent courses={courses} hasUnpublishedCourses={hasUnpublishedCourses} />
    );
};

export default CoursesPage;