import type { Metadata } from 'next';
import { ConfigPanel } from '@/components/ConfigPanel';
import { DatabasePanels } from '@/components/DatabasePanels';
import { Code, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'PostgreSQL' };

export default function PostgresPage() {
  return (
    <>
      <PageHeader title="PostgreSQL">
        The backend connects with <Code>PG_CONNECTION_STRING</Code>.
      </PageHeader>
      <ConfigPanel
        path="/pg/config"
        notConfigured={<>Not configured. In the Linx Portal, map the backend&apos;s PG_CONNECTION_STRING to a PostgreSQL database&apos;s connection string.</>}
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
