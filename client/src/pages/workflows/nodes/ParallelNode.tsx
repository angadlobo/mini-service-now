import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack } from '@mantine/core';
import { IconLayoutColumns } from '@tabler/icons-react';

export interface ParallelNodeData {
  config: {
    branches?: any[][];
  };
  onEdit?: () => void;
}

export function ParallelNode({ data }: NodeProps<ParallelNodeData>) {
  const branchCount = data.config?.branches?.length || 0;

  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #2b8a3e 0%, #51cf66 100%)',
        border: '2px solid #2b8a3e',
        minWidth: 200,
        cursor: data.onEdit ? 'pointer' : 'default',
        color: '#fff',
      }}
      onClick={data.onEdit}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: '#2b8a3e', width: 10, height: 10, border: '2px solid #fff' }} />

      <Stack gap={6} align="center">
        <IconLayoutColumns size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">Parallel</Text>
        <Badge color="white" variant="light" size="sm">
          {branchCount} branch{branchCount !== 1 ? 'es' : ''}
        </Badge>
      </Stack>

      <Handle type="source" position={Position.Bottom}
        style={{ background: '#2b8a3e', width: 10, height: 10, border: '2px solid #fff' }} />
    </Paper>
  );
}
