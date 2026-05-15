import { useState } from 'react';
import {
  Modal, Stack, Group, Button, Select, TextInput, SegmentedControl,
  ActionIcon, Paper, Text, Divider,
} from '@mantine/core';
import { IconTrash, IconPlus, IconFolderPlus } from '@tabler/icons-react';

export interface SimpleCondition {
  field: string;
  operator: string;
  value: string;
}

export interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: Array<SimpleCondition | ConditionGroup>;
}

interface ConditionEditorProps {
  opened: boolean;
  onClose: () => void;
  condition: ConditionGroup;
  onChange: (condition: ConditionGroup) => void;
  tableColumns: { name: string; label: string }[];
}

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'contains', label: 'Contains' },
  { value: 'in', label: 'In' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
  { value: 'regex', label: 'Regex' },
];

function isConditionGroup(c: SimpleCondition | ConditionGroup): c is ConditionGroup {
  return 'logic' in c && 'conditions' in c && Array.isArray((c as ConditionGroup).conditions);
}

function ConditionGroupEditor({
  group,
  onUpdate,
  tableColumns,
  depth = 0,
}: {
  group: ConditionGroup;
  onUpdate: (group: ConditionGroup) => void;
  tableColumns: { name: string; label: string }[];
  depth?: number;
}) {
  const columnOptions = tableColumns.map((col) => ({
    value: col.name,
    label: col.label,
  }));

  const updateConditionAt = (index: number, updated: SimpleCondition | ConditionGroup) => {
    const newConditions = [...group.conditions];
    newConditions[index] = updated;
    onUpdate({ ...group, conditions: newConditions });
  };

  const removeConditionAt = (index: number) => {
    const newConditions = group.conditions.filter((_, i) => i !== index);
    onUpdate({ ...group, conditions: newConditions });
  };

  const addCondition = () => {
    onUpdate({
      ...group,
      conditions: [...group.conditions, { field: '', operator: 'equals', value: '' }],
    });
  };

  const addSubGroup = () => {
    onUpdate({
      ...group,
      conditions: [
        ...group.conditions,
        { logic: 'AND', conditions: [{ field: '', operator: 'equals', value: '' }] },
      ],
    });
  };

  return (
    <Paper
      p="sm"
      radius="sm"
      withBorder
      style={{
        marginLeft: depth * 16,
        borderColor: depth > 0 ? '#dee2e6' : undefined,
        backgroundColor: depth % 2 === 0 ? '#f8f9fa' : '#fff',
      }}
    >
      <Group gap="sm" mb="xs">
        <Text size="sm" fw={600}>Match</Text>
        <SegmentedControl
          size="xs"
          value={group.logic}
          onChange={(v) => onUpdate({ ...group, logic: v as 'AND' | 'OR' })}
          data={[
            { value: 'AND', label: 'AND' },
            { value: 'OR', label: 'OR' },
          ]}
        />
        <Text size="sm" fw={600}>of the following:</Text>
      </Group>

      <Stack gap="xs">
        {group.conditions.map((cond, index) => {
          if (isConditionGroup(cond)) {
            return (
              <Group key={index} align="flex-start" gap="xs" wrap="nowrap">
                <div style={{ flex: 1 }}>
                  <ConditionGroupEditor
                    group={cond}
                    onUpdate={(updated) => updateConditionAt(index, updated)}
                    tableColumns={tableColumns}
                    depth={depth + 1}
                  />
                </div>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  mt={4}
                  onClick={() => removeConditionAt(index)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            );
          }

          const simple = cond as SimpleCondition;
          const hideValue = simple.operator === 'is_empty' || simple.operator === 'is_not_empty';

          return (
            <Group key={index} gap="xs" align="flex-end" wrap="nowrap">
              <Select
                size="xs"
                placeholder="Field"
                data={columnOptions}
                value={simple.field}
                onChange={(v) =>
                  updateConditionAt(index, { ...simple, field: v || '' })
                }
                style={{ flex: 1 }}
                searchable
              />
              <Select
                size="xs"
                placeholder="Operator"
                data={OPERATOR_OPTIONS}
                value={simple.operator}
                onChange={(v) =>
                  updateConditionAt(index, { ...simple, operator: v || 'equals' })
                }
                style={{ flex: 1 }}
              />
              {!hideValue && (
                <TextInput
                  size="xs"
                  placeholder="Value"
                  value={simple.value}
                  onChange={(e) =>
                    updateConditionAt(index, { ...simple, value: e.currentTarget.value })
                  }
                  style={{ flex: 1 }}
                />
              )}
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => removeConditionAt(index)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          );
        })}
      </Stack>

      <Divider my="xs" />

      <Group gap="xs">
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={addCondition}
        >
          Add Condition
        </Button>
        <Button
          size="xs"
          variant="light"
          color="grape"
          leftSection={<IconFolderPlus size={14} />}
          onClick={addSubGroup}
        >
          Add Sub-Group
        </Button>
      </Group>
    </Paper>
  );
}

export function ConditionEditor({
  opened,
  onClose,
  condition,
  onChange,
  tableColumns,
}: ConditionEditorProps) {
  const [draft, setDraft] = useState<ConditionGroup>(
    () => structuredClone(condition) || { logic: 'AND' as const, conditions: [] },
  );

  // Reset draft when modal opens with new condition
  const handleOpen = () => {
    setDraft(structuredClone(condition) || { logic: 'AND', conditions: [] });
  };

  const handleApply = () => {
    onChange(draft);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit Conditions"
      size="xl"
    >
      <Stack>
        <ConditionGroupEditor
          group={draft}
          onUpdate={setDraft}
          tableColumns={tableColumns}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
