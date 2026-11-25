import type { Metadata } from 'next';
import Link from 'next/link';
import { NavLink } from '@/components/NavLink';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'My Billion Dollar App', template: '%s · My Billion Dollar App' },
  description: 'A Next.js frontend and a .NET backend, built, deployed and hosted by the Linx Portal.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-page font-sans text-ink antialiased">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-bar px-6 py-4 text-bar-ink shadow-card">
          <Link href="/" className="mr-4 text-lg font-bold">
            💰 My Billion Dollar App
          </Link>
          <NavLink href="/">Home</NavLink>
          <NavLink href="/postgres">PostgreSQL</NavLink>
          <NavLink href="/mssql">SQL Server</NavLink>
          <NavLink href="/s3">Object storage</NavLink>
        </nav>
        <main className="mx-auto max-w-[980px] px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
