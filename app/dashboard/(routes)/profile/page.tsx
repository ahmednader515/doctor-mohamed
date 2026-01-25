"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { User, Save, Loader2, Key, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UserProfile {
    id: string;
    fullName: string;
    phoneNumber: string;
    parentPhoneNumber: string | null;
    grade: string | null;
    subject: string | null;
    semester: string | null;
    hasPassword: boolean;
}

export default function ProfilePage() {
    const { t } = useLanguage();
    const { data: session, update } = useSession();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        phoneNumber: "",
        parentPhoneNumber: "",
        grade: "",
        subject: "",
        subjects: [] as string[],
        semester: "",
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await fetch("/api/user/profile");
            if (response.ok) {
                const data = await response.json();
                setProfile({
                    ...data,
                    hasPassword: data.hasPassword !== undefined ? data.hasPassword : false
                });
                // Parse subject if it's comma-separated
                const subjects = data.subject?.includes(",") 
                    ? data.subject.split(",").map((s: string) => s.trim())
                    : data.subject ? [data.subject] : [];
                
                setFormData({
                    fullName: data.fullName || "",
                    phoneNumber: data.phoneNumber || "",
                    parentPhoneNumber: data.parentPhoneNumber ?? "",
                    grade: data.grade || "",
                    subject: data.subject || "",
                    subjects: subjects,
                    semester: data.semester || "",
                });
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            toast.error(t("student.profile.loadError"));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!profile) return;

        setSaving(true);
        try {
            // Prepare subject - use comma-separated if multiple subjects, otherwise single value
            const subjectValue = formData.subjects.length > 0 
                ? formData.subjects.join(",")
                : formData.subject;

            const response = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    phoneNumber: formData.phoneNumber,
                    parentPhoneNumber: formData.parentPhoneNumber,
                    grade: formData.grade || null,
                    subject: subjectValue || null,
                    semester: formData.semester || null,
                }),
            });

            if (response.ok) {
                const updatedData = await response.json();
                
                // Parse subject if it's comma-separated
                const updatedSubjects = updatedData.subject?.includes(",") 
                    ? updatedData.subject.split(",").map((s: string) => s.trim())
                    : updatedData.subject ? [updatedData.subject] : [];
                
                setProfile({
                    ...updatedData,
                    hasPassword: updatedData.hasPassword !== undefined ? updatedData.hasPassword : profile.hasPassword
                });
                
                // Update formData with the response
                setFormData({
                    fullName: updatedData.fullName || "",
                    phoneNumber: updatedData.phoneNumber || "",
                    parentPhoneNumber: updatedData.parentPhoneNumber ?? "",
                    grade: updatedData.grade || "",
                    subject: updatedData.subject || "",
                    subjects: updatedSubjects,
                    semester: updatedData.semester || "",
                });
                
                await update(); // Update session
                router.refresh(); // Refresh server components to reflect updated user data
                toast.success(t("student.profile.updateSuccess"));
            } else {
                const error = await response.text();
                toast.error(error || t("student.profile.updateError"));
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error(t("student.profile.updateError"));
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!passwordData.newPassword) {
            toast.error(t("student.profile.password.enterNewPassword"));
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error(t("student.profile.password.passwordsNotMatch"));
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error(t("student.profile.password.passwordTooShort"));
            return;
        }

        setChangingPassword(true);
        try {
            const response = await fetch("/api/user/password", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword || undefined,
                    newPassword: passwordData.newPassword,
                }),
            });

            if (response.ok) {
                toast.success(t("student.profile.password.changeSuccess"));
                setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                });
                fetchProfile(); // Refresh to update hasPassword status
            } else {
                const error = await response.text();
                toast.error(error || t("student.profile.password.changeError"));
            }
        } catch (error) {
            console.error("Error changing password:", error);
            toast.error(t("student.profile.password.changeError"));
        } finally {
            setChangingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground">{t("student.profile.notFound")}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t("student.profile.title")}</h1>
                    <p className="text-muted-foreground">{t("student.profile.subtitle")}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Profile Information */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            {t("student.profile.personalInfo")}
                        </CardTitle>
                        <CardDescription>{t("student.profile.personalInfoDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">{t("student.profile.fullName")}</Label>
                            <Input
                                id="fullName"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber">{t("student.profile.phoneNumber")}</Label>
                            <Input
                                id="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="parentPhoneNumber">{t("student.profile.parentPhoneNumber")}</Label>
                            <Input
                                id="parentPhoneNumber"
                                value={formData.parentPhoneNumber}
                                onChange={(e) => setFormData({ ...formData, parentPhoneNumber: e.target.value })}
                                disabled={saving}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Account Information */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>{t("student.profile.accountInfo")}</CardTitle>
                        <CardDescription>{t("student.profile.accountInfoDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="grade">{t("student.profile.grade")}</Label>
                            <Select
                                value={formData.grade}
                                onValueChange={(value) => {
                                    // Reset subjects when grade changes
                                    if (value === "الصف الاول الثانوي") {
                                        setFormData((prev) => ({ ...prev, grade: value, subject: "", subjects: [] }));
                                    } else {
                                        setFormData((prev) => ({ ...prev, grade: value, subject: "", subjects: [] }));
                                    }
                                }}
                                disabled={saving}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder={t("student.profile.notSet")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="الصف الاول الثانوي">الصف الاول الثانوي</SelectItem>
                                    <SelectItem value="الصف الثاني الثانوي">الصف الثاني الثانوي</SelectItem>
                                    <SelectItem value="الصف الثالث الثانوي">الصف الثالث الثانوي</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {formData.grade && (
                            <div className="space-y-2">
                                <Label htmlFor="subject">{t("student.profile.subject")}</Label>
                                {formData.grade === "الصف الاول الثانوي" ? (
                                    <Select
                                        value={formData.subject}
                                        onValueChange={(value) => setFormData((prev) => ({ ...prev, subject: value, subjects: [] }))}
                                        disabled={saving || !formData.grade}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder={t("student.profile.notSet")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="علوم متكاملة">علوم متكاملة</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (formData.grade === "الصف الثاني الثانوي" || formData.grade === "الصف الثالث الثانوي") ? (
                                    <MultiSelect
                                        options={[
                                            { label: "كيمياء", value: "كيمياء" },
                                            { label: "فيزياء", value: "فيزياء" },
                                        ]}
                                        selected={formData.subjects}
                                        onChange={(selected) => {
                                            setFormData((prev) => ({
                                                ...prev,
                                                subjects: selected,
                                                subject: selected.join(",")
                                            }));
                                        }}
                                        placeholder={t("student.profile.notSet")}
                                        disabled={saving}
                                    />
                                ) : null}
                            </div>
                        )}
                        {formData.grade && formData.grade !== "الصف الثالث الثانوي" && (
                            <div className="space-y-2">
                                <Label htmlFor="semester">{t("student.profile.semester")}</Label>
                                <Select
                                    value={formData.semester}
                                    onValueChange={(value) => setFormData((prev) => ({ ...prev, semester: value }))}
                                    disabled={saving}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder={t("student.profile.notSet")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="الترم الاول">الترم الاول</SelectItem>
                                        <SelectItem value="الترم الثاني">الترم الثاني</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Save Button - Between the two sections */}
            <div className="flex justify-center">
                <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-[200px]">
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("common.saving")}
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            {t("student.profile.save")}
                        </>
                    )}
                </Button>
            </div>

            {/* Password Change */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        {t("student.profile.password.title")}
                    </CardTitle>
                    <CardDescription>{t("student.profile.password.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {profile.hasPassword && (
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">{t("student.profile.password.currentPassword")}</Label>
                            <div className="relative">
                                <Input
                                    id="currentPassword"
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    placeholder={t("student.profile.password.currentPasswordPlaceholder")}
                                    className="rtl:pr-10 ltr:pl-10"
                                />
                                <button
                                    type="button"
                                    className="absolute rtl:right-0 ltr:left-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 flex items-center justify-center hover:bg-transparent cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                    {showCurrentPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">{t("student.profile.password.newPassword")}</Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                placeholder={t("student.profile.password.newPasswordPlaceholder")}
                                className="rtl:pr-10 ltr:pl-10"
                            />
                            <button
                                type="button"
                                className="absolute rtl:right-0 ltr:left-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 flex items-center justify-center hover:bg-transparent cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t("student.profile.password.confirmPassword")}</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                placeholder={t("student.profile.password.confirmPasswordPlaceholder")}
                                className="rtl:pr-10 ltr:pl-10"
                            />
                            <button
                                type="button"
                                className="absolute rtl:right-0 ltr:left-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 flex items-center justify-center hover:bg-transparent cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>
                    <Button 
                        onClick={handlePasswordChange} 
                        disabled={changingPassword} 
                        className="w-full"
                    >
                        {changingPassword ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t("common.saving")}
                            </>
                        ) : (
                            <>
                                <Key className="h-4 w-4 mr-2" />
                                {t("student.profile.password.change")}
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
