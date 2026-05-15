import { Table, Text, Group, UnstyledButton, Center, Skeleton, Box } from '@mantine/core';
import { IconChevronUp, IconChevronDown, IconSelector } from '@tabler/icons-react';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: number | string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

function SortIcon({ sorted, reversed }: { sorted: boolean; reversed: boolean }) {
  if (!sorted) return <IconSelector size={14} />;
  return reversed ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />;
}

export function DataTable<T extends Record<string, any>>({
  columns, data, loading, sortBy, sortOrder, onSort, onRowClick, emptyMessage = 'No records found'
}: Props<T>) {
  if (loading) {
    return (
      <Box>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={40} mb={8} />
        ))}
      </Box>
    );
  }

  return (
    <Table striped highlightOnHover withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          {columns.map((col) => (
            <Table.Th key={col.key} w={col.width}>
              {col.sortable && onSort ? (
                <UnstyledButton onClick={() => onSort(col.key)} style={{ width: '100%' }}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={600} size="sm">{col.label}</Text>
                    <SortIcon sorted={sortBy === col.key} reversed={sortOrder === 'desc'} />
                  </Group>
                </UnstyledButton>
              ) : (
                <Text fw={600} size="sm">{col.label}</Text>
              )}
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {data.length === 0 ? (
          <Table.Tr>
            <Table.Td colSpan={columns.length}>
              <Center py="xl">
                <Text c="dimmed">{emptyMessage}</Text>
              </Center>
            </Table.Td>
          </Table.Tr>
        ) : (
          data.map((row, i) => (
            <Table.Tr
              key={(row as any).id || i}
              style={{ cursor: onRowClick ? 'pointer' : undefined }}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <Table.Td key={col.key}>
                  {col.render ? col.render(row) : (row[col.key] ?? '-')}
                </Table.Td>
              ))}
            </Table.Tr>
          ))
        )}
      </Table.Tbody>
    </Table>
  );
}
