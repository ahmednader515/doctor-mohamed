import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Footer } from "@/components/footer";
import { NavigationLoading } from "@/components/navigation-loading";
import { Suspense } from "react";
import { theme } from "@/lib/theme";
import { cairo, roboto } from "@/lib/fonts";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "منصة الدكتور",
  description: "منصة تعليمية متكاملة",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="ar" dir="rtl" className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} ${roboto.variable}`}>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (document.documentElement) {
                  document.documentElement.style.setProperty('--brand', '${theme.brand}');
                }
              })();
            `,
          }}
        />
        <Providers>
          <Suspense fallback={null}>
            <NavigationLoading />
          </Suspense>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
