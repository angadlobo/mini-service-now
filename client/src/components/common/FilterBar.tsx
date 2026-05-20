import { Group, TextInput, Select, Button, Paper, Badge, CloseButton, Box } from '@mantine/core';
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
  const activeFilters = filters?.filter((f) => filterValues?.[f.key]) || [];

  return (
    <div>
      <Paper
        p="sm"
        px="md"
        mb={activeFilters.length > 0 ? 'xs' : 'md'}
        radius="lg"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Group>
          <TextInput
            placeholder="Search..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 300 }}
            radius="lg"
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
              radius="md"
            />
          ))}
          {onClear && (
            <Button variant="subtle" size="sm" leftSection={<IconX size={14} />} onClick={onClear}>
              Clear
            </Button>
          )}
        </Group>
      </Paper>

      {activeFilters.length > 0 && (
        <Group gap="xs" mb="md" ml="xs">
          {activeFilters.map((f) => {
            const selectedOption = f.options.find((o) => o.value === filterValues?.[f.key]);
            return (
              <Badge
                key={f.key}
                variant="light"
                size="lg"
                rightSection={
                  <CloseButton
                    size="xs"
                    variant="transparent"
                    onClick={() => onFilterChange?.(f.key, null)}
                  />
                }
              >
                {f.label}: {selectedOption?.label || filterValues?.[f.key]}
              </Badge>
            );
          })}
        </Group>
      )}
    </div>
  );
}
