import { useState, useEffect } from 'react';
import { Modal, Stack, Group, Button, TextInput, Select, Textarea } from '@mantine/core';

export interface EscalateNodeConfig {
  escalation_type?: string;
  target?: string;
  reason?: string;
}

interface EscalateNodeEditorProps {
  opened: boolean;
  onClose: () => void;
  config: EscalateNodeConfig;
  onChange: (config: EscalateNodeConfig) => void;
}

const ESCALATION_TYPE_OPTIONS = [
  { value: 'manager', label: 'Escalate to Manager' },
  { value: 'group', label: 'Escalate to Group' },
  { value: 'user', label: 'Escalate to Specific User' },
];

export function EscalateNodeEditor({ opened, onClose, config, onChange }: EscalateNodeEditorProps) {
  const [escalationType, setEscalationType] = useState(config.escalation_type || 'manager');
  const [target, setTarget] = useState(config.target || '');
  const [reason, setReason] = useState(config.reason || '');

  useEffect(() => {
    if (opened) {
      setEscalationType(config.escalation_type || 'manager');
      setTarget(config.target || '');
      setReason(config.reason || '');
    }
  }, [opened, config]);

  const handleApply = () => {
    onChange({
      escalation_type: escalationType,
      target,
      reason,
    });
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Configure Escalation" size="md">
      <Stack>
        <Select
          label="Escalation Type"
          data={ESCALATION_TYPE_OPTIONS}
          value={escalationType}
          onChange={(v) => setEscalationType(v || 'manager')}
        />

        {escalationType !== 'manager' && (
          <TextInput
            label={escalationType === 'group' ? 'Group ID' : 'User ID'}
            placeholder={escalationType === 'group' ? 'Target group ID' : 'Target user ID'}
            value={target}
            onChange={(e) => setTarget(e.currentTarget.value)}
          />
        )}

        <Textarea
          label="Reason"
          placeholder="Reason for escalation (supports {{record.field}} templates)"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          minRows={2}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
