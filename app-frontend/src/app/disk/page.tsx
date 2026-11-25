import type { Metadata } from 'next';
import { ConfigPanel } from '@/components/ConfigPanel';
import { DiskPanels } from '@/components/DiskPanels';
import { Code, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Disk' };

export default function DiskPage() {
  return (
    <>
      <PageHeader title="Disk">
        The backend works in the folder at <Code>DISK_PATH</Code>, where the persistent disk is mounted. Every file
        operation stays inside it.
      </PageHeader>
      <ConfigPanel
        path="/disk/config"
        notConfigured={<>Not configured. In the Linx Portal, mount a disk on the backend and set DISK_PATH to its path.</>}
      />
      <DiskPanels />
    </>
  );
}
