import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GoatedPlugins", template: "%s | GoatedPlugins" },
  description: "Minecraft plugins, community and development.",
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
  return <html lang="en"><body>{children}</body></html>;
}
