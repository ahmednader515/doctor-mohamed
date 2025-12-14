"use client"

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/contexts/language-context";

interface GradeFormProps {
    initialData: {
        grade: string | null;
        subject: string | null;
    };

    courseId: string;
}

const formSchema = z.object({
    grade: z.string().min(1, {
        message: "Grade is required",
    }),
});

export const GradeForm = ({
    initialData,
    courseId
}: GradeFormProps) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [currentSubject, setCurrentSubject] = useState<string | null>(initialData.subject);

    const toggleEdit = () => setIsEditing((current) => !current);

    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            grade: initialData.grade || "",
        },
    });

    const { isSubmitting, isValid } = form.formState;

    // Update current subject when initialData changes (after router.refresh())
    useEffect(() => {
        setCurrentSubject(initialData.subject);
        if (!isEditing) {
            form.reset({
                grade: initialData.grade || "",
            });
        }
    }, [initialData.subject, initialData.grade, isEditing]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        // If subject is set, validate it against the new grade
        if (currentSubject) {
            if (values.grade === "الصف الاول الثانوي" && currentSubject !== "علوم متكاملة") {
                // Reset subject if incompatible
                try {
                    await axios.patch(`/api/courses/${courseId}`, { grade: values.grade, subject: null });
                    toast.success(t("teacher.courseEdit.forms.updateSuccess"));
                    toast.info(t("teacher.courseEdit.forms.subjectReset") || "تم إعادة تعيين المادة الدراسية لأنها غير متوافقة مع الصف المحدد");
                    toggleEdit();
                    router.refresh();
                    return;
                } catch {
                    toast.error(t("teacher.courseEdit.forms.updateError"));
                    return;
                }
            } else if (values.grade !== "الصف الاول الثانوي" && currentSubject === "علوم متكاملة") {
                // Reset subject if incompatible
                try {
                    await axios.patch(`/api/courses/${courseId}`, { grade: values.grade, subject: null });
                    toast.success(t("teacher.courseEdit.forms.updateSuccess"));
                    toast.info(t("teacher.courseEdit.forms.subjectReset") || "تم إعادة تعيين المادة الدراسية لأنها غير متوافقة مع الصف المحدد");
                    toggleEdit();
                    router.refresh();
                    return;
                } catch {
                    toast.error(t("teacher.courseEdit.forms.updateError"));
                    return;
                }
            }
        }

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
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                {t("teacher.courseEdit.forms.courseGrade")}
                <Button onClick={toggleEdit} variant="ghost">
                    {isEditing && (<>{t("common.cancel")}</>)}
                    {!isEditing && (
                    <>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t("teacher.courseEdit.forms.editGrade")}
                    </>)}
                </Button>
            </div>
            {!isEditing && (
                <p className="text-sm mt-2 text-muted-foreground">
                    {initialData.grade || t("teacher.courseEdit.forms.noGrade")}
                </p>
            )}

            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField 
                            control={form.control}
                            name="grade"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={isSubmitting}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("auth.gradePlaceholder")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="الصف الاول الثانوي">الصف الاول الثانوي</SelectItem>
                                                <SelectItem value="الصف الثاني الثانوي">الصف الثاني الثانوي</SelectItem>
                                                <SelectItem value="الصف الثالث الثانوي">الصف الثالث الثانوي</SelectItem>
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

