import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

export interface ActionNodeData {
  action: {
    type: string;
    config: Record<string, unknown>;
  };
  onEdit?: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  set_field: 'Set Field',
  change_state: 'Change State',
  assign_to: 'Assign To User',
  assign_to_group: 'Assign To Group',
  send_notification: 'Send Notification',
  create_journal_entry: 'Create Journal Entry',
};

function summarizeAction(action: ActionNodeData['action']): string {
  if (!action) return 'No action configured';

  const config = action.config || {};
  switch (action.type) {
    case 'set_field':
      return `${config.field || '?'} = ${config.value ?? '?'}`;
    case 'change_state':
      return `state -> ${config.state || '?'}`;
    case 'assign_to':
      return `user: ${config.user_id || '?'}`;
    case 'assign_to_group':
      return `group: ${config.group_id || '?'}`;
    case 'send_notification':
      return `"${config.title || 'Untitled'}"`;
    case 'create_journal_entry':
      return `${config.journal_type || 'comment'}`;
    default:
      return action.type || 'Unknown';
  }
}

export function ActionNode({ data }: NodeProps<ActionNodeData>) {
  const label = ACTION_LABELS[data.action?.type] || data.action?.type || 'Action';
  const summary = summarizeAction(data.action);

  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #1971c2 0%, #339af0 100%)',
        border: '2px solid #1864ab',
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
          background: '#1864ab',
          width: 10,
          height: 10,
          border: '2px solid #fff',
        }}
      />

      <Stack gap={6} align="center">
        <IconPlayerPlay size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">
          Action
        </Text>
        <Badge color="white" variant="light" size="sm">
          {label}
        </Badge>
        <Text size="xs" c="white" ta="center" style={{ maxWidth: 200, wordBreak: 'break-word' }}>
          {summary}
        </Text>
      </Stack>
    </Paper>
  );
}
