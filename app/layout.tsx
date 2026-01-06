import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ChakraProvider from "@/components/providers/ChakraProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OptiTrack HK - Hong Kong Stock Options Tracker",
  description: "Track your Hong Kong stock options trades, monitor PNL, and manage your portfolio with ease.",
  keywords: ["Hong Kong", "stock options", "trading", "PNL", "portfolio tracker", "HKEX"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ChakraProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ChakraProvider>
      </body>
    </html>
  );
}
