import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import NavigationProgress from "@/components/NavigationProgress";
import ThemeBoot from "@/components/ThemeBoot";

export const metadata: Metadata = {
  title: { default: "OrvenSMP", template: "%s | OrvenSMP" },
  description: "OrvenSMP — The official community home of OrvenSMP — connect, share, make friends and stay close to the server.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark" suppressHydrationWarning><body><ThemeBoot/><Suspense fallback={null}><NavigationProgress/></Suspense>{children}</body></html>;
}
