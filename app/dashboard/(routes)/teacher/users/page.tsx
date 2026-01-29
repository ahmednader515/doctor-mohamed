"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
import { isFirstGrade, isSecondGrade, isThirdGrade } from "@/lib/utils/grade-utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    parentPhoneNumber: string;
    role: string;
    balance: number;
    grade: string | null;
    semester: string | null;
    subject: string | null;
    createdAt: string;
    updatedAt: string;
    _count: {
        courses: number;
        purchases: number;
        userProgress: number;
    };
}

interface EditUserData {
    fullName: string;
    phoneNumber: string;
    parentPhoneNumber: string;
    role: string;
    grade?: string | null;
    semester?: string | null;
    subject?: string | null;
}

// Utility function to format phone numbers: remove +2 prefix, convert Arabic numerals to English, and ensure LTR direction
const formatPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return "";
    // Remove +2 prefix if present
    let formatted = phone.startsWith("+2") ? phone.substring(2) : phone;
    
    // Convert Arabic numerals (٠١٢٣٤٥٦٧٨٩) to English numerals (0123456789)
    const arabicToEnglish: { [key: string]: string } = {
        "٠": "0",
        "١": "1",
        "٢": "2",
        "٣": "3",
        "٤": "4",
        "٥": "5",
        "٦": "6",
        "٧": "7",
        "٨": "8",
        "٩": "9"
    };
    
    // Replace each Arabic numeral with its English equivalent
    formatted = formatted.split("").map(char => arabicToEnglish[char] || char).join("");
    
    return formatted;
};

