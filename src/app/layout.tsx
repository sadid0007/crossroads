import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Crossroads IELTS Simulator",
  description: "Practice IELTS with realistic mock tests across all four modules - Listening, Reading, Writing, and Speaking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans bg-gray-50 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
