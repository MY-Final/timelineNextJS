import type { Metadata } from "next";
import { Geist, Noto_Serif_SC, Zhi_Mang_Xing } from "next/font/google";
import "./globals.css";
import SiteTopNav from "@/components/ui/common/SiteTopNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const serifCn = Noto_Serif_SC({
  variable: "--font-serif-cn",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
});

const handwrittenCn = Zhi_Mang_Xing({
  variable: "--font-handwritten-cn",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Our Story",
  description: "A timeline of memories built with Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${serifCn.variable} ${handwrittenCn.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SiteTopNav />
        {children}
      </body>
    </html>
  );
}
