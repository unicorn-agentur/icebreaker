import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Unicorn Icebreaker Generator",
  description: "Automated cold outreach icebreaker generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full">
      <body className={cn(inter.className, "h-full antialiased bg-gray-50 dark:bg-gray-950")}>
        {children}
      </body>
    </html>
  );
}
