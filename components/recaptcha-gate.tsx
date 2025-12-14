"use client";

import React, { useState, useEffect, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useLanguage } from "@/lib/contexts/language-context";
import { Loader2 } from "lucide-react";

interface RecaptchaGateProps {
  children: React.ReactNode;
  storageKey?: string;
}

export function RecaptchaGate({ children, storageKey = "recaptcha_verified" }: RecaptchaGateProps) {
  const { t } = useLanguage();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  useEffect(() => {
    // Check if already verified in this session
    const verified = sessionStorage.getItem(storageKey);
    if (verified === "true") {
      setIsVerified(true);
      return;
    }

    // Check if reCAPTCHA site key is configured
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      // If no reCAPTCHA configured, allow access (for development)
      setIsVerified(true);
      return;
    }

    setIsVerified(false);
  }, [storageKey]);

  const handleRecaptchaChange = async (token: string | null) => {
    if (!token) {
      setRecaptchaToken(null);
      return;
    }

    setRecaptchaToken(token);
    setIsVerifying(true);

    try {
      // Verify token on server
      const response = await fetch("/api/auth/verify-recaptcha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store verification in sessionStorage
        sessionStorage.setItem(storageKey, "true");
        setIsVerified(true);
      } else {
        // Verification failed, reset reCAPTCHA
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        setRecaptchaToken(null);
        setIsVerifying(false);
      }
    } catch (error) {
      console.error("reCAPTCHA verification error:", error);
      // Reset on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setRecaptchaToken(null);
      setIsVerifying(false);
    }
  };

  // Show loading state while checking verification
  if (isVerified === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  // If verified, show content
  if (isVerified) {
    return <>{children}</>;
  }

  // Show reCAPTCHA gate
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    // Fallback if no site key configured
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            {t("recaptcha.gate.title") || "Security Verification"}
          </h2>
          <p className="text-muted-foreground">
            {t("recaptcha.gate.description") || "Please verify that you are human to continue"}
          </p>
        </div>
        <div className="flex justify-center">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={siteKey}
            onChange={handleRecaptchaChange}
            theme="light"
          />
        </div>
        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("recaptcha.gate.verifying") || "Verifying..."}</span>
          </div>
        )}
      </div>
    </div>
  );
}

