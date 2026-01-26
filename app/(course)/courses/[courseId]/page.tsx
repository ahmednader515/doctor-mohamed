"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface CourseContent {
    id: string;
    title: string;
    type: 'chapter' | 'quiz' | 'homework';
    position: number;
    isPublished: boolean;
    userProgress?: {
        isCompleted: boolean;
    }[];
}

export default function CoursePage({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const router = useRouter();
    const { courseId } = use(params);
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [courseContent, setCourseContent] = useState<CourseContent[]>([]);
    const [courseTitle, setCourseTitle] = useState<string>("");

    useEffect(() => {
        fetchCourseData();
    }, [courseId]);

    // Handle redirect when user doesn't have access
    useEffect(() => {
        if (!loading && !hasAccess) {
            router.replace(`/courses/${courseId}/purchase`);
        }
    }, [loading, hasAccess, courseId, router]);

    const fetchCourseData = async () => {
        try {
            // Fetch course details first
            const courseResponse = await fetch(`/api/courses/${courseId}`);
            if (!courseResponse.ok) {
                if (courseResponse.status === 401) {
                    router.push("/sign-in");
                    return;
                }
                toast.error("الكورس غير موجود");
                router.push("/dashboard");
                return;
            }
            const courseData = await courseResponse.json();
            setCourseTitle(courseData.title || "");

            // Check if course has chapters
            const hasChapters = courseData.chapters && courseData.chapters.length > 0;

            // Check access and get course content
            const [accessResponse, contentResponse] = await Promise.all([
                fetch(`/api/courses/${courseId}/access`),
                fetch(`/api/courses/${courseId}/content`)
            ]);

            let userHasAccess = false;
            if (accessResponse.ok) {
                const accessData = await accessResponse.json();
                userHasAccess = accessData.hasAccess;
                setHasAccess(userHasAccess);
            } else if (accessResponse.status === 401) {
                // User not authenticated, redirect to sign in
                router.push("/sign-in");
                return;
            }

            let content: CourseContent[] = [];
            if (contentResponse.ok) {
                const contentData = await contentResponse.json();
                content = contentData;
                setCourseContent(contentData);
            }

            // If user has access and there's content, determine which chapter to redirect to
            if (userHasAccess && content.length > 0) {
                // Find all chapters (only chapters, not quizzes or homeworks)
                const chapters = content.filter((item: CourseContent) => item.type === 'chapter');
                
                console.log('📚 Course content:', {
                    totalContent: content.length,
                    chapters: chapters.length,
                    chapterTypes: chapters.map(c => ({ id: c.id, title: c.title, type: c.type, position: c.position }))
                });
                
                if (chapters.length === 0) {
                    setLoading(false);
                    return;
                }

                // Sort chapters by position to ensure correct order
                const sortedChapters = [...chapters].sort((a, b) => a.position - b.position);

                // Find completed chapters (chapters with userProgress that is completed)
                const completedChapters = sortedChapters.filter((chapter: CourseContent) => {
                    const hasProgress = chapter.userProgress && chapter.userProgress.length > 0;
                    const isCompleted = hasProgress && chapter.userProgress![0].isCompleted;
                    return isCompleted;
                });

                console.log('✅ Completed chapters:', completedChapters.map(c => ({ id: c.id, title: c.title, position: c.position })));

                let targetChapter: CourseContent | undefined;

                if (completedChapters.length === 0) {
                    // No progress: redirect to first chapter (by position)
                    targetChapter = sortedChapters[0];
                    console.log('🎯 No progress - selecting first chapter:', targetChapter.title, 'position:', targetChapter.position);
                } else {
                    // Find the last completed chapter by position
                    const lastCompletedChapter = completedChapters.reduce((last: CourseContent, current: CourseContent) => {
                        return current.position > last.position ? current : last;
                    });

                    console.log('📖 Last completed chapter:', lastCompletedChapter.title, 'position:', lastCompletedChapter.position);

                    // Find the next chapter after the last completed one
                    targetChapter = sortedChapters.find((chapter: CourseContent) => chapter.position > lastCompletedChapter.position);
                    
                    // If no next chapter exists, stay on the last completed chapter
                    if (!targetChapter) {
                        targetChapter = lastCompletedChapter;
                        console.log('🔄 No next chapter - staying on last completed:', targetChapter.title);
                    } else {
                        console.log('➡️ Next chapter found:', targetChapter.title, 'position:', targetChapter.position);
                    }
                }

                // Double-check that we're redirecting to a chapter, not a homework or quiz
                if (targetChapter && targetChapter.type === 'chapter') {
                    console.log('🚀 Redirecting to chapter:', targetChapter.id, targetChapter.title);
                    router.replace(`/courses/${courseId}/chapters/${targetChapter.id}`);
                    return;
                } else {
                    console.error('❌ Invalid target chapter:', targetChapter);
                }
            }

            // If user has access but no chapters, show message
            if (userHasAccess && content.length === 0) {
                setLoading(false);
                return;
            }

            // If user doesn't have access, redirect to purchase page
            if (!userHasAccess) {
                router.replace(`/courses/${courseId}/purchase`);
                return;
            }
        } catch (error) {
            console.error("Error fetching course data:", error);
            toast.error("حدث خطأ أثناء تحميل الكورس");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
        );
    }

    // If user has access but no content, show message
    if (hasAccess && courseContent.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>{courseTitle || "الكورس"}</CardTitle>
                        <CardDescription>لا يوجد محتوى متاح حالياً</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/dashboard">العودة إلى الصفحة الرئيسية</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Fallback: redirect to purchase page (handled by useEffect above)
    return null;
}

