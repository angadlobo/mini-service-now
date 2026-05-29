import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Textarea, Select, Group, Button, Paper, Text,
  LoadingOverlay, Box, Tabs, Table, ActionIcon, Badge, NumberInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { bcPlansApi } from '../../api/business-continuity.api';
import { usersApi } from '../../api/common.api';
import { ActivityStream } from '../../components/common/ActivityStream';
import { AttachmentPanel } from '../../components/common/AttachmentPanel';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  active: 'green',
  under_review: 'yellow',
  approved: 'teal',
  retired: 'red',
};

const TASK_CATEGORY_COLORS: Record<string, string> = {
  communication: 'blue',
  recovery: 'green',
  assessment: 'orange',
  escalation: 'red',
  logistics: 'violet',
  documentation: 'gray',
};

const TEST_STATUS_COLORS: Record<string, string> = {
  passed: 'green',
  failed: 'red',
  partial: 'yellow',
  scheduled: 'blue',
  cancelled: 'gray',
};

export function BCPlanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'bcp',
    status: 'draft',
    owner_id: '',
    rpo_hours: '' as string | number,
    rto_hours: '' as string | number,
    next_test_due: '',
  });

  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    category: 'recovery',
    order_index: 1,
    assigned_to: '',
  });

  const [testForm, setTestForm] = useState({
    test_type: 'tabletop',
    status: 'scheduled',
    actual_rpo_hours: '' as string | number,
    actual_rto_hours: '' as string | number,
    findings: '',
    test_date: '',
  });

  const { data: plan, isLoading } = useQuery({
    queryKey: ['bc-plan', id],
    queryFn: () => bcPlansApi.get(id!),
    enabled: !isNew,
  });

  const { data: tasks, refetch: refetchTasks } = useQuery({
    queryKey: ['bc-plan-tasks', id],
    queryFn: () => bcPlansApi.getTasks(id!),
    enabled: !isNew,
  });

  const { data: tests, refetch: refetchTests } = useQuery({
    queryKey: ['bc-plan-tests', id],
    queryFn: () => bcPlansApi.getTests(id!),
    enabled: !isNew,
  });

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ pageSize: 100 }),
  });

  useEffect(() => {
    if (plan) {
      setForm({
        name: plan.name || '',
        description: plan.description || '',
        type: plan.type || 'bcp',
        status: plan.status || 'draft',
        owner_id: plan.owner_id || '',
        rpo_hours: plan.rpo_hours != null ? Number(plan.rpo_hours) : '',
        rto_hours: plan.rto_hours != null ? Number(plan.rto_hours) : '',
        next_test_due: plan.next_test_due ? dayjs(plan.next_test_due).format('YYYY-MM-DD') : '',
      });
    }
  }, [plan]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: form.name,
        description: form.description,
        type: form.type,
        status: form.status,
        owner_id: form.owner_id || null,
        rpo_hours: form.rpo_hours !== '' ? Number(form.rpo_hours) : null,
        rto_hours: form.rto_hours !== '' ? Number(form.rto_hours) : null,
        next_test_due: form.next_test_due || null,
      };
      if (isNew) return bcPlansApi.create(payload);
      return bcPlansApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Plan created' : 'Plan updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['bc-plans'] });
      if (isNew) navigate(`/business-continuity/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['bc-plan', id] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' });
    },
  });

  const addTask = useMutation({
    mutationFn: () => bcPlansApi.addTask(id!, {
      name: taskForm.name,
      description: taskForm.description,
      category: taskForm.category,
      order_index: taskForm.order_index,
      assigned_to: taskForm.assigned_to || null,
    }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Task added', color: 'green' });
      setTaskForm({ name: '', description: '', category: 'recovery', order_index: (tasks?.length || 0) + 1, assigned_to: '' });
      refetchTasks();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add task', color: 'red' });
    },
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => bcPlansApi.deleteTask(taskId),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Task removed', color: 'green' });
      refetchTasks();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to remove task', color: 'red' });
    },
  });

  const addTest = useMutation({
    mutationFn: () => bcPlansApi.addTest(id!, {
      test_type: testForm.test_type,
      status: testForm.status,
      actual_rpo_hours: testForm.actual_rpo_hours !== '' ? Number(testForm.actual_rpo_hours) : null,
      actual_rto_hours: testForm.actual_rto_hours !== '' ? Number(testForm.actual_rto_hours) : null,
      findings: testForm.findings || null,
      test_date: testForm.test_date || null,
    }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Test record added', color: 'green' });
      setTestForm({ test_type: 'tabletop', status: 'scheduled', actual_rpo_hours: '', actual_rto_hours: '', findings: '', test_date: '' });
      refetchTests();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add test', color: 'red' });
    },
  });

  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));
  const taskList: any[] = tasks || [];
  const testList: any[] = tests || [];

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/business-continuity')}>
          Back
        </Button>
        <Title order={2}>{isNew ? 'New BC Plan' : `${plan?.number || plan?.name || ''}`}</Title>
        {plan && <Badge variant="filled" color={STATUS_COLORS[plan.status] || 'gray'}>{(plan.status || '').replace(/_/g, ' ')}</Badge>}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Tabs defaultValue="details">
              <Tabs.List>
                <Tabs.Tab value="details">Details</Tabs.Tab>
                {!isNew && <Tabs.Tab value="tasks">Tasks</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="tests">Test History</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="journal">Journal</Tabs.Tab>}
              </Tabs.List>

              <Tabs.Panel value="details" pt="md">
                <Stack>
                  <TextInput label="Name" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
                  <Textarea label="Description" minRows={3} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />

                  <Grid>
                    <Grid.Col span={6}>
                      <Select label="Type" data={[
                        { value: 'bcp', label: 'Business Continuity Plan (BCP)' },
                        { value: 'drp', label: 'Disaster Recovery Plan (DRP)' },
                        { value: 'irp', label: 'Incident Response Plan (IRP)' },
                        { value: 'crp', label: 'Crisis Response Plan (CRP)' },
                      ]} value={form.type} onChange={(v) => setForm({ ...form, type: v || 'bcp' })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select label="Status" data={[
                        { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' },
                        { value: 'under_review', label: 'Under Review' }, { value: 'approved', label: 'Approved' },
                        { value: 'retired', label: 'Retired' },
                      ]} value={form.status} onChange={(v) => setForm({ ...form, status: v || 'draft' })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <Select label="Owner" data={userOptions} value={form.owner_id}
                        onChange={(v) => setForm({ ...form, owner_id: v || '' })} clearable searchable />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput label="Next Test Due" type="date" value={form.next_test_due}
                        onChange={(e) => setForm({ ...form, next_test_due: e.currentTarget.value })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <NumberInput label="RPO (hours)" min={0} value={form.rpo_hours !== '' ? Number(form.rpo_hours) : ''}
                        onChange={(v) => setForm({ ...form, rpo_hours: v })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput label="RTO (hours)" min={0} value={form.rto_hours !== '' ? Number(form.rto_hours) : ''}
                        onChange={(v) => setForm({ ...form, rto_hours: v })} />
                    </Grid.Col>
                  </Grid>

                  <Group justify="flex-end">
                    <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                      {isNew ? 'Create' : 'Update'}
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              {!isNew && (
                <Tabs.Panel value="tasks" pt="md">
                  <Stack>
                    <Paper withBorder p="sm">
                      <Text fw={600} mb="sm">Add Task</Text>
                      <Grid>
                        <Grid.Col span={3}>
                          <TextInput label="Name" value={taskForm.name} required
                            onChange={(e) => setTaskForm({ ...taskForm, name: e.currentTarget.value })} />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <TextInput label="Description" value={taskForm.description}
                            onChange={(e) => setTaskForm({ ...taskForm, description: e.currentTarget.value })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <Select label="Category" data={[
                            { value: 'communication', label: 'Communication' },
                            { value: 'recovery', label: 'Recovery' },
                            { value: 'assessment', label: 'Assessment' },
                            { value: 'escalation', label: 'Escalation' },
                            { value: 'logistics', label: 'Logistics' },
                            { value: 'documentation', label: 'Documentation' },
                          ]} value={taskForm.category} onChange={(v) => setTaskForm({ ...taskForm, category: v || 'recovery' })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <NumberInput label="Order" min={1} value={taskForm.order_index}
                            onChange={(v) => setTaskForm({ ...taskForm, order_index: Number(v) || 1 })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <Box mt={24}>
                            <Button size="sm" leftSection={<IconPlus size={14} />}
                              onClick={() => addTask.mutate()}
                              loading={addTask.isPending}
                              disabled={!taskForm.name}
                              fullWidth>
                              Add
                            </Button>
                          </Box>
                        </Grid.Col>
                      </Grid>
                    </Paper>

                    {taskList.length > 0 ? (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ width: 60 }}>Order</Table.Th>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Description</Table.Th>
                            <Table.Th style={{ width: 120 }}>Category</Table.Th>
                            <Table.Th style={{ width: 140 }}>Assigned To</Table.Th>
                            <Table.Th style={{ width: 50 }}></Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {taskList
                            .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                            .map((task: any) => (
                            <Table.Tr key={task.id}>
                              <Table.Td>{task.order_index}</Table.Td>
                              <Table.Td>{task.name}</Table.Td>
                              <Table.Td>{task.description || '-'}</Table.Td>
                              <Table.Td>
                                <Badge variant="light" color={TASK_CATEGORY_COLORS[task.category] || 'gray'} size="sm">
                                  {task.category}
                                </Badge>
                              </Table.Td>
                              <Table.Td>{task.assigned_to_name || '-'}</Table.Td>
                              <Table.Td>
                                <ActionIcon variant="subtle" color="red" size="sm"
                                  onClick={() => deleteTask.mutate(task.id)}>
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text c="dimmed" ta="center" py="lg">No tasks yet</Text>
                    )}
                  </Stack>
                </Tabs.Panel>
              )}

              {!isNew && (
                <Tabs.Panel value="tests" pt="md">
                  <Stack>
                    <Paper withBorder p="sm">
                      <Text fw={600} mb="sm">Add Test Record</Text>
                      <Grid>
                        <Grid.Col span={2}>
                          <Select label="Test Type" data={[
                            { value: 'tabletop', label: 'Tabletop' },
                            { value: 'walkthrough', label: 'Walkthrough' },
                            { value: 'simulation', label: 'Simulation' },
                            { value: 'full', label: 'Full Test' },
                          ]} value={testForm.test_type} onChange={(v) => setTestForm({ ...testForm, test_type: v || 'tabletop' })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <Select label="Status" data={[
                            { value: 'scheduled', label: 'Scheduled' }, { value: 'passed', label: 'Passed' },
                            { value: 'failed', label: 'Failed' }, { value: 'partial', label: 'Partial' },
                            { value: 'cancelled', label: 'Cancelled' },
                          ]} value={testForm.status} onChange={(v) => setTestForm({ ...testForm, status: v || 'scheduled' })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <NumberInput label="Actual RPO (hrs)" min={0} value={testForm.actual_rpo_hours !== '' ? Number(testForm.actual_rpo_hours) : ''}
                            onChange={(v) => setTestForm({ ...testForm, actual_rpo_hours: v })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <NumberInput label="Actual RTO (hrs)" min={0} value={testForm.actual_rto_hours !== '' ? Number(testForm.actual_rto_hours) : ''}
                            onChange={(v) => setTestForm({ ...testForm, actual_rto_hours: v })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <TextInput label="Test Date" type="date" value={testForm.test_date}
                            onChange={(e) => setTestForm({ ...testForm, test_date: e.currentTarget.value })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <Box mt={24}>
                            <Button size="sm" leftSection={<IconPlus size={14} />}
                              onClick={() => addTest.mutate()}
                              loading={addTest.isPending}
                              fullWidth>
                              Add
                            </Button>
                          </Box>
                        </Grid.Col>
                        <Grid.Col span={12}>
                          <Textarea label="Findings" minRows={2} value={testForm.findings}
                            onChange={(e) => setTestForm({ ...testForm, findings: e.currentTarget.value })} />
                        </Grid.Col>
                      </Grid>
                    </Paper>

                    {testList.length > 0 ? (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Date</Table.Th>
                            <Table.Th>Test Type</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Actual RPO</Table.Th>
                            <Table.Th>Actual RTO</Table.Th>
                            <Table.Th>Findings</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {testList.map((test: any) => (
                            <Table.Tr key={test.id}>
                              <Table.Td>{test.test_date ? dayjs(test.test_date).format('MMM D, YYYY') : '-'}</Table.Td>
                              <Table.Td>
                                <Text size="sm" tt="capitalize">{test.test_type}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="filled" color={TEST_STATUS_COLORS[test.status] || 'gray'} size="sm">
                                  {test.status}
                                </Badge>
                              </Table.Td>
                              <Table.Td>{test.actual_rpo_hours != null ? `${test.actual_rpo_hours}h` : '-'}</Table.Td>
                              <Table.Td>{test.actual_rto_hours != null ? `${test.actual_rto_hours}h` : '-'}</Table.Td>
                              <Table.Td>
                                <Text size="sm" lineClamp={2}>{test.findings || '-'}</Text>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text c="dimmed" ta="center" py="lg">No test records yet</Text>
                    )}
                  </Stack>
                </Tabs.Panel>
              )}

              {!isNew && (
                <Tabs.Panel value="journal" pt="md">
                  <ActivityStream tableName="bc_plans" recordId={plan?.id} />
                </Tabs.Panel>
              )}
            </Tabs>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && plan && (
            <Stack>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {plan.number || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Type:</Text> {(plan.type || '').toUpperCase()}</Text>
                  <Text size="sm"><Text span fw={600}>Owner:</Text> {plan.owner_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>RPO:</Text> {plan.rpo_hours != null ? `${plan.rpo_hours} hours` : '-'}</Text>
                  <Text size="sm"><Text span fw={600}>RTO:</Text> {plan.rto_hours != null ? `${plan.rto_hours} hours` : '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Last Tested:</Text> {plan.last_tested ? dayjs(plan.last_tested).format('MMM D, YYYY') : 'Never'}</Text>
                  {plan.next_test_due && (
                    <Text size="sm" c={dayjs(plan.next_test_due).isBefore(dayjs()) ? 'red' : undefined}>
                      <Text span fw={600}>Next Test Due:</Text> {dayjs(plan.next_test_due).format('MMM D, YYYY')}
                    </Text>
                  )}
                  <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(plan.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(plan.updated_at).format('MMM D, YYYY HH:mm')}</Text>
                </Stack>
              </Paper>
              <AttachmentPanel tableName="bc_plans" recordId={plan.id} />
            </Stack>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
