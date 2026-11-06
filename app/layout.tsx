import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import { BagProvider } from "@/components/providers/BagProvider";
import SiteChrome from "@/components/layout/SiteChrome";
import Footer from "@/components/layout/Footer";

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Plattering Co.",
  description: "Delivered and hosted catering in Singapore.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jost.variable}>
      <body className="min-h-screen bg-white font-sans text-ink">
        <BagProvider>
          <div className="relative">
            <SiteChrome />
            {children}
          </div>
          <Footer />
        </BagProvider>
      </body>
    </html>
  );
}
