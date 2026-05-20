import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack } from '@mantine/core';
import { IconWorld } from '@tabler/icons-react';

export interface HttpNodeData {
  config: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    auth?: Record<string, string>;
    timeout?: number;
    store_response_in?: string;
  };
  onEdit?: () => void;
}

function summarize(config: HttpNodeData['config']): string {
  if (!config || !config.url) return 'Not configured';
  const method = (config.method || 'GET').toUpperCase();
  const url = config.url.length > 30 ? config.url.substring(0, 30) + '...' : config.url;
  return `${method} ${url}`;
}

export function HttpNode({ data }: NodeProps<HttpNodeData>) {
  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #0c8599 0%, #22b8cf 100%)',
        border: '2px solid #0c8599',
        minWidth: 200,
        cursor: data.onEdit ? 'pointer' : 'default',
        color: '#fff',
      }}
      onClick={data.onEdit}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: '#0c8599', width: 10, height: 10, border: '2px solid #fff' }} />

      <Stack gap={6} align="center">
        <IconWorld size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">HTTP Request</Text>
        <Badge color="white" variant="light" size="sm">{summarize(data.config)}</Badge>
      </Stack>

      <Handle type="source" position={Position.Bottom}
        style={{ background: '#0c8599', width: 10, height: 10, border: '2px solid #fff' }} />
    </Paper>
  );
}
