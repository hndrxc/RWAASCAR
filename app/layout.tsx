import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const placeBold = localFont({
  src: "../public/fonts/Bold_web_0.ttf",
  variable: "--font-place-bold",
  display: "swap"
});

export const metadata: Metadata = {
  title: "RWAASCAR: A Better Live Race Site",
  description: "A live NASCAR leaderboard with fallback race data.",
  icons: {
    icon: "/trackicon.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={placeBold.variable}>{children}</body>
    </html>
  );
}
