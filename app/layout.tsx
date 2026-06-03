import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClaimAudio Evidence Studio",
  description: "Turn recorded statements into timestamped claim evidence in minutes."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
