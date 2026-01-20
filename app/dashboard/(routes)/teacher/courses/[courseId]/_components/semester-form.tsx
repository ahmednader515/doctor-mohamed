"use client"

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/contexts/language-context";

interface SemesterFormProps {
    initialData: {
        semester: string | null;
        grade: string | null;
    };

    courseId: string;
}

const formSchema = z.object({
    semester: z.string().min(1, {
        message: "Semester is required",
    }),
});

export const SemesterForm = ({
    initialData,
    courseId
}: SemesterFormProps) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);

    const toggleEdit = () => setIsEditing((current) => !current);

    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            semester: initialData.semester || "",
        },
    });

    const { isSubmitting, isValid } = form.formState;

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await axios.patch(`/api/courses/${courseId}`, values);
            toast.success(t("teacher.courseEdit.forms.updateSuccess"));
            toggleEdit();
            router.refresh();
        } catch {
            toast.error(t("teacher.courseEdit.forms.updateError"));
        }
    }

    // Hide semester form by default or if grade is الصف الثالث الثانوي
    if (!initialData.grade || initialData.grade === "الصف الثالث الثانوي") {
        return null;
    }

    return (
        <div className="mt-4 sm:mt-6 border bg-card rounded-md p-3 sm:p-4">
            <div className="font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <span className="text-sm sm:text-base">{t("teacher.courseEdit.forms.courseSemester")}</span>
                <Button onClick={toggleEdit} variant="ghost" size="sm" className="self-start sm:self-auto">
                    {isEditing && (<>{t("common.cancel")}</>)}
                    {!isEditing && (
                    <>
                        <Pencil className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">{t("teacher.courseEdit.forms.editSemester")}</span>
                        <span className="sm:hidden">{t("common.edit")}</span>
                    </>)}
                </Button>
            </div>
            {!isEditing && (
                <p className="text-sm mt-2 text-muted-foreground break-words overflow-wrap-anywhere">
                    {initialData.semester || t("teacher.courseEdit.forms.noSemester")}
                </p>
            )}

            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField 
                            control={form.control}
                            name="semester"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={isSubmitting}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("auth.semesterPlaceholder")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="الترم الاول">الترم الاول</SelectItem>
                                                <SelectItem value="الترم الثاني">الترم الثاني</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-x-2">
                            <Button disabled={!isValid || isSubmitting} type="submit">
                                {t("common.save")}
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    )
}

