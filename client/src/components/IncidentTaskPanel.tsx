import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Paper, Title, Button, Modal, TextInput, Textarea, Select, Group, Text, Table, ActionIcon, LoadingOverlay, Grid } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import api from '../api/client';
import { usersApi } from '../api/common.api';

interface IncidentTask {
  id: string;
  number: string;
  incident_id: string;
  short_description: string;
  description?: string;
  status: string;
  priority: number;
  assigned_to?: string;
  assigned_to_name?: string;
  percent_complete: number;
  created_by: string;
  created_at: string;
}

interface IncidentTaskPanelProps {
  incidentId: string;
}

export function IncidentTaskPanel({ incidentId }: IncidentTaskPanelProps) {
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [form, setForm] = useState({
    short_description: '',
    description: '',
    priority: '3',
    assigned_to: '',
  });

  const { data: tasksResponse, isLoading } = useQuery({
    queryKey: ['incident-tasks', incidentId],
    queryFn: async () => {
      const response = await api.get(`/incidents/${incidentId}/tasks`);
      return response.data;
    },
  });

  const tasks = tasksResponse?.data || [];

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ pageSize: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post(`/incidents/${incidentId}/tasks`, {
      short_description: form.short_description,
      description: form.description || null,
      priority: Number(form.priority),
      assigned_to: form.assigned_to || null,
    }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Task created', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['incident-tasks', incidentId] });
      resetForm();
      setOpened(false);
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to create task', color: 'red' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => api.delete(`/incidents/${incidentId}/tasks/${taskId}`),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Task deleted', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['incident-tasks', incidentId] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to delete task', color: 'red' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { taskId: string; status: string }) =>
      api.put(`/incidents/${incidentId}/tasks/${data.taskId}`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-tasks', incidentId] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to update task', color: 'red' });
    },
  });

  const resetForm = () => {
    setForm({ short_description: '', description: '', priority: '3', assigned_to: '' });
  };

  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={4}>Tasks</Title>
          <Button size="xs" leftSection={<IconPlus size={16} />} onClick={() => setOpened(true)}>
            Add Task
          </Button>
        </Group>

        <LoadingOverlay visible={isLoading} />

        {!tasks || tasks.length === 0 ? (
          <Text size="sm" c="dimmed">No tasks yet</Text>
        ) : (
          <Table striped highlightOnHover size="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Number</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tasks.map((task: IncidentTask) => (
                <Table.Tr key={task.id}>
                  <Table.Td>
                    <Text size="xs" fw={600}>{task.number}</Text>
                  </Table.Td>
                  <Table.Td>
                    <div>
                      <Text size="xs" fw={500}>{task.short_description}</Text>
                      {task.assigned_to_name && (
                        <Text size="xs" c="dimmed">→ {task.assigned_to_name}</Text>
                      )}
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Select
                      size="xs"
                      data={statusOptions}
                      value={task.status}
                      onChange={(v) => v && updateStatusMutation.mutate({ taskId: task.id, status: v })}
                      style={{ maxWidth: 120 }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      size="xs"
                      color="red"
                      variant="subtle"
                      onClick={() => deleteMutation.mutate(task.id)}
                      loading={deleteMutation.isPending}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      <Modal opened={opened} onClose={() => { setOpened(false); resetForm(); }} title="Create Task" size="md">
        <Stack>
          <TextInput
            label="Description"
            placeholder="What needs to be done?"
            required
            value={form.short_description}
            onChange={(e) => setForm({ ...form, short_description: e.currentTarget.value })}
          />
          <Textarea
            label="Details"
            placeholder="Additional details..."
            minRows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.currentTarget.value })}
          />
          <Grid>
            <Grid.Col span={6}>
              <Select
                label="Priority"
                data={[
                  { value: '1', label: 'High' },
                  { value: '2', label: 'Medium' },
                  { value: '3', label: 'Low' },
                ]}
                value={form.priority}
                onChange={(v) => setForm({ ...form, priority: v || '3' })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Assign To"
                data={userOptions}
                value={form.assigned_to}
                onChange={(v) => setForm({ ...form, assigned_to: v || '' })}
                searchable
                clearable
              />
            </Grid.Col>
          </Grid>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => { setOpened(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
              Create Task
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}
