'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'font-semibold underline-offset-4 hover:underline',
        active ? 'text-bar-ink underline' : 'text-bar-ink/70 hover:text-bar-ink',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}
