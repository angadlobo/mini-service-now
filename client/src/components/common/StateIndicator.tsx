import { Badge } from '@mantine/core';
import { STATE_COLORS } from '@shared/constants';

export function StateIndicator({ state }: { state: string }) {
  const color = STATE_COLORS[state] || 'gray';
  return (
    <Badge color={color} variant="light" size="sm">
      {state.replace(/_/g, ' ')}
    </Badge>
  );
}
