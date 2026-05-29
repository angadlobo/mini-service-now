import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, Group, Card, Text, Badge, SimpleGrid, Paper, Avatar, LoadingOverlay, Button } from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';
import { projectsApi } from '../../api/projects.api';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { notifications } from '@mantine/notifications';

const COLUMNS = [
  { key: 'pending', label: 'Pending', color: 'gray' },
  { key: 'in_progress', label: 'In Progress', color: 'blue' },
  { key: 'completed', label: 'Completed', color: 'green' },
  { key: 'blocked', label: 'Blocked', color: 'red' },
];

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

export function TaskBoard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => projectsApi.listTasks(id!, { pageSize: 200 }),
    enabled: !!id,
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      projectsApi.updateTask(id!, taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', id] });
      notifications.show({ title: 'Updated', message: 'Task status updated', color: 'green' });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to update task', color: 'red' });
    },
  });

  const tasks: any[] = tasksData?.data || (Array.isArray(tasksData) ? tasksData : []);
  const isLoading = projectLoading || tasksLoading;

  const getTasksByStatus = (status: string) =>
    tasks.filter((t: any) => t.status === status);

  return (
    <Stack className="fade-in">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate(`/projects/${id}`)}>
          Back to Project
        </Button>
        <Title order={2}>{project?.name || ''} - Task Board</Title>
      </Group>

      <div style={{ position: 'relative', minHeight: 400 }}>
        <LoadingOverlay visible={isLoading} />

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          {COLUMNS.map((col) => {
            const columnTasks = getTasksByStatus(col.key);
            return (
              <Paper
                key={col.key}
                withBorder
                p="md"
                radius="md"
                style={{ minHeight: 300, background: 'var(--mantine-color-gray-0)' }}
              >
                <Group justify="space-between" mb="md">
                  <Group gap="xs">
                    <Badge variant="filled" color={col.color} size="sm">{col.label}</Badge>
                    <Text size="xs" c="dimmed">({columnTasks.length})</Text>
                  </Group>
                </Group>

                <Stack gap="sm">
                  {columnTasks.map((task: any) => (
                    <Card
                      key={task.id}
                      withBorder
                      padding="sm"
                      radius="md"
                      style={{ cursor: 'pointer', transition: 'box-shadow 0.15s ease' }}
                      className="hover-lift"
                      onClick={() => navigate(`/projects/${id}/tasks/${task.id}`)}
                    >
                      <Stack gap="xs">
                        {task.number && (
                          <Text size="xs" c="dimmed" fw={600}>{task.number}</Text>
                        )}
                        <Text size="sm" fw={500} lineClamp={2}>{task.short_description || '-'}</Text>
                        <Group justify="space-between" align="center">
                          {task.priority && <PriorityBadge priority={task.priority} />}
                          <Group gap={4}>
                            {task.assigned_to_name && (
                              <Avatar size="sm" radius="xl" color="blue">
                                {getInitials(task.assigned_to_name)}
                              </Avatar>
                            )}
                          </Group>
                        </Group>
                      </Stack>
                    </Card>
                  ))}

                  {columnTasks.length === 0 && (
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                      No tasks
                    </Text>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      </div>
    </Stack>
  );
}
