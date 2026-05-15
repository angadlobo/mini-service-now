import { Badge } from '@mantine/core';
import { PRIORITY_LABELS } from '@shared/constants';

const PRIORITY_COLORS: Record<number, string> = {
  1: 'red', 2: 'orange', 3: 'yellow', 4: 'blue', 5: 'gray',
};

export function PriorityBadge({ priority }: { priority: number }) {
  return (
    <Badge color={PRIORITY_COLORS[priority] || 'gray'} variant="light" size="sm">
      P{priority} - {PRIORITY_LABELS[priority] || 'Unknown'}
    </Badge>
  );
}
