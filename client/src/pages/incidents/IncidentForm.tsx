import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, Grid, TextInput, Textarea, Select, Group, Button, Paper, Text, LoadingOverlay, Box, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft } from '@tabler/icons-react';
import { incidentsApi } from '../../api/incidents.api';
import { usersApi } from '../../api/common.api';
import { StateIndicator } from '../../components/common/StateIndicator';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { ActivityStream } from '../../components/common/ActivityStream';
import { AttachmentPanel } from '../../components/common/AttachmentPanel';
import { useAuthStore } from '../../store/auth';
import dayjs from 'dayjs';

export function IncidentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    short_description: '',
    description: '',
    urgency: '3',
    impact: '3',
    caller_id: '',
    assigned_to: '',
    assignment_group_id: '',
    state: 'new',
    resolution_notes: '',
  });

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentsApi.get(id!),
    enabled: !isNew,
  });

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ pageSize: 100 }),
  });

  const { data: groups } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => usersApi.listGroups(),
  });

  useEffect(() => {
    if (incident) {
      setForm({
        short_description: incident.short_description || '',
        description: incident.description || '',
        urgency: String(incident.urgency),
        impact: String(incident.impact),
        caller_id: incident.caller_id || '',
        assigned_to: incident.assigned_to || '',
        assignment_group_id: incident.assignment_group_id || '',
        state: incident.state,
        resolution_notes: incident.resolution_notes || '',
      });
    }
  }, [incident]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        short_description: form.short_description,
        description: form.description,
        urgency: Number(form.urgency),
        impact: Number(form.impact),
        assigned_to: form.assigned_to || null,
        assignment_group_id: form.assignment_group_id || null,
      };
      if (isNew) {
        payload.caller_id = form.caller_id || user?.id;
        return incidentsApi.create(payload);
      }
      if (form.state !== incident?.state) payload.state = form.state;
      if (form.resolution_notes) payload.resolution_notes = form.resolution_notes;
      return incidentsApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Incident created' : 'Incident updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      if (isNew) navigate(`/incidents/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['incident', id] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' });
    },
  });

  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));
  const groupOptions = ((groups as any[]) || []).map((g: any) => ({ value: g.id, label: g.name }));

  const stateOptions = isNew ? [] : (() => {
    const transitions: Record<string, string[]> = {
      new: ['in_progress', 'cancelled'],
      in_progress: ['on_hold', 'resolved', 'cancelled'],
      on_hold: ['in_progress', 'cancelled'],
      resolved: ['closed', 'in_progress'],
      closed: [], cancelled: [],
    };
    const available = transitions[incident?.state || 'new'] || [];
    return [
      { value: incident?.state || 'new', label: (incident?.state || 'new').replace(/_/g, ' ') },
      ...available.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
    ];
  })();

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/incidents')}>
          Back
        </Button>
        <Title order={2}>{isNew ? 'New Incident' : `${incident?.number || ''}`}</Title>
        {incident && <StateIndicator state={incident.state} />}
        {incident && <PriorityBadge priority={incident.priority} />}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Stack>
              <TextInput label="Short Description" required value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.currentTarget.value })} />
              <Textarea label="Description" minRows={3} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />

              <Grid>
                <Grid.Col span={6}>
                  <Select label="Urgency" data={[
                    { value: '1', label: 'High' }, { value: '2', label: 'Medium' }, { value: '3', label: 'Low' },
                  ]} value={form.urgency} onChange={(v) => setForm({ ...form, urgency: v || '3' })} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select label="Impact" data={[
                    { value: '1', label: 'High' }, { value: '2', label: 'Medium' }, { value: '3', label: 'Low' },
                  ]} value={form.impact} onChange={(v) => setForm({ ...form, impact: v || '3' })} />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={6}>
                  <Select label="Assigned To" data={userOptions} value={form.assigned_to} onChange={(v) => setForm({ ...form, assigned_to: v || '' })} clearable searchable />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select label="Assignment Group" data={groupOptions} value={form.assignment_group_id} onChange={(v) => setForm({ ...form, assignment_group_id: v || '' })} clearable searchable />
                </Grid.Col>
              </Grid>

              {!isNew && (
                <Select label="State" data={stateOptions} value={form.state} onChange={(v) => setForm({ ...form, state: v || form.state })} />
              )}

              {(form.state === 'resolved' || incident?.state === 'resolved') && (
                <Textarea label="Resolution Notes" minRows={2} value={form.resolution_notes}
                  onChange={(e) => setForm({ ...form, resolution_notes: e.currentTarget.value })} />
              )}

              <Group justify="flex-end">
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                  {isNew ? 'Create' : 'Update'}
                </Button>
              </Group>
            </Stack>
          </Paper>

          {!isNew && incident && (
            <Box mt="md">
              <ActivityStream tableName="incidents" recordId={incident.id} />
            </Box>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && incident && (
            <Stack>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {incident.number}</Text>
                  <Text size="sm"><Text span fw={600}>Caller:</Text> {incident.caller_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Created by:</Text> {incident.created_by_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(incident.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(incident.updated_at).format('MMM D, YYYY HH:mm')}</Text>
                  {incident.sla_due && (
                    <Text size="sm" c={new Date(incident.sla_due) < new Date() ? 'red' : undefined}>
                      <Text span fw={600}>SLA Due:</Text> {dayjs(incident.sla_due).format('MMM D, YYYY HH:mm')}
                    </Text>
                  )}
                  {incident.resolved_at && <Text size="sm"><Text span fw={600}>Resolved:</Text> {dayjs(incident.resolved_at).format('MMM D, YYYY HH:mm')}</Text>}
                </Stack>
              </Paper>
              <AttachmentPanel tableName="incidents" recordId={incident.id} />
            </Stack>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
