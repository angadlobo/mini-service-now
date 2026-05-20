import { useState, useEffect } from 'react';
import { Modal, Stack, Group, Button, Select, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { workflowsApi } from '../../../api/common.api';

export interface SubWorkflowNodeConfig {
  target_workflow_id?: string;
  target_workflow_name?: string;
}

interface SubWorkflowNodeEditorProps {
  opened: boolean;
  onClose: () => void;
  config: SubWorkflowNodeConfig;
  onChange: (config: SubWorkflowNodeConfig) => void;
}

export function SubWorkflowNodeEditor({ opened, onClose, config, onChange }: SubWorkflowNodeEditorProps) {
  const [draft, setDraft] = useState<SubWorkflowNodeConfig>(() => ({ ...config }));

  useEffect(() => {
    if (opened) setDraft({ ...config });
  }, [opened, config]);

  const { data: workflows } = useQuery({
    queryKey: ['workflows-list-for-subworkflow'],
    queryFn: () => workflowsApi.list({ pageSize: 100 }),
    enabled: opened,
  });

  const workflowOptions = (workflows?.data || []).map((w: any) => ({
    value: w.id,
    label: `${w.name} (${w.table_name})`,
  }));

  const handleApply = () => {
    const selected = (workflows?.data || []).find((w: any) => w.id === draft.target_workflow_id);
    onChange({
      ...draft,
      target_workflow_name: selected?.name || draft.target_workflow_name,
    });
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Configure Sub-Workflow" size="md">
      <Stack>
        <Select
          label="Target Workflow"
          placeholder="Select a workflow to call"
          data={workflowOptions}
          value={draft.target_workflow_id || ''}
          onChange={(v) => setDraft({ ...draft, target_workflow_id: v || '' })}
          searchable
        />

        {!draft.target_workflow_id && (
          <Text size="sm" c="dimmed">
            Select a workflow to invoke when this node executes.
          </Text>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!draft.target_workflow_id}>Apply</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