const UsersPage = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editData, setEditData] = useState<EditUserData>({
        fullName: "",
        phoneNumber: "",
        parentPhoneNumber: "",
        role: "",
        grade: null,
        semester: null,
        subject: null
    });
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [subjects, setSubjects] = useState<string[]>([]); // For MultiSelect component
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
            const response = await fetch("/api/teacher/users");
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                console.error("Error fetching users:", response.status, response.statusText);
                if (response.status === 403) {
                    toast.error(t("teacher.users.errors.noAccess"));
                } else {
                    toast.error(t("teacher.users.errors.loadError"));
                }
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error(t("teacher.users.errors.loadError"));
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        // Convert comma-separated subject string to array for MultiSelect
        const subjectsArray = user.subject ? user.subject.split(",").map(s => s.trim()).filter(s => s) : [];
        setSubjects(subjectsArray);
        setEditData({
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            parentPhoneNumber: user.parentPhoneNumber,
            role: user.role,
            grade: user.grade || null,
            semester: user.semester || null,
            subject: user.subject || null
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        // Convert subjects array to comma-separated string for database
        const subjectString = subjects.length > 0 ? subjects.join(",") : null;
        const dataToSave = {
            ...editData,
            subject: subjectString
        };

        try {
            const response = await fetch(`/api/teacher/users/${editingUser.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(dataToSave),
            });

            if (response.ok) {
                const roleKey = editingUser.role === "TEACHER" ? "teacher" : editingUser.role === "ADMIN" ? "admin" : "student";
                toast.success(t("teacher.users.errors.updateSuccess", { role: t(`teacher.users.roles.${roleKey}`) }));
                setIsEditDialogOpen(false);
                setEditingUser(null);
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.text();
                console.error("Error updating user:", response.status, error);
                if (response.status === 403) {
                    toast.error(t("teacher.users.errors.noPermission"));
                } else if (response.status === 404) {
                    toast.error(t("teacher.users.errors.notFound"));
                } else if (response.status === 400) {
                    toast.error(error || t("teacher.users.errors.invalidData"));
                } else {
                    toast.error(t("teacher.users.errors.updateError"));
                }
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error(t("teacher.users.errors.updateError"));
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/teacher/users/${userId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success(t("teacher.users.errors.deleteSuccess"));
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.text();
                console.error("Error deleting user:", response.status, error);
                if (response.status === 403) {
                    toast.error(t("teacher.users.errors.noPermissionDelete"));
                } else if (response.status === 404) {
                    toast.error(t("teacher.users.errors.notFound"));
                } else {
                    toast.error(error || t("teacher.users.errors.deleteError"));
                }
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error(t("teacher.users.errors.deleteError"));
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );

    // Separate users by role
    const studentUsers = filteredUsers.filter(user => user.role === "USER");
    const staffUsers = filteredUsers.filter(user => user.role === "TEACHER" || user.role === "ADMIN");

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

    // Debug logging
    console.log("All users count:", users.length);
    console.log("Student users count:", studentUsers.length);
    
    // Check all unique grade values
    const uniqueGrades = [...new Set(studentUsers.map(u => u.grade).filter(Boolean))];
    console.log("Unique grade values in database:", uniqueGrades);
    console.log("Looking for grade:", "الصف الأول الثانوي");
    console.log("Grade comparison test:", uniqueGrades.map(g => ({
        original: g,
        trimmed: g?.trim(),
        matches: g?.trim() === "الصف الأول الثانوي",
        charCodes: g?.split('').map(c => c.charCodeAt(0))
    })));
    
    // Show students with grade that might match
    const potentialGrade1 = studentUsers.filter(u => {
        const grade = u.grade?.trim() || "";
        return grade.includes("الأول") || grade.includes("اول");
    });
    console.log("Students with 'الأول' or 'اول' in grade:", potentialGrade1.map(u => ({
        name: u.fullName,
        grade: u.grade,
        gradeCharCodes: u.grade?.split('').map(c => c.charCodeAt(0))
    })));
    
    console.log("Grade 1 students count:", grade1StudentsAll.length);
    console.log("Grade 1 students:", grade1StudentsAll.map(u => ({ name: u.fullName, grade: u.grade })));
    console.log("Grade 2 students count:", grade2StudentsAll.length);
    console.log("Grade 3 students count:", grade3StudentsAll.length);

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
                    {t("teacher.users.title")}
                </h1>
            </div>

            {/* Staff Table (Admins and Teachers) */}
            {staffUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("teacher.users.staffTitle")}</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("teacher.users.searchPlaceholder")}
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
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.name")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.phoneNumber")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.parentPhoneNumber")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.role")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.registrationDate")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell dir="ltr" className="text-left">{formatPhoneNumber(user.phoneNumber)}</TableCell>
                                        <TableCell dir="ltr" className="text-left">{formatPhoneNumber(user.parentPhoneNumber)}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="secondary"
                                                className={
                                                    user.role === "TEACHER" ? "bg-blue-600 text-white hover:bg-blue-700" : 
                                                    user.role === "ADMIN" ? "bg-orange-600 text-white hover:bg-orange-700" : 
                                                    ""
                                                }
                                            >
                                                {user.role === "TEACHER" ? t("teacher.users.roles.teacher") : 
                                                 user.role === "ADMIN" ? t("teacher.users.roles.admin") : user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                    if (!open) {
                                                        setIsEditDialogOpen(false);
                                                        setEditingUser(null);
                                                    }
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditUser(user)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>{t("teacher.users.edit.title", { role: user.role === "TEACHER" ? t("teacher.users.roles.teacher") : t("teacher.users.roles.admin") })}</DialogTitle>
                                                            <DialogDescription>
                                                                {t("teacher.users.edit.description", { role: user.role === "TEACHER" ? t("teacher.users.roles.teacher") : t("teacher.users.roles.admin") })}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="fullName" className="text-right">
                                                                    {t("auth.fullName")}
                                                                </Label>
                                                                <Input
                                                                    id="fullName"
                                                                    value={editData.fullName}
                                                                    onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="phoneNumber" className="text-right">
                                                                    {t("auth.phoneNumber")}
                                                                </Label>
                                                                <Input
                                                                    id="phoneNumber"
                                                                    value={editData.phoneNumber}
                                                                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="parentPhoneNumber" className="text-right">
                                                                    {t("auth.parentPhoneNumber")}
                                                                </Label>
                                                                <Input
                                                                    id="parentPhoneNumber"
                                                                    value={editData.parentPhoneNumber}
                                                                    onChange={(e) => setEditData({...editData, parentPhoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="role" className="text-right">
                                                                    {t("teacher.users.table.role")}
                                                                </Label>
                                                                <Select
                                                                    value={editData.role}
                                                                    onValueChange={(value) => setEditData({...editData, role: value})}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder={t("teacher.users.edit.selectRole")} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="USER">{t("teacher.users.roles.student")}</SelectItem>
                                                                        <SelectItem value="TEACHER">{t("teacher.users.roles.teacher")}</SelectItem>
                                                                        <SelectItem value="ADMIN">{t("teacher.users.roles.admin")}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => {
                                                                setIsEditDialogOpen(false);
                                                                setEditingUser(null);
                                                            }}>
                                                                {t("common.cancel")}
                                                            </Button>
                                                            <Button onClick={handleSaveUser}>
                                                                {t("teacher.users.edit.saveChanges")}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t("teacher.users.delete.confirm")}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t("teacher.users.delete.description", { role: user.role === "TEACHER" ? t("teacher.users.roles.teacher") : t("teacher.users.roles.admin") })}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
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
                                placeholder={t("teacher.users.searchPlaceholder")}
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
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.parentPhoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.role")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.balance")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.purchasedCourses")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.registrationDate")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {grade1StudentsPaginated.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell dir="ltr" className="text-left">{formatPhoneNumber(user.phoneNumber)}</TableCell>
                                        <TableCell dir="ltr" className="text-left">{formatPhoneNumber(user.parentPhoneNumber)}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="secondary"
                                                className="bg-green-600 text-white hover:bg-green-700"
                                            >
                                                {t("teacher.users.roles.student")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {user.balance} {t("dashboard.egp")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {user._count.purchases}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                    if (!open) {
                                                        setIsEditDialogOpen(false);
                                                        setEditingUser(null);
                                                    }
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditUser(user)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>{t("teacher.users.edit.studentTitle")}</DialogTitle>
                                                            <DialogDescription>
                                                                {t("teacher.users.edit.studentDescription")}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="fullName" className="text-right">
                                                                    {t("auth.fullName")}
                                                                </Label>
                                                                <Input
                                                                    id="fullName"
                                                                    value={editData.fullName}
                                                                    onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="phoneNumber" className="text-right">
                                                                    {t("auth.phoneNumber")}
                                                                </Label>
                                                                <Input
                                                                    id="phoneNumber"
                                                                    value={editData.phoneNumber}
                                                                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="parentPhoneNumber" className="text-right">
                                                                    {t("auth.parentPhoneNumber")}
                                                                </Label>
                                                                <Input
                                                                    id="parentPhoneNumber"
                                                                    value={editData.parentPhoneNumber}
                                                                    onChange={(e) => setEditData({...editData, parentPhoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="grade" className="text-right">
                                                                    {t("auth.grade")}
                                                                </Label>
                                                                <Select
                                                                    value={editData.grade || ""}
                                                                    onValueChange={(value) => {
                                                                        const newGrade = value || null;
                                                                        setEditData({
                                                                            ...editData, 
                                                                            grade: newGrade, 
                                                                            subject: null,
                                                                            semester: newGrade === "الصف الثالث الثانوي" ? null : editData.semester
                                                                        });
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder={t("auth.gradePlaceholder")} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="الصف الاول الثانوي">الصف الاول الثانوي</SelectItem>
                                                                        <SelectItem value="الصف الثاني الثانوي">الصف الثاني الثانوي</SelectItem>
                                                                        <SelectItem value="الصف الثالث الثانوي">الصف الثالث الثانوي</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            {editData.grade !== "الصف الثالث الثانوي" && (
                                                                <div className="grid grid-cols-4 items-center gap-4">
                                                                    <Label htmlFor="semester" className="text-right">
                                                                        {t("auth.semester")}
                                                                    </Label>
                                                                    <Select
                                                                        value={editData.semester || ""}
                                                                        onValueChange={(value) => setEditData({...editData, semester: value || null})}
                                                                    >
                                                                        <SelectTrigger className="col-span-3">
                                                                            <SelectValue placeholder={t("auth.semesterPlaceholder")} />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="الترم الاول">الترم الاول</SelectItem>
                                                                            <SelectItem value="الترم الثاني">الترم الثاني</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}
                                                            {editData.grade === "الصف الثالث الثانوي" && (
                                                                <div className="grid grid-cols-4 items-center gap-4">
                                                                    <Label htmlFor="semester" className="text-right">
                                                                        {t("auth.semester")}
                                                                    </Label>
                                                                    <Input
                                                                        id="semester"
                                                                        value=""
                                                                        disabled
                                                                        className="col-span-3"
                                                                        placeholder="غير متاح للصف الثالث الثانوي"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="subject" className="text-right">
                                                                    {t("auth.subject")}
                                                                </Label>
                                                                {editData.grade === "الصف الاول الثانوي" ? (
                                                                    <Select
                                                                        value={editData.subject || ""}
                                                                        onValueChange={(value) => setEditData({...editData, subject: value || null})}
                                                                        disabled={!editData.grade}
                                                                    >
                                                                        <SelectTrigger className="col-span-3">
                                                                            <SelectValue placeholder={t("auth.subjectPlaceholder")} />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="علوم متكاملة">علوم متكاملة</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : editData.grade === "الصف الثاني الثانوي" || editData.grade === "الصف الثالث الثانوي" ? (
                                                                    <div className="col-span-3">
                                                                        <MultiSelect
                                                                            options={[
                                                                                { label: "كيمياء", value: "كيمياء" },
                                                                                { label: "فيزياء", value: "فيزياء" },
                                                                            ]}
                                                                            selected={subjects}
                                                                            onChange={(selected) => {
                                                                                setSubjects(selected);
                                                                            }}
                                                                            placeholder={t("auth.subjectPlaceholder")}
                                                                            disabled={!editData.grade}
                                                                        />
                                                                        {subjects.length === 0 && (
                                                                            <p className="text-sm text-destructive mt-1">{t("auth.errors.selectAtLeastOneSubject") || "Please select at least one subject"}</p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <Select
                                                                        value={editData.subject || ""}
                                                                        onValueChange={(value) => setEditData({...editData, subject: value || null})}
                                                                        disabled={!editData.grade}
                                                                    >
                                                                        <SelectTrigger className="col-span-3">
                                                                            <SelectValue placeholder={t("auth.subjectPlaceholder")} />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="كيمياء">كيمياء</SelectItem>
                                                                            <SelectItem value="فيزياء">فيزياء</SelectItem>
                                                                            <SelectItem value="علوم متكاملة">علوم متكاملة</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="role" className="text-right">
                                                                    {t("teacher.users.table.role")}
                                                                </Label>
                                                                <Select
                                                                    value={editData.role}
                                                                    onValueChange={(value) => setEditData({...editData, role: value})}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder={t("teacher.users.edit.selectRole")} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="USER">{t("teacher.users.roles.student")}</SelectItem>
                                                                        <SelectItem value="TEACHER">{t("teacher.users.roles.teacher")}</SelectItem>
                                                                        <SelectItem value="ADMIN">{t("teacher.users.roles.admin")}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => {
                                                                setIsEditDialogOpen(false);
                                                                setEditingUser(null);
                                                            }}>
                                                                {t("common.cancel")}
                                                            </Button>
                                                            <Button onClick={handleSaveUser}>
                                                                {t("teacher.users.edit.saveChanges")}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t("teacher.users.delete.confirm")}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t("teacher.users.delete.studentDescription")}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
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
                                placeholder={t("teacher.users.searchPlaceholder")}
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
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.parentPhoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.role")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.balance")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.purchasedCourses")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.registrationDate")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {grade2StudentsPaginated.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="font-medium">
                                                        {user.fullName}
                                                    </TableCell>
                                                    <TableCell dir="ltr" className="text-left">{formatPhoneNumber(user.phoneNumber)}</TableCell>
                                                    <TableCell dir="ltr" className="text-left">{formatPhoneNumber(user.parentPhoneNumber)}</TableCell>
                                                    <TableCell>
                                                        <Badge 
                                                            variant="secondary"
                                                            className="bg-green-600 text-white hover:bg-green-700"
                                                        >
                                                            {t("teacher.users.roles.student")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {user.balance} {t("dashboard.egp")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {user._count.purchases}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                                if (!open) {
                                                                    setIsEditDialogOpen(false);
                                                                    setEditingUser(null);
                                                                }
                                                            }}>
                                                                <DialogTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleEditUser(user)}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>{t("teacher.users.edit.studentTitle")}</DialogTitle>
                                                                        <DialogDescription>
                                                                            {t("teacher.users.edit.studentDescription")}
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="grid gap-4 py-4">
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="fullName" className="text-right">
                                                                                {t("auth.fullName")}
                                                                            </Label>
                                                                            <Input
                                                                                id="fullName"
                                                                                value={editData.fullName}
                                                                                onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                                className="col-span-3"
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="phoneNumber" className="text-right">
                                                                                {t("auth.phoneNumber")}
                                                                            </Label>
                                                                            <Input
                                                                                id="phoneNumber"
                                                                                value={editData.phoneNumber}
                                                                                onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                                className="col-span-3"
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="parentPhoneNumber" className="text-right">
                                                                                {t("auth.parentPhoneNumber")}
                                                                            </Label>
                                                                            <Input
                                                                                id="parentPhoneNumber"
                                                                                value={editData.parentPhoneNumber}
                                                                                onChange={(e) => setEditData({...editData, parentPhoneNumber: e.target.value})}
                                                                                className="col-span-3"
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="grade" className="text-right">
                                                                                {t("auth.grade")}
                                                                            </Label>
                                                                            <Select
                                                                                value={editData.grade || ""}
                                                                                onValueChange={(value) => {
                                                                        const newGrade = value || null;
                                                                        setEditData({
                                                                            ...editData, 
                                                                            grade: newGrade, 
                                                                            subject: null,
                                                                            semester: newGrade === "الصف الثالث الثانوي" ? null : editData.semester
                                                                        });
                                                                    }}
                                                                            >
                                                                                <SelectTrigger className="col-span-3">
                                                                                    <SelectValue placeholder={t("auth.gradePlaceholder")} />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="الصف الاول الثانوي">الصف الاول الثانوي</SelectItem>
                                                                                    <SelectItem value="الصف الثاني الثانوي">الصف الثاني الثانوي</SelectItem>
                                                                                    <SelectItem value="الصف الثالث الثانوي">الصف الثالث الثانوي</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        {editData.grade !== "الصف الثالث الثانوي" && (
                                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                                <Label htmlFor="semester" className="text-right">
                                                                                    {t("auth.semester")}
                                                                                </Label>
                                                                                <Select
                                                                                    value={editData.semester || ""}
                                                                                    onValueChange={(value) => setEditData({...editData, semester: value || null})}
                                                                                >
                                                                                    <SelectTrigger className="col-span-3">
                                                                                        <SelectValue placeholder={t("auth.semesterPlaceholder")} />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="الترم الاول">الترم الاول</SelectItem>
                                                                                        <SelectItem value="الترم الثاني">الترم الثاني</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>
                                                                        )}
                                                                        {editData.grade === "الصف الثالث الثانوي" && (
                                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                                <Label htmlFor="semester" className="text-right">
                                                                                    {t("auth.semester")}
                                                                                </Label>
                                                                                <Input
                                                                                    id="semester"
                                                                                    value=""
                                                                                    disabled
                                                                                    className="col-span-3"
                                                                                    placeholder="غير متاح للصف الثالث الثانوي"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="subject" className="text-right">
                                                                                {t("auth.subject")}
                                                                            </Label>
                                                                            {editData.grade === "الصف الاول الثانوي" ? (
                                                                                <Select
                                                                                    value={editData.subject || ""}
                                                                                    onValueChange={(value) => setEditData({...editData, subject: value || null})}
                                                                                    disabled={!editData.grade}
                                                                                >
                                                                                    <SelectTrigger className="col-span-3">
                                                                                        <SelectValue placeholder={t("auth.subjectPlaceholder")} />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="علوم متكاملة">علوم متكاملة</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            ) : editData.grade === "الصف الثاني الثانوي" || editData.grade === "الصف الثالث الثانوي" ? (
                                                                                <div className="col-span-3">
                                                                                    <MultiSelect
                                                                                        options={[
                                                                                            { label: "كيمياء", value: "كيمياء" },
                                                                                            { label: "فيزياء", value: "فيزياء" },
                                                                                        ]}
                                                                                        selected={subjects}
                                                                                        onChange={(selected) => {
                                                                                            setSubjects(selected);
                                                                                        }}
                                                                                        placeholder={t("auth.subjectPlaceholder")}
                                                                                        disabled={!editData.grade}
                                                                                    />
                                                                                    {subjects.length === 0 && (
                                                                                        <p className="text-sm text-destructive mt-1">{t("auth.errors.selectAtLeastOneSubject") || "Please select at least one subject"}</p>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <Select
                                                                                    value={editData.subject || ""}
                                                                                    onValueChange={(value) => setEditData({...editData, subject: value || null})}
                                                                                    disabled={!editData.grade}
                                                                                >
                                                                                    <SelectTrigger className="col-span-3">
                                                                                        <SelectValue placeholder={t("auth.subjectPlaceholder")} />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="كيمياء">كيمياء</SelectItem>
                                                                                        <SelectItem value="فيزياء">فيزياء</SelectItem>
                                                                                        <SelectItem value="علوم متكاملة">علوم متكاملة</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            )}
                                                                        </div>
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="role" className="text-right">
                                                                                {t("teacher.users.table.role")}
                                                                            </Label>
                                                                            <Select
                                                                                value={editData.role}
                                                                                onValueChange={(value) => setEditData({...editData, role: value})}
                                                                            >
                                                                                <SelectTrigger className="col-span-3">
                                                                                    <SelectValue placeholder={t("teacher.users.edit.selectRole")} />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="USER">{t("teacher.users.roles.student")}</SelectItem>
                                                                                    <SelectItem value="TEACHER">{t("teacher.users.roles.teacher")}</SelectItem>
                                                                                    <SelectItem value="ADMIN">{t("teacher.users.roles.admin")}</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                    </div>
                                                                    <DialogFooter>
                                                                        <Button variant="outline" onClick={() => {
                                                                            setIsEditDialogOpen(false);
                                                                            setEditingUser(null);
                                                                        }}>
                                                                            {t("common.cancel")}
                                                                        </Button>
                                                                        <Button onClick={handleSaveUser}>
                                                                            {t("teacher.users.edit.saveChanges")}
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                            
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        disabled={isDeleting}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>{t("teacher.users.delete.confirm")}</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            {t("teacher.users.delete.studentDescription")}
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDeleteUser(user.id)}
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
                                placeholder={t("teacher.users.searchPlaceholder")}
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
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.parentPhoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.role")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.balance")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.purchasedCourses")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.registrationDate")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.users.table.actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {grade3StudentsPaginated.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="font-medium">
                                                        {user.fullName}
                                                    </TableCell>
                                                    <TableCell dir="ltr" className="text-left">{formatPhoneNumber(user.phoneNumber)}</TableCell>
                                                    <TableCell dir="ltr" className="text-left">{formatPhoneNumber(user.parentPhoneNumber)}</TableCell>
                                                    <TableCell>
                                                        <Badge 
                                                            variant="secondary"
                                                            className="bg-green-600 text-white hover:bg-green-700"
                                                        >
                                                            {t("teacher.users.roles.student")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {user.balance} {t("dashboard.egp")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {user._count.purchases}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                                if (!open) {
                                                                    setIsEditDialogOpen(false);
                                                                    setEditingUser(null);
                                                                }
                                                            }}>
                                                                <DialogTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleEditUser(user)}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>{t("teacher.users.edit.studentTitle")}</DialogTitle>
                                                                        <DialogDescription>
                                                                            {t("teacher.users.edit.studentDescription")}
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="grid gap-4 py-4">
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="fullName" className="text-right">
                                                                                {t("auth.fullName")}
                                                                            </Label>
                                                                            <Input
                                                                                id="fullName"
                                                                                value={editData.fullName}
                                                                                onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                                className="col-span-3"
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="phoneNumber" className="text-right">
                                                                                {t("auth.phoneNumber")}
                                                                            </Label>
                                                                            <Input
                                                                                id="phoneNumber"
                                                                                value={editData.phoneNumber}
                                                                                onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                                className="col-span-3"
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="parentPhoneNumber" className="text-right">
                                                                                {t("auth.parentPhoneNumber")}
                                                                            </Label>
                                                                            <Input
                                                                                id="parentPhoneNumber"
                                                                                value={editData.parentPhoneNumber}
                                                                                onChange={(e) => setEditData({...editData, parentPhoneNumber: e.target.value})}
                                                                                className="col-span-3"
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="grade" className="text-right">
                                                                                {t("auth.grade")}
                                                                            </Label>
                                                                            <Select
                                                                                value={editData.grade || ""}
                                                                                onValueChange={(value) => {
                                                                        const newGrade = value || null;
                                                                        setEditData({
                                                                            ...editData, 
                                                                            grade: newGrade, 
                                                                            subject: null,
                                                                            semester: newGrade === "الصف الثالث الثانوي" ? null : editData.semester
                                                                        });
                                                                    }}
                                                                            >
                                                                                <SelectTrigger className="col-span-3">
                                                                                    <SelectValue placeholder={t("auth.gradePlaceholder")} />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="الصف الاول الثانوي">الصف الاول الثانوي</SelectItem>
                                                                                    <SelectItem value="الصف الثاني الثانوي">الصف الثاني الثانوي</SelectItem>
                                                                                    <SelectItem value="الصف الثالث الثانوي">الصف الثالث الثانوي</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        {editData.grade !== "الصف الثالث الثانوي" && (
                                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                                <Label htmlFor="semester" className="text-right">
                                                                                    {t("auth.semester")}
                                                                                </Label>
                                                                                <Select
                                                                                    value={editData.semester || ""}
                                                                                    onValueChange={(value) => setEditData({...editData, semester: value || null})}
                                                                                >
                                                                                    <SelectTrigger className="col-span-3">
                                                                                        <SelectValue placeholder={t("auth.semesterPlaceholder")} />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="الترم الاول">الترم الاول</SelectItem>
                                                                                        <SelectItem value="الترم الثاني">الترم الثاني</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>
                                                                        )}
                                                                        {editData.grade === "الصف الثالث الثانوي" && (
                                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                                <Label htmlFor="semester" className="text-right">
                                                                                    {t("auth.semester")}
                                                                                </Label>
                                                                                <Input
                                                                                    id="semester"
                                                                                    value=""
                                                                                    disabled
                                                                                    className="col-span-3"
                                                                                    placeholder="غير متاح للصف الثالث الثانوي"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="subject" className="text-right">
                                                                                {t("auth.subject")}
                                                                            </Label>
                                                                            {editData.grade === "الصف الاول الثانوي" ? (
                                                                                <Select
                                                                                    value={editData.subject || ""}
                                                                                    onValueChange={(value) => setEditData({...editData, subject: value || null})}
                                                                                    disabled={!editData.grade}
                                                                                >
                                                                                    <SelectTrigger className="col-span-3">
                                                                                        <SelectValue placeholder={t("auth.subjectPlaceholder")} />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="علوم متكاملة">علوم متكاملة</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            ) : editData.grade === "الصف الثاني الثانوي" || editData.grade === "الصف الثالث الثانوي" ? (
                                                                                <div className="col-span-3">
                                                                                    <MultiSelect
                                                                                        options={[
                                                                                            { label: "كيمياء", value: "كيمياء" },
                                                                                            { label: "فيزياء", value: "فيزياء" },
                                                                                        ]}
                                                                                        selected={subjects}
                                                                                        onChange={(selected) => {
                                                                                            setSubjects(selected);
                                                                                        }}
                                                                                        placeholder={t("auth.subjectPlaceholder")}
                                                                                        disabled={!editData.grade}
                                                                                    />
                                                                                    {subjects.length === 0 && (
                                                                                        <p className="text-sm text-destructive mt-1">{t("auth.errors.selectAtLeastOneSubject") || "Please select at least one subject"}</p>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <Select
                                                                                    value={editData.subject || ""}
                                                                                    onValueChange={(value) => setEditData({...editData, subject: value || null})}
                                                                                    disabled={!editData.grade}
                                                                                >
                                                                                    <SelectTrigger className="col-span-3">
                                                                                        <SelectValue placeholder={t("auth.subjectPlaceholder")} />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="كيمياء">كيمياء</SelectItem>
                                                                                        <SelectItem value="فيزياء">فيزياء</SelectItem>
                                                                                        <SelectItem value="علوم متكاملة">علوم متكاملة</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            )}
                                                                        </div>
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="role" className="text-right">
                                                                                {t("teacher.users.table.role")}
                                                                            </Label>
                                                                            <Select
                                                                                value={editData.role}
                                                                                onValueChange={(value) => setEditData({...editData, role: value})}
                                                                            >
                                                                                <SelectTrigger className="col-span-3">
                                                                                    <SelectValue placeholder={t("teacher.users.edit.selectRole")} />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="USER">{t("teacher.users.roles.student")}</SelectItem>
                                                                                    <SelectItem value="TEACHER">{t("teacher.users.roles.teacher")}</SelectItem>
                                                                                    <SelectItem value="ADMIN">{t("teacher.users.roles.admin")}</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                    </div>
                                                                    <DialogFooter>
                                                                        <Button variant="outline" onClick={() => {
                                                                            setIsEditDialogOpen(false);
                                                                            setEditingUser(null);
                                                                        }}>
                                                                            {t("common.cancel")}
                                                                        </Button>
                                                                        <Button onClick={handleSaveUser}>
                                                                            {t("teacher.users.edit.saveChanges")}
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                            
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        disabled={isDeleting}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>{t("teacher.users.delete.confirm")}</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            {t("teacher.users.delete.studentDescription")}
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDeleteUser(user.id)}
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

            {staffUsers.length === 0 && studentUsers.length === 0 && !loading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">
                            {t("teacher.users.empty")}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default UsersPage;
