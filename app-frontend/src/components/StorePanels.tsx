'use client';

import { useRef, useState } from 'react';
import { get, postForm, query } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import { useAction } from '@/lib/use-action';
import { StatusBox } from './StatusBox';
import { Button, FieldLabel, Panel, TextArea, TextInput } from './ui';

export function StorePanels({ onStored }: { onStored: () => void }) {
  const write = useAction();
  const upload = useAction();
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [uploadKey, setUploadKey] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  async function writeText() {
    const done = await write.run(() => get<string>(`/s3/write?${query({ key, value })}`), (m) => m);
    if (done !== undefined) onStored();
  }

  async function uploadFile() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    if (uploadKey.trim()) form.append('key', uploadKey.trim());
    const done = await upload.run(
      () => postForm<{ key: string; size: number }>('/s3/upload', form),
      (d) => `Uploaded ${d.key} (${formatBytes(d.size)}).`,
    );
    if (!done) return;
    if (fileInput.current) fileInput.current.value = '';
    setUploadKey('');
    onStored();
  }

  return (
    <>
      <Panel title="Write a text file">
        <FieldLabel htmlFor="s3-key">Key</FieldLabel>
        <TextInput id="s3-key" value={key} placeholder="notes/hello.txt" onChange={(e) => setKey(e.target.value)} />
        <div className="mt-3">
          <FieldLabel htmlFor="s3-value">Contents</FieldLabel>
          <TextArea id="s3-value" value={value} placeholder="Hello from the demo" onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="mt-2">
          <Button disabled={write.busy || !key.trim()} onClick={writeText}>
            Write
          </Button>
        </div>
        <StatusBox status={write.status} />
      </Panel>

      <Panel title="Upload a file">
        <FieldLabel htmlFor="s3-file">File</FieldLabel>
        <input id="s3-file" ref={fileInput} type="file" className="text-sm" />
        <div className="mt-3">
          <FieldLabel htmlFor="s3-upload-key">Key (optional, defaults to the file name)</FieldLabel>
          <TextInput
            id="s3-upload-key"
            value={uploadKey}
            placeholder="uploads/picture.png"
            onChange={(e) => setUploadKey(e.target.value)}
          />
        </div>
        <div className="mt-2">
          <Button disabled={upload.busy} onClick={uploadFile}>
            Upload
          </Button>
        </div>
        <StatusBox status={upload.status} />
      </Panel>
    </>
  );
}
