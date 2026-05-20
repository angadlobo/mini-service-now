import { Badge, Group } from '@mantine/core';
import { STATE_COLORS } from '@shared/constants';

const STATE_COLOR_MAP: Record<string, { color: string; dotColor: string }> = {
  new:              { color: 'cyan',   dotColor: '#4facfe' },
  in_progress:      { color: 'violet', dotColor: '#764ba2' },
  on_hold:          { color: 'yellow', dotColor: '#f59f00' },
  resolved:         { color: 'green',  dotColor: '#43e97b' },
  closed:           { color: 'gray',   dotColor: '#868e96' },
  cancelled:        { color: 'red',    dotColor: '#ff6b6b' },
  assess:           { color: 'cyan',   dotColor: '#4facfe' },
  authorize:        { color: 'grape',  dotColor: '#a18cd1' },
  scheduled:        { color: 'indigo', dotColor: '#667eea' },
  implement:        { color: 'orange', dotColor: '#f7971e' },
  review:           { color: 'teal',   dotColor: '#38d9a9' },
  investigation:    { color: 'blue',   dotColor: '#4facfe' },
  root_cause_found: { color: 'yellow', dotColor: '#f59f00' },
  fix_in_progress:  { color: 'violet', dotColor: '#764ba2' },
};

export function StateIndicator({ state }: { state: string }) {
  const mapped = STATE_COLOR_MAP[state];
  const color = mapped?.color || STATE_COLORS[state] || 'gray';
  const dotColor = mapped?.dotColor || '#868e96';

  return (
    <Badge
      variant="light"
      color={color}
      size="md"
      radius="xl"
      styles={{
        root: { textTransform: 'capitalize', fontWeight: 600, fontSize: '0.72rem', paddingLeft: 8, paddingRight: 10 },
      }}
      leftSection={
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: dotColor,
            marginRight: 2,
          }}
        />
      }
    >
      {state.replace(/_/g, ' ')}
    </Badge>
  );
}
