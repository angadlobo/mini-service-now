import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';

export interface DelayNodeData {
  config: {
    duration_minutes?: number;
    duration_unit?: string; // minutes, hours, days
    duration_value?: number;
  };
  onEdit?: () => void;
}

function formatDuration(config: DelayNodeData['config']): string {
  if (!config) return 'Not configured';
  const unit = config.duration_unit || 'minutes';
  const value = config.duration_value || config.duration_minutes || 0;
  if (!value) return 'Not configured';
  return `Wait ${value} ${unit}`;
}

export function DelayNode({ data }: NodeProps<DelayNodeData>) {
  const label = formatDuration(data.config);

  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #e8590c 0%, #fd7e14 100%)',
        border: '2px solid #d9480f',
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
          background: '#d9480f',
          width: 10,
          height: 10,
          border: '2px solid #fff',
        }}
      />

      <Stack gap={6} align="center">
        <IconClock size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">
          Delay
        </Text>
        <Badge color="white" variant="light" size="sm">
          {label}
        </Badge>
      </Stack>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#d9480f',
          width: 10,
          height: 10,
          border: '2px solid #fff',
        }}
      />
    </Paper>
  );
}
