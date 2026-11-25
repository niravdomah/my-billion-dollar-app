'use client';

import { useState } from 'react';
import { downloadUrl, get, query } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/format';
import { useAction } from '@/lib/use-action';
import { ListTable, Td, TextPreview } from './ListTable';
import { StatusBox } from './StatusBox';
import { StorePanels } from './StorePanels';
import { Button, FieldLabel, LinkButton, Panel, Row, TextInput } from './ui';

interface StoredObject {
  key: string;
  size: number;
  lastModified: string;
}

export function ObjectStoragePanels() {
  const objects = useAction();
  const [prefix, setPrefix] = useState('');
  const [list, setList] = useState<StoredObject[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function refresh() {
    setPreview(null);
    const data = await objects.run(
      () => get<StoredObject[]>(`/s3/list?${query({ prefix })}`),
      (d) => `${d.length} object(s).`,
    );
    if (data) setList(data);
  }

  async function read(key: string) {
    const text = await objects.run(() => get<string>(`/s3/read?${query({ key })}`), () => `Read ${key}.`);
    if (text !== undefined) setPreview(text);
  }

  async function remove(key: string) {
    const done = await objects.run(() => get<string>(`/s3/delete?${query({ key })}`), (m) => m);
    if (done === undefined) return;
    setPreview(null);
    setList((current) => current?.filter((o) => o.key !== key) ?? null);
  }

  return (
    <>
      <Panel title="Objects">
        <FieldLabel htmlFor="s3-prefix">Prefix (optional)</FieldLabel>
        <Row>
          <div className="w-72 max-w-full">
            <TextInput id="s3-prefix" value={prefix} placeholder="notes/" onChange={(e) => setPrefix(e.target.value)} />
          </div>
          <Button disabled={objects.busy} onClick={refresh}>
            List objects
          </Button>
        </Row>
        <StatusBox status={objects.status} />
        {list && list.length > 0 && (
          <ListTable headers={['Key', 'Size', 'Modified', '']}>
            {list.map((o) => (
              <tr key={o.key}>
                <Td wide>{o.key}</Td>
                <Td>{formatBytes(o.size)}</Td>
                <Td>{formatDate(o.lastModified)}</Td>
                <Td>
                  <span className="flex gap-3">
                    <LinkButton onClick={() => read(o.key)}>Read</LinkButton>
                    <a className="text-accent hover:underline" href={downloadUrl('/s3/download', o.key)}>
                      Download
                    </a>
                    <LinkButton onClick={() => remove(o.key)}>Delete</LinkButton>
                  </span>
                </Td>
              </tr>
            ))}
          </ListTable>
        )}
        {preview !== null && <TextPreview text={preview} />}
      </Panel>

      <StorePanels basePath="/s3" keyLabel="Key" onStored={refresh} />
    </>
  );
}
