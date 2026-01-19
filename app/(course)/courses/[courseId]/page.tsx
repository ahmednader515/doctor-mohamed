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

            // If user has access and there's content, redirect to first chapter
            if (userHasAccess && content.length > 0) {
                const firstChapter = content.find((item: CourseContent) => item.type === 'chapter');
                if (firstChapter) {
                    router.replace(`/courses/${courseId}/chapters/${firstChapter.id}`);
                    return;
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

