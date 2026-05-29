import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, TextInput, Select, Table, Badge, Paper, Text, Loader, Box } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import api from '../../api/client';
import dayjs from 'dayjs';

const glassStyle = {
  background: 'var(--glass-bg)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--shadow-md)',
};

const TABLE_OPTIONS = [
  { value: '', label: 'All Tables' },
  { value: 'incidents', label: 'Incidents' },
  { value: 'changes', label: 'Changes' },
  { value: 'problems', label: 'Problems' },
  { value: 'cis', label: 'Configuration Items' },
  { value: 'users', label: 'Users' },
  { value: 'sc_requests', label: 'Catalog Requests' },
  { value: 'kb_articles', label: 'Knowledge Articles' },
  { value: 'workflow_rules', label: 'Workflows' },
  { value: 'releases', label: 'Releases' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'assets', label: 'Assets' },
];

const TABLE_COLORS: Record<string, string> = {
  incidents: 'red',
  changes: 'orange',
  problems: 'violet',
  cis: 'teal',
  users: 'blue',
  sc_requests: 'cyan',
  kb_articles: 'green',
  workflow_rules: 'indigo',
  releases: 'yellow',
  contracts: 'grape',
  assets: 'lime',
};

function truncateValue(value: string | null, maxLen = 60): string {
  if (!value) return '-';
  if (value.length <= maxLen) return value;
  return value.substring(0, maxLen) + '...';
}

export function AuditDashboard() {
  const [search, setSearch] = useState('');
  const [tableName, setTableName] = useState('');
  const [limit] = useState(50);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['audit-search', tableName, search],
    queryFn: () =>
      api.get('/audit/search', {
        params: {
          table_name: tableName || undefined,
          search: search || undefined,
          limit,
        },
      }).then(r => r.data),
    staleTime: 15_000,
  });

  return (
    <Stack className="fade-in">
      <Title order={2} className="page-title">Audit Trail</Title>

      {/* Filters */}
      <Paper p="md" radius="lg" style={glassStyle}>
        <Group gap="sm">
          <TextInput
            placeholder="Search field names, values..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by table"
            data={TABLE_OPTIONS}
            value={tableName}
            onChange={(v) => setTableName(v || '')}
            clearable
            searchable
            style={{ width: 220 }}
          />
        </Group>
      </Paper>

      {/* Results */}
      <Paper p="lg" radius="lg" style={glassStyle}>
        <Group justify="space-between" mb="md">
          <Title order={4}>
            Audit Records
            {results.length > 0 && (
              <Text span size="sm" c="dimmed" ml="sm">({results.length} results)</Text>
            )}
          </Title>
        </Group>

        {isLoading ? (
          <Box ta="center" py="xl">
            <Loader size="md" />
            <Text size="sm" c="dimmed" mt="sm">Loading audit records...</Text>
          </Box>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Table</Table.Th>
                  <Table.Th>Record ID</Table.Th>
                  <Table.Th>Field</Table.Th>
                  <Table.Th>Old Value</Table.Th>
                  <Table.Th>New Value</Table.Th>
                  <Table.Th>Changed By</Table.Th>
                  <Table.Th>Timestamp</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {results.map((entry: any) => (
                  <Table.Tr key={entry.id}>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={TABLE_COLORS[entry.table_name] || 'gray'}
                      >
                        {entry.table_name}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" ff="monospace" c="dimmed">
                        {entry.record_id ? entry.record_id.substring(0, 8) + '...' : '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{entry.field_name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="red" style={{ maxWidth: 200, wordBreak: 'break-word' }}>
                        {truncateValue(entry.old_value)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="green" style={{ maxWidth: 200, wordBreak: 'break-word' }}>
                        {truncateValue(entry.new_value)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{entry.changed_by_name || 'System'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{dayjs(entry.created_at).format('MMM D, YYYY')}</Text>
                      <Text size="xs" c="dimmed">{dayjs(entry.created_at).format('h:mm:ss A')}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {results.length === 0 && !isLoading && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text ta="center" py="xl" c="dimmed">
                        {search || tableName ? 'No audit records match your filters' : 'No audit records found'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}
