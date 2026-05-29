import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Select, Group, Button, Paper, Text,
  LoadingOverlay, Tabs, ActionIcon, Table, Badge, Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { oncallApi } from '../../api/oncall.api';
import { usersApi } from '../../api/common.api';
import dayjs from 'dayjs';

export function OnCallScheduleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState<Record<string, any>>({
    name: '',
    assignment_group_id: '',
    timezone: 'UTC',
    rotation_type: 'weekly',
    handoff_time: '09:00',
  });

  const [rotationForm, setRotationForm] = useState<Record<string, any>>({
    user_id: '',
    start_date: '',
    end_date: '',
  });

  const [overrideForm, setOverrideForm] = useState<Record<string, any>>({
    user_id: '',
    override_user_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['oncall-schedule', id],
    queryFn: () => oncallApi.getSchedule(id!),
    enabled: !isNew,
  });

  const { data: users } = useQuery({ queryKey: ['users-list'], queryFn: () => usersApi.list({ pageSize: 100 }) });
  const { data: groups } = useQuery({ queryKey: ['groups-list'], queryFn: () => usersApi.listGroups() });

  useEffect(() => {
    if (schedule) {
      setForm({
        name: schedule.name || '',
        assignment_group_id: schedule.assignment_group_id || '',
        timezone: schedule.timezone || 'UTC',
        rotation_type: schedule.rotation_type || 'weekly',
        handoff_time: schedule.handoff_time || '09:00',
      });
    }
  }, [schedule]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: form.name,
        assignment_group_id: form.assignment_group_id || null,
        timezone: form.timezone,
        rotation_type: form.rotation_type,
        handoff_time: form.handoff_time,
      };
      if (isNew) return oncallApi.createSchedule(payload);
      return oncallApi.updateSchedule(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Schedule created' : 'Schedule updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['oncall-schedules'] });
      if (isNew) navigate(`/oncall/schedules/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['oncall-schedule', id] });
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  const handleAddRotation = async () => {
    if (!rotationForm.user_id || !rotationForm.start_date || !rotationForm.end_date || !id) return;
    try {
      await oncallApi.addRotation(id, rotationForm);
      setRotationForm({ user_id: '', start_date: '', end_date: '' });
      queryClient.invalidateQueries({ queryKey: ['oncall-schedule', id] });
      notifications.show({ title: 'Success', message: 'Rotation added', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add rotation', color: 'red' });
    }
  };

  const handleDeleteRotation = async (rotationId: string) => {
    try {
      await oncallApi.deleteRotation(rotationId);
      queryClient.invalidateQueries({ queryKey: ['oncall-schedule', id] });
      notifications.show({ title: 'Success', message: 'Rotation removed', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const handleAddOverride = async () => {
    if (!overrideForm.user_id || !overrideForm.override_user_id || !overrideForm.start_date || !overrideForm.end_date || !id) return;
    try {
      await oncallApi.addOverride(id, overrideForm);
      setOverrideForm({ user_id: '', override_user_id: '', start_date: '', end_date: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: ['oncall-schedule', id] });
      notifications.show({ title: 'Success', message: 'Override added', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add override', color: 'red' });
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    try {
      await oncallApi.deleteOverride(overrideId);
      queryClient.invalidateQueries({ queryKey: ['oncall-schedule', id] });
      notifications.show({ title: 'Success', message: 'Override removed', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await oncallApi.deleteSchedule(id);
      queryClient.invalidateQueries({ queryKey: ['oncall-schedules'] });
      notifications.show({ title: 'Success', message: 'Schedule deleted', color: 'green' });
      navigate('/oncall/schedules');
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));
  const groupOptions = ((groups as any[]) || []).map((g: any) => ({ value: g.id, label: g.name }));

  const timezoneOptions = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai',
    'Asia/Kolkata', 'Australia/Sydney', 'Pacific/Auckland',
  ].map(tz => ({ value: tz, label: tz }));

  return (
    <Stack className="fade-in">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/oncall/schedules')}>Back</Button>
        <Title order={2}>{isNew ? 'New On-Call Schedule' : schedule?.name || ''}</Title>
        {schedule?.rotation_type && <Badge variant="light">{schedule.rotation_type}</Badge>}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative" className="glass-panel">
            <LoadingOverlay visible={isLoading} />
            <Tabs defaultValue="details">
              <Tabs.List>
                <Tabs.Tab value="details">Details</Tabs.Tab>
                {!isNew && <Tabs.Tab value="rotations">Rotations ({schedule?.rotations?.length || 0})</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="overrides">Overrides ({schedule?.overrides?.length || 0})</Tabs.Tab>}
              </Tabs.List>

              <Tabs.Panel value="details" pt="md">
                <Stack>
                  <TextInput label="Schedule Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
                  <Grid>
                    <Grid.Col span={4}>
                      <Select label="Rotation Type" data={[
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'custom', label: 'Custom' },
                      ]} value={form.rotation_type} onChange={(v) => setForm({ ...form, rotation_type: v || 'weekly' })} />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <Select label="Timezone" data={timezoneOptions} value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v || 'UTC' })} searchable />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <TextInput label="Handoff Time" type="time" value={form.handoff_time} onChange={(e) => setForm({ ...form, handoff_time: e.currentTarget.value })} />
                    </Grid.Col>
                  </Grid>
                  <Select label="Assignment Group" data={groupOptions} value={form.assignment_group_id} onChange={(v) => setForm({ ...form, assignment_group_id: v || '' })} clearable searchable />
                </Stack>
              </Tabs.Panel>

              {!isNew && (
                <Tabs.Panel value="rotations" pt="md">
                  <Stack>
                    <Paper withBorder p="sm">
                      <Text size="sm" fw={600} mb="sm">Add Rotation</Text>
                      <Group align="end">
                        <Select label="User" data={userOptions} value={rotationForm.user_id} onChange={(v) => setRotationForm({ ...rotationForm, user_id: v || '' })} searchable clearable style={{ flex: 1 }} />
                        <TextInput label="Start Date" type="date" value={rotationForm.start_date} onChange={(e) => setRotationForm({ ...rotationForm, start_date: e.currentTarget.value })} />
                        <TextInput label="End Date" type="date" value={rotationForm.end_date} onChange={(e) => setRotationForm({ ...rotationForm, end_date: e.currentTarget.value })} />
                        <Button leftSection={<IconPlus size={16} />} onClick={handleAddRotation} disabled={!rotationForm.user_id || !rotationForm.start_date || !rotationForm.end_date}>Add</Button>
                      </Group>
                    </Paper>

                    {schedule?.rotations?.length > 0 && (
                      <Table striped highlightOnHover className="glass-table">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Order</Table.Th>
                            <Table.Th>User</Table.Th>
                            <Table.Th>Start Date</Table.Th>
                            <Table.Th>End Date</Table.Th>
                            <Table.Th w={50}></Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {schedule.rotations.map((rot: any) => (
                            <Table.Tr key={rot.id}>
                              <Table.Td>{rot.order_index}</Table.Td>
                              <Table.Td><Text size="sm" fw={500}>{rot.user_name || '-'}</Text></Table.Td>
                              <Table.Td>{dayjs(rot.start_date).format('MMM D, YYYY')}</Table.Td>
                              <Table.Td>{dayjs(rot.end_date).format('MMM D, YYYY')}</Table.Td>
                              <Table.Td>
                                <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleDeleteRotation(rot.id)}>
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    )}
                  </Stack>
                </Tabs.Panel>
              )}

              {!isNew && (
                <Tabs.Panel value="overrides" pt="md">
                  <Stack>
                    <Paper withBorder p="sm">
                      <Text size="sm" fw={600} mb="sm">Add Override</Text>
                      <Grid>
                        <Grid.Col span={6}>
                          <Select label="Original User" data={userOptions} value={overrideForm.user_id} onChange={(v) => setOverrideForm({ ...overrideForm, user_id: v || '' })} searchable clearable />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Select label="Override User" data={userOptions} value={overrideForm.override_user_id} onChange={(v) => setOverrideForm({ ...overrideForm, override_user_id: v || '' })} searchable clearable />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <TextInput label="Start" type="datetime-local" value={overrideForm.start_date} onChange={(e) => setOverrideForm({ ...overrideForm, start_date: e.currentTarget.value })} />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <TextInput label="End" type="datetime-local" value={overrideForm.end_date} onChange={(e) => setOverrideForm({ ...overrideForm, end_date: e.currentTarget.value })} />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <Textarea label="Reason" value={overrideForm.reason} onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.currentTarget.value })} minRows={1} />
                        </Grid.Col>
                      </Grid>
                      <Group justify="flex-end" mt="sm">
                        <Button leftSection={<IconPlus size={16} />} onClick={handleAddOverride} disabled={!overrideForm.user_id || !overrideForm.override_user_id || !overrideForm.start_date || !overrideForm.end_date}>
                          Add Override
                        </Button>
                      </Group>
                    </Paper>

                    {schedule?.overrides?.length > 0 && (
                      <Table striped highlightOnHover className="glass-table">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Original User</Table.Th>
                            <Table.Th>Override User</Table.Th>
                            <Table.Th>Start</Table.Th>
                            <Table.Th>End</Table.Th>
                            <Table.Th>Reason</Table.Th>
                            <Table.Th w={50}></Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {schedule.overrides.map((ov: any) => (
                            <Table.Tr key={ov.id}>
                              <Table.Td>{ov.user_name || '-'}</Table.Td>
                              <Table.Td><Text size="sm" fw={500}>{ov.override_user_name || '-'}</Text></Table.Td>
                              <Table.Td>{dayjs(ov.start_date).format('MMM D, YYYY HH:mm')}</Table.Td>
                              <Table.Td>{dayjs(ov.end_date).format('MMM D, YYYY HH:mm')}</Table.Td>
                              <Table.Td><Text size="sm" lineClamp={1}>{ov.reason || '-'}</Text></Table.Td>
                              <Table.Td>
                                <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleDeleteOverride(ov.id)}>
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    )}
                  </Stack>
                </Tabs.Panel>
              )}
            </Tabs>

            <Group justify="space-between" mt="md">
              {!isNew && (
                <Button color="red" variant="subtle" onClick={handleDelete}>Delete Schedule</Button>
              )}
              <Group ml="auto">
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                  {isNew ? 'Create' : 'Update'}
                </Button>
              </Group>
            </Group>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && schedule && (
            <Paper withBorder p="md" className="glass-panel hover-glow">
              <Stack gap="xs">
                <Text size="sm"><Text span fw={600}>Schedule:</Text> {schedule.name}</Text>
                <Text size="sm"><Text span fw={600}>Rotation Type:</Text> <Badge size="sm" variant="light">{schedule.rotation_type}</Badge></Text>
                <Text size="sm"><Text span fw={600}>Timezone:</Text> {schedule.timezone}</Text>
                <Text size="sm"><Text span fw={600}>Handoff Time:</Text> {schedule.handoff_time}</Text>
                <Text size="sm"><Text span fw={600}>Group:</Text> {schedule.group_name || '-'}</Text>
                <Text size="sm"><Text span fw={600}>Rotations:</Text> {schedule.rotations?.length || 0}</Text>
                <Text size="sm"><Text span fw={600}>Overrides:</Text> {schedule.overrides?.length || 0}</Text>
                <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(schedule.created_at).format('MMM D, YYYY HH:mm')}</Text>
                <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(schedule.updated_at).format('MMM D, YYYY HH:mm')}</Text>
              </Stack>
            </Paper>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
