"use client";

import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";

export const Footer = () => {
  const pathname = usePathname();
  const { t } = useLanguage();
  
  // Check if we're on a page with a sidebar
  const hasSidebar = pathname?.startsWith('/dashboard') || pathname?.startsWith('/courses');
  
  return (
    <footer className="py-6 border-t">
      <div className="container mx-auto px-4">
        <div className={`text-center text-muted-foreground ${
          hasSidebar 
            ? 'md:rtl:pr-56 md:ltr:pl-56 lg:rtl:pr-80 lg:ltr:pl-80' 
            : ''
        }`}>
          <div className="inline-block bg-brand/10 border-2 border-brand/20 rounded-lg px-6 py-3 mb-4">
            <p className="font-semibold text-lg text-brand">
              {t("footer.whatsapp")} : 01000000000
            </p>
          </div>
          
          <p>{t("footer.copyright", { year: new Date().getFullYear().toString() })}</p>
        </div>
      </div>
    </footer>
  );
}; 