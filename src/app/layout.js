import Link from "next/link";
import AuthProvider from "@/components/providers/AuthProvider";
import Navigation from "@/components/Navigation";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CSSECDV | Forums",
  description: "A forum web app created in fulfillment for the course CSSECDV",
};

export default function Layout({ children }) {
  return (
    <html>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <Navigation />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
