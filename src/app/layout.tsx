import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MemBox — Free Live Memory for Your AI Agents",
  description: "Create a MemBox in seconds. Get an API endpoint and token. Let all your coding tools and AI agents use it as their live memory. Completely free, unlimited storage.",
  keywords: ["MemBox", "AI memory", "agent memory", "live memory", "coding tools", "API storage", "free"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "MemBox — Free Live Memory for Your AI Agents",
    description: "Create a MemBox in seconds. Get an API endpoint and token. Let all your coding tools and AI agents use it as their live memory.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MemBox — Free Live Memory for Your AI Agents",
    description: "Create a MemBox in seconds. Get an API endpoint and token. Let all your coding tools and AI agents use it as their live memory.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
