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

interface SubjectFormProps {
    initialData: {
        subject: string | null;
        grade: string | null;
    };

    courseId: string;
}

const formSchema = z.object({
    subject: z.string().min(1, {
        message: "Subject is required",
    }),
});

export const SubjectForm = ({
    initialData,
    courseId
}: SubjectFormProps) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [currentGrade, setCurrentGrade] = useState<string | null>(initialData.grade);

    const toggleEdit = () => setIsEditing((current) => !current);

    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            subject: initialData.subject || "",
        },
    });

    const { isSubmitting, isValid } = form.formState;

    // Update current grade when initialData changes (after router.refresh())
    useEffect(() => {
        setCurrentGrade(initialData.grade);
        if (!isEditing) {
            form.reset({
                subject: initialData.subject || "",
            });
        }
    }, [initialData.grade, initialData.subject, isEditing]);

    // Get available subjects based on grade
    const getAvailableSubjects = () => {
        if (currentGrade === "الصف الاول الثانوي") {
            return [{ value: "علوم متكاملة", label: "علوم متكاملة" }];
        } else if (currentGrade === "الصف الثاني الثانوي" || currentGrade === "الصف الثالث الثانوي") {
            return [
                { value: "كيمياء", label: "كيمياء" },
                { value: "فيزياء", label: "فيزياء" }
            ];
        }
        return [
            { value: "كيمياء", label: "كيمياء" },
            { value: "فيزياء", label: "فيزياء" },
            { value: "علوم متكاملة", label: "علوم متكاملة" }
        ];
    };

    const availableSubjects = getAvailableSubjects();

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        // Validate subject against current grade
        if (currentGrade === "الصف الاول الثانوي" && values.subject !== "علوم متكاملة") {
            toast.error(t("teacher.courseEdit.forms.subjectGradeMismatch") || "علوم متكاملة متاحة فقط للصف الاول الثانوي");
            return;
        }
        if (currentGrade && currentGrade !== "الصف الاول الثانوي" && values.subject === "علوم متكاملة") {
            toast.error(t("teacher.courseEdit.forms.subjectGradeMismatch") || "علوم متكاملة متاحة فقط للصف الاول الثانوي");
            return;
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
        <div className="mt-4 sm:mt-6 border bg-card rounded-md p-3 sm:p-4">
            <div className="font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <span className="text-sm sm:text-base">{t("teacher.courseEdit.forms.courseSubject")}</span>
                <Button onClick={toggleEdit} variant="ghost" size="sm" className="self-start sm:self-auto">
                    {isEditing && (<>{t("common.cancel")}</>)}
                    {!isEditing && (
                    <>
                        <Pencil className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">{t("teacher.courseEdit.forms.editSubject")}</span>
                        <span className="sm:hidden">{t("common.edit")}</span>
                    </>)}
                </Button>
            </div>
            {!isEditing && (
                <div className="space-y-1">
                    <p className="text-sm mt-2 text-muted-foreground break-words overflow-wrap-anywhere">
                        {initialData.subject || t("teacher.courseEdit.forms.noSubject")}
                    </p>
                    {currentGrade && initialData.subject && (
                        (currentGrade === "الصف الاول الثانوي" && initialData.subject !== "علوم متكاملة") ||
                        (currentGrade !== "الصف الاول الثانوي" && initialData.subject === "علوم متكاملة")
                    ) && (
                        <p className="text-sm text-destructive">
                            {t("teacher.courseEdit.forms.subjectGradeMismatch") || "المادة الدراسية غير متوافقة مع الصف المحدد. يرجى تحديث الصف أو المادة."}
                        </p>
                    )}
                </div>
            )}

            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        {!currentGrade && (
                            <p className="text-sm text-yellow-600 mb-2">
                                {t("teacher.courseEdit.forms.selectGradeFirst") || "يرجى تحديد الصف الدراسي أولاً"}
                            </p>
                        )}
                        <FormField 
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={isSubmitting || !currentGrade}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("auth.subjectPlaceholder")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableSubjects.map((subject) => (
                                                    <SelectItem key={subject.value} value={subject.value}>
                                                        {subject.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-x-2">
                            <Button disabled={!isValid || isSubmitting} type="submit">
                                {t("common.save") || "حفظ"}
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    )
}

