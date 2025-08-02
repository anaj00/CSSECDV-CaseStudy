import Link from "next/link";

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
      <body>
        <nav className="p-4 bg-white shadow flex gap-4">
          <Link href="/forums">Forums</Link>
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
