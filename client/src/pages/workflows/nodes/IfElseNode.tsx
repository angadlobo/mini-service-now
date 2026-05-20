import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack, Group } from '@mantine/core';
import { IconGitBranch } from '@tabler/icons-react';

export interface IfElseNodeData {
  config: {
    condition?: { logic: string; conditions: any[] };
    then_actions?: any[];
    else_actions?: any[];
  };
  onEdit?: () => void;
}

function summarize(config: IfElseNodeData['config']): string {
  if (!config?.condition?.conditions?.length) return 'No condition set';
  return `${config.condition.conditions.length} condition${config.condition.conditions.length !== 1 ? 's' : ''}`;
}

export function IfElseNode({ data }: NodeProps<IfElseNodeData>) {
  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #e67700 0%, #fab005 100%)',
        border: '2px solid #e67700',
        minWidth: 220,
        cursor: data.onEdit ? 'pointer' : 'default',
        color: '#fff',
      }}
      onClick={data.onEdit}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: '#e67700', width: 10, height: 10, border: '2px solid #fff' }} />

      <Stack gap={6} align="center">
        <IconGitBranch size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">If / Else</Text>
        <Badge color="white" variant="light" size="sm">{summarize(data.config)}</Badge>
        <Group gap={4}>
          <Badge color="green" variant="light" size="xs">Then: {data.config?.then_actions?.length || 0}</Badge>
          <Badge color="red" variant="light" size="xs">Else: {data.config?.else_actions?.length || 0}</Badge>
        </Group>
      </Stack>

      <Handle type="source" position={Position.Bottom} id="then"
        style={{ background: '#2f9e44', width: 10, height: 10, border: '2px solid #fff', left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="else"
        style={{ background: '#e03131', width: 10, height: 10, border: '2px solid #fff', left: '70%' }} />
    </Paper>
  );
}
