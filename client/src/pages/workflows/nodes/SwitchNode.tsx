import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack } from '@mantine/core';
import { IconSwitchHorizontal } from '@tabler/icons-react';

export interface SwitchNodeData {
  config: {
    field?: string;
    cases?: Record<string, any[]>;
    default_actions?: any[];
  };
  onEdit?: () => void;
}

function summarize(config: SwitchNodeData['config']): string {
  if (!config?.field) return 'Not configured';
  const caseCount = Object.keys(config.cases || {}).length;
  return `${config.field} (${caseCount} case${caseCount !== 1 ? 's' : ''})`;
}

export function SwitchNode({ data }: NodeProps<SwitchNodeData>) {
  const caseKeys = Object.keys(data.config?.cases || {});

  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #862e9c 0%, #be4bdb 100%)',
        border: '2px solid #862e9c',
        minWidth: 220,
        cursor: data.onEdit ? 'pointer' : 'default',
        color: '#fff',
      }}
      onClick={data.onEdit}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: '#862e9c', width: 10, height: 10, border: '2px solid #fff' }} />

      <Stack gap={6} align="center">
        <IconSwitchHorizontal size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">Switch</Text>
        <Badge color="white" variant="light" size="sm">{summarize(data.config)}</Badge>
      </Stack>

      {caseKeys.map((key, i) => (
        <Handle
          key={key}
          type="source"
          position={Position.Bottom}
          id={`case-${key}`}
          style={{
            background: '#be4bdb',
            width: 8,
            height: 8,
            border: '2px solid #fff',
            left: `${((i + 1) / (caseKeys.length + 2)) * 100}%`,
          }}
        />
      ))}
      <Handle type="source" position={Position.Bottom} id="default"
        style={{ background: '#868e96', width: 10, height: 10, border: '2px solid #fff' }} />
    </Paper>
  );
}
