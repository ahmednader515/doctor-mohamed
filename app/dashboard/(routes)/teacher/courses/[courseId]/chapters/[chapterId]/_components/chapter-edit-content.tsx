"use client";

import { ChapterForm } from "./chapter-form";
import { VideoForm } from "./video-form";
import Link from "next/link";
import { ArrowLeft, Video, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/icon-badge";
import { useLanguage } from "@/lib/contexts/language-context";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";

interface Chapter {
    id: string;
    title: string | null;
    description: string | null;
    videoUrl: string | null;
    videoType: string | null;
    youtubeVideoId: string | null;
    isPublished: boolean;
}

interface ChapterEditContentProps {
    chapter: Chapter;
    courseId: string;
    chapterId: string;
    completionText: string;
    userRole?: string | null;
}

export const ChapterEditContent = ({
    chapter,
    courseId,
    chapterId,
    completionText,
    userRole
}: ChapterEditContentProps) => {
    const { t } = useLanguage();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isPublished, setIsPublished] = useState(chapter.isPublished);

    const onPublish = async () => {
        try {
            setIsLoading(true);
            
            await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}/publish`);
            
            const newPublishedState = !isPublished;
            setIsPublished(newPublishedState);
            
            toast.success(newPublishedState ? t("teacher.courseEdit.forms.publishSuccess") : t("teacher.courseEdit.forms.unpublishSuccess"));
            router.refresh();
        } catch {
            toast.error(t("teacher.chapterEdit.updateError"));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-y-2">
                    <Link
                        href={
                            userRole === "ADMIN"
                                ? `/dashboard/admin/courses/${courseId}`
                                : `/dashboard/teacher/courses/${courseId}`
                        }
                    >
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t("teacher.chapterEdit.backToCourse")}
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-medium">
                        {t("teacher.chapterEdit.setupTitle")}
                    </h1>
                    <span className="text-sm text-muted-foreground">
                        {t("teacher.chapterEdit.completeFields", { completion: completionText })}
                    </span>
                </div>
            </div>
            <div className="flex flex-col md:grid md:grid-cols-2 gap-6 mt-16">
                <div className="order-1">
                    <ChapterForm
                        initialData={chapter}
                        courseId={courseId}
                        chapterId={chapterId}
                    />
                </div>
                <div className="flex flex-col space-y-6 order-2 md:order-2">
                    <div className="order-1">
                        <div className="flex items-center gap-x-2">
                            <IconBadge icon={Video} />
                            <h2 className="text-xl">
                                {t("teacher.chapterEdit.addVideo")}
                            </h2>
                        </div>
                        <VideoForm
                            initialData={chapter}
                            courseId={courseId}
                            chapterId={chapterId}
                        />
                    </div>
                    <div className="border bg-card rounded-md p-4 order-2 md:order-2">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">
                                    {isPublished ? t("teacher.chapterEdit.published") : t("teacher.chapterEdit.unpublished")}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {isPublished
                                        ? t("teacher.chapterEdit.publishedDescription")
                                        : t("teacher.chapterEdit.unpublishedDescription")}
                                </p>
                            </div>
                            <Button
                                onClick={onPublish}
                                disabled={isLoading}
                                variant={isPublished ? "outline" : "default"}
                                className="w-full sm:w-auto px-8 py-6 text-base font-semibold"
                            >
                                {isPublished ? (
                                    <>
                                        <EyeOff className="h-4 w-4 mr-2" />
                                        {t("teacher.chapterEdit.unpublishChapter")}
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-4 w-4 mr-2" />
                                        {t("teacher.chapterEdit.publishChapter")}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

