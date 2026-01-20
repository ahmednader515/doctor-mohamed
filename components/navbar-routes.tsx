"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react";
import Link from "next/link";
import { UserButton } from "./user-button";
import { useSession, signOut } from "next-auth/react";
import { LoadingButton } from "@/components/ui/loading-button";
import { useState } from "react";

export const NavbarRoutes = () => {
    const { data: session } = useSession();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await signOut({ callbackUrl: "/" });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="flex items-center gap-x-1 md:gap-x-2 rtl:mr-auto ltr:ml-auto">
            {/* Logout button for all user types */}
            {session?.user && (
                <LoadingButton 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleLogout}
                    loading={isLoggingOut}
                    loadingText="جاري تسجيل الخروج..."
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200 ease-in-out text-xs md:text-sm px-2 md:px-3"
                >
                    <LogOut className="h-3 w-3 md:h-4 md:w-4 rtl:ml-1 ltr:mr-1 md:rtl:ml-2 md:ltr:mr-2"/>
                    تسجيل الخروج
                </LoadingButton>
            )}
            
            <UserButton />
        </div>
    )
}