import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack } from '@mantine/core';
import { IconChecklist } from '@tabler/icons-react';

export interface ApprovalNodeData {
  config: {
    approver_ids?: string[];
    approver_group_id?: string;
    approval_type?: string;
    wait_for_completion?: boolean;
  };
  onEdit?: () => void;
}

function summarize(config: ApprovalNodeData['config']): string {
  if (!config) return 'Not configured';
  const count = config.approver_ids?.length || 0;
  const type = config.approval_type || 'all';
  return `${count} approver${count !== 1 ? 's' : ''} (${type})`;
}

export function ApprovalNode({ data }: NodeProps<ApprovalNodeData>) {
  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #5f3dc4 0%, #7950f2 100%)',
        border: '2px solid #5f3dc4',
        minWidth: 200,
        cursor: data.onEdit ? 'pointer' : 'default',
        color: '#fff',
      }}
      onClick={data.onEdit}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: '#5f3dc4', width: 10, height: 10, border: '2px solid #fff' }} />

      <Stack gap={6} align="center">
        <IconChecklist size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">Approval</Text>
        <Badge color="white" variant="light" size="sm">{summarize(data.config)}</Badge>
        {data.config?.wait_for_completion && (
          <Badge color="yellow" variant="light" size="xs">Waits</Badge>
        )}
      </Stack>

      <Handle type="source" position={Position.Bottom}
        style={{ background: '#5f3dc4', width: 10, height: 10, border: '2px solid #fff' }} />
    </Paper>
  );
}
