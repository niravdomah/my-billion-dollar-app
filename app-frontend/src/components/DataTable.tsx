import { ListTable } from './ListTable';

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function DataTable({ columns, rows }: { columns: string[]; rows: unknown[][] }) {
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-muted">No rows.</p>;
  }
  return (
    <ListTable headers={columns}>
      {rows.map((row, r) => (
        <tr key={r}>
          {row.map((value, c) => (
            <td key={c} className="border border-line px-2 py-1.5 align-top">
              {cell(value)}
            </td>
          ))}
        </tr>
      ))}
    </ListTable>
  );
}
