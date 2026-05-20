import { Table, Text, Group, UnstyledButton, Center, Skeleton, Box, Paper, Stack } from '@mantine/core';
import { IconChevronUp, IconChevronDown, IconSelector, IconDatabaseOff } from '@tabler/icons-react';

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
  density?: 'compact' | 'default' | 'relaxed';
}

function SortIcon({ sorted, reversed }: { sorted: boolean; reversed: boolean }) {
  if (!sorted) return <IconSelector size={14} />;
  return reversed ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />;
}

const DENSITY_MAP = {
  compact: { py: 4, fontSize: '0.82rem' },
  default: { py: 8, fontSize: '0.875rem' },
  relaxed: { py: 14, fontSize: '0.95rem' },
};

const SKELETON_WIDTHS = [60, 45, 70, 55, 80, 50, 65];

export function DataTable<T extends Record<string, any>>({
  columns, data, loading, sortBy, sortOrder, onSort, onRowClick,
  emptyMessage = 'No records found', density = 'default',
}: Props<T>) {
  const densityStyle = DENSITY_MAP[density];

  if (loading) {
    return (
      <Paper
        radius={16}
        className="glass-table"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        <Table>
          <Table.Thead>
            <Table.Tr>
              {columns.map((col) => (
                <Table.Th key={col.key} w={col.width}>
                  <Skeleton height={14} width={`${SKELETON_WIDTHS[columns.indexOf(col) % SKELETON_WIDTHS.length]}%`} radius="sm" />
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {[...Array(7)].map((_, i) => (
              <Table.Tr key={i} style={{ borderBottom: '1px solid var(--msn-border-subtle)' }}>
                {columns.map((col, j) => (
                  <Table.Td key={col.key} style={{ padding: `${densityStyle.py}px 12px` }}>
                    <Skeleton
                      height={14}
                      width={`${SKELETON_WIDTHS[(i + j) % SKELETON_WIDTHS.length]}%`}
                      radius="sm"
                    />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    );
  }

  return (
    <Paper
      radius={16}
      className="glass-table"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            {columns.map((col) => (
              <Table.Th key={col.key} w={col.width}>
                {col.sortable && onSort ? (
                  <UnstyledButton onClick={() => onSort(col.key)} style={{ width: '100%' }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text fw={700} size="xs" tt="uppercase" style={{ letterSpacing: '0.04em' }}>{col.label}</Text>
                      <SortIcon sorted={sortBy === col.key} reversed={sortOrder === 'desc'} />
                    </Group>
                  </UnstyledButton>
                ) : (
                  <Text fw={700} size="xs" tt="uppercase" style={{ letterSpacing: '0.04em' }}>{col.label}</Text>
                )}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody className="fade-in-stagger">
          {data.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={columns.length}>
                <Center py={48}>
                  <Stack align="center" gap={8}>
                    <IconDatabaseOff size={56} style={{ opacity: 0.15 }} />
                    <Text fw={500} size="sm">No records found</Text>
                    <Text c="dimmed" size="xs">Try adjusting your filters or search criteria</Text>
                  </Stack>
                </Center>
              </Table.Td>
            </Table.Tr>
          ) : (
            data.map((row, i) => (
              <Table.Tr
                key={(row as any).id || i}
                style={{
                  cursor: onRowClick ? 'pointer' : undefined,
                  borderBottom: '1px solid var(--msn-border-subtle)',
                }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <Table.Td key={col.key} style={{ padding: `${densityStyle.py}px 12px`, fontSize: densityStyle.fontSize }}>
                    {col.render ? col.render(row) : (row[col.key] ?? '-')}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
