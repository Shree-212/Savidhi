import type { Metadata } from "next";
import { Inter, Playfair_Display, Cabin } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/lib/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["400", "500", "600", "700"] });
const cabin = Cabin({ subsets: ["latin"], variable: "--font-cabin", weight: ["400", "500", "600", "700"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://savidhi.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Savidhi — Book Pujas, Chadhava & Consult Astrologers Online",
    template: "%s | Savidhi",
  },
  description:
    "Savidhi — Your trusted platform for online puja booking, chadhava offerings, temple exploration, and spiritual consultations.",
  icons: {
    icon: "/svlogo.png",
    shortcut: "/svlogo.png",
    apple: "/svlogo.png",
  },
  openGraph: {
    title: "Savidhi — Book Pujas, Chadhava & Consult Astrologers Online",
    description:
      "Book pujas, chadhava offerings, and astrologer consultations from trusted temples and pandits across India.",
    url: SITE_URL,
    siteName: "Savidhi",
    images: [{ url: "/svlogo.png", width: 1200, height: 630, alt: "Savidhi" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Savidhi",
    description:
      "Book pujas, chadhava offerings, and astrologer consultations from trusted temples and pandits across India.",
    images: ["/svlogo.png"],
  },
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
