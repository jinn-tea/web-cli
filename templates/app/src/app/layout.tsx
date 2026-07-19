import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { clientEnv } from "@/config/env";
import "./globals.css";

/**
 * Root layout — a Server Component.
 *
 * Fonts load through `next/font` (self-hosted, no layout shift, no runtime
 * request to a font CDN). `AppProviders` is the app's ONE client boundary;
 * everything above it stays server-rendered.
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: clientEnv.NEXT_PUBLIC_APP_NAME,
    template: `%s · ${clientEnv.NEXT_PUBLIC_APP_NAME}`,
  },
  description: "Built with the Codeable web architecture.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // TODO(i18n): when a second locale ships, drive `lang` from the active
    // locale so screen readers announce content in the right language.
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
