import { useState, useEffect } from 'react';
import { Stack, Group, Select, TextInput, NumberInput, ActionIcon, Button, Text, Box } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

export interface ConditionField {
  /** The object key this field contributes to the conditions object. */
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  /** Display-only operator word shown between field and value, e.g. "is", "contains". */
  operatorLabel?: string;
  hint?: string;
}

interface Row { key: string; val: string }

interface ConditionBuilderProps {
  fields: ConditionField[];
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
  addLabel?: string;
  emptyLabel?: string;
}

/**
 * A friendly, no-JSON editor for a flat conditions object. Each row picks a field
 * and a value; the emitted object is `{ field.key: value }` merged across rows.
 * An empty builder emits `{}` (matches everything).
 */
export function ConditionBuilder({ fields, value, onChange, addLabel = 'Add condition', emptyLabel }: ConditionBuilderProps) {
  const [rows, setRows] = useState<Row[]>(() =>
    Object.entries(value || {}).map(([key, val]) => ({ key, val: String(val) }))
  );

  // Re-hydrate when the incoming value identity changes (e.g. switching records in edit mode).
  useEffect(() => {
    setRows(Object.entries(value || {}).map(([key, val]) => ({ key, val: String(val) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  const emit = (next: Row[]) => {
    setRows(next);
    const obj: Record<string, any> = {};
    next.forEach((r) => {
      if (!r.key || r.val === '') return;
      const f = fields.find((x) => x.key === r.key);
      obj[r.key] = f?.type === 'number' ? Number(r.val) : r.val;
    });
    onChange(obj);
  };

  const usedKeys = new Set(rows.map((r) => r.key));
  const available = (current: string) => fields.filter((f) => f.key === current || !usedKeys.has(f.key));
  const firstFree = fields.find((f) => !usedKeys.has(f.key));

  const fieldFor = (key: string) => fields.find((f) => f.key === key);

  return (
    <Stack gap="xs">
      {rows.length === 0 && (
        <Text size="xs" c="dimmed">{emptyLabel || 'No conditions — matches everything.'}</Text>
      )}
      {rows.map((row, i) => {
        const f = fieldFor(row.key);
        return (
          <Group key={i} gap="xs" wrap="nowrap" align="flex-start">
            <Select
              w={200}
              data={available(row.key).map((x) => ({ value: x.key, label: x.label }))}
              value={row.key}
              onChange={(v) => emit(rows.map((r, idx) => idx === i ? { key: v || '', val: '' } : r))}
              placeholder="Field"
            />
            <Box pt={7}><Text size="sm" c="dimmed" w={62} ta="center">{f?.operatorLabel || 'is'}</Text></Box>
            {f?.type === 'select' ? (
              <Select
                style={{ flex: 1 }}
                data={f.options || []}
                value={row.val}
                onChange={(v) => emit(rows.map((r, idx) => idx === i ? { ...r, val: v || '' } : r))}
                placeholder="Value"
                searchable
              />
            ) : f?.type === 'number' ? (
              <NumberInput
                style={{ flex: 1 }}
                value={row.val === '' ? '' : Number(row.val)}
                onChange={(v) => emit(rows.map((r, idx) => idx === i ? { ...r, val: String(v) } : r))}
                placeholder={f.placeholder || 'Value'}
              />
            ) : (
              <TextInput
                style={{ flex: 1 }}
                value={row.val}
                onChange={(e) => emit(rows.map((r, idx) => idx === i ? { ...r, val: e.currentTarget.value } : r))}
                placeholder={f?.placeholder || 'Value'}
              />
            )}
            <ActionIcon color="red" variant="subtle" mt={4} onClick={() => emit(rows.filter((_, idx) => idx !== i))}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        );
      })}
      {f_hint(rows, fieldFor)}
      <Group>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          disabled={!firstFree}
          onClick={() => firstFree && emit([...rows, { key: firstFree.key, val: '' }])}
        >
          {addLabel}
        </Button>
      </Group>
    </Stack>
  );
}

/** Show the hint for the most recently chosen field, if any. */
function f_hint(rows: Row[], fieldFor: (k: string) => ConditionField | undefined) {
  const last = rows[rows.length - 1];
  const hint = last ? fieldFor(last.key)?.hint : undefined;
  return hint ? <Text size="xs" c="dimmed">{hint}</Text> : null;
}
