"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Pencil, Trash2, Eye } from "lucide-react";
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
  course: { id: string; title: string };
  questions: { id: string }[];
  createdAt: string;
}

export default function AdminHomeworksPage() {
  const { t } = useLanguage();
  const router = useNavigationRouter();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHomeworks = async () => {
      try {
        const response = await fetch("/api/admin/homeworks");
        if (response.ok) {
          const data = await response.json();
          setHomeworks(data);
        } else {
          toast.error(t("admin.homeworks.errors.loadError"));
        }
      } catch (e) {
        toast.error(t("admin.homeworks.errors.loadErrorGeneric"));
      } finally {
        setLoading(false);
      }
    };
    fetchHomeworks();
  }, []);

  const filteredHomeworks = homeworks.filter((homework) =>
    [homework.title, homework.course.title].some((value) =>
      value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleViewHomework = (homework: Homework) => {
    router.push(`/dashboard/admin/homeworks/${homework.id}`);
  };

  const handleTogglePublish = async (homework: Homework) => {
    setPublishingId(homework.id);
    try {
      const response = await fetch(`/api/admin/homeworks/${homework.id}/publish`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublished: !homework.isPublished }),
      });

      if (!response.ok) {
        throw new Error(t("admin.homeworks.errors.updateError"));
      }

      toast.success(homework.isPublished ? t("admin.homeworks.errors.unpublishSuccess") : t("admin.homeworks.errors.publishSuccess"));
      setHomeworks((prev) =>
        prev.map((item) =>
          item.id === homework.id ? { ...item, isPublished: !homework.isPublished } : item
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.homeworks.errors.updateError"));
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (homeworkId: string, homeworkTitle: string) => {
    const confirmed = window.confirm(t("admin.homeworks.errors.deleteConfirm", { title: homeworkTitle }));
    if (!confirmed) {
      return;
    }

    setDeletingId(homeworkId);
    try {
      const response = await fetch(`/api/admin/homeworks/${homeworkId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || t("admin.homeworks.errors.deleteError"));
      }

      setHomeworks((previous) => previous.filter((homework) => homework.id !== homeworkId));
      toast.success(t("admin.homeworks.errors.deleteSuccess"));
    } catch (error) {
      console.error("[ADMIN_DELETE_HOMEWORK]", error);
      toast.error(error instanceof Error ? error.message : t("admin.homeworks.errors.deleteError"));
    } finally {
      setDeletingId(null);
    }
  };

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
        <h1 className="text-3xl font-bold">{t("admin.homeworks.title")}</h1>
        <Button onClick={() => router.push("/dashboard/admin/homeworks/create")} className="bg-brand hover:bg-brand/90 text-white">
          <Plus className="h-4 w-4" />
          {t("admin.homeworks.createNew")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.homeworks.homeworksTitle")}</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.homeworks.searchPlaceholder")}
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
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.homeworks.table.homeworkTitle")}</TableHead>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.homeworks.table.course")}</TableHead>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.homeworks.table.position")}</TableHead>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.homeworks.table.status")}</TableHead>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.homeworks.table.questionsCount")}</TableHead>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.homeworks.table.createdAt")}</TableHead>
                <TableHead className="rtl:text-right ltr:text-left">{t("admin.homeworks.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHomeworks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t("admin.homeworks.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredHomeworks.map((homework) => (
                  <TableRow key={homework.id}>
                    <TableCell className="font-medium">{homework.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{homework.course.title}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{homework.position}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={homework.isPublished ? "default" : "secondary"}>
                        {homework.isPublished ? t("admin.homeworks.status.published") : t("admin.homeworks.status.draft")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{homework.questions.length} {homework.questions.length === 1 ? t("admin.homeworks.question") : t("admin.homeworks.questions")}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(homework.createdAt).toLocaleDateString("ar-EG")}
                    </TableCell>
                    <TableCell className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        className="bg-brand hover:bg-brand/90 text-white"
                        size="sm"
                        onClick={() => handleViewHomework(homework)}
                      >
                        <Eye className="h-4 w-4" />
                        {t("admin.homeworks.actions.view")}
                      </Button>
                      <Button
                        className="bg-brand hover:bg-brand/90 text-white"
                        size="sm"
                        onClick={() => router.push(`/dashboard/admin/homeworks/${homework.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                        {t("admin.homeworks.actions.edit")}
                      </Button>
                      <Button
                        variant={homework.isPublished ? "destructive" : "default"}
                        className={!homework.isPublished ? "bg-brand hover:bg-brand/90 text-white" : ""}
                        size="sm"
                        disabled={publishingId === homework.id}
                        onClick={() => handleTogglePublish(homework)}
                      >
                        {publishingId === homework.id
                          ? t("admin.homeworks.actions.updating")
                          : homework.isPublished
                          ? t("admin.homeworks.actions.unpublish")
                          : t("admin.homeworks.actions.publish")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === homework.id}
                        onClick={() => handleDelete(homework.id, homework.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingId === homework.id ? t("admin.homeworks.actions.deleting") : t("admin.homeworks.actions.delete")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

