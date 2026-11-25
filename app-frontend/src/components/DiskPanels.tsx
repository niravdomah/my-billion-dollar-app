'use client';

import { useState } from 'react';
import { downloadUrl, get, query } from '@/lib/api';
import { describe, formatBytes, formatDate } from '@/lib/format';
import { useAction } from '@/lib/use-action';
import { ListTable, Td, TextPreview } from './ListTable';
import { StatusBox } from './StatusBox';
import { StorePanels } from './StorePanels';
import { Button, FieldLabel, LinkButton, Panel, Row, TextInput } from './ui';

interface Entry {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size: number | null;
  modified: string;
}

interface Capacity {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
}

const parentOf = (path: string) => path.split('/').slice(0, -1).join('/');

export function DiskPanels() {
  const health = useAction();
  const capacity = useAction();
  const files = useAction();
  const [folder, setFolder] = useState('');
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function open(path: string) {
    setFolder(path);
    setPreview(null);
    const data = await files.run(
      () => get<Entry[]>(`/disk/list?${query({ path })}`),
      (d) => `${d.length} item(s) in /${path}.`,
    );
    if (data) setEntries(data);
  }

  async function read(path: string) {
    const text = await files.run(() => get<string>(`/disk/read?${query({ key: path })}`), () => `Read ${path}.`);
    if (text !== undefined) setPreview(text);
  }

  async function remove(path: string) {
    const done = await files.run(() => get<string>(`/disk/delete?${query({ key: path })}`), (m) => m);
    if (done === undefined) return;
    setPreview(null);
    setEntries((current) => current?.filter((e) => e.path !== path) ?? null);
  }

  return (
    <>
      <Panel title="Health check">
        <Row>
          <Button disabled={health.busy} onClick={() => health.run(() => get<object>('/disk/health'), describe)}>
            Run health check
          </Button>
          <span className="text-sm text-muted">Writes a file, reads it back, checks it and deletes it.</span>
        </Row>
        <StatusBox status={health.status} />
      </Panel>

      <Panel title="Capacity">
        <Row>
          <Button
            disabled={capacity.busy}
            onClick={() =>
              capacity.run(
                () => get<Capacity>('/disk/stats'),
                (c) =>
                  `Total: ${formatBytes(c.totalBytes)}\nUsed: ${formatBytes(c.usedBytes)}\nFree: ${formatBytes(c.freeBytes)}`,
              )
            }
          >
            Check capacity
          </Button>
          <span className="text-sm text-muted">Total, used and free space on the disk.</span>
        </Row>
        <StatusBox status={capacity.status} />
      </Panel>

      <Panel title="Files">
        <FieldLabel htmlFor="disk-folder">Folder (optional)</FieldLabel>
        <Row>
          <div className="w-72 max-w-full">
            <TextInput id="disk-folder" value={folder} placeholder="notes" onChange={(e) => setFolder(e.target.value)} />
          </div>
          <Button disabled={files.busy} onClick={() => open(folder)}>
            List files
          </Button>
          {folder && (
            <Button variant="secondary" disabled={files.busy} onClick={() => open(parentOf(folder))}>
              Up
            </Button>
          )}
        </Row>
        <StatusBox status={files.status} />
        {entries && entries.length > 0 && (
          <ListTable headers={['Name', 'Size', 'Modified', '']}>
            {entries.map((e) => (
              <tr key={e.path}>
                <Td wide>{e.type === 'folder' ? `${e.name}/` : e.name}</Td>
                <Td>{formatBytes(e.size)}</Td>
                <Td>{formatDate(e.modified)}</Td>
                <Td>
                  <span className="flex gap-3">
                    {e.type === 'folder' ? (
                      <LinkButton onClick={() => open(e.path)}>Open</LinkButton>
                    ) : (
                      <>
                        <LinkButton onClick={() => read(e.path)}>Read</LinkButton>
                        <a className="text-accent hover:underline" href={downloadUrl('/disk/download', e.path)}>
                          Download
                        </a>
                      </>
                    )}
                    <LinkButton onClick={() => remove(e.path)}>Delete</LinkButton>
                  </span>
                </Td>
              </tr>
            ))}
          </ListTable>
        )}
        {preview !== null && <TextPreview text={preview} />}
      </Panel>

      <StorePanels basePath="/disk" keyLabel="File name" onStored={() => open(folder)} />
    </>
  );
}
