import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, Inter, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { StatusAnnouncerProvider } from "@/components/ui/live-region";
import { UnifiedThemeProvider } from "@/components/providers/unified-theme-provider";
import { UnifiedGrain, UnifiedBackground, ThemePopup } from "@/components/theme";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CheckMate",
    template: "%s | CheckMate",
  },
  description:
    "Create, share, and track checklist templates for any life event",
  keywords: [
    "checklist",
    "template",
    "task management",
    "progress tracking",
    "collaboration",
  ],
  authors: [{ name: "CheckMate" }],
  creator: "CheckMate",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "CheckMate",
    title: "CheckMate",
    description:
      "Create, share, and track checklist templates for any life event",
  },
  twitter: {
    card: "summary_large_image",
    title: "CheckMate",
    description:
      "Create, share, and track checklist templates for any life event",
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CheckMate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${plusJakarta.variable} ${inter.variable} ${manrope.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={[
            "light",
            "dark",
            "system",
          ]}
        >
          <UnifiedThemeProvider>
            <StatusAnnouncerProvider>{children}</StatusAnnouncerProvider>
            <UnifiedBackground />
            <UnifiedGrain />
            <ThemePopup />
          </UnifiedThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
