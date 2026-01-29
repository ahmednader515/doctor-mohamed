"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigationRouter } from "@/lib/hooks/use-navigation-router";
import { useLanguage } from "@/lib/contexts/language-context";

interface Homework {
    id: string;
    title: string;
    description: string;
    courseId: string;
    position: number;
    isPublished: boolean;
    course: {
        title: string;
    };
    questions: Question[];
    createdAt: string;
    updatedAt: string;
}

interface Question {
    id: string;
    text: string;
    imageUrl?: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
    options?: string[];
    correctAnswer: string;
    points: number;
}

const HomeworksPage = () => {
    const { t } = useLanguage();
    const router = useNavigationRouter();
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchHomeworks();
    }, []);

    const fetchHomeworks = async () => {
        try {
            const response = await fetch("/api/teacher/homeworks");
            if (response.ok) {
                const data = await response.json();
                setHomeworks(data);
            }
        } catch (error) {
            console.error("Error fetching homeworks:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteHomework = async (homework: Homework) => {
        if (!confirm(t("teacher.homeworks.deleteConfirm"))) {
            return;
        }

        setIsDeleting(homework.id);
        try {
            const response = await fetch(`/api/courses/${homework.courseId}/homeworks/${homework.id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success(t("teacher.homeworks.deleteSuccess"));
                fetchHomeworks();
            } else {
                toast.error(t("teacher.homeworks.deleteError"));
            }
        } catch (error) {
            console.error("Error deleting homework:", error);
            toast.error(t("teacher.homeworks.deleteError"));
        } finally {
            setIsDeleting(null);
        }
    };

    const handleViewHomework = (homework: Homework) => {
        router.push(`/dashboard/teacher/homeworks/${homework.id}`);
    };

    const filteredHomeworks = homeworks.filter(homework =>
        homework.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        homework.course.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">{t("common.loading")}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t("teacher.homeworks.title")}
                </h1>
                <Button onClick={() => router.push("/dashboard/teacher/homeworks/create")} className="bg-brand hover:bg-brand/90 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("teacher.homeworks.createNew")}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("sidebar.teacher.homeworks")}</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("teacher.homeworks.searchPlaceholder")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.homeworks.table.homeworkTitle")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.homeworks.table.course")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.homeworks.table.position")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.homeworks.table.status")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.homeworks.table.questionsCount")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.homeworks.table.createdAt")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.homeworks.table.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredHomeworks.map((homework) => (
                                <TableRow key={homework.id}>
                                    <TableCell className="font-medium">
                                        {homework.title}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {homework.course.title}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {homework.position}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={homework.isPublished ? "default" : "secondary"}>
                                            {homework.isPublished ? t("teacher.homeworks.status.published") : t("teacher.homeworks.status.draft")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {homework.questions.length} {homework.questions.length === 1 ? t("teacher.homeworks.question") : t("teacher.homeworks.questions")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(homework.createdAt).toLocaleDateString("ar-EG")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Button 
                                                size="sm" 
                                                className="bg-brand hover:bg-brand/90 text-white"
                                                onClick={() => handleViewHomework(homework)}
                                            >
                                                <Eye className="h-4 w-4" />
                                                {t("teacher.homeworks.actions.view")}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                className="bg-brand hover:bg-brand/90 text-white"
                                                onClick={() => router.push(`/dashboard/teacher/homeworks/${homework.id}/edit`)}
                                            >
                                                <Edit className="h-4 w-4" />
                                                {t("teacher.homeworks.actions.edit")}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant={homework.isPublished ? "destructive" : "default"}
                                                className={!homework.isPublished ? "bg-brand hover:bg-brand/90 text-white" : ""}
                                                onClick={async () => {
                                                    try {
                                                        const response = await fetch(`/api/teacher/homeworks/${homework.id}/publish`, {
                                                            method: "PATCH",
                                                            headers: {
                                                                "Content-Type": "application/json",
                                                            },
                                                            body: JSON.stringify({
                                                                isPublished: !homework.isPublished
                                                            }),
                                                        });
                                                        if (response.ok) {
                                                            toast.success(homework.isPublished ? t("teacher.homeworks.unpublishSuccess") : t("teacher.homeworks.publishSuccess"));
                                                            fetchHomeworks();
                                                        } else {
                                                            const errorText = await response.text();
                                                            toast.error(errorText || t("teacher.homeworks.publishError"));
                                                        }
                                                    } catch (error) {
                                                        console.error("Error publishing/unpublishing homework:", error);
                                                        toast.error(t("teacher.homeworks.publishError"));
                                                    }
                                                }}
                                            >
                                                {homework.isPublished ? t("teacher.homeworks.actions.unpublish") : t("teacher.homeworks.actions.publish")}
                                            </Button>

                                            <Button 
                                                size="sm" 
                                                variant="destructive"
                                                onClick={() => handleDeleteHomework(homework)}
                                                disabled={isDeleting === homework.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                {isDeleting === homework.id ? t("teacher.homeworks.actions.deleting") : t("teacher.homeworks.actions.delete")}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default HomeworksPage;

