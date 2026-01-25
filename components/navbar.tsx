"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";
import { ScrollProgress } from "@/components/scroll-progress";
import { LogOut } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Navbar = () => {
  const { data: session } = useSession();
  const { t, isRTL } = useLanguage();

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <div className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Logo"
              width={80}
              height={80}
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain ml-2"
              unoptimized
            />
          </Link>

          {/* Right side items */}
          <div className="flex items-center gap-1 md:gap-4">
            <LanguageSwitcher />
            {!session ? (
              <>
                <Button 
                  className={`bg-brand hover:bg-brand/90 text-white ${isRTL ? 'text-xs sm:text-sm px-2 sm:px-4' : ''}`} 
                  asChild
                >
                  <Link href="/sign-up">{t("navigation.signUp")}</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className={`border-brand text-brand hover:bg-brand/10 ${isRTL ? 'text-xs sm:text-sm px-2 sm:px-4' : ''}`}
                >
                  <Link href="/sign-in">{t("navigation.signIn")}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-xs md:text-sm">
                  <Link href="/dashboard">{t("navigation.dashboard")}</Link>
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200 ease-in-out text-xs md:text-sm"
                >
                  <LogOut className="h-3 w-3 md:h-4 md:w-4 rtl:ml-1 ltr:mr-1 md:rtl:ml-2 md:ltr:mr-2"/>
                  {t("navigation.logout")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      <ScrollProgress />
    </div>
  );
}; 