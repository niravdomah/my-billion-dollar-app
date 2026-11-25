import type { Metadata } from 'next';
import { ConfigPanel } from '@/components/ConfigPanel';
import { DatabasePanels } from '@/components/DatabasePanels';
import { Code, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'PostgreSQL' };

export default function PostgresPage() {
  return (
    <>
      <PageHeader title="PostgreSQL">
        The backend connects with <Code>PG_CONNECTION_STRING</Code>, or with <Code>PG_HOST</Code>,{' '}
        <Code>PG_NAME</Code>, <Code>PG_USER</Code> and <Code>PG_PASSWORD</Code>.
      </PageHeader>
      <ConfigPanel
        path="/pg/config"
        notConfigured={<>Not configured. In the Linx Portal, map the backend&apos;s PG_* variables to a database.</>}
      />
      <DatabasePanels
        engine="pg"
        tableName="portal_check"
        queryLabel="SQL query"
        placeholder="SELECT * FROM information_schema.tables LIMIT 10;"
      />
    </>
  );
}
