import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { StatusAnnouncerProvider } from "@/components/ui/live-region";
import { UnifiedThemeProvider } from "@/components/providers/unified-theme-provider";
import { UnifiedGrain, UnifiedBackground, ThemePopup } from "@/components/theme";
import "./globals.css";

// Vendored under public/fonts by scripts/fonts/fetch-fonts.mjs, over the same
// weight ranges as before. Each @font-face keeps the family's own name, since
// that is the name its font-themes.ts entry renders.
const outfit = localFont({
  src: "../../public/fonts/outfit/outfit-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-outfit",
  declarations: [{ prop: "font-family", value: "Outfit" }],
});

const plusJakarta = localFont({
  src: "../../public/fonts/plusJakarta/plusJakarta-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-plus-jakarta",
  declarations: [{ prop: "font-family", value: "Plus Jakarta Sans" }],
});

const inter = localFont({
  src: "../../public/fonts/inter/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-inter",
  declarations: [{ prop: "font-family", value: "Inter" }],
});

const manrope = localFont({
  src: "../../public/fonts/manrope/manrope-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-manrope",
  declarations: [{ prop: "font-family", value: "Manrope" }],
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
