import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack,
  Title,
  Group,
  Button,
  TextInput,
  Select,
  Table,
  Badge,
  Pagination,
  Text,
  LoadingOverlay,
  Paper,
  Center,
} from '@mantine/core';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import { appEngineApi } from '../../api/app-engine.api';
import type { TableConfig, ColumnDefinition } from '@shared/interfaces';

export function DynamicList() {
  const { tableName } = useParams<{ tableName: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Fetch all registered tables to find the config for this tableName
  const { data: tables, isLoading: tablesLoading } = useQuery<TableConfig[]>({
    queryKey: ['registered-tables'],
    queryFn: () => appEngineApi.getRegisteredTables(),
  });

  const tableConfig = useMemo(
    () => tables?.find((t) => t.name === tableName),
    [tables, tableName],
  );

  const listColumns = useMemo(
    () => tableConfig?.columns.filter((c) => c.showInList) ?? [],
    [tableConfig],
  );

  const selectFilterColumns = useMemo(
    () => listColumns.filter((c) => c.type === 'select' && c.options?.length),
    [listColumns],
  );

  // Build query params including filters with non-empty values
  const activeFilters = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value) result[key] = value;
    }
    return result;
  }, [filters]);

  // Fetch records
  const {
    data: recordsResponse,
    isLoading: recordsLoading,
  } = useQuery({
    queryKey: ['dynamic-records', tableName, page, pageSize, search, sortBy, sortOrder, activeFilters],
    queryFn: () =>
      appEngineApi.listRecords(tableName!, {
        page,
        pageSize,
        search: search || undefined,
        sortBy,
        sortOrder,
        ...activeFilters,
      }),
    enabled: !!tableConfig,
  });

  const records: Record<string, unknown>[] = recordsResponse?.data ?? [];
  const totalPages: number = recordsResponse?.totalPages ?? 1;
  const total: number = recordsResponse?.total ?? 0;

  // --- Sorting ---
  const handleSort = (columnName: string) => {
    if (sortBy === columnName) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnName);
      setSortOrder('asc');
    }
  };

  // --- Cell rendering ---
  const renderCell = (record: Record<string, unknown>, col: ColumnDefinition) => {
    const value = record[col.name];

    switch (col.type) {
      case 'boolean':
        return (
          <Badge color={value ? 'green' : 'gray'} variant="light">
            {value ? 'Yes' : 'No'}
          </Badge>
        );

      case 'date':
        return value ? new Date(value as string).toLocaleDateString() : '-';

      case 'datetime':
        return value
          ? new Date(value as string).toLocaleString()
          : '-';

      case 'select': {
        const optionLabel = col.options?.find((o) => o.value === value)?.label;
        return value ? (
          <Badge variant="light">{optionLabel ?? String(value)}</Badge>
        ) : (
          '-'
        );
      }

      case 'reference': {
        const displayKey = `${col.name}_display`;
        const displayValue = record[displayKey];
        return displayValue ? String(displayValue) : value ? String(value) : '-';
      }

      case 'number':
        return value != null ? String(value) : '-';

      case 'string':
      case 'text':
      default:
        return value != null ? String(value) : '-';
    }
  };

  // --- Loading / not found ---
  if (tablesLoading) {
    return (
      <Paper pos="relative" mih={300}>
        <LoadingOverlay visible />
      </Paper>
    );
  }

  if (!tableConfig) {
    return (
      <Center mih={300}>
        <Text size="lg" c="dimmed">
          Table not found: {tableName}
        </Text>
      </Center>
    );
  }

  return (
    <Stack>
      {/* Header */}
      <Group justify="space-between">
        <Title order={2}>{tableConfig.label}</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => navigate(`/x/${tableName}/new`)}
        >
          New Record
        </Button>
      </Group>

      {/* Search + Filters */}
      <Group>
        <TextInput
          placeholder="Search..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
          style={{ flex: 1, maxWidth: 400 }}
        />
        {selectFilterColumns.map((col) => (
          <Select
            key={col.name}
            placeholder={col.label}
            data={col.options ?? []}
            value={filters[col.name] || null}
            onChange={(val) => {
              setFilters((prev) => ({ ...prev, [col.name]: val || '' }));
              setPage(1);
            }}
            clearable
            style={{ minWidth: 160 }}
          />
        ))}
      </Group>

      {/* Table */}
      <Paper pos="relative" withBorder>
        <LoadingOverlay visible={recordsLoading} />

        {records.length === 0 && !recordsLoading ? (
          <Center p="xl">
            <Text c="dimmed">No records found.</Text>
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {listColumns.map((col) => (
                  <Table.Th
                    key={col.name}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort(col.name)}
                  >
                    {col.label}
                    {sortBy === col.name && (sortOrder === 'asc' ? ' \u2191' : ' \u2193')}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {records.map((record) => (
                <Table.Tr
                  key={String(record.id)}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/x/${tableName}/${record.id}`)}
                >
                  {listColumns.map((col) => (
                    <Table.Td key={col.name}>{renderCell(record, col)}</Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {/* Pagination */}
      {total > 0 && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} records
          </Text>
          <Pagination
            value={page}
            onChange={setPage}
            total={totalPages}
          />
        </Group>
      )}
    </Stack>
  );
}
