import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { SearchContent } from "./_components/search-content";
import { Course, Purchase } from "@prisma/client";

type CourseWithDetails = Course & {
    chapters: { id: string }[];
    purchases: Purchase[];
    progress: number;
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return redirect("/");
    }

    const resolvedParams = await searchParams;
    const title = typeof resolvedParams.title === 'string' ? resolvedParams.title : '';

    // Get the user's subject, grade, and semester
    const user = await db.user.findUnique({
        where: {
            id: session.user.id,
        },
        select: {
            subject: true,
            grade: true,
            semester: true,
        },
    });

    // Handle multiple subjects (comma-separated)
    const userSubjects = user?.subject 
      ? user.subject.split(",").map(s => s.trim()).filter(s => s.length > 0)
      : [];

    const courses = await db.course.findMany({
        where: {
            isPublished: true,
            title: {
                contains: title,
            },
            // Filter by student's subject(s) if they have one
            ...(userSubjects.length > 0 ? {
                subject: {
                    in: userSubjects,
                },
            } : {}),
            // Filter by student's grade if they have one
            ...(user?.grade ? {
                grade: user.grade,
            } : {}),
            // Filter by student's semester if they have one
            ...(user?.semester ? {
                semester: user.semester,
            } : {}),
        },
        include: {
            chapters: {
                where: {
                    isPublished: true,
                },
                select: {
                    id: true,
                }
            },
            purchases: {
                where: {
                    userId: session.user.id,
                }
            }
        },
        orderBy: {
            createdAt: "desc",
        }
    ,
        cacheStrategy: process.env.NODE_ENV === "production" ? { ttl: 60 } : undefined,
    });

    const coursesWithProgress = await Promise.all(
        courses.map(async (course) => {
            const totalChapters = course.chapters.length;
            const completedChapters = await db.userProgress.count({
                where: {
                    userId: session.user.id,
                    chapterId: {
                        in: course.chapters.map(chapter => chapter.id)
                    },
                    isCompleted: true
                }
            });

            const progress = totalChapters > 0 
                ? (completedChapters / totalChapters) * 100 
                : 0;

            return {
                ...course,
                progress
            } as CourseWithDetails;
        })
    );

    return (
        <SearchContent 
            title={title}
            coursesWithProgress={coursesWithProgress}
        />
    );
}