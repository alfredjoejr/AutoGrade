import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'AutoGrade',
  description: 'An AI-powered MCQ grading interface with setup, moderation, and analytics views.',
  openGraph: {
    title: 'AutoGrade',
    description: 'An AI-powered MCQ grading interface with setup, moderation, and analytics views.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AutoGrade',
    description: 'An AI-powered MCQ grading interface with setup, moderation, and analytics views.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
