import type { Metadata } from "next";
import { Inter, Playfair_Display, Cabin } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { AuthProvider } from "@/lib/AuthContext";
import { LocaleProvider } from "@/lib/i18n";
import { Toaster } from "react-hot-toast";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["400", "500", "600", "700"] });
const cabin = Cabin({ subsets: ["latin"], variable: "--font-cabin", weight: ["400", "500", "600", "700"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://savidhi.in";

export async function generateMetadata(): Promise<Metadata> {
  // savidhi.com and savidhi.org serve the same Next.js bundle as savidhi.in.
  // We always emit rel=canonical pointing at the savidhi.in version of the
  // current path so search engines consolidate ranking on the primary domain.
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "/";
  const canonical = `${SITE_URL}${pathname}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "Savidhi — Book Pujas, Chadhava & Consult Astrologers Online",
      template: "%s | Savidhi",
    },
    description:
      "Savidhi — Your trusted platform for online puja booking, chadhava offerings, temple exploration, and spiritual consultations.",
    alternates: {
      canonical,
    },
    icons: {
      icon: "/svlogo.png",
      shortcut: "/svlogo.png",
      apple: "/svlogo.png",
    },
    openGraph: {
      title: "Savidhi — Book Pujas, Chadhava & Consult Astrologers Online",
      description:
        "Book pujas, chadhava offerings, and astrologer consultations from trusted temples and pandits across India.",
      url: canonical,
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Meta Pixel — only injected when the env var is set, so the page is
            safe to ship without an ID. Trips ViewContent / AddToCart /
            InitiateCheckout / Purchase via `window.fbq` from
            src/lib/analytics.ts. */}
        {META_PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window,document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');`}
          </Script>
        )}
        {/* GA4 / Google Ads — gtag.js, gated on env var. */}
        {GA4_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA4_ID}');`}
            </Script>
          </>
        )}
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${cabin.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <LocaleProvider>
          <AuthProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <FloatingWhatsApp />
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
