import { Paper, Group, Text, ThemeIcon } from '@mantine/core';
import { TablerIconsProps } from '@tabler/icons-react';

interface Props {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<TablerIconsProps>;
  color?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, color = 'blue' }: Props) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{title}</Text>
          <Text fw={700} size="xl">{value}</Text>
          {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
        </div>
        <ThemeIcon color={color} variant="light" size={48} radius="md">
          <Icon size={28} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
