import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waitlist",
  description: "Turn your idea into a waitlist page.",
  openGraph: {
    title: 'Waitlist',
    description: 'Turn your idea into a waitlist page.',
    url: 'https://waitlist.internalapplication.com',
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
        {children}
      </body>
    </html>
  )
}
