"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, User, Plus } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
import { isFirstGrade, isSecondGrade, isThirdGrade } from "@/lib/utils/grade-utils";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    grade: string | null;
    _count?: {
        purchases: number;
    };
}

interface Course {
    id: string;
    title: string;
    price: number;
    isPublished: boolean;
}

const TeacherAddCoursesPage = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [ownedCourses, setOwnedCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<"add" | "delete">("add");
    const [isAddingCourse, setIsAddingCourse] = useState(false);
    const [isDeletingCourse, setIsDeletingCourse] = useState(false);
    // Pagination state for each grade
    const [grade1DisplayCount, setGrade1DisplayCount] = useState(25);
    const [grade2DisplayCount, setGrade2DisplayCount] = useState(25);
    const [grade3DisplayCount, setGrade3DisplayCount] = useState(25);
    // Search terms for each grade table
    const [grade1SearchTerm, setGrade1SearchTerm] = useState("");
    const [grade2SearchTerm, setGrade2SearchTerm] = useState("");
    const [grade3SearchTerm, setGrade3SearchTerm] = useState("");

    useEffect(() => {
        fetchUsers();
        fetchCourses();
    }, []);

    useEffect(() => {
        // fetch owned courses when a user is selected for delete mode
        const fetchOwned = async () => {
            if (!selectedUser) {
                setOwnedCourses([]);
                return;
            }
            try {
                const res = await fetch(`/api/teacher/users/${selectedUser.id}/courses`);
                if (res.ok) {
                    const data = await res.json();
                    setOwnedCourses(data.courses || []);
                }
            } catch (e) {
                console.error("Error fetching owned courses", e);
            }
        };
        fetchOwned();
    }, [selectedUser]);

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/teacher/users");
            if (response.ok) {
                const data = await response.json();
                // Filter only students
                const studentUsers = data.filter((user: User) => user.role === "USER");
                setUsers(studentUsers);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
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

    const handleAddCourse = async () => {
        if (!selectedUser || !selectedCourse) {
            toast.error(t("teacher.addCourses.errors.selectStudentCourse"));
            return;
        }

        setIsAddingCourse(true);
        try {
            const response = await fetch(`/api/teacher/users/${selectedUser.id}/add-course`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ courseId: selectedCourse }),
            });

            if (response.ok) {
                toast.success(t("teacher.addCourses.errors.addSuccess"));
                setIsDialogOpen(false);
                setSelectedUser(null);
                setSelectedCourse("");
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.json();
                toast.error(error.message || t("teacher.addCourses.errors.addError"));
            }
        } catch (error) {
            console.error("Error adding course:", error);
            toast.error(t("teacher.addCourses.errors.addError"));
        } finally {
            setIsAddingCourse(false);
        }
    };

    const handleDeleteCourse = async () => {
        if (!selectedUser || !selectedCourse) {
            toast.error(t("teacher.addCourses.errors.selectStudentCourse"));
            return;
        }

        setIsDeletingCourse(true);
        try {
            const res = await fetch(`/api/teacher/users/${selectedUser.id}/add-course`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId: selectedCourse })
            });
            if (res.ok) {
                toast.success(t("teacher.addCourses.errors.deleteSuccess"));
                setIsDialogOpen(false);
                setSelectedCourse("");
                setSelectedUser(null);
                fetchUsers();
            } else {
                const data = await res.json().catch(() => ({} as any));
                toast.error((data as any).error || t("teacher.addCourses.errors.deleteError"));
            }
        } catch (error) {
            console.error("Error deleting course:", error);
            toast.error(t("teacher.addCourses.errors.deleteError"));
        } finally {
            setIsDeletingCourse(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );
    
    // Group students by grade level
    const grade1StudentsAll = filteredUsers.filter(user => isFirstGrade(user.grade));
    const grade2StudentsAll = filteredUsers.filter(user => isSecondGrade(user.grade));
    const grade3StudentsAll = filteredUsers.filter(user => isThirdGrade(user.grade));

    // Apply search filters for each grade table
    const grade1Students = grade1StudentsAll.filter(user =>
        user.fullName.toLowerCase().includes(grade1SearchTerm.toLowerCase()) ||
        user.phoneNumber.includes(grade1SearchTerm)
    );
    const grade2Students = grade2StudentsAll.filter(user =>
        user.fullName.toLowerCase().includes(grade2SearchTerm.toLowerCase()) ||
        user.phoneNumber.includes(grade2SearchTerm)
    );
    const grade3Students = grade3StudentsAll.filter(user =>
        user.fullName.toLowerCase().includes(grade3SearchTerm.toLowerCase()) ||
        user.phoneNumber.includes(grade3SearchTerm)
    );

    // Paginated results
    const grade1StudentsPaginated = grade1Students.slice(0, grade1DisplayCount);
    const grade2StudentsPaginated = grade2Students.slice(0, grade2DisplayCount);
    const grade3StudentsPaginated = grade3Students.slice(0, grade3DisplayCount);

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
                    {t("teacher.addCourses.title")}
                </h1>
            </div>

            {/* Students Tables by Grade */}
            <>
                {/* Grade 1 Students Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>الصف الأول الثانوي</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("teacher.addCourses.searchPlaceholder")}
                                value={grade1SearchTerm}
                                onChange={(e) => {
                                    setGrade1SearchTerm(e.target.value);
                                    setGrade1DisplayCount(25);
                                }}
                                className="max-w-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {grade1Students.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.role")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.purchasedCourses")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {grade1StudentsPaginated.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">
                                                    {user.fullName}
                                                </TableCell>
                                                <TableCell>{user.phoneNumber}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {t("teacher.users.roles.student")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{user._count?.purchases ?? 0}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setDialogMode("add");
                                                                setSelectedCourse("");
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            {t("teacher.addCourses.add.button")}
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="destructive"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setDialogMode("delete");
                                                                setSelectedCourse("");
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            {t("teacher.addCourses.delete.button")}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {grade1Students.length > grade1DisplayCount && (
                                <div className="mt-4 flex justify-center">
                                    <Button
                                        variant="outline"
                                        onClick={() => setGrade1DisplayCount(grade1DisplayCount + 25)}
                                    >
                                        {t("common.showMore")}
                                    </Button>
                                </div>
                            )}
                        </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                لا يوجد طلاب في هذا الصف
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Grade 2 Students Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>الصف الثاني الثانوي</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("teacher.addCourses.searchPlaceholder")}
                                value={grade2SearchTerm}
                                onChange={(e) => {
                                    setGrade2SearchTerm(e.target.value);
                                    setGrade2DisplayCount(25);
                                }}
                                className="max-w-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {grade2Students.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.role")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.purchasedCourses")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {grade2StudentsPaginated.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">
                                                    {user.fullName}
                                                </TableCell>
                                                <TableCell>{user.phoneNumber}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {t("teacher.users.roles.student")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{user._count?.purchases ?? 0}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setDialogMode("add");
                                                                setSelectedCourse("");
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            {t("teacher.addCourses.add.button")}
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="destructive"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setDialogMode("delete");
                                                                setSelectedCourse("");
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            {t("teacher.addCourses.delete.button")}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {grade2Students.length > grade2DisplayCount && (
                                <div className="mt-4 flex justify-center">
                                    <Button
                                        variant="outline"
                                        onClick={() => setGrade2DisplayCount(grade2DisplayCount + 25)}
                                    >
                                        {t("common.showMore")}
                                    </Button>
                                </div>
                            )}
                        </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                لا يوجد طلاب في هذا الصف
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Grade 3 Students Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>الصف الثالث الثانوي</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("teacher.addCourses.searchPlaceholder")}
                                value={grade3SearchTerm}
                                onChange={(e) => {
                                    setGrade3SearchTerm(e.target.value);
                                    setGrade3DisplayCount(25);
                                }}
                                className="max-w-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {grade3Students.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.role")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.purchasedCourses")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.addCourses.table.actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {grade3StudentsPaginated.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">
                                                    {user.fullName}
                                                </TableCell>
                                                <TableCell>{user.phoneNumber}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {t("teacher.users.roles.student")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{user._count?.purchases ?? 0}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setDialogMode("add");
                                                                setSelectedCourse("");
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            {t("teacher.addCourses.add.button")}
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="destructive"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setDialogMode("delete");
                                                                setSelectedCourse("");
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            {t("teacher.addCourses.delete.button")}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {grade3Students.length > grade3DisplayCount && (
                                <div className="mt-4 flex justify-center">
                                    <Button
                                        variant="outline"
                                        onClick={() => setGrade3DisplayCount(grade3DisplayCount + 25)}
                                    >
                                        {t("common.showMore")}
                                    </Button>
                                </div>
                            )}
                        </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                لا يوجد طلاب في هذا الصف
                            </div>
                        )}
                    </CardContent>
                </Card>
            </>

            {/* Single lightweight dialog rendered once */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsDialogOpen(false);
                        setSelectedCourse("");
                        setSelectedUser(null);
                        setDialogMode("add");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialogMode === "add" ? (
                                <>{t("teacher.addCourses.add.title", { name: selectedUser?.fullName || "" })}</>
                            ) : (
                                <>{t("teacher.addCourses.delete.title", { name: selectedUser?.fullName || "" })}</>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("teacher.addCourses.add.selectCourse")}</label>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("teacher.addCourses.add.selectPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {(dialogMode === "delete" ? ownedCourses : courses).map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{course.title}</span>
                                                {typeof course.price === "number" && (
                                                    <Badge variant="outline" className="mr-2">
                                                        {course.price} {t("dashboard.egp")}
                                                    </Badge>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setSelectedCourse("");
                                    setSelectedUser(null);
                                    setDialogMode("add");
                                }}
                            >
                                {t("common.cancel")}
                            </Button>
                            {dialogMode === "add" ? (
                                <Button 
                                    onClick={handleAddCourse}
                                    disabled={!selectedCourse || isAddingCourse}
                                >
                                    {isAddingCourse ? t("teacher.addCourses.add.adding") : t("teacher.addCourses.add.addCourse")}
                                </Button>
                            ) : (
                                <Button 
                                    variant="destructive"
                                    onClick={handleDeleteCourse}
                                    disabled={!selectedCourse || isDeletingCourse}
                                >
                                    {isDeletingCourse ? t("teacher.addCourses.delete.deleting") : t("teacher.addCourses.delete.button")}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherAddCoursesPage;
