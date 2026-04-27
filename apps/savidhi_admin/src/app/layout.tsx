import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.savidhi.in";

export const metadata: Metadata = {
  metadataBase: new URL(ADMIN_URL),
  title: {
    default: "Savidhi Admin",
    template: "%s | Savidhi Admin",
  },
  description:
    "Savidhi Admin Panel — Manage Pujas, Chadhavas, Temples, Bookings, and Reports.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/svlogo.png",
    shortcut: "/svlogo.png",
    apple: "/svlogo.png",
  },
  openGraph: {
    title: "Savidhi Admin",
    description: "Internal admin panel — restricted access.",
    url: ADMIN_URL,
    siteName: "Savidhi Admin",
    images: [{ url: "/svlogo.png", width: 1200, height: 630, alt: "Savidhi" }],
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
