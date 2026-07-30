import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maritime & Freight Services — Global Analytics Platform",
  description: "Open-source global maritime analytics platform tracking vessel traffic, port operations, shipment logistics, and seaborne trade data.",
  keywords: ["maritime", "freight", "shipping", "vessel tracking", "port management", "trade analytics", "AIS", "UN Comtrade"],
  authors: [{ name: "Maritime & Freight Services" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Maritime & Freight Services",
    description: "Global maritime analytics platform for vessel tracking, port operations, and trade data.",
    type: "website",
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
