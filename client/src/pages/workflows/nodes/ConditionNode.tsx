import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack, Group } from '@mantine/core';
import { IconFilter } from '@tabler/icons-react';

export interface ConditionNodeData {
  condition: {
    logic: 'AND' | 'OR';
    conditions: Array<{ field?: string; operator?: string; value?: string } | Record<string, unknown>>;
  };
  onEdit?: () => void;
}

function summarizeCondition(condition: ConditionNodeData['condition']): string {
  if (!condition || !condition.conditions || condition.conditions.length === 0) {
    return 'No conditions defined';
  }

  const parts = condition.conditions
    .filter((c): c is { field: string; operator: string; value: string } => 'field' in c)
    .slice(0, 3)
    .map((c) => {
      const op = (c.operator || '').replace(/_/g, ' ');
      return `${c.field} ${op} ${c.value ?? ''}`.trim();
    });

  const suffix = condition.conditions.length > 3 ? ` (+${condition.conditions.length - 3} more)` : '';
  return parts.join(` ${condition.logic} `) + suffix || 'Complex condition';
}

export function ConditionNode({ data }: NodeProps<ConditionNodeData>) {
  const summary = summarizeCondition(data.condition);

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
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#e67700',
          width: 10,
          height: 10,
          border: '2px solid #fff',
        }}
      />

      <Stack gap={6} align="center">
        <IconFilter size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">
          Condition
        </Text>
        <Badge color="dark" variant="filled" size="sm">
          {data.condition?.logic || 'AND'}
        </Badge>
        <Text size="xs" c="white" ta="center" style={{ maxWidth: 200, wordBreak: 'break-word' }}>
          {summary}
        </Text>
      </Stack>

      <Group justify="space-between" mt="xs" style={{ position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Text size="xs" c="white" fw={600}>Yes</Text>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            style={{
              background: '#2f9e44',
              width: 10,
              height: 10,
              border: '2px solid #fff',
              left: 10,
              bottom: -14,
            }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <Text size="xs" c="white" fw={600}>No</Text>
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            style={{
              background: '#e03131',
              width: 10,
              height: 10,
              border: '2px solid #fff',
              right: -4,
              left: 'auto',
              bottom: -14,
            }}
          />
        </div>
      </Group>
    </Paper>
  );
}
