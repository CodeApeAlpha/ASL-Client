import type { Metadata } from "next";

import "@/ui/tailwind.css";

export const metadata: Metadata = {
  title: "SignBridge — ASL ↔ English Translation",
  description: "Two-way ASL sign language and English translation powered by AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full w-full">
      <body className="bg-neutral-950 antialiased h-full w-full font-sans">
        {children}
      </body>
    </html>
  );
}
