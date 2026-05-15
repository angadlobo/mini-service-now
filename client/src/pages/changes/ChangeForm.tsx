import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, Grid, TextInput, Textarea, Select, Group, Button, Paper, Text, LoadingOverlay, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft } from '@tabler/icons-react';
import { changesApi } from '../../api/changes.api';
import { usersApi } from '../../api/common.api';
import { StateIndicator } from '../../components/common/StateIndicator';
import { ActivityStream } from '../../components/common/ActivityStream';
import { AttachmentPanel } from '../../components/common/AttachmentPanel';
import { ApprovalPanel } from '../../components/common/ApprovalPanel';
import dayjs from 'dayjs';

export function ChangeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    short_description: '', description: '', type: 'normal', risk: 'moderate',
    priority: '4', assigned_to: '', assignment_group_id: '', state: 'new',
    planned_start: '', planned_end: '', backout_plan: '', justification: '',
  });

  const { data: change, isLoading } = useQuery({
    queryKey: ['change', id],
    queryFn: () => changesApi.get(id!),
    enabled: !isNew,
  });

  const { data: users } = useQuery({ queryKey: ['users-list'], queryFn: () => usersApi.list({ pageSize: 100 }) });
  const { data: groups } = useQuery({ queryKey: ['groups-list'], queryFn: () => usersApi.listGroups() });

  useEffect(() => {
    if (change) {
      setForm({
        short_description: change.short_description || '', description: change.description || '',
        type: change.type, risk: change.risk, priority: String(change.priority),
        assigned_to: change.assigned_to || '', assignment_group_id: change.assignment_group_id || '',
        state: change.state, planned_start: change.planned_start ? change.planned_start.slice(0, 16) : '',
        planned_end: change.planned_end ? change.planned_end.slice(0, 16) : '',
        backout_plan: change.backout_plan || '', justification: change.justification || '',
      });
    }
  }, [change]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        short_description: form.short_description, description: form.description,
        type: form.type, risk: form.risk, priority: Number(form.priority),
        assigned_to: form.assigned_to || null, assignment_group_id: form.assignment_group_id || null,
        planned_start: form.planned_start || null, planned_end: form.planned_end || null,
        backout_plan: form.backout_plan || null, justification: form.justification || null,
      };
      if (isNew) return changesApi.create(payload);
      if (form.state !== change?.state) payload.state = form.state;
      return changesApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Change created' : 'Change updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['changes'] });
      if (isNew) navigate(`/changes/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['change', id] });
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));
  const groupOptions = ((groups as any[]) || []).map((g: any) => ({ value: g.id, label: g.name }));

  const transitions: Record<string, string[]> = {
    new: ['assess', 'cancelled'], assess: ['authorize', 'cancelled'], authorize: ['scheduled', 'cancelled'],
    scheduled: ['implement', 'cancelled'], implement: ['review', 'cancelled'], review: ['closed', 'cancelled'],
    closed: [], cancelled: [],
  };
  const stateOptions = isNew ? [] : [
    { value: change?.state || 'new', label: (change?.state || 'new').replace(/_/g, ' ') },
    ...(transitions[change?.state || 'new'] || []).map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
  ];

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/changes')}>Back</Button>
        <Title order={2}>{isNew ? 'New Change' : change?.number || ''}</Title>
        {change && <StateIndicator state={change.state} />}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Stack>
              <TextInput label="Short Description" required value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.currentTarget.value })} />
              <Textarea label="Description" minRows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />
              <Grid>
                <Grid.Col span={4}>
                  <Select label="Type" data={[{ value: 'normal', label: 'Normal' }, { value: 'standard', label: 'Standard' }, { value: 'emergency', label: 'Emergency' }]} value={form.type} onChange={(v) => setForm({ ...form, type: v || 'normal' })} />
                </Grid.Col>
                <Grid.Col span={4}>
                  <Select label="Risk" data={[{ value: 'high', label: 'High' }, { value: 'moderate', label: 'Moderate' }, { value: 'low', label: 'Low' }]} value={form.risk} onChange={(v) => setForm({ ...form, risk: v || 'moderate' })} />
                </Grid.Col>
                <Grid.Col span={4}>
                  <Select label="Priority" data={[{ value: '1', label: 'P1 - Critical' }, { value: '2', label: 'P2 - High' }, { value: '3', label: 'P3 - Moderate' }, { value: '4', label: 'P4 - Low' }]} value={form.priority} onChange={(v) => setForm({ ...form, priority: v || '4' })} />
                </Grid.Col>
              </Grid>
              <Grid>
                <Grid.Col span={6}><Select label="Assigned To" data={userOptions} value={form.assigned_to} onChange={(v) => setForm({ ...form, assigned_to: v || '' })} clearable searchable /></Grid.Col>
                <Grid.Col span={6}><Select label="Assignment Group" data={groupOptions} value={form.assignment_group_id} onChange={(v) => setForm({ ...form, assignment_group_id: v || '' })} clearable searchable /></Grid.Col>
              </Grid>
              <Grid>
                <Grid.Col span={6}><TextInput label="Planned Start" type="datetime-local" value={form.planned_start} onChange={(e) => setForm({ ...form, planned_start: e.currentTarget.value })} /></Grid.Col>
                <Grid.Col span={6}><TextInput label="Planned End" type="datetime-local" value={form.planned_end} onChange={(e) => setForm({ ...form, planned_end: e.currentTarget.value })} /></Grid.Col>
              </Grid>
              <Textarea label="Justification" minRows={2} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.currentTarget.value })} />
              <Textarea label="Backout Plan" minRows={2} value={form.backout_plan} onChange={(e) => setForm({ ...form, backout_plan: e.currentTarget.value })} />
              {!isNew && <Select label="State" data={stateOptions} value={form.state} onChange={(v) => setForm({ ...form, state: v || form.state })} />}
              <Group justify="flex-end">
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>{isNew ? 'Create' : 'Update'}</Button>
              </Group>
            </Stack>
          </Paper>
          {!isNew && change && <Box mt="md"><ActivityStream tableName="changes" recordId={change.id} /></Box>}
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && change && (
            <Stack>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {change.number}</Text>
                  <Text size="sm"><Text span fw={600}>Created by:</Text> {change.created_by_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(change.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(change.updated_at).format('MMM D, YYYY HH:mm')}</Text>
                  {change.planned_start && <Text size="sm"><Text span fw={600}>Planned Start:</Text> {dayjs(change.planned_start).format('MMM D, YYYY HH:mm')}</Text>}
                  {change.planned_end && <Text size="sm"><Text span fw={600}>Planned End:</Text> {dayjs(change.planned_end).format('MMM D, YYYY HH:mm')}</Text>}
                </Stack>
              </Paper>
              <ApprovalPanel tableName="changes" recordId={change.id} />
              <AttachmentPanel tableName="changes" recordId={change.id} />
            </Stack>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
