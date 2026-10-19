import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team 5 · Smart Locker",
  description: "Y2 Robotics Club · locker.robotics.local - RFID Smart Locker Admin Console",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try { const saved = localStorage.getItem("theme"); document.documentElement.dataset.theme = saved === "light" ? "light" : "dark"; } catch { document.documentElement.dataset.theme = "dark"; }`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen selection:bg-neutral-800 selection:text-white dark:selection:bg-neutral-200 dark:selection:text-black">
        {children}
      </body>
    </html>
  );
}
