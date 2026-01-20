"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    balance: number;
    grade: string | null;
}

const BalancesPage = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newBalance, setNewBalance] = useState("");
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

    const handleBalanceUpdate = async () => {
        if (!selectedUser || !newBalance) {
            toast.error(t("admin.balances.errors.enterBalance"));
            return;
        }

        const balance = parseFloat(newBalance);
        if (isNaN(balance) || balance < 0) {
            toast.error(t("admin.balances.errors.enterBalance"));
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ newBalance: balance }),
            });

            if (response.ok) {
                toast.success(t("admin.balances.errors.updateSuccess"));
                setNewBalance("");
                setIsDialogOpen(false);
                setSelectedUser(null);
                fetchUsers(); // Refresh the list
            } else {
                toast.error(t("admin.balances.errors.updateError"));
            }
        } catch (error) {
            console.error("Error updating balance:", error);
            toast.error(t("admin.balances.errors.updateError"));
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phoneNumber.includes(searchTerm)
    );

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
                    {t("admin.balances.title")}
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
                                placeholder={t("admin.balances.searchPlaceholder")}
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
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.role")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.currentBalance")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.actions")}</TableHead>
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
                                                        <Badge variant="outline" className="flex items-center gap-1">
                                                            <Wallet className="h-3 w-3" />
                                                            {user.balance} {t("admin.balances.egp")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setNewBalance(user.balance.toString());
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            {t("admin.balances.edit.updateBalance")}
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
                                placeholder={t("admin.balances.searchPlaceholder")}
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
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.role")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.currentBalance")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.actions")}</TableHead>
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
                                                        <Badge variant="outline" className="flex items-center gap-1">
                                                            <Wallet className="h-3 w-3" />
                                                            {user.balance} {t("admin.balances.egp")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setNewBalance(user.balance.toString());
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            {t("admin.balances.edit.updateBalance")}
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
                                placeholder={t("admin.balances.searchPlaceholder")}
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
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.name")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.phoneNumber")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.role")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.currentBalance")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.balances.table.actions")}</TableHead>
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
                                                        <Badge variant="outline" className="flex items-center gap-1">
                                                            <Wallet className="h-3 w-3" />
                                                            {user.balance} {t("admin.balances.egp")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setNewBalance(user.balance.toString());
                                                                setIsDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            {t("admin.balances.edit.updateBalance")}
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
                        setNewBalance("");
                        setSelectedUser(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t("admin.balances.edit.title", { name: selectedUser?.fullName || "" })}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newBalance">{t("admin.balances.edit.newBalance")}</Label>
                            <Input
                                id="newBalance"
                                type="number"
                                value={newBalance}
                                onChange={(e) => setNewBalance(e.target.value)}
                                placeholder={t("admin.balances.edit.placeholder")}
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setNewBalance("");
                                    setSelectedUser(null);
                                }}
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button onClick={handleBalanceUpdate}>
                                {t("admin.balances.edit.updateBalance")}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BalancesPage; 