import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600", "700"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["300", "400", "500"] });

export const metadata: Metadata = {
  title: "Shayan Mehmood — AI Architect",
  description:
    "Full Stack AI Engineer & SaaS Architect. Agentic LLM systems, retrieval pipelines, and multi-tenant platforms.",
  metadataBase: new URL("https://shayan-mehmood.github.io"),
  openGraph: {
    title: "Shayan Mehmood — AI Architect",
    description: "Agentic LLM systems, retrieval pipelines, and multi-tenant SaaS platforms.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#010103",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
