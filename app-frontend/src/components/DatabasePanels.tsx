'use client';

import { useState } from 'react';
import { get, postJson, query } from '@/lib/api';
import { describe, formatDate } from '@/lib/format';
import { useAction } from '@/lib/use-action';
import { DataTable } from './DataTable';
import { StatusBox } from './StatusBox';
import { Button, Code, FieldLabel, Panel, Row, TextArea, TextInput } from './ui';

interface Note {
  id: number;
  note: string;
  at: string;
}

interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
  recordsAffected: number;
}

interface Table {
  columns: string[];
  rows: unknown[][];
}

interface DatabasePanelsProps {
  engine: 'pg' | 'mssql';
  tableName: string;
  queryLabel: string;
  placeholder: string;
}

const notesTable = (notes: Note[]): Table => ({
  columns: ['id', 'note', 'at'],
  rows: notes.map((n) => [n.id, n.note, formatDate(n.at)]),
});

function querySummary(result: QueryResult): string {
  if (result.columns.length > 0) {
    return `${result.rowCount} row(s)${result.truncated ? ', showing the first 500' : ''}.`;
  }
  return result.recordsAffected >= 0 ? `Done. ${result.recordsAffected} row(s) affected.` : 'Done.';
}

export function DatabasePanels({ engine, tableName, queryLabel, placeholder }: DatabasePanelsProps) {
  const connection = useAction();
  const notes = useAction();
  const sqlQuery = useAction();
  const [note, setNote] = useState('');
  const [table, setTable] = useState<Table | null>(null);
  const [sql, setSql] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);

  async function showNotes() {
    const data = await notes.run(() => get<Note[]>(`/${engine}/db/read`), (d) => `${d.length} note(s).`);
    if (data) setTable(notesTable(data));
  }

  async function addNote() {
    const added = await notes.run(
      () => get<{ id: number }>(`/${engine}/db/write?${query({ note })}`),
      (d) => `Added note ${d.id}.`,
    );
    if (!added) return;
    setNote('');
    const all = await get<Note[]>(`/${engine}/db/read`);
    if (all.ok) setTable(notesTable(all.data));
  }

  async function simple(path: string) {
    setTable(null);
    await notes.run(() => get<string>(`/${engine}/db/${path}`), (message) => message);
  }

  async function runQuery() {
    setResult(null);
    const data = await sqlQuery.run(() => postJson<QueryResult>(`/${engine}/query`, { sql }), querySummary);
    if (data) setResult(data);
  }

  return (
    <>
      <Panel title="Connection">
        <Row>
          <Button
            disabled={connection.busy}
            onClick={() => connection.run(() => get<object>(`/${engine}/db`), describe)}
          >
            Test connection
          </Button>
          <span className="text-sm text-muted">Connects and reports the database, login and server version.</span>
        </Row>
        <StatusBox status={connection.status} />
      </Panel>

      <Panel title="Notes">
        <p className="mb-3 text-sm text-muted">
          Fixed actions on a <Code>{tableName}</Code> table: create it, add notes, read them back.
        </p>
        <Row>
          <Button variant="secondary" disabled={notes.busy} onClick={() => simple('create')}>
            Create table
          </Button>
          <Button variant="secondary" disabled={notes.busy} onClick={showNotes}>
            Show notes
          </Button>
          <Button variant="danger" disabled={notes.busy} onClick={() => simple('drop')}>
            Drop table
          </Button>
        </Row>
        <div className="mt-3">
          <FieldLabel htmlFor={`${engine}-note`}>Note</FieldLabel>
          <Row>
            <div className="min-w-0 flex-1">
              <TextInput
                id={`${engine}-note`}
                value={note}
                maxLength={200}
                placeholder="A billion-dollar idea"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button disabled={notes.busy || !note.trim()} onClick={addNote}>
              Add note
            </Button>
          </Row>
        </div>
        <StatusBox status={notes.status} />
        {table && <DataTable columns={table.columns} rows={table.rows} />}
      </Panel>

      <Panel title={queryLabel}>
        <FieldLabel htmlFor={`${engine}-sql`}>Any SQL, run as the configured login</FieldLabel>
        <TextArea id={`${engine}-sql`} value={sql} placeholder={placeholder} onChange={(e) => setSql(e.target.value)} />
        <div className="mt-2">
          <Button disabled={sqlQuery.busy || !sql.trim()} onClick={runQuery}>
            Run query
          </Button>
        </div>
        <StatusBox status={sqlQuery.status} />
        {result && result.columns.length > 0 && <DataTable columns={result.columns} rows={result.rows} />}
      </Panel>
    </>
  );
}
