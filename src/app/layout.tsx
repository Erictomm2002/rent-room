import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Quản lý phòng - Tính lương nhân viên",
  description: "Ứng dụng quản lý ca làm và tính lương nhân viên theo giờ",
};

export const viewport: Viewport = {
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
    <html lang="vi">
      <body className="antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
