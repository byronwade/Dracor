import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Dracor: First Road",
  description:
    "Awaken the dragon memory. Rebuild Ironvale. Walk the First Road. A dark fantasy MMO where every contract matters and your deeds shape a living world.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans min-h-screen bg-surface text-content-primary antialiased`}
      >
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
