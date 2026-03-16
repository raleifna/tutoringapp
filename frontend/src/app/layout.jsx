import Providers from '../components/providers/Provider';
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: {
    default: 'TutorConnect - Find Your Perfect Tutor',
    template: '%s | TutorConnect',
  },
  description:
    'Connect with qualified tutors for personalized learning. Find expert tutors in any subject, book sessions online or in-person, and track your progress.',
  keywords: ['tutoring', 'online tutoring', 'find tutor', 'learning', 'education'],
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
