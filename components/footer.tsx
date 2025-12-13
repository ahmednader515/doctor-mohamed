"use client";

import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";
import { Facebook, Youtube } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export const Footer = () => {
  const pathname = usePathname();
  const { t } = useLanguage();
  
  // Check if we're on a page with a sidebar
  const hasSidebar = pathname?.startsWith('/dashboard') || pathname?.startsWith('/courses');
  
  return (
    <footer className="py-6 border-t">
      <div className="container mx-auto px-4">
        <div className={`flex flex-col md:flex-row items-center gap-6 ${
          hasSidebar 
            ? 'md:rtl:pr-56 md:ltr:pl-56 lg:rtl:pr-80 lg:ltr:pl-80' 
            : ''
        }`}>
          {/* QR Code Section - Left Side */}
          <div className="flex flex-col items-center md:items-start">
            <Link
              href="https://www.youtube.com/@drmohamedmahmoud3m"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2"
              aria-label="YouTube QR Code"
            >
              <Image
                src="/youtube-qr.jpeg"
                alt="YouTube QR Code"
                width={150}
                height={150}
                className="rounded-lg border-2 border-brand/20"
              />
            </Link>
            <p className="text-sm text-muted-foreground text-center md:text-right max-w-[150px]">
              {t("footer.scanToSubscribe")}
            </p>
          </div>

          {/* Main Content - Centered */}
          <div className="flex-1 text-center text-muted-foreground">
            <div className="inline-block bg-brand/10 border-2 border-brand/20 rounded-lg px-6 py-3 mb-4">
              <p className="font-semibold text-lg text-brand">
                {t("footer.whatsapp")} : 01104365170
              </p>
            </div>
            
            {/* Social Media Links */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <Link
                href="https://www.facebook.com/share/19zPN6zppS/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-brand transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-6 w-6" />
              </Link>
              <Link
                href="https://www.youtube.com/@drmohamedmahmoud3m"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-brand transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-6 w-6" />
              </Link>
            </div>
            
            <p>{t("footer.copyright", { year: new Date().getFullYear().toString() })}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}; 