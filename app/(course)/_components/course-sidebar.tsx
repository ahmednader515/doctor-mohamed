"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { CheckCircle, Circle } from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/contexts/language-context";

interface Chapter {
  id: string;
  title: string;
  isFree: boolean;
  userProgress: {
    isCompleted: boolean;
  }[];
}

interface Quiz {
  id: string;
  title: string;
  position: number;
  quizResults: {
    id: string;
    score: number;
    totalPoints: number;
    percentage: number;
  }[];
}

interface CourseContent {
  id: string;
  title: string;
  position: number;
  type: 'chapter' | 'quiz' | 'homework';
  isFree?: boolean;
  userProgress?: {
    isCompleted: boolean;
  }[];
  quizResults?: {
    id: string;
    score: number;
    totalPoints: number;
    percentage: number;
  }[];
  homeworkResults?: {
    id: string;
    score: number;
    totalPoints: number;
    percentage: number;
  }[];
}

interface CourseSidebarProps {
  course?: {
    id: string;
    title: string;
    chapters: Chapter[];
  };
}

export const CourseSidebar = ({ course }: CourseSidebarProps) => {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [courseContent, setCourseContent] = useState<CourseContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>("");

  const fetchCourseData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const courseId = course?.id || params.courseId;
      if (!courseId) {
        throw new Error("Course ID is required");
      }
      const [contentResponse, courseResponse] = await Promise.all([
        axios.get(`/api/courses/${courseId}/content?t=${Date.now()}`),
        axios.get(`/api/courses/${courseId}?t=${Date.now()}`)
      ]);
      setCourseContent(contentResponse.data);
      setCourseTitle(courseResponse.data.title);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load course data");
    } finally {
      setLoading(false);
    }
  }, [course?.id, params.courseId]);

  // Refresh data when pathname changes (indicating navigation)
  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData, pathname]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  // Listen for custom event to refresh sidebar
  useEffect(() => {
    const handleRefresh = () => {
      fetchCourseData();
    };

    window.addEventListener('course-sidebar-refresh', handleRefresh);
    return () => {
      window.removeEventListener('course-sidebar-refresh', handleRefresh);
    };
  }, [fetchCourseData]);

  useEffect(() => {
    // Update selected content based on current path
    const currentContentId = pathname?.split("/").pop();
    setSelectedContentId(currentContentId || null);
  }, [pathname]);

  const onClick = (content: CourseContent) => {
    const courseId = course?.id || params.courseId;
    if (courseId) {
      setSelectedContentId(content.id);
      if (content.type === 'chapter') {
        router.push(`/courses/${courseId}/chapters/${content.id}`);
      } else if (content.type === 'quiz') {
        router.push(`/courses/${courseId}/quizzes/${content.id}`);
      } else if (content.type === 'homework') {
        router.push(`/courses/${courseId}/homeworks/${content.id}`);
      }
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="h-full border-r flex flex-col overflow-y-auto shadow-lg">
        <div className="p-8 flex flex-col border-b">
          <h1 className="font-semibold">جاري تحميل الكورس</h1>
        </div>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full border-l flex flex-col overflow-y-auto shadow-lg w-64 md:w-80">
        <div className="p-8 flex flex-col border-b">
          <h1 className="font-semibold">حدث خطأ</h1>
        </div>
        <div className="flex items-center justify-center h-full text-red-500">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full border-l flex flex-col overflow-y-auto shadow-lg w-72 md:w-80">
      <div className="p-8 flex flex-col border-b">
        <h1 className="font-semibold break-words overflow-wrap-anywhere">{courseTitle || course?.title}</h1>
      </div>
      <div className="flex flex-col w-full">
        {courseContent.map((content) => {
          const isSelected = selectedContentId === content.id;
          // Check completion status - userProgress is an array, check if any entry has isCompleted: true
          const isCompleted = content.type === 'chapter' 
            ? (content.userProgress && content.userProgress.length > 0 && content.userProgress[0]?.isCompleted === true)
            : (content.type === 'quiz' 
                ? content.quizResults && content.quizResults.length > 0
                : (content.type === 'homework'
                    ? content.homeworkResults && content.homeworkResults.length > 0
                    : false));
          
          // Debug log for selected chapter
          if (isSelected && content.type === 'chapter') {
            console.log('🔍 Sidebar - Selected chapter completion status:', {
              chapterId: content.id,
              title: content.title,
              userProgress: content.userProgress,
              userProgressLength: content.userProgress?.length,
              userProgressFirstItem: content.userProgress?.[0],
              isCompletedFirstCheck: content.userProgress?.[0]?.isCompleted,
              isCompleted
            });
          }
          
          return (
            <div
              key={content.id}
              className={cn(
                "flex items-start gap-x-2 text-sm font-[500] rtl:pr-4 ltr:pl-4 py-4 transition cursor-pointer",
                isSelected 
                  ? "bg-slate-200 text-slate-900"
                  : "text-slate-500 hover:bg-slate-300/20 hover:text-slate-600",
                isCompleted && !isSelected && "text-emerald-600"
              )}
              onClick={() => onClick(content)}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <CheckCircle className={cn("h-4 w-4", isSelected ? "text-slate-700" : "text-emerald-600")} />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="rtl:text-right ltr:text-left break-words overflow-wrap-anywhere">
                  {content.title}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {content.type === 'quiz' && (
                    <span className="text-xs text-green-600">({t("course.quiz")})</span>
                  )}
                  {content.type === 'homework' && (
                    <span className="text-xs text-blue-600">({t("course.homework")})</span>
                  )}
                  {content.type === 'chapter' && content.isFree && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                      {t("course.free")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 