import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, Grid, TextInput, Textarea, Select, Group, Button, Paper, Text, LoadingOverlay, Box, Tabs, Table, ActionIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconLink, IconUnlink } from '@tabler/icons-react';
import { problemsApi, usersApi } from '../../api/common.api';
import { StateIndicator } from '../../components/common/StateIndicator';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { ActivityStream } from '../../components/common/ActivityStream';
import { AttachmentPanel } from '../../components/common/AttachmentPanel';
import dayjs from 'dayjs';

export function ProblemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    short_description: '', description: '', state: 'new', priority: '4',
    root_cause: '', workaround: '', permanent_solution: '',
    assigned_to: '', assignment_group_id: '',
  });
  const [linkIncidentId, setLinkIncidentId] = useState('');
  const [linkChangeId, setLinkChangeId] = useState('');

  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', id],
    queryFn: () => problemsApi.get(id!),
    enabled: !isNew,
  });

  const { data: users } = useQuery({ queryKey: ['users-list'], queryFn: () => usersApi.list({ pageSize: 100 }) });
  const { data: groups } = useQuery({ queryKey: ['groups-list'], queryFn: () => usersApi.listGroups() });

  const { data: linkedIncidents } = useQuery({
    queryKey: ['problem-incidents', id],
    queryFn: () => problemsApi.getLinkedIncidents(id!),
    enabled: !isNew,
  });

  const { data: linkedChanges } = useQuery({
    queryKey: ['problem-changes', id],
    queryFn: () => problemsApi.getLinkedChanges(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (problem) {
      setForm({
        short_description: problem.short_description || '', description: problem.description || '',
        state: problem.state, priority: String(problem.priority),
        root_cause: problem.root_cause || '', workaround: problem.workaround || '',
        permanent_solution: problem.permanent_solution || '',
        assigned_to: problem.assigned_to || '', assignment_group_id: problem.assignment_group_id || '',
      });
    }
  }, [problem]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        short_description: form.short_description, description: form.description,
        priority: Number(form.priority), assigned_to: form.assigned_to || null,
        assignment_group_id: form.assignment_group_id || null,
        root_cause: form.root_cause || null, workaround: form.workaround || null,
        permanent_solution: form.permanent_solution || null,
      };
      if (isNew) return problemsApi.create(payload);
      if (form.state !== problem?.state) payload.state = form.state;
      return problemsApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Problem created' : 'Problem updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      if (isNew) navigate(`/problems/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['problem', id] });
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' }),
  });

  const linkIncident = useMutation({
    mutationFn: (incidentId: string) => problemsApi.linkIncident(id!, incidentId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['problem-incidents', id] }); setLinkIncidentId(''); },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to link', color: 'red' }),
  });

  const unlinkIncident = useMutation({
    mutationFn: (incidentId: string) => problemsApi.unlinkIncident(id!, incidentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['problem-incidents', id] }),
  });

  const linkChange = useMutation({
    mutationFn: (changeId: string) => problemsApi.linkChange(id!, changeId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['problem-changes', id] }); setLinkChangeId(''); },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to link', color: 'red' }),
  });

  const unlinkChange = useMutation({
    mutationFn: (changeId: string) => problemsApi.unlinkChange(id!, changeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['problem-changes', id] }),
  });

  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));
  const groupOptions = ((groups as any[]) || []).map((g: any) => ({ value: g.id, label: g.name }));

  const transitions: Record<string, string[]> = {
    new: ['investigation'], investigation: ['root_cause_found'],
    root_cause_found: ['fix_in_progress'], fix_in_progress: ['resolved'],
    resolved: ['closed', 'fix_in_progress'], closed: [],
  };
  const stateOptions = isNew ? [] : [
    { value: problem?.state || 'new', label: (problem?.state || 'new').replace(/_/g, ' ') },
    ...(transitions[problem?.state || 'new'] || []).map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
  ];

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/problems')}>Back</Button>
        <Title order={2}>{isNew ? 'New Problem' : problem?.number || ''}</Title>
        {problem && <StateIndicator state={problem.state} />}
        {problem && <PriorityBadge priority={problem.priority} />}
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
                  <Select label="Priority" data={[
                    { value: '1', label: 'P1 - Critical' }, { value: '2', label: 'P2 - High' },
                    { value: '3', label: 'P3 - Moderate' }, { value: '4', label: 'P4 - Low' },
                  ]} value={form.priority} onChange={(v) => setForm({ ...form, priority: v || '4' })} />
                </Grid.Col>
                {!isNew && (
                  <Grid.Col span={6}>
                    <Select label="State" data={stateOptions} value={form.state}
                      onChange={(v) => setForm({ ...form, state: v || form.state })} />
                  </Grid.Col>
                )}
              </Grid>
              <Grid>
                <Grid.Col span={6}>
                  <Select label="Assigned To" data={userOptions} value={form.assigned_to}
                    onChange={(v) => setForm({ ...form, assigned_to: v || '' })} clearable searchable />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select label="Assignment Group" data={groupOptions} value={form.assignment_group_id}
                    onChange={(v) => setForm({ ...form, assignment_group_id: v || '' })} clearable searchable />
                </Grid.Col>
              </Grid>
              <Textarea label="Root Cause" minRows={2} value={form.root_cause}
                onChange={(e) => setForm({ ...form, root_cause: e.currentTarget.value })} />
              <Textarea label="Workaround" minRows={2} value={form.workaround}
                onChange={(e) => setForm({ ...form, workaround: e.currentTarget.value })} />
              <Textarea label="Permanent Solution" minRows={2} value={form.permanent_solution}
                onChange={(e) => setForm({ ...form, permanent_solution: e.currentTarget.value })} />
              <Group justify="flex-end">
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                  {isNew ? 'Create' : 'Update'}
                </Button>
              </Group>
            </Stack>
          </Paper>

          {!isNew && problem && (
            <Box mt="md">
              <Tabs defaultValue="activity">
                <Tabs.List>
                  <Tabs.Tab value="activity">Activity</Tabs.Tab>
                  <Tabs.Tab value="incidents">Related Incidents ({(linkedIncidents as any[])?.length || 0})</Tabs.Tab>
                  <Tabs.Tab value="changes">Related Changes ({(linkedChanges as any[])?.length || 0})</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="activity" pt="sm">
                  <ActivityStream tableName="problems" recordId={problem.id} />
                </Tabs.Panel>

                <Tabs.Panel value="incidents" pt="sm">
                  <Stack gap="sm">
                    <Group>
                      <TextInput placeholder="Incident ID" size="xs" value={linkIncidentId}
                        onChange={(e) => setLinkIncidentId(e.currentTarget.value)} />
                      <Button size="xs" leftSection={<IconLink size={14} />}
                        onClick={() => linkIncidentId && linkIncident.mutate(linkIncidentId)}
                        loading={linkIncident.isPending}>Link</Button>
                    </Group>
                    <Table striped highlightOnHover>
                      <Table.Thead><Table.Tr>
                        <Table.Th>Number</Table.Th><Table.Th>Description</Table.Th>
                        <Table.Th>State</Table.Th><Table.Th w={60} />
                      </Table.Tr></Table.Thead>
                      <Table.Tbody>
                        {((linkedIncidents as any[]) || []).map((inc: any) => (
                          <Table.Tr key={inc.id} style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/incidents/${inc.id}`)}>
                            <Table.Td>{inc.number}</Table.Td>
                            <Table.Td>{inc.short_description}</Table.Td>
                            <Table.Td><StateIndicator state={inc.state} /></Table.Td>
                            <Table.Td>
                              <ActionIcon variant="subtle" color="red" size="sm"
                                onClick={(e) => { e.stopPropagation(); unlinkIncident.mutate(inc.id); }}>
                                <IconUnlink size={14} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="changes" pt="sm">
                  <Stack gap="sm">
                    <Group>
                      <TextInput placeholder="Change ID" size="xs" value={linkChangeId}
                        onChange={(e) => setLinkChangeId(e.currentTarget.value)} />
                      <Button size="xs" leftSection={<IconLink size={14} />}
                        onClick={() => linkChangeId && linkChange.mutate(linkChangeId)}
                        loading={linkChange.isPending}>Link</Button>
                    </Group>
                    <Table striped highlightOnHover>
                      <Table.Thead><Table.Tr>
                        <Table.Th>Number</Table.Th><Table.Th>Description</Table.Th>
                        <Table.Th>State</Table.Th><Table.Th w={60} />
                      </Table.Tr></Table.Thead>
                      <Table.Tbody>
                        {((linkedChanges as any[]) || []).map((chg: any) => (
                          <Table.Tr key={chg.id} style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/changes/${chg.id}`)}>
                            <Table.Td>{chg.number}</Table.Td>
                            <Table.Td>{chg.short_description}</Table.Td>
                            <Table.Td><StateIndicator state={chg.state} /></Table.Td>
                            <Table.Td>
                              <ActionIcon variant="subtle" color="red" size="sm"
                                onClick={(e) => { e.stopPropagation(); unlinkChange.mutate(chg.id); }}>
                                <IconUnlink size={14} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            </Box>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && problem && (
            <Stack>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {problem.number}</Text>
                  <Text size="sm"><Text span fw={600}>Created by:</Text> {problem.created_by_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(problem.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(problem.updated_at).format('MMM D, YYYY HH:mm')}</Text>
                </Stack>
              </Paper>
              <AttachmentPanel tableName="problems" recordId={problem.id} />
            </Stack>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
