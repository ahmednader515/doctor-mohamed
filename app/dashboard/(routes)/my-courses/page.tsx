"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Play, FileText } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";

interface Course {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    progress: number;
    chapters: { id: string }[];
    quizzes: { id: string }[];
    homeworks: { id: string }[];
}

export default function MyCoursesPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/student/courses");
            if (response.ok) {
                const data = await response.json();
                setCourses(data);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t("student.myCourses.title")}</h1>
                    <p className="text-muted-foreground">{t("student.myCourses.subtitle")}</p>
                </div>
            </div>

            {courses.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">{t("student.myCourses.noCourses")}</p>
                        <Button 
                            onClick={() => router.push("/dashboard/search")}
                            className="mt-4"
                        >
                            {t("student.myCourses.browseCourses")}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => (
                        <Card key={course.id} className="hover:shadow-lg transition-shadow">
                            <div className="relative">
                                {course.imageUrl ? (
                                    <img
                                        src={course.imageUrl}
                                        alt={course.title}
                                        className="w-full h-48 object-cover rounded-t-lg"
                                    />
                                ) : (
                                    <div className="w-full h-48 bg-muted flex items-center justify-center rounded-t-lg">
                                        <BookOpen className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            <CardHeader>
                                <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                                {course.description && (
                                    <CardDescription className="line-clamp-2">
                                        {course.description}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{t("student.myCourses.progress")}</span>
                                            <span className="font-medium">{Math.round(course.progress)}%</span>
                                        </div>
                                        <Progress value={course.progress} className="h-2" />
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <FileText className="h-4 w-4" />
                                            {course.chapters?.length || 0} {t("student.myCourses.chapters")}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <FileText className="h-4 w-4" />
                                            {course.quizzes?.length || 0} {t("student.myCourses.quizzes")}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <FileText className="h-4 w-4" />
                                            {course.homeworks?.length || 0} {t("student.myCourses.homeworks")}
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => router.push(`/courses/${course.id}`)}
                                        className="w-full"
                                    >
                                        <Play className="h-4 w-4 mr-2" />
                                        {t("student.myCourses.continueLearning")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

