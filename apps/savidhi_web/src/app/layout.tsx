import type { Metadata } from "next";
import { Inter, Playfair_Display, Cabin } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/lib/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["400", "500", "600", "700"] });
const cabin = Cabin({ subsets: ["latin"], variable: "--font-cabin", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Savidhi — Book Pujas, Chadhava & Consult Astrologers Online",
  description:
    "Savidhi — Your trusted platform for online puja booking, chadhava offerings, temple exploration, and spiritual consultations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${cabin.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
