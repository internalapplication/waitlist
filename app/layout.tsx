import type { Metadata, Viewport } from "next";
import { getAppUrl } from "@/lib/site";
import { Providers } from "./providers";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: getAppUrl(),
  title: "Waitlist",
  description: "Turn your idea into a waitlist page.",
  openGraph: {
    title: 'Waitlist',
    description: 'Turn your idea into a waitlist page.',
    url: getAppUrl().origin,
    siteName: 'Waitlist',
    images: [
      {
        url: '/OpenGraph.png', // Placed in your /public folder
        width: 1200,
        height: 630,
        alt: 'Waitlist Book Preview Image',
      },
    ],
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
