export interface Status {
  ok: boolean;
  message: string;
}

export function StatusBox({ status }: { status: Status | null }) {
  if (!status) return null;
  return (
    <div
      role={status.ok ? 'status' : 'alert'}
      className={[
        'mt-3 rounded-md border px-3 py-2 text-sm break-words whitespace-pre-wrap',
        status.ok ? 'border-ok bg-ok/10' : 'border-err bg-err/10',
      ].join(' ')}
    >
      {status.message}
    </div>
  );
}
