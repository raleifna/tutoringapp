import './globals.css';

export const metadata = {
  title: 'TutorConnect',
  description: 'TutorConnect project workspace.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
