"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle, Check, X } from "lucide-react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { useLanguage } from "@/lib/contexts/language-context";

interface CreatedUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
}

export default function CreateAccountPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    parentPhoneNumber: "",
    password: "",
    confirmPassword: "",
    subject: "",
    subjects: [] as string[], // For multiple subjects (الصف الثاني الثانوي)
    grade: "",
    semester: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePasswords = () => {
    return {
      match: formData.password === formData.confirmPassword,
      isValid: formData.password === formData.confirmPassword && formData.password.length > 0,
    };
  };

  const passwordChecks = validatePasswords();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!passwordChecks.isValid) {
      toast.error(t("teacher.createAccount.errors.passwordsNotMatch"));
      setIsLoading(false);
      return;
    }

    // Validate subject selection
    if (formData.grade === "الصف الثاني الثانوي" || formData.grade === "الصف الثالث الثانوي") {
      if (formData.subjects.length === 0) {
        toast.error(t("auth.errors.selectAtLeastOneSubject") || "Please select at least one subject");
        setIsLoading(false);
        return;
      }
    } else if (!formData.subject) {
      toast.error(t("auth.errors.subjectRequired") || "Please select a subject");
      setIsLoading(false);
      return;
    }

    // Validate semester (not required for الصف الثالث الثانوي)
    if (formData.grade !== "الصف الثالث الثانوي" && !formData.semester) {
      toast.error(t("auth.semesterRequired") || "Please select a semester");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/teacher/create-account", formData);
      
      if (response.data.success) {
        setCreatedUser(response.data.user);
        toast.success(t("teacher.createAccount.errors.createSuccess"));
        // Reset form
        setFormData({
          fullName: "",
          phoneNumber: "",
          parentPhoneNumber: "",
          password: "",
          confirmPassword: "",
          subject: "",
          subjects: [],
          grade: "",
          semester: "",
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 400) {
        const errorMessage = axiosError.response.data as string;
        if (errorMessage.includes("Phone number already exists")) {
          toast.error(t("teacher.createAccount.errors.phoneExists"));
        } else if (errorMessage.includes("Parent phone number already exists")) {
          toast.error(t("teacher.createAccount.errors.parentPhoneExists"));
        } else if (errorMessage.includes("Phone number cannot be the same as parent phone number")) {
          toast.error(t("teacher.createAccount.errors.samePhone"));
        } else if (errorMessage.includes("Passwords do not match")) {
          toast.error(t("teacher.createAccount.errors.passwordsNotMatch"));
        } else {
          toast.error(t("teacher.createAccount.errors.createError"));
        }
      } else {
        toast.error(t("teacher.createAccount.errors.createError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      phoneNumber: "",
      parentPhoneNumber: "",
      password: "",
      confirmPassword: "",
      subject: "",
      subjects: [],
      grade: "",
      semester: "",
    });
    setCreatedUser(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/teacher/courses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("teacher.createAccount.back")}
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("teacher.createAccount.title")}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {createdUser ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                {t("teacher.createAccount.success.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">{t("auth.fullName")}</Label>
                  <p className="text-green-800 dark:text-green-200 font-semibold">{createdUser.fullName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">{t("auth.phoneNumber")}</Label>
                  <p className="text-green-800 dark:text-green-200 font-semibold">{createdUser.phoneNumber}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700 text-white">
                  {t("teacher.createAccount.success.createAnother")}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/teacher/courses">
                    {t("teacher.createAccount.success.backToCourses")}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {t("teacher.createAccount.form.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    disabled={isLoading}
                    className="h-10"
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">{t("auth.phoneNumber")}</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    autoComplete="tel"
                    required
                    disabled={isLoading}
                    className="h-10"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="+20XXXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentPhoneNumber">{t("auth.parentPhoneNumber")}</Label>
                  <Input
                    id="parentPhoneNumber"
                    name="parentPhoneNumber"
                    type="tel"
                    autoComplete="tel"
                    required
                    disabled={isLoading}
                    className="h-10"
                    value={formData.parentPhoneNumber}
                    onChange={handleInputChange}
                    placeholder="+20XXXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">{t("auth.grade")}</Label>
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
                    disabled={isLoading}
                    required
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={t("auth.gradePlaceholder")} />
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
                    <Label htmlFor="subject">{t("auth.subject")}</Label>
                    {formData.grade === "الصف الاول الثانوي" ? (
                      <Select
                        value={formData.subject}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, subject: value, subjects: [] }))}
                        disabled={isLoading || !formData.grade}
                        required
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder={t("auth.subjectPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="علوم متكاملة">علوم متكاملة</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (formData.grade === "الصف الثاني الثانوي" || formData.grade === "الصف الثالث الثانوي") ? (
                      <div className="space-y-2">
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
                          placeholder={t("auth.subjectPlaceholder")}
                          disabled={isLoading}
                        />
                        {formData.subjects.length === 0 && (
                          <p className="text-sm text-destructive mt-1">{t("auth.errors.selectAtLeastOneSubject") || "Please select at least one subject"}</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
                {formData.grade !== "الصف الثالث الثانوي" && (
                  <div className="space-y-2">
                    <Label htmlFor="semester">{t("auth.semester")}</Label>
                    <Select
                      value={formData.semester}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, semester: value }))}
                      disabled={isLoading}
                      required
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t("auth.semesterPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="الترم الاول">الترم الاول</SelectItem>
                        <SelectItem value="الترم الثاني">الترم الثاني</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      disabled={isLoading}
                      className="h-10 rtl:pr-10 ltr:pl-10"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute rtl:right-0 ltr:left-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      disabled={isLoading}
                      className="h-10 rtl:pr-10 ltr:pl-10"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute rtl:right-0 ltr:left-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {passwordChecks.match ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm text-muted-foreground">{passwordChecks.match ? t("auth.passwordsMatch") : t("auth.passwordsNotMatch")}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 bg-brand hover:bg-brand/90 text-white"
                  disabled={
                    isLoading || 
                    !passwordChecks.isValid || 
                    (formData.grade === "الصف الثاني الثانوي" || formData.grade === "الصف الثالث الثانوي" ? formData.subjects.length === 0 : !formData.subject) ||
                    (formData.grade !== "الصف الثالث الثانوي" && !formData.semester)
                  }
                >
                  {isLoading ? t("teacher.createAccount.form.creating") : t("teacher.createAccount.form.createAccount")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 