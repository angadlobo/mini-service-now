import { useState, useEffect } from 'react';
import { Modal, Stack, Group, Button, TextInput, Select, Switch, TagsInput } from '@mantine/core';

export interface ApprovalNodeConfig {
  approver_ids?: string[];
  approver_group_id?: string;
  approval_type?: string;
  wait_for_completion?: boolean;
}

interface ApprovalNodeEditorProps {
  opened: boolean;
  onClose: () => void;
  config: ApprovalNodeConfig;
  onChange: (config: ApprovalNodeConfig) => void;
}

const APPROVAL_TYPE_OPTIONS = [
  { value: 'all', label: 'All must approve' },
  { value: 'any', label: 'Any one can approve' },
];

export function ApprovalNodeEditor({ opened, onClose, config, onChange }: ApprovalNodeEditorProps) {
  const [approverIds, setApproverIds] = useState<string[]>(config.approver_ids || []);
  const [approverGroupId, setApproverGroupId] = useState(config.approver_group_id || '');
  const [approvalType, setApprovalType] = useState(config.approval_type || 'all');
  const [waitForCompletion, setWaitForCompletion] = useState(config.wait_for_completion ?? true);

  useEffect(() => {
    if (opened) {
      setApproverIds(config.approver_ids || []);
      setApproverGroupId(config.approver_group_id || '');
      setApprovalType(config.approval_type || 'all');
      setWaitForCompletion(config.wait_for_completion ?? true);
    }
  }, [opened, config]);

  const handleApply = () => {
    onChange({
      approver_ids: approverIds,
      approver_group_id: approverGroupId,
      approval_type: approvalType,
      wait_for_completion: waitForCompletion,
    });
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Configure Approval" size="md">
      <Stack>
        <TagsInput
          label="Approver User IDs"
          placeholder="Enter user ID and press Enter"
          value={approverIds}
          onChange={setApproverIds}
        />

        <TextInput
          label="Approver Group ID"
          placeholder="Optional group ID"
          value={approverGroupId}
          onChange={(e) => setApproverGroupId(e.currentTarget.value)}
        />

        <Select
          label="Approval Type"
          data={APPROVAL_TYPE_OPTIONS}
          value={approvalType}
          onChange={(v) => setApprovalType(v || 'all')}
        />

        <Switch
          label="Wait for completion (pause workflow until decided)"
          checked={waitForCompletion}
          onChange={(e) => setWaitForCompletion(e.currentTarget.checked)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
