import { useState, useEffect } from 'react';
import { Modal, Stack, Group, Button, TextInput, Select, Text, Paper, ActionIcon } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

export interface SwitchNodeConfig {
  field?: string;
  cases?: Record<string, any[]>;
  default_actions?: any[];
}

interface SwitchNodeEditorProps {
  opened: boolean;
  onClose: () => void;
  config: SwitchNodeConfig;
  onChange: (config: SwitchNodeConfig) => void;
  tableColumns?: { name: string; label: string }[];
}

export function SwitchNodeEditor({ opened, onClose, config, onChange, tableColumns }: SwitchNodeEditorProps) {
  const [field, setField] = useState(config.field || '');
  const [caseValues, setCaseValues] = useState<string[]>(Object.keys(config.cases || {}));

  const columnOptions = (tableColumns || []).map((c) => ({ value: c.name, label: c.label }));

  useEffect(() => {
    if (opened) {
      setField(config.field || '');
      setCaseValues(Object.keys(config.cases || {}));
    }
  }, [opened, config]);

  const addCase = () => {
    setCaseValues([...caseValues, '']);
  };

  const updateCase = (index: number, value: string) => {
    const updated = [...caseValues];
    updated[index] = value;
    setCaseValues(updated);
  };

  const removeCase = (index: number) => {
    setCaseValues(caseValues.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    const cases: Record<string, any[]> = {};
    for (const val of caseValues) {
      if (val) cases[val] = (config.cases || {})[val] || [];
    }
    onChange({
      field,
      cases,
      default_actions: config.default_actions || [],
    });
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Configure Switch" size="md">
      <Stack>
        <Select
          label="Switch on Field"
          data={columnOptions}
          value={field}
          onChange={(v) => setField(v || '')}
          searchable
        />

        <Text size="sm" fw={600}>Case Values</Text>

        {caseValues.map((val, i) => (
          <Paper key={i} p="xs" withBorder radius="sm">
            <Group gap="xs">
              <TextInput
                placeholder="Case value"
                value={val}
                onChange={(e) => updateCase(i, e.currentTarget.value)}
                style={{ flex: 1 }}
                size="xs"
              />
              <ActionIcon color="red" variant="light" onClick={() => removeCase(i)}>
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}

        <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addCase}>
          Add Case
        </Button>

        <Text size="xs" c="dimmed">
          Connect downstream nodes to each case output handle on the Switch node.
          A default output is always available for unmatched values.
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
