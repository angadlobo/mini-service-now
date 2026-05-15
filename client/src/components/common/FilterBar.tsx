import { Group, TextInput, Select, Button } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';

interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  filters?: FilterOption[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string | null) => void;
  onClear?: () => void;
}

export function FilterBar({ search, onSearchChange, filters, filterValues, onFilterChange, onClear }: Props) {
  return (
    <Group mb="md">
      <TextInput
        placeholder="Search..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        style={{ flex: 1, maxWidth: 300 }}
      />
      {filters?.map((f) => (
        <Select
          key={f.key}
          placeholder={f.label}
          data={f.options}
          value={filterValues?.[f.key] || null}
          onChange={(v) => onFilterChange?.(f.key, v)}
          clearable
          size="sm"
          w={160}
        />
      ))}
      {onClear && (
        <Button variant="subtle" size="sm" leftSection={<IconX size={14} />} onClick={onClear}>
          Clear
        </Button>
      )}
    </Group>
  );
}
