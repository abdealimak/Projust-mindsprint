import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'Projust — Justice for Honest Builders',
  description: "Verify developers' understanding of their own projects with personalized courses, quizzes, and dynamic certificates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className="theme-light" suppressHydrationWarning>
      <head>
        {/* Same fonts as the landing page */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300..700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="bg-paper text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        {/* Vercel Web Analytics: cookieless page views; only active on Vercel */}
        <Analytics />
      </body>
    </html>
  );
}
