"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Eye, Edit, Search, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    grade: string | null;
}

const PasswordsPage = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
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

    const handlePasswordChange = async () => {
        if (!selectedUser || !newPassword) {
            toast.error(t("admin.passwords.errors.enterPassword"));
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}/password`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ newPassword }),
            });

            if (response.ok) {
                toast.success(t("admin.passwords.errors.changeSuccess"));
                setNewPassword("");
                setIsDialogOpen(false);
                setSelectedUser(null);
            } else {
                toast.error(t("admin.passwords.errors.changeError"));
            }
        } catch (error) {
            console.error("Error changing password:", error);
            toast.error(t("admin.passwords.errors.changeError"));
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );

    const staffUsers = filteredUsers.filter(user => user.role === "ADMIN" || user.role === "TEACHER");
    const studentUsers = filteredUsers.filter(user => user.role === "USER");
    
    // Group students by grade level
    const grade1StudentsAll = studentUsers.filter(user => user.grade === "الصف الأول الثانوي");
    const grade2StudentsAll = studentUsers.filter(user => user.grade === "الصف الثاني الثانوي");
    const grade3StudentsAll = studentUsers.filter(user => user.grade === "الصف الثالث الثانوي");

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
                    {t("admin.passwords.title")}
                </h1>
            </div>

            {/* Staff Table (Admins and Teachers) */}
            {staffUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("admin.passwords.staffTitle")}</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("admin.passwords.searchPlaceholder")}
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
                                    <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.name")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.phoneNumber")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.role")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell>{user.phoneNumber}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="secondary"
                                                className={
                                                    user.role === "ADMIN" ? "bg-orange-600 text-white hover:bg-orange-700" : 
                                                    user.role === "TEACHER" ? "bg-blue-600 text-white hover:bg-blue-700" : 
                                                    ""
                                                }
                                            >
                                                {user.role === "TEACHER" ? t("teacher.users.roles.teacher") : 
                                                 user.role === "ADMIN" ? t("teacher.users.roles.admin") : user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.role === "TEACHER" ? (
                                                <span className="text-sm text-muted-foreground">
                                                    {t("common.notAvailable")}
                                                </span>
                                            ) : (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsDialogOpen(true);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                    {t("admin.passwords.change.button")}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Students Tables by Grade */}
            <>
                {/* Grade 1 Students Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>الصف الأول الثانوي</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("admin.passwords.searchPlaceholder")}
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
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.role")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.actions")}</TableHead>
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
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            {t("admin.passwords.change.button")}
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
                                placeholder={t("admin.passwords.searchPlaceholder")}
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
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.role")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.actions")}</TableHead>
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
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            {t("admin.passwords.change.button")}
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
                                placeholder={t("admin.passwords.searchPlaceholder")}
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
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.role")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.passwords.table.actions")}</TableHead>
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
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            {t("admin.passwords.change.button")}
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
            {/* Single lightweight dialog rendered once */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsDialogOpen(false);
                        setNewPassword("");
                        setSelectedUser(null);
                        setShowPassword(false);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t("admin.passwords.change.title", { name: selectedUser?.fullName || "" })}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">{t("admin.passwords.change.newPassword")}</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder={t("admin.passwords.change.placeholder")}
                                    className="rtl:pr-10 ltr:pl-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent rtl:right-0 ltr:left-0"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setNewPassword("");
                                    setSelectedUser(null);
                                }}
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button onClick={handlePasswordChange}>
                                {t("admin.passwords.change.button")}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PasswordsPage; 