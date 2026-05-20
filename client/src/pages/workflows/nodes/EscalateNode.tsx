import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack } from '@mantine/core';
import { IconArrowBigUpLines } from '@tabler/icons-react';

export interface EscalateNodeData {
  config: {
    escalation_type?: string;
    target?: string;
    reason?: string;
  };
  onEdit?: () => void;
}

function summarize(config: EscalateNodeData['config']): string {
  if (!config?.escalation_type) return 'Not configured';
  return `${config.escalation_type}${config.target ? `: ${config.target.substring(0, 16)}` : ''}`;
}

export function EscalateNode({ data }: NodeProps<EscalateNodeData>) {
  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #c92a2a 0%, #fa5252 100%)',
        border: '2px solid #c92a2a',
        minWidth: 200,
        cursor: data.onEdit ? 'pointer' : 'default',
        color: '#fff',
      }}
      onClick={data.onEdit}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: '#c92a2a', width: 10, height: 10, border: '2px solid #fff' }} />

      <Stack gap={6} align="center">
        <IconArrowBigUpLines size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">Escalate</Text>
        <Badge color="white" variant="light" size="sm">{summarize(data.config)}</Badge>
      </Stack>

      <Handle type="source" position={Position.Bottom}
        style={{ background: '#c92a2a', width: 10, height: 10, border: '2px solid #fff' }} />
    </Paper>
  );
}
