"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Plus, Copy, Check, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";

interface Course {
  id: string;
  title: string;
  isPublished: boolean;
}

interface PurchaseCode {
  id: string;
  code: string;
  courseId: string;
  isUsed: boolean;
  usedAt: string | null;
  createdAt: string;
  course: {
    id: string;
    title: string;
  };
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
  } | null;
}

const TeacherCodesPage = () => {
  const { t } = useLanguage();
  const [codes, setCodes] = useState<PurchaseCode[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [codeCount, setCodeCount] = useState<string>("1");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchCodes();
    fetchCourses();
  }, []);

  const fetchCodes = async () => {
    try {
      const response = await fetch("/api/teacher/codes");
      if (response.ok) {
        const data = await response.json();
        setCodes(data);
      } else {
        toast.error(t("teacher.codes.errors.loadError"));
      }
    } catch (error) {
      console.error("Error fetching codes:", error);
      toast.error(t("teacher.codes.errors.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      if (response.ok) {
        const data = await response.json();
        // Filter only published courses
        const publishedCourses = data.filter((course: Course) => course.isPublished);
        setCourses(publishedCourses);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const handleGenerateCodes = async () => {
    if (!selectedCourse || !codeCount || parseInt(codeCount) < 1 || parseInt(codeCount) > 100) {
      toast.error(t("teacher.codes.errors.selectCourseCount"));
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/teacher/codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourse,
          count: parseInt(codeCount),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(t("teacher.codes.errors.generateSuccess", { count: data.count }));
        setIsDialogOpen(false);
        setSelectedCourse("");
        setCodeCount("1");
        fetchCodes(); // Refresh the list
      } else {
        const error = await response.text();
        toast.error(error || t("teacher.codes.errors.generateError"));
      }
    } catch (error) {
      console.error("Error generating codes:", error);
      toast.error(t("teacher.codes.errors.generateError"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(t("teacher.codes.errors.copySuccess"));
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error(t("teacher.codes.errors.copyError"));
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    setIsDeleting(codeId);
    try {
      const response = await fetch(`/api/teacher/codes/${codeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("teacher.codes.errors.deleteSuccess") || "Code deleted successfully");
        fetchCodes(); // Refresh the list
      } else {
        const error = await response.text();
        toast.error(error || t("teacher.codes.errors.deleteError") || "Failed to delete code");
      }
    } catch (error) {
      console.error("Error deleting code:", error);
      toast.error(t("teacher.codes.errors.deleteError") || "Failed to delete code");
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredCodes = codes.filter((code) => {
    const matchesSearch =
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = courseFilter === "all" || code.courseId === courseFilter;
    return matchesSearch && matchesCourse;
  });

  const usedCodes = filteredCodes.filter((code) => code.isUsed);
  const unusedCodes = filteredCodes.filter((code) => !code.isUsed);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t("teacher.codes.title")}</h1>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-brand hover:bg-brand/90 w-full sm:w-auto">
          <Plus className="h-4 w-4 ml-2" />
          {t("teacher.codes.createNew")}
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center space-x-2 flex-1 w-full">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder={t("teacher.codes.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-sm md:text-base"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
              <Label htmlFor="course-filter" className="whitespace-nowrap text-sm">{t("teacher.codes.filterByCourse")}</Label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger id="course-filter" className="w-full md:w-[250px] text-sm">
                  <SelectValue placeholder={t("teacher.codes.allCourses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("teacher.codes.allCourses")}</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs sm:text-sm font-medium">{t("teacher.codes.stats.total")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{filteredCodes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs sm:text-sm font-medium">{t("teacher.codes.stats.unused")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{unusedCodes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs sm:text-sm font-medium">{t("teacher.codes.stats.used")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-gray-600">{usedCodes.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("teacher.codes.table.code")}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-4">
              {t("teacher.codes.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="rtl:text-right ltr:text-left text-xs sm:text-sm">{t("teacher.codes.table.code")}</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left text-xs sm:text-sm">{t("teacher.codes.table.course")}</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left text-xs sm:text-sm">{t("teacher.codes.table.status")}</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left text-xs sm:text-sm">{t("teacher.codes.table.user")}</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left text-xs sm:text-sm">{t("teacher.codes.table.usedAt")}</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left text-xs sm:text-sm">{t("teacher.codes.table.createdAt")}</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left text-xs sm:text-sm">{t("teacher.codes.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <code className="font-mono text-sm bg-muted px-2 py-1 rounded break-all">
                          {code.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(code.code)}
                          className="h-6 w-6 p-0"
                        >
                          {copiedCode === code.code ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate" title={code.course.title}>
                        {code.course.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.isUsed ? "secondary" : "default"}>
                        {code.isUsed ? t("teacher.codes.status.used") : t("teacher.codes.status.unused")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      {code.user ? (
                        <div>
                          <div className="font-medium truncate" title={code.user.fullName}>
                            {code.user.fullName}
                          </div>
                          <div className="text-sm text-muted-foreground truncate" title={code.user.phoneNumber}>
                            {code.user.phoneNumber}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {code.usedAt
                        ? format(new Date(code.usedAt), "yyyy-MM-dd HH:mm", { locale: ar })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(code.createdAt), "yyyy-MM-dd HH:mm", { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(code.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isDeleting === code.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("teacher.codes.delete.confirm") || "Are you sure you want to delete this code? This action cannot be undone."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCode(code.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t("common.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Codes Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("teacher.codes.generate.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="course" className="mb-2 block">{t("teacher.codes.generate.course")}</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder={t("teacher.codes.generate.selectCourse")} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="count" className="mb-2 block">{t("teacher.codes.generate.count")}</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="100"
                value={codeCount}
                onChange={(e) => setCodeCount(e.target.value)}
                placeholder={t("teacher.codes.generate.placeholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleGenerateCodes}
              disabled={isGenerating || !selectedCourse || !codeCount}
              className="bg-brand hover:bg-brand/90"
            >
              {isGenerating ? t("teacher.codes.generate.generating") : t("teacher.codes.generate.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherCodesPage;

