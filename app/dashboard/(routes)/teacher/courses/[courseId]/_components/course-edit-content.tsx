"use client";

import { IconBadge } from "@/components/icon-badge";
import { LayoutDashboard } from "lucide-react";
import { TitleForm } from "./title-form";
import { DescriptionForm } from "./description-form";
import { ImageForm } from "./image-form";
import { PriceForm } from "./price-form";
import { SubjectForm } from "./subject-form";
import { GradeForm } from "./grade-form";
import { SemesterForm } from "./semester-form";
import { CourseContentForm } from "./course-content-form";
import { Banner } from "@/components/banner";
import { Actions } from "./actions";
import { useLanguage } from "@/lib/contexts/language-context";

interface Course {
    id: string;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    price: number | null;
    subject: string | null;
    grade: string | null;
    semester: string | null;
    isPublished: boolean;
    chapters: Array<{ isPublished: boolean }>;
}

interface CourseEditContentProps {
    course: Course;
    courseId: string;
    completionText: string;
    isComplete: boolean;
    completionStatus: {
        title: boolean;
        description: boolean;
        imageUrl: boolean;
        price: boolean;
        publishedChapters: boolean;
    };
}

export const CourseEditContent = ({
    course,
    courseId,
    completionText,
    isComplete,
    completionStatus
}: CourseEditContentProps) => {
    const { t } = useLanguage();

    return (
        <>
            {!course.isPublished && (
                <Banner
                    variant="warning"
                    label={t("teacher.courseEdit.unpublishedBanner")}
                />
            )}
            <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-col gap-y-2 flex-1">
                        <h1 className="text-xl sm:text-2xl font-medium">
                            {t("teacher.courseEdit.setupTitle")}
                        </h1>
                        <span className="text-xs sm:text-sm text-slate-700">
                            {t("teacher.courseEdit.completeFields", { completion: completionText })}
                        </span>
                        {!isComplete && (
                            <div className="text-xs text-muted-foreground mt-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className={`flex items-center gap-1 ${completionStatus.title ? 'text-brand' : 'text-red-600'}`}>
                                        <span>{completionStatus.title ? '✓' : '✗'}</span>
                                        <span>{t("teacher.courseEdit.fields.title")}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.description ? 'text-brand' : 'text-red-600'}`}>
                                        <span>{completionStatus.description ? '✓' : '✗'}</span>
                                        <span>{t("teacher.courseEdit.fields.description")}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.imageUrl ? 'text-brand' : 'text-red-600'}`}>
                                        <span>{completionStatus.imageUrl ? '✓' : '✗'}</span>
                                        <span>{t("teacher.courseEdit.fields.image")}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.price ? 'text-brand' : 'text-red-600'}`}>
                                        <span>{completionStatus.price ? '✓' : '✗'}</span>
                                        <span>{t("teacher.courseEdit.fields.price")}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${completionStatus.publishedChapters ? 'text-brand' : 'text-red-600'}`}>
                                        <span>{completionStatus.publishedChapters ? '✓' : '✗'}</span>
                                        <span>{t("teacher.courseEdit.fields.publishedChapter")}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex-shrink-0">
                        <Actions
                            disabled={!isComplete}
                            courseId={courseId}
                            isPublished={course.isPublished}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-8 sm:mt-16">
                    <div>
                        <div className="flex items-center gap-x-2 mb-4">
                            <IconBadge icon={LayoutDashboard} />
                            <h2 className="text-lg sm:text-xl">
                                {t("teacher.courseEdit.customizeCourse")}
                            </h2>
                        </div>
                        <TitleForm
                            initialData={course}
                            courseId={course.id}
                        />
                        <DescriptionForm
                            initialData={course}
                            courseId={course.id}
                        />
                        <PriceForm
                            initialData={course}
                            courseId={course.id}
                        />
                        <GradeForm
                            initialData={course}
                            courseId={course.id}
                        />
                        <SubjectForm
                            initialData={course}
                            courseId={course.id}
                        />
                        {course.grade && course.grade !== "الصف الثالث الثانوي" && (
                            <SemesterForm
                                initialData={course}
                                courseId={course.id}
                            />
                        )}
                    </div>
                    <div className="space-y-4 sm:space-y-6">
                        <div>
                            <div className="flex items-center gap-x-2 mb-4">
                                <IconBadge icon={LayoutDashboard} />
                                <h2 className="text-lg sm:text-xl">
                                    {t("teacher.courseEdit.resourcesChapters")}
                                </h2>
                            </div>
                            <CourseContentForm
                                initialData={course}
                                courseId={course.id}
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-x-2 mb-4">
                                <IconBadge icon={LayoutDashboard} />
                                <h2 className="text-lg sm:text-xl">
                                    {t("teacher.courseEdit.courseSettings")}
                                </h2>
                            </div>
                            <ImageForm
                                initialData={course}
                                courseId={course.id}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

