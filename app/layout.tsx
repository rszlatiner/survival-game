import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Desert Island Maths",
  description: "A classroom maths survival game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
