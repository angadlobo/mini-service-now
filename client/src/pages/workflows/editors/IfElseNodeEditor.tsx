import { useState, useEffect } from 'react';
import { Modal, Stack, Group, Button, TextInput, Select, Text, Paper, ActionIcon } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

export interface IfElseNodeConfig {
  condition?: { logic: string; conditions: any[] };
  then_actions?: any[];
  else_actions?: any[];
}

interface IfElseNodeEditorProps {
  opened: boolean;
  onClose: () => void;
  config: IfElseNodeConfig;
  onChange: (config: IfElseNodeConfig) => void;
  tableColumns?: { name: string; label: string }[];
}

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

export function IfElseNodeEditor({ opened, onClose, config, onChange, tableColumns }: IfElseNodeEditorProps) {
  const [logic, setLogic] = useState<string>(config.condition?.logic || 'AND');
  const [conditions, setConditions] = useState<any[]>(config.condition?.conditions || []);

  useEffect(() => {
    if (opened) {
      setLogic(config.condition?.logic || 'AND');
      setConditions(config.condition?.conditions || []);
    }
  }, [opened, config]);

  const columnOptions = (tableColumns || []).map((c) => ({ value: c.name, label: c.label }));

  const addCondition = () => {
    setConditions([...conditions, { field: '', operator: 'equals', value: '' }]);
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    onChange({
      condition: { logic, conditions },
      then_actions: config.then_actions || [],
      else_actions: config.else_actions || [],
    });
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Configure If/Else Branch" size="lg">
      <Stack>
        <Select
          label="Logic"
          data={[{ value: 'AND', label: 'ALL conditions must match (AND)' }, { value: 'OR', label: 'ANY condition must match (OR)' }]}
          value={logic}
          onChange={(v) => setLogic(v || 'AND')}
        />

        <Text size="sm" fw={600}>Conditions</Text>

        {conditions.map((cond, i) => (
          <Paper key={i} p="xs" withBorder radius="sm">
            <Group gap="xs" align="flex-end">
              <Select
                label="Field"
                data={columnOptions}
                value={cond.field || ''}
                onChange={(v) => updateCondition(i, 'field', v || '')}
                searchable
                style={{ flex: 1 }}
                size="xs"
              />
              <Select
                label="Operator"
                data={OPERATOR_OPTIONS}
                value={cond.operator || 'equals'}
                onChange={(v) => updateCondition(i, 'operator', v || 'equals')}
                style={{ flex: 1 }}
                size="xs"
              />
              <TextInput
                label="Value"
                value={cond.value || ''}
                onChange={(e) => updateCondition(i, 'value', e.currentTarget.value)}
                style={{ flex: 1 }}
                size="xs"
              />
              <ActionIcon color="red" variant="light" onClick={() => removeCondition(i)}>
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}

        <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addCondition}>
          Add Condition
        </Button>

        <Text size="xs" c="dimmed">
          The Then/Else branches are defined by connecting nodes to the green (Then) and red (Else) output handles.
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
