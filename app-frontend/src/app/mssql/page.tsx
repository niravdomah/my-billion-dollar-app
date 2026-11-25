import type { Metadata } from 'next';
import { ConfigPanel } from '@/components/ConfigPanel';
import { DatabasePanels } from '@/components/DatabasePanels';
import { Code, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'SQL Server' };

export default function SqlServerPage() {
  return (
    <>
      <PageHeader title="SQL Server">
        The backend connects with <Code>MSSQL_CONNECTION_STRING</Code>.
      </PageHeader>
      <ConfigPanel
        path="/mssql/config"
        notConfigured={<>Not configured. In the Linx Portal, map the backend&apos;s MSSQL_CONNECTION_STRING to a SQL Server database&apos;s connection string.</>}
      />
      <DatabasePanels
        engine="mssql"
        tableName="dbo.portal_check"
        queryLabel="T-SQL query"
        placeholder="SELECT TOP 10 * FROM INFORMATION_SCHEMA.TABLES;"
      />
    </>
  );
}
