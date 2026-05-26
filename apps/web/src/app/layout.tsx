import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", weight: ["400", "500", "600", "700", "800", "900"] });

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
        className={`${inter.variable} ${cinzel.variable} font-sans min-h-screen bg-surface text-content-primary antialiased`}
      >
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
