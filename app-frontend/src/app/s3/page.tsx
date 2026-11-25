import type { Metadata } from 'next';
import { ConfigPanel } from '@/components/ConfigPanel';
import { ObjectStoragePanels } from '@/components/ObjectStoragePanels';
import { Code, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Object storage' };

export default function ObjectStoragePage() {
  return (
    <>
      <PageHeader title="Object storage">
        The backend reaches its bucket with <Code>S3_ENDPOINT_URL</Code>, <Code>S3_BUCKET_NAME</Code>,{' '}
        <Code>S3_ACCESS_KEY</Code> and <Code>S3_SECRET_KEY</Code>.
      </PageHeader>
      <ConfigPanel
        path="/s3/config"
        notConfigured={<>Not configured. In the Linx Portal, map the backend&apos;s S3_* variables to a bucket.</>}
      />
      <ObjectStoragePanels />
    </>
  );
}
