import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ClubOS | Make your next move",
  description:
    "Discover student festivals, book your next challenge, and run your club in one place.",
  icons: { icon: "/favicon.svg", apple: "/icon-192.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ClubOS", statusBarStyle: "default" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
