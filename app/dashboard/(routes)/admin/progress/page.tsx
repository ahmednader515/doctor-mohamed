"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Search, Eye, BookOpen, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";
import { isFirstGrade, isSecondGrade, isThirdGrade } from "@/lib/utils/grade-utils";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    grade: string | null;
    _count: {
        purchases: number;
        userProgress: number;
    };
}

interface UserProgress {
    id: string;
    isCompleted: boolean;
    updatedAt: string;
    chapter: {
        id: string;
        title: string;
        course: {
            id: string;
            title: string;
        };
    };
}

interface Chapter {
    id: string;
    title: string;
    isPublished: boolean;
    course: {
        id: string;
        title: string;
    };
}

interface Purchase {
    id: string;
    status: string;
    createdAt: string;
    course: {
        id: string;
        title: string;
        price: number;
    };
}

const ProgressPage = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
    const [userPurchases, setUserPurchases] = useState<Purchase[]>([]);
    const [allChapters, setAllChapters] = useState<Chapter[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(false);
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
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/admin/users");
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserProgress = async (userId: string) => {
        setLoadingProgress(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}/progress`);
            if (response.ok) {
                const data = await response.json();
                setUserProgress(data.userProgress);
                setUserPurchases(data.purchases);
                setAllChapters(data.allChapters || []);
            }
        } catch (error) {
            console.error("Error fetching user progress:", error);
        } finally {
            setLoadingProgress(false);
        }
    };

    const handleViewProgress = (user: User) => {
        setSelectedUser(user);
        fetchUserProgress(user.id);
        setIsDialogOpen(true);
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );

    const studentUsers = filteredUsers.filter(user => user.role === "USER");
    
    // Group students by grade level
    const grade1StudentsAll = studentUsers.filter(user => isFirstGrade(user.grade));
    const grade2StudentsAll = studentUsers.filter(user => isSecondGrade(user.grade));
    const grade3StudentsAll = studentUsers.filter(user => isThirdGrade(user.grade));

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

    const completedProgress = userProgress.filter(p => p.isCompleted).length;
    const inProgressChapters = userProgress.filter(p => !p.isCompleted).length;
    const totalAvailableChapters = allChapters.length;
    const notStartedChapters = totalAvailableChapters - completedProgress - inProgressChapters;
    const progressPercentage = totalAvailableChapters > 0 ? (completedProgress / totalAvailableChapters) * 100 : 0;

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
                    {t("admin.progress.title")}
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
                                placeholder={t("admin.progress.searchPlaceholder")}
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
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.purchasedCourses")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.progress")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.actions")}</TableHead>
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
                                                        <Badge variant="outline">
                                                            {user._count.purchases} {t("admin.progress.course")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {user._count.userProgress} {t("admin.progress.chapter")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => handleViewProgress(user)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            {t("admin.progress.viewProgress")}
                                                        </Button>
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
                                placeholder={t("admin.progress.searchPlaceholder")}
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
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.purchasedCourses")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.progress")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.actions")}</TableHead>
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
                                                        <Badge variant="outline">
                                                            {user._count.purchases} {t("admin.progress.course")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {user._count.userProgress} {t("admin.progress.chapter")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => handleViewProgress(user)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            {t("admin.progress.viewProgress")}
                                                        </Button>
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
                                placeholder={t("admin.progress.searchPlaceholder")}
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
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.purchasedCourses")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.progress")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.table.actions")}</TableHead>
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
                                                        <Badge variant="outline">
                                                            {user._count.purchases} {t("admin.progress.course")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {user._count.userProgress} {t("admin.progress.chapter")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => handleViewProgress(user)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            {t("admin.progress.viewProgress")}
                                                        </Button>
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t("admin.progress.dialog.title", { name: selectedUser?.fullName || "" })}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {loadingProgress ? (
                        <div className="text-center py-8">{t("common.loading")}</div>
                    ) : (
                        <div className="space-y-6">
                            {/* Progress Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("admin.progress.dialog.summary.title")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span>{t("admin.progress.dialog.summary.completionRate")}</span>
                                            <span className="font-bold">{progressPercentage.toFixed(1)}%</span>
                                        </div>
                                        <Progress value={progressPercentage} className="w-full" />
                                        <div className="grid grid-cols-2 gap-4 text-center">
                                            <div>
                                                <div className="text-2xl font-bold text-green-600">{completedProgress}</div>
                                                <div className="text-sm text-muted-foreground">{t("admin.progress.dialog.summary.completed")}</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-gray-600">{notStartedChapters}</div>
                                                <div className="text-sm text-muted-foreground">{t("admin.progress.dialog.summary.notStarted")}</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Purchased Courses */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("admin.progress.dialog.purchasedCourses.title")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                                                                 <TableHeader>
                                             <TableRow>
                                                 <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.dialog.purchasedCourses.courseName")}</TableHead>
                                                 <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.dialog.purchasedCourses.price")}</TableHead>
                                                 <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.dialog.purchasedCourses.status")}</TableHead>
                                                 <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.dialog.purchasedCourses.purchaseDate")}</TableHead>
                                             </TableRow>
                                         </TableHeader>
                                        <TableBody>
                                            {userPurchases.map((purchase) => (
                                                <TableRow key={purchase.id}>
                                                    <TableCell className="font-medium">
                                                        {purchase.course.title}
                                                    </TableCell>
                                                    <TableCell>
                                                        {purchase.course.price} {t("admin.balances.egp")}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={purchase.status === "ACTIVE" ? "default" : "secondary"}>
                                                            {purchase.status === "ACTIVE" ? t("admin.progress.dialog.purchasedCourses.active") : t("admin.progress.dialog.purchasedCourses.inactive")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {format(new Date(purchase.createdAt), "dd/MM/yyyy", { locale: ar })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Progress Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("admin.progress.dialog.progressDetails.title")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                                                                 <TableHeader>
                                             <TableRow>
                                                 <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.dialog.progressDetails.course")}</TableHead>
                                                 <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.dialog.progressDetails.chapter")}</TableHead>
                                                 <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.dialog.progressDetails.status")}</TableHead>
                                                 <TableHead className="rtl:text-right ltr:text-left">{t("admin.progress.dialog.progressDetails.lastUpdate")}</TableHead>
                                             </TableRow>
                                         </TableHeader>
                                        <TableBody>
                                            {allChapters.map((chapter) => {
                                                const progress = userProgress.find(p => p.chapter.id === chapter.id);
                                                return (
                                                    <TableRow key={chapter.id}>
                                                        <TableCell className="font-medium">
                                                            {chapter.course.title}
                                                        </TableCell>
                                                        <TableCell>
                                                            {chapter.title}
                                                        </TableCell>
                                                        <TableCell>
                                                            {progress ? (
                                                                progress.isCompleted ? (
                                                                    <Badge variant="default" className="flex items-center gap-1">
                                                                        <CheckCircle className="h-3 w-3" />
                                                                        {t("admin.progress.dialog.progressDetails.completed")}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="secondary" className="flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        {t("admin.progress.dialog.progressDetails.inProgress")}
                                                                    </Badge>
                                                                )
                                                            ) : (
                                                                <Badge variant="outline" className="flex items-center gap-1">
                                                                    <BookOpen className="h-3 w-3" />
                                                                    {t("admin.progress.dialog.progressDetails.notStarted")}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {progress ? (
                                                                format(new Date(progress.updatedAt), "dd/MM/yyyy", { locale: ar })
                                                            ) : (
                                                                "-"
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProgressPage; 