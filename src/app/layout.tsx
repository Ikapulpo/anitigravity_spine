import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "脊椎OVFダッシュボード",
  description:
    "骨粗鬆症性椎体骨折（OVF）の疫学・在院日数・相関分析ダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
