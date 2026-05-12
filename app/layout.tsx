import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Sentinel · Autonomous Incident Response",
  description:
    "Multi-vendor LLM agent for production incident response. Gemini Flash + Claude Sonnet investigate, diagnose, and recommend fixes in ~53 seconds. Adversarial cross-vendor review. Built for AI Agent Olympics 2026.",
  metadataBase: new URL("https://wma-contacting-lindsay-orientation.trycloudflare.com"),
  openGraph: {
    title: "Sentinel · Autonomous Incident Response Agent",
    description:
      "When production breaks, three specialized LLMs investigate, diagnose, and recommend fixes in ~53 seconds — with adversarial cross-vendor review. Multi-vendor truth.",
    url: "https://wma-contacting-lindsay-orientation.trycloudflare.com",
    siteName: "Sentinel",
    images: [{ url: "/og/og-image.png", width: 1200, height: 630, alt: "Sentinel dashboard showing multi-vendor LLM incident response trace" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentinel · Autonomous Incident Response",
    description: "Multi-vendor LLM agent (Gemini + Claude) for production incident response. ~53s MTTR. Adversarial cross-vendor review.",
    images: ["/og/og-image.png"],
    creator: "@jackjin1997",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
