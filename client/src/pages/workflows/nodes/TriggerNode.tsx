import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack } from '@mantine/core';
import { IconBolt } from '@tabler/icons-react';

const TRIGGER_LABELS: Record<string, string> = {
  'record.created': 'Record Created',
  'record.updated': 'Record Updated',
  'record.state_changed': 'State Changed',
};

export interface TriggerNodeData {
  trigger_event: string;
  table_name?: string;
}

export function TriggerNode({ data }: NodeProps<TriggerNodeData>) {
  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #2f9e44 0%, #40c057 100%)',
        border: '2px solid #2b8a3e',
        minWidth: 200,
        color: '#fff',
      }}
    >
      <Stack gap={6} align="center">
        <IconBolt size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">
          Trigger
        </Text>
        <Badge color="white" variant="light" size="lg">
          {TRIGGER_LABELS[data.trigger_event] || data.trigger_event || 'No Trigger'}
        </Badge>
        {data.table_name && (
          <Text size="xs" c="white" opacity={0.85}>
            Table: {data.table_name}
          </Text>
        )}
      </Stack>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#2b8a3e',
          width: 10,
          height: 10,
          border: '2px solid #fff',
        }}
      />
    </Paper>
  );
}
