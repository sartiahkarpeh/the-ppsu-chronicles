import type { Metadata, Viewport } from "next";
import { Outfit, Oswald } from "next/font/google";
import "./globals.css";
import ConditionalNavbar from "../components/ConditionalNavbar";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "The PPSU Chronicles",
  description: "The PPSU Chronicles is the official student-run media body of P. P. Savani University, sharing stories, ideas, events, and campus culture.",
  metadataBase: new URL('https://www.theppsuchronicles.com'),
  openGraph: {
    title: "The PPSU Chronicles",
    description: "The official student-run media body of P. P. Savani University, sharing stories, ideas, events, and campus culture.",
    url: 'https://www.theppsuchronicles.com',
    siteName: 'The PPSU Chronicles',
    images: [
      {
        url: '/ppsu.png',
        width: 1200,
        height: 630,
        alt: 'The PPSU Chronicles',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "The PPSU Chronicles",
    description: "The official student-run media body of P. P. Savani University",
    images: ['/ppsu.png'],
    creator: '@PPSUChronicles',
    site: '@PPSUChronicles',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo1.jpg" />
      </head>
      <body
        className={`${outfit.variable} ${oswald.variable} antialiased`}
      >
        <ConditionalNavbar />
        {children}
      </body>
    </html>
  );
}
