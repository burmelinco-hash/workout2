import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300","400","500","600","700"],
  variable: "--font-dm-sans",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400","500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "Marathon · BKK 2026",
  description: "Amazing Thailand Marathon Bangkok — Nov 29, 2026",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body style={{ background: "#000", minHeight: "100dvh" }}>
        <main className="page-content" style={{ maxWidth: 430, margin: "0 auto" }}>
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
