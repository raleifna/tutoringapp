// src/app/layout.jsx - Root Layout
import Providers from '../components/providers/Provider';
import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: {
    default: 'TutorConnect - Find Your Perfect Tutor',
    template: '%s | TutorConnect',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  description:
    'Connect with qualified tutors for personalized learning. Find expert tutors in any subject, book sessions online or in-person, and track your progress.',
  keywords: ['tutoring', 'online tutoring', 'find tutor', 'learning', 'education'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TutorConnect',
  },
  openGraph: {
    type: 'website',
    siteName: 'TutorConnect',
    title: 'TutorConnect - Find Your Perfect Tutor',
    description: 'Connect with qualified tutors for personalized learning.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen">
        <Providers>
          {children}

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: '10px', background: '#fff', color: '#111827' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
