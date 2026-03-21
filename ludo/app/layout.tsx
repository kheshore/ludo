import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ludo - Play & Win",
  description: "A modern, phone-first Ludo game. Play with friends, track your stats, and climb the ranks!",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ludo",
  },
  icons: {
    icon: "/icon-192.svg",
    apple: "/icon-512.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-gray-950 text-white antialiased font-sans overflow-x-hidden" suppressHydrationWarning>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
