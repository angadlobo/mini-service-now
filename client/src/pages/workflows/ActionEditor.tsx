import { useState } from 'react';
import {
  Modal, Stack, Group, Button, Select, TextInput, Textarea, Text,
} from '@mantine/core';

export interface Action {
  type: string;
  config: Record<string, unknown>;
}

interface ActionEditorProps {
  opened: boolean;
  onClose: () => void;
  action: Action;
  onChange: (action: Action) => void;
  tableColumns: { name: string; label: string }[];
}

const ACTION_TYPE_OPTIONS = [
  { value: 'set_field', label: 'Set Field' },
  { value: 'change_state', label: 'Change State' },
  { value: 'assign_to', label: 'Assign To User' },
  { value: 'assign_to_group', label: 'Assign To Group' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'create_journal_entry', label: 'Create Journal Entry' },
];

const JOURNAL_TYPE_OPTIONS = [
  { value: 'comment', label: 'Comment' },
  { value: 'work_note', label: 'Work Note' },
];

function ActionConfigFields({
  type,
  config,
  onConfigChange,
  tableColumns,
}: {
  type: string;
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
  tableColumns: { name: string; label: string }[];
}) {
  const columnOptions = tableColumns.map((col) => ({
    value: col.name,
    label: col.label,
  }));

  const updateField = (key: string, value: unknown) => {
    onConfigChange({ ...config, [key]: value });
  };

  switch (type) {
    case 'set_field':
      return (
        <>
          <Select
            label="Field"
            placeholder="Select field to set"
            data={columnOptions}
            value={(config.field as string) || ''}
            onChange={(v) => updateField('field', v || '')}
            searchable
          />
          <TextInput
            label="Value"
            placeholder="New value"
            value={(config.value as string) || ''}
            onChange={(e) => updateField('value', e.currentTarget.value)}
          />
        </>
      );

    case 'change_state':
      return (
        <TextInput
          label="State"
          placeholder="Target state value"
          value={(config.state as string) || ''}
          onChange={(e) => updateField('state', e.currentTarget.value)}
        />
      );

    case 'assign_to':
      return (
        <TextInput
          label="User ID"
          placeholder="User ID to assign to"
          value={(config.user_id as string) || ''}
          onChange={(e) => updateField('user_id', e.currentTarget.value)}
        />
      );

    case 'assign_to_group':
      return (
        <TextInput
          label="Group ID"
          placeholder="Group ID to assign to"
          value={(config.group_id as string) || ''}
          onChange={(e) => updateField('group_id', e.currentTarget.value)}
        />
      );

    case 'send_notification':
      return (
        <>
          <TextInput
            label="Title"
            placeholder="Notification title"
            value={(config.title as string) || ''}
            onChange={(e) => updateField('title', e.currentTarget.value)}
          />
          <Textarea
            label="Body"
            placeholder="Notification body"
            minRows={3}
            value={(config.body as string) || ''}
            onChange={(e) => updateField('body', e.currentTarget.value)}
          />
        </>
      );

    case 'create_journal_entry':
      return (
        <>
          <Select
            label="Journal Type"
            data={JOURNAL_TYPE_OPTIONS}
            value={(config.journal_type as string) || 'comment'}
            onChange={(v) => updateField('journal_type', v || 'comment')}
          />
          <Textarea
            label="Body"
            placeholder="Journal entry content"
            minRows={3}
            value={(config.body as string) || ''}
            onChange={(e) => updateField('body', e.currentTarget.value)}
          />
        </>
      );

    default:
      return (
        <Text size="sm" c="dimmed">
          Select an action type to configure it.
        </Text>
      );
  }
}

export function ActionEditor({
  opened,
  onClose,
  action,
  onChange,
  tableColumns,
}: ActionEditorProps) {
  const [draft, setDraft] = useState<Action>(
    () => structuredClone(action) || { type: '', config: {} },
  );

  const handleTypeChange = (newType: string | null) => {
    setDraft({ type: newType || '', config: {} });
  };

  const handleConfigChange = (config: Record<string, unknown>) => {
    setDraft((prev) => ({ ...prev, config }));
  };

  const handleApply = () => {
    onChange(draft);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit Action"
      size="md"
    >
      <Stack>
        <Select
          label="Action Type"
          placeholder="Select action type"
          data={ACTION_TYPE_OPTIONS}
          value={draft.type}
          onChange={handleTypeChange}
        />

        <ActionConfigFields
          type={draft.type}
          config={draft.config}
          onConfigChange={handleConfigChange}
          tableColumns={tableColumns}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!draft.type}>
            Apply
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
