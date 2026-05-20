import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack } from '@mantine/core';
import { IconGitBranch } from '@tabler/icons-react';

export interface SubWorkflowNodeData {
  config: {
    target_workflow_id?: string;
    target_workflow_name?: string;
  };
  onEdit?: () => void;
}

export function SubWorkflowNode({ data }: NodeProps<SubWorkflowNodeData>) {
  const config = data.config || {};
  const label = config.target_workflow_name || 'No workflow selected';

  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #0c8599 0%, #15aabf 100%)',
        border: '2px solid #0b7285',
        minWidth: 200,
        cursor: data.onEdit ? 'pointer' : 'default',
        color: '#fff',
      }}
      onClick={data.onEdit}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#0b7285',
          width: 10,
          height: 10,
          border: '2px solid #fff',
        }}
      />

      <Stack gap={6} align="center">
        <IconGitBranch size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">
          Sub-Workflow
        </Text>
        <Badge color="white" variant="light" size="sm">
          {label}
        </Badge>
      </Stack>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#0b7285',
          width: 10,
          height: 10,
          border: '2px solid #fff',
        }}
      />
    </Paper>
  );
}
