import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AuthMissingBanner } from "@/components/auth-missing-banner";
import { ThemeProvider } from "@/components/theme-provider";
import { hasClerk } from "@/lib/clerk-config";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "COTWB — Chip of the Writer's Block",
  description: "Chip of the Writer's Block (COTWB) — a community for writers and readers.",
};

import { cookies } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkReady = hasClerk();
  const cookieStore = await cookies();
  const initialTheme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";

  const inner = (
    <html
      lang="en"
      data-theme={initialTheme}
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text-primary">
        {!clerkReady ? <AuthMissingBanner /> : null}
        <ThemeProvider initialTheme={initialTheme as "light" | "dark"}>{children}</ThemeProvider>
      </body>
    </html>
  );

  if (!clerkReady) return inner;

  return <ClerkProvider>{inner}</ClerkProvider>;
}
