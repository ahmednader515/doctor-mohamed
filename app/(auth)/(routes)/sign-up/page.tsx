"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { Check, X, Eye, EyeOff, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/lib/contexts/language-context";
import ReCAPTCHA from "react-google-recaptcha";
import { RecaptchaGate } from "@/components/recaptcha-gate";

export default function SignUpPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
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
      toast.error(t("auth.passwordsNotMatch"));
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

    // Only require reCAPTCHA if site key is configured
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast.error(t("auth.errors.recaptchaRequired") || "Please complete the reCAPTCHA verification");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/auth/register", {
        ...formData,
        recaptchaToken,
      });
      
      if (response.data.success) {
        toast.success(t("auth.errors.accountCreated"));
        router.push("/sign-in");
      }
    } catch (error) {
      // Reset reCAPTCHA on error
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 400) {
        const errorMessage = axiosError.response.data as string;
        if (errorMessage.includes("Phone number already exists")) {
          toast.error(t("auth.errors.phoneExists"));
        } else if (errorMessage.includes("Parent phone number already exists")) {
          toast.error(t("auth.errors.parentPhoneExists"));
        } else if (errorMessage.includes("Phone number cannot be the same as parent phone number")) {
          toast.error(t("auth.errors.samePhone"));
        } else if (errorMessage.includes("Passwords do not match")) {
          toast.error(t("auth.passwordsNotMatch"));
        } else if (errorMessage.includes("reCAPTCHA")) {
          toast.error(t("auth.errors.recaptchaError") || "reCAPTCHA verification failed. Please try again.");
        } else {
          toast.error(t("auth.errors.accountCreationError"));
        }
      } else {
        toast.error(t("auth.errors.accountCreationError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RecaptchaGate storageKey="recaptcha_signup_verified">
      <div className="flex min-h-screen bg-background overflow-y-auto">
      <div className="absolute top-4 left-4 z-10">
        <Button variant="ghost" size="lg" asChild>
          <Link href="/">
            <ChevronLeft className="h-10 w-10" />
          </Link>
        </Button>
      </div>
      
      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand/10 to-brand/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-brand/5"></div>
        <div className="relative z-10 flex items-center justify-center w-full">
          <div className="text-center space-y-6 p-8">
            <div className="relative w-64 h-[268px] mx-auto rounded-full border-4 border-brand/20 shadow-2xl overflow-hidden">
              <div className="absolute inset-8">
                <Image
                  src="/logo.png"
                  alt="Teacher"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-brand">
                {t("auth.signUpWelcome")}
              </h3>
              <p className="text-lg text-muted-foreground max-w-md">
                {t("auth.signUpMessage")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-md space-y-6 py-8 mt-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight mt-8">
              {t("auth.signUpTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("auth.signUpSubtitle")}
            </p>
          </div>
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

            {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                  onChange={(token) => setRecaptchaToken(token)}
                  onExpired={() => setRecaptchaToken(null)}
                  onError={() => setRecaptchaToken(null)}
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-brand hover:bg-brand/90 text-white"
              disabled={
                isLoading || 
                !passwordChecks.isValid || 
                (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && !recaptchaToken) ||
                (formData.grade === "الصف الثاني الثانوي" || formData.grade === "الصف الثالث الثانوي" ? formData.subjects.length === 0 : !formData.subject) ||
                (formData.grade !== "الصف الثالث الثانوي" && !formData.semester)
              }
            >
              {isLoading ? t("auth.creatingAccount") : t("auth.createAccountButton")}
            </Button>
          </form>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">{t("auth.alreadyHaveAccount")} </span>
            <Link 
              href="/sign-in" 
              className="text-primary hover:underline transition-colors"
            >
              {t("auth.signIn")}
            </Link>
          </div>
        </div>
      </div>
    </div>
    </RecaptchaGate>
  );
} 