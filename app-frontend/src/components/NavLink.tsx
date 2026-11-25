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
        'font-semibold hover:underline',
        active ? 'text-ink underline' : 'text-accent',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}
