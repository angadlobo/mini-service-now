import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Textarea, Select, NumberInput, Group, Button,
  Paper, Text, LoadingOverlay, Tabs, Badge, Table, ActionIcon, Modal, Slider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { projectsApi } from '../../api/projects.api';
import { usersApi } from '../../api/common.api';
import { ActivityStream } from '../../components/common/ActivityStream';
import { AttachmentPanel } from '../../components/common/AttachmentPanel';
import { StateIndicator } from '../../components/common/StateIndicator';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import dayjs from 'dayjs';

export function ProjectForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'waterfall',
    status: 'planning',
    priority: '3',
    phase: 'initiation',
    start_date: '',
    end_date: '',
    budget: '' as string | number,
    actual_cost: '' as string | number,
    owner: '',
    portfolio: '',
    percent_complete: 0,
  });

  // Sub-entity modals
  const [taskModal, setTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ short_description: '', assigned_to: '', status: 'pending', start_date: '', end_date: '' });
  const [milestoneModal, setMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ name: '', due_date: '', status: 'pending' });
  const [memberModal, setMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ user_id: '', role: 'member' });
  const [timeModal, setTimeModal] = useState(false);
  const [timeForm, setTimeForm] = useState({ date: '', hours: '' as string | number, notes: '' });

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !isNew,
  });

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ pageSize: 100 }),
  });

  const { data: tasks } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => projectsApi.listTasks(id!),
    enabled: !isNew,
  });

  const { data: milestones } = useQuery({
    queryKey: ['project-milestones', id],
    queryFn: () => projectsApi.getMilestones(id!),
    enabled: !isNew,
  });

  const { data: members } = useQuery({
    queryKey: ['project-members', id],
    queryFn: () => projectsApi.getMembers(id!),
    enabled: !isNew,
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['project-time-entries', id],
    queryFn: () => projectsApi.getTimeEntries(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        type: project.type || 'waterfall',
        status: project.status || 'planning',
        priority: String(project.priority || 3),
        phase: project.phase || 'initiation',
        start_date: project.start_date ? project.start_date.substring(0, 10) : '',
        end_date: project.end_date ? project.end_date.substring(0, 10) : '',
        budget: project.budget ?? '',
        actual_cost: project.actual_cost ?? '',
        owner: project.owner || '',
        portfolio: project.portfolio || '',
        percent_complete: project.percent_complete || 0,
      });
    }
  }, [project]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: form.name,
        description: form.description || null,
        type: form.type,
        priority: Number(form.priority),
        phase: form.phase,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: form.budget ? Number(form.budget) : null,
        actual_cost: form.actual_cost ? Number(form.actual_cost) : null,
        owner: form.owner || null,
        portfolio: form.portfolio || null,
        percent_complete: form.percent_complete,
      };
      if (isNew) {
        return projectsApi.create(payload);
      }
      if (form.status !== project?.status) payload.status = form.status;
      return projectsApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Project created' : 'Project updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (isNew) navigate(`/projects/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' });
    },
  });

  const addTask = useMutation({
    mutationFn: () => projectsApi.createTask(id!, {
      short_description: taskForm.short_description,
      assigned_to: taskForm.assigned_to || null,
      status: taskForm.status,
      start_date: taskForm.start_date || null,
      end_date: taskForm.end_date || null,
    }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Task added', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', id] });
      setTaskModal(false);
      setTaskForm({ short_description: '', assigned_to: '', status: 'pending', start_date: '', end_date: '' });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add task', color: 'red' });
    },
  });

  const addMilestone = useMutation({
    mutationFn: () => projectsApi.addMilestone(id!, {
      name: milestoneForm.name,
      due_date: milestoneForm.due_date || null,
      status: milestoneForm.status,
    }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Milestone added', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['project-milestones', id] });
      setMilestoneModal(false);
      setMilestoneForm({ name: '', due_date: '', status: 'pending' });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add milestone', color: 'red' });
    },
  });

  const addMember = useMutation({
    mutationFn: () => projectsApi.addMember(id!, { user_id: memberForm.user_id, role: memberForm.role }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Member added', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['project-members', id] });
      setMemberModal(false);
      setMemberForm({ user_id: '', role: 'member' });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add member', color: 'red' });
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(id!, userId),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Member removed', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['project-members', id] });
    },
  });

  const addTimeEntry = useMutation({
    mutationFn: () => projectsApi.addTimeEntry(id!, {
      date: timeForm.date || null,
      hours: timeForm.hours ? Number(timeForm.hours) : null,
      notes: timeForm.notes || null,
    }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Time entry added', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['project-time-entries', id] });
      setTimeModal(false);
      setTimeForm({ date: '', hours: '', notes: '' });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add time entry', color: 'red' });
    },
  });

  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const phaseOptions = [
    { value: 'initiation', label: 'Initiation' },
    { value: 'planning', label: 'Planning' },
    { value: 'execution', label: 'Execution' },
    { value: 'monitoring', label: 'Monitoring' },
    { value: 'closure', label: 'Closure' },
  ];

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/projects')}>
          Back
        </Button>
        <Title order={2}>{isNew ? 'New Project' : `${project?.number || ''}`}</Title>
        {project && <StateIndicator state={project.status} />}
        {project && <PriorityBadge priority={project.priority} />}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />

            <Tabs defaultValue="details">
              <Tabs.List>
                <Tabs.Tab value="details">Details</Tabs.Tab>
                {!isNew && <Tabs.Tab value="tasks">Tasks</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="milestones">Milestones</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="members">Members</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="time">Time Entries</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="journal">Journal</Tabs.Tab>}
              </Tabs.List>

              <Tabs.Panel value="details" pt="md">
                <Stack>
                  <TextInput label="Name" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />

                  <Textarea label="Description" minRows={3} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />

                  <Grid>
                    <Grid.Col span={4}>
                      <Select label="Type" data={[
                        { value: 'waterfall', label: 'Waterfall' },
                        { value: 'agile', label: 'Agile' },
                        { value: 'hybrid', label: 'Hybrid' },
                      ]} value={form.type} onChange={(v) => setForm({ ...form, type: v || 'waterfall' })} />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <Select label="Status" data={statusOptions} value={form.status}
                        onChange={(v) => setForm({ ...form, status: v || form.status })} />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <Select label="Priority" data={[
                        { value: '1', label: 'P1 - Critical' },
                        { value: '2', label: 'P2 - High' },
                        { value: '3', label: 'P3 - Moderate' },
                        { value: '4', label: 'P4 - Low' },
                        { value: '5', label: 'P5 - Planning' },
                      ]} value={form.priority} onChange={(v) => setForm({ ...form, priority: v || '3' })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <Select label="Phase" data={phaseOptions} value={form.phase}
                        onChange={(v) => setForm({ ...form, phase: v || 'initiation' })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select label="Owner" data={userOptions} value={form.owner}
                        onChange={(v) => setForm({ ...form, owner: v || '' })} clearable searchable />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <TextInput label="Start Date" type="date" value={form.start_date}
                        onChange={(e) => setForm({ ...form, start_date: e.currentTarget.value })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput label="End Date" type="date" value={form.end_date}
                        onChange={(e) => setForm({ ...form, end_date: e.currentTarget.value })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <NumberInput label="Budget" prefix="$" decimalScale={2} value={form.budget as number}
                        onChange={(v) => setForm({ ...form, budget: v })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput label="Actual Cost" prefix="$" decimalScale={2} value={form.actual_cost as number}
                        onChange={(v) => setForm({ ...form, actual_cost: v })} />
                    </Grid.Col>
                  </Grid>

                  <TextInput label="Portfolio" value={form.portfolio}
                    onChange={(e) => setForm({ ...form, portfolio: e.currentTarget.value })} />

                  <Stack gap={4}>
                    <Text size="sm" fw={500}>Percent Complete: {form.percent_complete}%</Text>
                    <Slider
                      value={form.percent_complete}
                      onChange={(v) => setForm({ ...form, percent_complete: v })}
                      min={0}
                      max={100}
                      step={1}
                      marks={[
                        { value: 0, label: '0%' },
                        { value: 25, label: '25%' },
                        { value: 50, label: '50%' },
                        { value: 75, label: '75%' },
                        { value: 100, label: '100%' },
                      ]}
                    />
                  </Stack>

                  <Group justify="flex-end" mt="md">
                    <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                      {isNew ? 'Create' : 'Update'}
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              {/* Tasks Tab */}
              {!isNew && (
                <Tabs.Panel value="tasks" pt="md">
                  <Stack>
                    <Group justify="space-between">
                      <Text fw={600}>Tasks</Text>
                      <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setTaskModal(true)}>
                        Add Task
                      </Button>
                    </Group>

                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Number</Table.Th>
                          <Table.Th>Description</Table.Th>
                          <Table.Th>Status</Table.Th>
                          <Table.Th>Assignee</Table.Th>
                          <Table.Th>Start</Table.Th>
                          <Table.Th>End</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {((tasks?.data || (Array.isArray(tasks) ? tasks : [])) as any[]).map((t: any) => (
                          <Table.Tr key={t.id}>
                            <Table.Td><Text size="sm" fw={600} c="blue">{t.number || '-'}</Text></Table.Td>
                            <Table.Td>{t.short_description || '-'}</Table.Td>
                            <Table.Td><StateIndicator state={t.status} /></Table.Td>
                            <Table.Td>{t.assigned_to_name || '-'}</Table.Td>
                            <Table.Td>{t.start_date ? dayjs(t.start_date).format('MMM D, YYYY') : '-'}</Table.Td>
                            <Table.Td>{t.end_date ? dayjs(t.end_date).format('MMM D, YYYY') : '-'}</Table.Td>
                          </Table.Tr>
                        ))}
                        {(!(tasks?.data || tasks) || (tasks?.data || tasks).length === 0) && (
                          <Table.Tr>
                            <Table.Td colSpan={6}>
                              <Text c="dimmed" ta="center" py="md">No tasks</Text>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </Tabs.Panel>
              )}

              {/* Milestones Tab */}
              {!isNew && (
                <Tabs.Panel value="milestones" pt="md">
                  <Stack>
                    <Group justify="space-between">
                      <Text fw={600}>Milestones</Text>
                      <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setMilestoneModal(true)}>
                        Add Milestone
                      </Button>
                    </Group>

                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Name</Table.Th>
                          <Table.Th>Due Date</Table.Th>
                          <Table.Th>Status</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {(milestones || []).map((m: any) => (
                          <Table.Tr key={m.id}>
                            <Table.Td><Text size="sm" fw={600}>{m.name}</Text></Table.Td>
                            <Table.Td>{m.due_date ? dayjs(m.due_date).format('MMM D, YYYY') : '-'}</Table.Td>
                            <Table.Td><StateIndicator state={m.status} /></Table.Td>
                          </Table.Tr>
                        ))}
                        {(milestones || []).length === 0 && (
                          <Table.Tr>
                            <Table.Td colSpan={3}>
                              <Text c="dimmed" ta="center" py="md">No milestones</Text>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </Tabs.Panel>
              )}

              {/* Members Tab */}
              {!isNew && (
                <Tabs.Panel value="members" pt="md">
                  <Stack>
                    <Group justify="space-between">
                      <Text fw={600}>Team Members</Text>
                      <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setMemberModal(true)}>
                        Add Member
                      </Button>
                    </Group>

                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Name</Table.Th>
                          <Table.Th>Role</Table.Th>
                          <Table.Th w={50}></Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {(members || []).map((m: any) => (
                          <Table.Tr key={m.user_id || m.id}>
                            <Table.Td>{m.user_name || m.name || '-'}</Table.Td>
                            <Table.Td><Badge variant="light" size="sm" tt="capitalize">{m.role || 'member'}</Badge></Table.Td>
                            <Table.Td>
                              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeMember.mutate(m.user_id || m.id)}>
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                        {(members || []).length === 0 && (
                          <Table.Tr>
                            <Table.Td colSpan={3}>
                              <Text c="dimmed" ta="center" py="md">No team members</Text>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </Tabs.Panel>
              )}

              {/* Time Entries Tab */}
              {!isNew && (
                <Tabs.Panel value="time" pt="md">
                  <Stack>
                    <Group justify="space-between">
                      <Text fw={600}>Time Entries</Text>
                      <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setTimeModal(true)}>
                        Log Time
                      </Button>
                    </Group>

                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Hours</Table.Th>
                          <Table.Th>User</Table.Th>
                          <Table.Th>Notes</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {(timeEntries || []).map((t: any) => (
                          <Table.Tr key={t.id}>
                            <Table.Td>{t.date ? dayjs(t.date).format('MMM D, YYYY') : '-'}</Table.Td>
                            <Table.Td><Text size="sm" fw={600}>{t.hours || 0}h</Text></Table.Td>
                            <Table.Td>{t.user_name || '-'}</Table.Td>
                            <Table.Td>{t.notes || '-'}</Table.Td>
                          </Table.Tr>
                        ))}
                        {(timeEntries || []).length === 0 && (
                          <Table.Tr>
                            <Table.Td colSpan={4}>
                              <Text c="dimmed" ta="center" py="md">No time entries</Text>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </Tabs.Panel>
              )}

              {/* Journal Tab */}
              {!isNew && (
                <Tabs.Panel value="journal" pt="md">
                  <ActivityStream tableName="projects" recordId={project?.id} />
                </Tabs.Panel>
              )}
            </Tabs>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && project && (
            <Stack>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {project.number}</Text>
                  <Text size="sm"><Text span fw={600}>Type:</Text> {project.type}</Text>
                  <Text size="sm"><Text span fw={600}>Phase:</Text> {project.phase}</Text>
                  <Text size="sm"><Text span fw={600}>Owner:</Text> {project.owner_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Portfolio:</Text> {project.portfolio || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Progress:</Text> {project.percent_complete || 0}%</Text>
                  {project.budget && (
                    <Text size="sm"><Text span fw={600}>Budget:</Text> ${Number(project.budget).toLocaleString()}</Text>
                  )}
                  {project.actual_cost && (
                    <Text size="sm"><Text span fw={600}>Actual Cost:</Text> ${Number(project.actual_cost).toLocaleString()}</Text>
                  )}
                  <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(project.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(project.updated_at).format('MMM D, YYYY HH:mm')}</Text>
                </Stack>
              </Paper>
              <AttachmentPanel tableName="projects" recordId={project.id} />
            </Stack>
          )}
        </Grid.Col>
      </Grid>

      {/* Task Modal */}
      <Modal opened={taskModal} onClose={() => setTaskModal(false)} title="Add Task">
        <Stack>
          <TextInput label="Description" required value={taskForm.short_description}
            onChange={(e) => setTaskForm({ ...taskForm, short_description: e.currentTarget.value })} />
          <Select label="Assigned To" data={userOptions} value={taskForm.assigned_to}
            onChange={(v) => setTaskForm({ ...taskForm, assigned_to: v || '' })} clearable searchable />
          <Select label="Status" data={[
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'blocked', label: 'Blocked' },
          ]} value={taskForm.status} onChange={(v) => setTaskForm({ ...taskForm, status: v || 'pending' })} />
          <Grid>
            <Grid.Col span={6}>
              <TextInput label="Start Date" type="date" value={taskForm.start_date}
                onChange={(e) => setTaskForm({ ...taskForm, start_date: e.currentTarget.value })} />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput label="End Date" type="date" value={taskForm.end_date}
                onChange={(e) => setTaskForm({ ...taskForm, end_date: e.currentTarget.value })} />
            </Grid.Col>
          </Grid>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setTaskModal(false)}>Cancel</Button>
            <Button onClick={() => addTask.mutate()} loading={addTask.isPending} disabled={!taskForm.short_description.trim()}>
              Add Task
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Milestone Modal */}
      <Modal opened={milestoneModal} onClose={() => setMilestoneModal(false)} title="Add Milestone">
        <Stack>
          <TextInput label="Name" required value={milestoneForm.name}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.currentTarget.value })} />
          <TextInput label="Due Date" type="date" value={milestoneForm.due_date}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.currentTarget.value })} />
          <Select label="Status" data={[
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'missed', label: 'Missed' },
          ]} value={milestoneForm.status} onChange={(v) => setMilestoneForm({ ...milestoneForm, status: v || 'pending' })} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setMilestoneModal(false)}>Cancel</Button>
            <Button onClick={() => addMilestone.mutate()} loading={addMilestone.isPending} disabled={!milestoneForm.name.trim()}>
              Add Milestone
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Member Modal */}
      <Modal opened={memberModal} onClose={() => setMemberModal(false)} title="Add Team Member">
        <Stack>
          <Select label="User" required data={userOptions} value={memberForm.user_id}
            onChange={(v) => setMemberForm({ ...memberForm, user_id: v || '' })} searchable />
          <Select label="Role" data={[
            { value: 'owner', label: 'Owner' },
            { value: 'lead', label: 'Lead' },
            { value: 'member', label: 'Member' },
            { value: 'stakeholder', label: 'Stakeholder' },
          ]} value={memberForm.role} onChange={(v) => setMemberForm({ ...memberForm, role: v || 'member' })} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setMemberModal(false)}>Cancel</Button>
            <Button onClick={() => addMember.mutate()} loading={addMember.isPending} disabled={!memberForm.user_id}>
              Add Member
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Time Entry Modal */}
      <Modal opened={timeModal} onClose={() => setTimeModal(false)} title="Log Time">
        <Stack>
          <TextInput label="Date" type="date" value={timeForm.date}
            onChange={(e) => setTimeForm({ ...timeForm, date: e.currentTarget.value })} />
          <NumberInput label="Hours" min={0} step={0.5} decimalScale={1} value={timeForm.hours as number}
            onChange={(v) => setTimeForm({ ...timeForm, hours: v })} />
          <Textarea label="Notes" value={timeForm.notes}
            onChange={(e) => setTimeForm({ ...timeForm, notes: e.currentTarget.value })} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setTimeModal(false)}>Cancel</Button>
            <Button onClick={() => addTimeEntry.mutate()} loading={addTimeEntry.isPending}>
              Log Time
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
