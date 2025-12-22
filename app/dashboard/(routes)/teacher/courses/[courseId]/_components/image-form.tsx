"use client"

import axios from "axios";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ImageIcon, Pencil, PlusCircle } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Course } from "@prisma/client";
import Image from "next/image";
import { FileUpload } from "@/components/file-upload";
import { useLanguage } from "@/lib/contexts/language-context";

interface ImageFormProps {
    initialData: Course;
    courseId: string;
}

export const ImageForm = ({
    initialData,
    courseId
}: ImageFormProps) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);

    const toggleEdit = () => setIsEditing((current) => !current);

    const router = useRouter();

    const onSubmit = async (values: { imageUrl: string }) => {
        try {
            await axios.patch(`/api/courses/${courseId}`, values);
            toast.success(t("teacher.courseEdit.forms.updateSuccess"));
            toggleEdit();
            router.refresh();
        } catch {
            toast.error(t("teacher.courseEdit.forms.updateError"));
        }
    }

    return (
        <div className="mt-4 sm:mt-6 border bg-card rounded-md p-3 sm:p-4">
            <div className="font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <span className="text-sm sm:text-base">{t("teacher.courseEdit.forms.courseImage")}</span>
                <Button onClick={toggleEdit} variant="ghost" size="sm" className="self-start sm:self-auto">
                    {isEditing && (<>{t("common.cancel")}</>)}
                    {!isEditing && !initialData.imageUrl && (
                        <>
                            <PlusCircle className="h-4 w-4 mr-2"/>
                            <span className="hidden sm:inline">{t("teacher.courseEdit.forms.addImage")}</span>
                            <span className="sm:hidden">{t("common.add")}</span>
                        </>
                    )}
                    {!isEditing && initialData.imageUrl && (
                    <>
                        <Pencil className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">{t("teacher.courseEdit.forms.editImage")}</span>
                        <span className="sm:hidden">{t("common.edit")}</span>
                    </>)}
                </Button>
            </div>
            {!isEditing && (
                !initialData.imageUrl ? (
                    <div className="flex items-center justify-center h-60 bg-muted rounded-md">
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                ) : (
                    <div className="relative aspect-video mt-2">
                        <Image
                            alt="Upload"
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover rounded-md"
                            src={initialData.imageUrl}
                        />
                    </div>
                )
            )}

            {isEditing && (
                <div>
                    <FileUpload
                        endpoint="courseImage"
                        onChange={(res) => {
                            if (res) {
                                onSubmit({ imageUrl: res.url })
                            }
                        }}
                    />

                    <div className="text-xs text-muted-foreground mt-4">
                        النسبة العرضية 16:9 موصى بها
                    </div>
                </div>
            )}
        </div>
    )
}