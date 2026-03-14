import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savidhi Admin",
  description: "Savidhi Admin Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground">{children}</body>
    </html>
  );
}
