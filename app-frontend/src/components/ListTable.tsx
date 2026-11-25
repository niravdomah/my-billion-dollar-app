import type { ReactNode } from 'react';

export function ListTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="mt-3 max-h-[420px] overflow-auto rounded-md">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="sticky top-0 border border-line bg-page px-2 py-1.5 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <td
      className={[
        'border border-line px-2 py-1.5 align-top',
        wide ? 'font-mono break-all' : 'whitespace-nowrap',
      ].join(' ')}
    >
      {children}
    </td>
  );
}

export function TextPreview({ text }: { text: string }) {
  return (
    <pre className="mt-3 max-h-72 overflow-auto rounded-md border border-line bg-page p-3 text-sm whitespace-pre-wrap">
      {text}
    </pre>
  );
}
