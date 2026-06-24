import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Drivenode - Votazione',
  description: 'Vota le tue auto preferite agli eventi Drivenode',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-white">{children}</body>
    </html>
  );
}
