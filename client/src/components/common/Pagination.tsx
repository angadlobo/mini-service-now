import { Group, Pagination as MantinePagination, Select, Text } from '@mantine/core';

interface Props {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({ page, totalPages, pageSize, total, onPageChange, onPageSizeChange }: Props) {
  return (
    <Group justify="space-between" mt="md">
      <Text size="sm" c="dimmed">
        Showing {Math.min((page - 1) * pageSize + 1, total)}-{Math.min(page * pageSize, total)} of {total}
      </Text>
      <Group>
        {onPageSizeChange && (
          <Select
            size="xs"
            w={80}
            value={String(pageSize)}
            onChange={(v) => onPageSizeChange(Number(v))}
            data={['10', '20', '50', '100']}
          />
        )}
        <MantinePagination value={page} onChange={onPageChange} total={totalPages} size="sm" />
      </Group>
    </Group>
  );
}
