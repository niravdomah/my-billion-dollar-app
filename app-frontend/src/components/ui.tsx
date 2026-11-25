import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-5 rounded-xl border border-line bg-panel px-6 py-5 shadow-card">
      {title && <h2 className="mb-3 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function PageHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="mb-2 text-3xl font-bold">{title}</h1>
      <p className="text-muted">{children}</p>
    </header>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-page px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const colours = {
    primary: 'bg-accent text-accent-ink',
    secondary: 'bg-line text-ink',
    danger: 'bg-err/80 text-white',
  }[variant];
  return (
    <button
      type="button"
      className={[
        'cursor-pointer rounded-md px-4 py-2 text-sm font-semibold hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50',
        colours,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}

export function LinkButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="cursor-pointer text-accent hover:underline" {...props}>
      {children}
    </button>
  );
}

const fieldClasses =
  'w-full rounded-md border border-line bg-page px-3 py-2 font-mono text-sm text-ink placeholder:text-muted/60';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" className={fieldClasses} {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={['min-h-32 resize-y', fieldClasses].join(' ')} {...props} />;
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm text-muted">
      {children}
    </label>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function SetBadge({ set }: { set: boolean }) {
  return (
    <span
      className={[
        'inline-block rounded-full px-2 text-xs font-semibold',
        set ? 'bg-ok/20 text-ok' : 'bg-err/20 text-err',
      ].join(' ')}
    >
      {set ? 'set' : 'not set'}
    </span>
  );
}

export function ConfigList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {rows.map(([name, value]) => (
        <div key={name} className="contents">
          <dt className="text-muted">{name}</dt>
          <dd className="font-mono break-all">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
