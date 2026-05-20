import { Badge } from '@mantine/core';
import { PRIORITY_LABELS } from '@shared/constants';
import { IconAlertTriangle, IconAlertCircle, IconInfoCircle, IconMinus } from '@tabler/icons-react';

const PRIORITY_CONFIG: Record<number, { color: string; dotColor: string; icon: React.ReactNode }> = {
  1: { color: 'red',    dotColor: '#e03131', icon: <IconAlertTriangle size={12} /> },
  2: { color: 'orange', dotColor: '#e8590c', icon: <IconAlertCircle size={12} /> },
  3: { color: 'blue',   dotColor: '#4facfe', icon: <IconInfoCircle size={12} /> },
  4: { color: 'gray',   dotColor: '#868e96', icon: <IconMinus size={12} /> },
  5: { color: 'gray',   dotColor: '#adb5bd', icon: <IconMinus size={12} /> },
};

export function PriorityBadge({ priority }: { priority: number }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[5];

  return (
    <Badge
      variant="light"
      color={config.color}
      size="md"
      radius="xl"
      styles={{
        root: { textTransform: 'uppercase', fontWeight: 600, fontSize: '0.7rem', paddingLeft: 8, paddingRight: 10 },
      }}
      leftSection={
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            marginRight: 2,
          }}
        >
          {config.icon}
        </span>
      }
    >
      P{priority} - {PRIORITY_LABELS[priority] || 'Unknown'}
    </Badge>
  );
}
