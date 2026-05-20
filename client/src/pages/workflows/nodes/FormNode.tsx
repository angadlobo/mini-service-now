import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack } from '@mantine/core';
import { IconForms } from '@tabler/icons-react';

export interface FormNodeData {
  config: {
    form_template_id?: string;
    form_template_name?: string;
    assign_to_field?: string;
  };
  onEdit?: () => void;
}

export function FormNode({ data }: NodeProps<FormNodeData>) {
  const config = data.config || {};
  const label = config.form_template_name || 'No form selected';

  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #7048e8 0%, #9775fa 100%)',
        border: '2px solid #6741d9',
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
          background: '#6741d9',
          width: 10,
          height: 10,
          border: '2px solid #fff',
        }}
      />

      <Stack gap={6} align="center">
        <IconForms size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">
          Form Task
        </Text>
        <Badge color="white" variant="light" size="sm">
          {label}
        </Badge>
        {config.assign_to_field && (
          <Text size="xs" c="white" opacity={0.85}>
            Assign: {config.assign_to_field}
          </Text>
        )}
      </Stack>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#6741d9',
          width: 10,
          height: 10,
          border: '2px solid #fff',
        }}
      />
    </Paper>
  );
}
