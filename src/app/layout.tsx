import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The PPSU Chronicles",
  description: "The PPSU Chronicles is the official student-run media body of P. P. Savani University, sharing stories, ideas, events, and campus culture.",
  metadataBase: new URL('https://www.theppsuchronicles.com'),
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
