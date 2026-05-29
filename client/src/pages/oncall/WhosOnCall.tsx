import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Card, Avatar, Text, Badge, SimpleGrid, LoadingOverlay, Paper } from '@mantine/core';
import { IconPhone, IconClock, IconArrowRight } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { oncallApi } from '../../api/oncall.api';

export function WhosOnCall() {
  const { data, isLoading } = useQuery({
    queryKey: ['whos-oncall'],
    queryFn: () => oncallApi.getWhosOnCall(),
    refetchInterval: 60000,
  });

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Who's On Call</Title>
        <Badge size="lg" variant="light" leftSection={<IconClock size={14} />}>
          {dayjs().format('ddd, MMM D, YYYY HH:mm')}
        </Badge>
      </Group>

      <Paper pos="relative" p="md" withBorder>
        <LoadingOverlay visible={isLoading} />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {(data || []).map((entry: any) => (
            <Card key={entry.schedule_id} withBorder shadow="sm" padding="lg" radius="md" className="hover-glow">
              <Group justify="space-between" mb="xs">
                <Text fw={700} size="lg">{entry.schedule_name}</Text>
                {entry.is_override && (
                  <Badge color="orange" variant="filled" size="sm">Override</Badge>
                )}
              </Group>

              {entry.group_name && (
                <Text size="sm" c="dimmed" mb="sm">{entry.group_name}</Text>
              )}

              {entry.oncall_user_name ? (
                <Group gap="sm" mt="md">
                  <Avatar color="blue" radius="xl" size="lg">
                    {entry.oncall_user_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </Avatar>
                  <div>
                    <Group gap={4}>
                      <IconPhone size={14} />
                      <Text fw={600} size="md">{entry.oncall_user_name}</Text>
                    </Group>
                    {entry.oncall_user_email && (
                      <Text size="xs" c="dimmed">{entry.oncall_user_email}</Text>
                    )}
                  </div>
                </Group>
              ) : (
                <Text c="dimmed" size="sm" mt="md" ta="center" py="md">
                  No one currently on call
                </Text>
              )}

              <Group justify="space-between" mt="md" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                <div>
                  <Text size="xs" c="dimmed">Timezone</Text>
                  <Text size="sm">{entry.timezone}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Handoff</Text>
                  <Text size="sm">{entry.handoff_time}</Text>
                </div>
              </Group>

              {entry.rotation_end && (
                <Group gap={4} mt="xs">
                  <Text size="xs" c="dimmed">Until:</Text>
                  <Text size="xs">{dayjs(entry.rotation_end).format('MMM D, YYYY HH:mm')}</Text>
                </Group>
              )}

              {entry.is_override && entry.override_reason && (
                <Text size="xs" c="orange" mt="xs">Reason: {entry.override_reason}</Text>
              )}

              {entry.next_user_name && (
                <Group gap={4} mt="xs">
                  <IconArrowRight size={12} />
                  <Text size="xs" c="dimmed">
                    Next: {entry.next_user_name} ({entry.next_handoff ? dayjs(entry.next_handoff).format('MMM D HH:mm') : '-'})
                  </Text>
                </Group>
              )}
            </Card>
          ))}

          {!isLoading && (!data || data.length === 0) && (
            <Text c="dimmed" ta="center" py="xl">
              No on-call schedules configured. Create a schedule to get started.
            </Text>
          )}
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}
