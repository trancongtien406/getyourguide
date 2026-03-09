import { ToastProvider } from "@/lib/toast-context";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { JetBrains_Mono, Jost } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GetYourGuide - Book Tours & Activities",
    template: "%s | GetYourGuide",
  },
  description: "Discover and book amazing tours, attractions, and activities worldwide. Best prices guaranteed.",
  keywords: ["tours", "travel", "activities", "booking", "attractions"],
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body
      suppressHydrationWarning
        className={`${jost.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            <Suspense fallback={null}>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none"
              >
                Skip to main content
              </a>
              <div id="main-content">
                {children}
              </div>
            </Suspense>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
