import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Textarea, Select, Group, Button, Paper, Text,
  LoadingOverlay, Box, Badge, Tabs, ActionIcon, Divider, Progress, Tooltip, Table,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconDeviceFloppy, IconArrowLeft, IconRocket, IconPlayerPlay, IconCheck, IconArrowBackUp,
  IconPlus, IconTrash,
} from '@tabler/icons-react';
import { releasesApi } from '../../api/releases.api';
import { changesApi } from '../../api/changes.api';
import { usersApi, cmdbApi } from '../../api/common.api';
import { StateIndicator } from '../../components/common/StateIndicator';
import { ActivityStream } from '../../components/common/ActivityStream';
import { AttachmentPanel } from '../../components/common/AttachmentPanel';
import { ApprovalPanel } from '../../components/common/ApprovalPanel';
import { WorkflowActivity } from '../../components/common/WorkflowActivity';
import dayjs from 'dayjs';

export function ReleaseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState<Record<string, any>>({
    short_description: '', description: '', release_type: 'minor', risk: 'moderate', impact: 'moderate',
    priority: '4', assigned_to: '', assignment_group_id: '', release_manager_id: '', state: 'planning',
    scheduled_start: '', scheduled_end: '',
    implementation_plan: '', test_plan: '', rollback_plan: '', communication_plan: '',
    deployed_version: '', previous_version: '', build_number: '',
  });

  const [addChangeId, setAddChangeId] = useState('');
  const [addCiId, setAddCiId] = useState('');
  const [addStakeholderId, setAddStakeholderId] = useState('');
  const [addStakeholderRole, setAddStakeholderRole] = useState('stakeholder');

  const { data: release, isLoading } = useQuery({
    queryKey: ['release', id],
    queryFn: () => releasesApi.get(id!),
    enabled: !isNew,
  });

  const { data: users } = useQuery({ queryKey: ['users-list'], queryFn: () => usersApi.list({ pageSize: 100 }) });
  const { data: groups } = useQuery({ queryKey: ['groups-list'], queryFn: () => usersApi.listGroups() });
  const { data: cis } = useQuery({ queryKey: ['cis-list'], queryFn: () => cmdbApi.listCis({ pageSize: 200 }) });
  const { data: allChanges } = useQuery({ queryKey: ['changes-list'], queryFn: () => changesApi.list({ pageSize: 200 }) });

  useEffect(() => {
    if (release) {
      setForm({
        short_description: release.short_description || '', description: release.description || '',
        release_type: release.release_type, risk: release.risk, impact: release.impact || 'moderate',
        priority: String(release.priority), assigned_to: release.assigned_to || '',
        assignment_group_id: release.assignment_group_id || '',
        release_manager_id: release.release_manager_id || '', state: release.state,
        scheduled_start: release.scheduled_start ? release.scheduled_start.slice(0, 16) : '',
        scheduled_end: release.scheduled_end ? release.scheduled_end.slice(0, 16) : '',
        implementation_plan: release.implementation_plan || '',
        test_plan: release.test_plan || '',
        rollback_plan: release.rollback_plan || '',
        communication_plan: release.communication_plan || '',
        deployed_version: release.deployed_version || '',
        previous_version: release.previous_version || '',
        build_number: release.build_number || '',
      });
    }
  }, [release]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        short_description: form.short_description, description: form.description,
        release_type: form.release_type, risk: form.risk, impact: form.impact,
        priority: Number(form.priority),
        assigned_to: form.assigned_to || null,
        assignment_group_id: form.assignment_group_id || null,
        release_manager_id: form.release_manager_id || null,
        scheduled_start: form.scheduled_start || null,
        scheduled_end: form.scheduled_end || null,
        implementation_plan: form.implementation_plan || null,
        test_plan: form.test_plan || null,
        rollback_plan: form.rollback_plan || null,
        communication_plan: form.communication_plan || null,
        deployed_version: form.deployed_version || null,
        previous_version: form.previous_version || null,
        build_number: form.build_number || null,
      };
      if (!isNew && form.state !== release?.state) payload.state = form.state;
      if (isNew) return releasesApi.create(payload);
      return releasesApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Release created' : 'Release updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      if (isNew) navigate(`/releases/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['release', id] });
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  const handleAddChange = async () => {
    if (!addChangeId || !id) return;
    try {
      await releasesApi.addChange(id, addChangeId);
      setAddChangeId('');
      queryClient.invalidateQueries({ queryKey: ['release', id] });
      notifications.show({ title: 'Success', message: 'Change linked', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to link change', color: 'red' });
    }
  };

  const handleRemoveChange = async (changeId: string) => {
    if (!id) return;
    try {
      await releasesApi.removeChange(id, changeId);
      queryClient.invalidateQueries({ queryKey: ['release', id] });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const handleAddCi = async () => {
    if (!addCiId || !id) return;
    try {
      await releasesApi.addCi(id, addCiId);
      setAddCiId('');
      queryClient.invalidateQueries({ queryKey: ['release', id] });
      notifications.show({ title: 'Success', message: 'CI linked', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const handleRemoveCi = async (ciId: string) => {
    if (!id) return;
    try {
      await releasesApi.removeCi(id, ciId);
      queryClient.invalidateQueries({ queryKey: ['release', id] });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const handleAddStakeholder = async () => {
    if (!addStakeholderId || !id) return;
    try {
      await releasesApi.addStakeholder(id, addStakeholderId, addStakeholderRole);
      setAddStakeholderId('');
      queryClient.invalidateQueries({ queryKey: ['release', id] });
      notifications.show({ title: 'Success', message: 'Stakeholder added', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const handleRemoveStakeholder = async (userId: string) => {
    if (!id) return;
    try {
      await releasesApi.removeStakeholder(id, userId);
      queryClient.invalidateQueries({ queryKey: ['release', id] });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const handleStartDeployment = async () => {
    if (!id) return;
    try {
      await releasesApi.startDeployment(id);
      queryClient.invalidateQueries({ queryKey: ['release', id] });
      notifications.show({ title: 'Success', message: 'Deployment started', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const handleCompleteDeployment = async () => {
    if (!id) return;
    try {
      await releasesApi.completeDeployment(id);
      queryClient.invalidateQueries({ queryKey: ['release', id] });
      notifications.show({ title: 'Success', message: 'Deployment completed', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const handleRollback = async () => {
    if (!id) return;
    const reason = window.prompt('Reason for rollback:');
    if (reason === null) return;
    try {
      await releasesApi.rollback(id, reason);
      queryClient.invalidateQueries({ queryKey: ['release', id] });
      notifications.show({ title: 'Success', message: 'Release rolled back', color: 'orange' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));
  const groupOptions = ((groups as any[]) || []).map((g: any) => ({ value: g.id, label: g.name }));
  const ciOptions = ((cis?.data || cis || []) as any[]).map((ci: any) => ({ value: ci.id, label: `${ci.number} - ${ci.name}` }));
  const changeOptions = ((allChanges?.data || []) as any[]).map((c: any) => ({ value: c.id, label: `${c.number} - ${c.short_description}` }));

  const transitions: Record<string, string[]> = {
    planning: ['review', 'cancelled'], review: ['approved', 'cancelled'],
    approved: ['in_progress', 'cancelled'], in_progress: ['completed', 'rolled_back', 'cancelled'],
    completed: [], rolled_back: [], cancelled: [],
  };
  const stateOptions = isNew ? [] : [
    { value: release?.state || 'planning', label: (release?.state || 'planning').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) },
    ...(transitions[release?.state || 'planning'] || []).map((s) => ({
      value: s,
      label: s.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    })),
  ];

  const riskScoreColor = (score: number) => score >= 70 ? 'red' : score >= 40 ? 'yellow' : 'green';
  const typeColors: Record<string, string> = { major: 'red', minor: 'blue', patch: 'green', hotfix: 'orange' };

  return (
    <Stack className="fade-in">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/releases')}>Back</Button>
        <Title order={2}>{isNew ? 'New Release' : release?.number || ''}</Title>
        {release && <StateIndicator state={release.state} />}
        {release?.release_type && <Badge color={typeColors[release.release_type] || 'gray'} variant="filled">{release.release_type}</Badge>}
        {release?.risk_score != null && (
          <Tooltip label={`Risk Score: ${release.risk_score}/100`}>
            <Badge color={riskScoreColor(release.risk_score)} variant="light" size="lg">{release.risk_score}</Badge>
          </Tooltip>
        )}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative" className="glass-panel">
            <LoadingOverlay visible={isLoading} />
            <Tabs defaultValue="details">
              <Tabs.List>
                <Tabs.Tab value="details">Details</Tabs.Tab>
                <Tabs.Tab value="planning">Planning</Tabs.Tab>
                <Tabs.Tab value="schedule">Schedule & Versions</Tabs.Tab>
                {!isNew && <Tabs.Tab value="changes">Changes ({release?.changes?.length || 0})</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="cis">CIs ({release?.cis?.length || 0})</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="stakeholders">Stakeholders ({release?.stakeholders?.length || 0})</Tabs.Tab>}
              </Tabs.List>

              <Tabs.Panel value="details" pt="md">
                <Stack>
                  <TextInput label="Short Description" required value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.currentTarget.value })} />
                  <Textarea label="Description" minRows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />
                  <Grid>
                    <Grid.Col span={3}>
                      <Select label="Type" data={[{ value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }, { value: 'patch', label: 'Patch' }, { value: 'hotfix', label: 'Hotfix' }]} value={form.release_type} onChange={(v) => setForm({ ...form, release_type: v || 'minor' })} />
                    </Grid.Col>
                    <Grid.Col span={3}>
                      <Select label="Risk" data={[{ value: 'high', label: 'High' }, { value: 'moderate', label: 'Moderate' }, { value: 'low', label: 'Low' }]} value={form.risk} onChange={(v) => setForm({ ...form, risk: v || 'moderate' })} />
                    </Grid.Col>
                    <Grid.Col span={3}>
                      <Select label="Impact" data={[{ value: 'high', label: 'High' }, { value: 'moderate', label: 'Moderate' }, { value: 'low', label: 'Low' }]} value={form.impact} onChange={(v) => setForm({ ...form, impact: v || 'moderate' })} />
                    </Grid.Col>
                    <Grid.Col span={3}>
                      <Select label="Priority" data={[{ value: '1', label: 'P1 - Critical' }, { value: '2', label: 'P2 - High' }, { value: '3', label: 'P3 - Moderate' }, { value: '4', label: 'P4 - Low' }]} value={form.priority} onChange={(v) => setForm({ ...form, priority: v || '4' })} />
                    </Grid.Col>
                  </Grid>
                  <Grid>
                    <Grid.Col span={4}><Select label="Release Manager" data={userOptions} value={form.release_manager_id} onChange={(v) => setForm({ ...form, release_manager_id: v || '' })} clearable searchable /></Grid.Col>
                    <Grid.Col span={4}><Select label="Assigned To" data={userOptions} value={form.assigned_to} onChange={(v) => setForm({ ...form, assigned_to: v || '' })} clearable searchable /></Grid.Col>
                    <Grid.Col span={4}><Select label="Assignment Group" data={groupOptions} value={form.assignment_group_id} onChange={(v) => setForm({ ...form, assignment_group_id: v || '' })} clearable searchable /></Grid.Col>
                  </Grid>
                  {!isNew && <Select label="State" data={stateOptions} value={form.state} onChange={(v) => setForm({ ...form, state: v || form.state })} />}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="planning" pt="md">
                <Stack>
                  <Textarea label="Implementation Plan" description="Step-by-step deployment details" minRows={3} value={form.implementation_plan} onChange={(e) => setForm({ ...form, implementation_plan: e.currentTarget.value })} />
                  <Textarea label="Test Plan" description="Testing strategy and acceptance criteria" minRows={3} value={form.test_plan} onChange={(e) => setForm({ ...form, test_plan: e.currentTarget.value })} />
                  <Textarea label="Rollback Plan" description="Steps to roll back if deployment fails" minRows={3} value={form.rollback_plan} onChange={(e) => setForm({ ...form, rollback_plan: e.currentTarget.value })} />
                  <Textarea label="Communication Plan" description="Stakeholder notification plan" minRows={2} value={form.communication_plan} onChange={(e) => setForm({ ...form, communication_plan: e.currentTarget.value })} />
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="schedule" pt="md">
                <Stack>
                  <Grid>
                    <Grid.Col span={6}><TextInput label="Scheduled Start" type="datetime-local" value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.currentTarget.value })} /></Grid.Col>
                    <Grid.Col span={6}><TextInput label="Scheduled End" type="datetime-local" value={form.scheduled_end} onChange={(e) => setForm({ ...form, scheduled_end: e.currentTarget.value })} /></Grid.Col>
                  </Grid>
                  {release?.actual_start && (
                    <Grid>
                      <Grid.Col span={6}><TextInput label="Actual Start" value={dayjs(release.actual_start).format('MMM D, YYYY HH:mm')} readOnly /></Grid.Col>
                      <Grid.Col span={6}><TextInput label="Actual End" value={release.actual_end ? dayjs(release.actual_end).format('MMM D, YYYY HH:mm') : 'In progress'} readOnly /></Grid.Col>
                    </Grid>
                  )}
                  <Divider label="Version Info" />
                  <Grid>
                    <Grid.Col span={4}><TextInput label="Deployed Version" value={form.deployed_version} onChange={(e) => setForm({ ...form, deployed_version: e.currentTarget.value })} /></Grid.Col>
                    <Grid.Col span={4}><TextInput label="Previous Version" value={form.previous_version} onChange={(e) => setForm({ ...form, previous_version: e.currentTarget.value })} /></Grid.Col>
                    <Grid.Col span={4}><TextInput label="Build Number" value={form.build_number} onChange={(e) => setForm({ ...form, build_number: e.currentTarget.value })} /></Grid.Col>
                  </Grid>
                </Stack>
              </Tabs.Panel>

              {!isNew && (
                <Tabs.Panel value="changes" pt="md">
                  <Stack>
                    <Group>
                      <Select placeholder="Select a change to link" data={changeOptions} value={addChangeId} onChange={(v) => setAddChangeId(v || '')} searchable clearable style={{ flex: 1 }} />
                      <Button leftSection={<IconPlus size={16} />} onClick={handleAddChange} disabled={!addChangeId}>Add Change</Button>
                    </Group>
                    {release?.changes?.length > 0 && (
                      <Table striped highlightOnHover className="glass-table">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Order</Table.Th>
                            <Table.Th>Number</Table.Th>
                            <Table.Th>Description</Table.Th>
                            <Table.Th>State</Table.Th>
                            <Table.Th>Type</Table.Th>
                            <Table.Th>Deploy Status</Table.Th>
                            <Table.Th w={50}></Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {release.changes.map((c: any) => (
                            <Table.Tr key={c.id}>
                              <Table.Td>{c.sequence_order}</Table.Td>
                              <Table.Td><Text size="sm" fw={500} c="blue" style={{ cursor: 'pointer' }} onClick={() => navigate(`/changes/${c.id}`)}>{c.number}</Text></Table.Td>
                              <Table.Td><Text size="sm" lineClamp={1}>{c.short_description}</Text></Table.Td>
                              <Table.Td><StateIndicator state={c.state} /></Table.Td>
                              <Table.Td><Badge size="sm" variant="light">{c.type}</Badge></Table.Td>
                              <Table.Td><Badge size="sm" color={c.deployment_status === 'deployed' ? 'green' : c.deployment_status === 'rolled_back' ? 'red' : 'gray'} variant="light">{c.deployment_status}</Badge></Table.Td>
                              <Table.Td><ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleRemoveChange(c.id)}><IconTrash size={14} /></ActionIcon></Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    )}
                  </Stack>
                </Tabs.Panel>
              )}

              {!isNew && (
                <Tabs.Panel value="cis" pt="md">
                  <Stack>
                    <Group>
                      <Select placeholder="Select a CI to link" data={ciOptions} value={addCiId} onChange={(v) => setAddCiId(v || '')} searchable clearable style={{ flex: 1 }} />
                      <Button leftSection={<IconPlus size={16} />} onClick={handleAddCi} disabled={!addCiId}>Add CI</Button>
                    </Group>
                    {release?.cis?.length > 0 && (
                      <Table striped highlightOnHover className="glass-table">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Number</Table.Th>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th w={50}></Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {release.cis.map((ci: any) => (
                            <Table.Tr key={ci.id}>
                              <Table.Td><Text size="sm" fw={500}>{ci.number}</Text></Table.Td>
                              <Table.Td><Text size="sm">{ci.name}</Text></Table.Td>
                              <Table.Td><Badge size="sm" variant="light">{ci.status}</Badge></Table.Td>
                              <Table.Td><ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleRemoveCi(ci.id)}><IconTrash size={14} /></ActionIcon></Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    )}
                  </Stack>
                </Tabs.Panel>
              )}

              {!isNew && (
                <Tabs.Panel value="stakeholders" pt="md">
                  <Stack>
                    <Group>
                      <Select placeholder="Select a user" data={userOptions} value={addStakeholderId} onChange={(v) => setAddStakeholderId(v || '')} searchable clearable style={{ flex: 1 }} />
                      <Select placeholder="Role" data={[{ value: 'stakeholder', label: 'Stakeholder' }, { value: 'approver', label: 'Approver' }, { value: 'tester', label: 'Tester' }, { value: 'developer', label: 'Developer' }]} value={addStakeholderRole} onChange={(v) => setAddStakeholderRole(v || 'stakeholder')} w={140} />
                      <Button leftSection={<IconPlus size={16} />} onClick={handleAddStakeholder} disabled={!addStakeholderId}>Add</Button>
                    </Group>
                    {release?.stakeholders?.length > 0 && (
                      <Table striped highlightOnHover className="glass-table">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Email</Table.Th>
                            <Table.Th>Role</Table.Th>
                            <Table.Th w={50}></Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {release.stakeholders.map((s: any) => (
                            <Table.Tr key={s.id}>
                              <Table.Td><Text size="sm">{s.first_name} {s.last_name}</Text></Table.Td>
                              <Table.Td><Text size="sm" c="dimmed">{s.email}</Text></Table.Td>
                              <Table.Td><Badge size="sm" variant="light">{s.role}</Badge></Table.Td>
                              <Table.Td><ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleRemoveStakeholder(s.id)}><IconTrash size={14} /></ActionIcon></Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    )}
                  </Stack>
                </Tabs.Panel>
              )}
            </Tabs>

            <Group justify="flex-end" mt="md">
              {!isNew && release?.state === 'approved' && (
                <Button color="green" leftSection={<IconPlayerPlay size={16} />} onClick={handleStartDeployment}>Start Deployment</Button>
              )}
              {!isNew && release?.state === 'in_progress' && (
                <>
                  <Button color="green" leftSection={<IconCheck size={16} />} onClick={handleCompleteDeployment}>Complete Deployment</Button>
                  <Button color="orange" leftSection={<IconArrowBackUp size={16} />} onClick={handleRollback}>Rollback</Button>
                </>
              )}
              <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>{isNew ? 'Create' : 'Update'}</Button>
            </Group>
          </Paper>

          {!isNew && release && <Box mt="md"><ActivityStream tableName="releases" recordId={release.id} /></Box>}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && release && (
            <Stack>
              <Paper withBorder p="md" className="glass-panel hover-glow">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {release.number}</Text>
                  <Text size="sm"><Text span fw={600}>Type:</Text> <Badge size="sm" color={typeColors[release.release_type] || 'gray'}>{release.release_type}</Badge></Text>
                  <Text size="sm"><Text span fw={600}>Risk Score:</Text> <Badge size="sm" color={riskScoreColor(release.risk_score || 0)}>{release.risk_score || 0}/100</Badge></Text>
                  {release.risk_score != null && <Progress value={release.risk_score} color={riskScoreColor(release.risk_score)} size="sm" />}
                  <Text size="sm"><Text span fw={600}>Changes:</Text> {release.changes?.length || 0}</Text>
                  <Text size="sm"><Text span fw={600}>Affected CIs:</Text> {release.cis?.length || 0}</Text>
                  <Text size="sm"><Text span fw={600}>Stakeholders:</Text> {release.stakeholders?.length || 0}</Text>
                  <Divider />
                  {release.release_manager_name && <Text size="sm"><Text span fw={600}>Release Manager:</Text> {release.release_manager_name}</Text>}
                  <Text size="sm"><Text span fw={600}>Created by:</Text> {release.created_by_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(release.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(release.updated_at).format('MMM D, YYYY HH:mm')}</Text>
                  {release.scheduled_start && <Text size="sm"><Text span fw={600}>Scheduled Start:</Text> {dayjs(release.scheduled_start).format('MMM D, YYYY HH:mm')}</Text>}
                  {release.scheduled_end && <Text size="sm"><Text span fw={600}>Scheduled End:</Text> {dayjs(release.scheduled_end).format('MMM D, YYYY HH:mm')}</Text>}
                  {release.deployed_version && <Text size="sm"><Text span fw={600}>Deployed Version:</Text> {release.deployed_version}</Text>}
                  {release.previous_version && <Text size="sm"><Text span fw={600}>Previous Version:</Text> {release.previous_version}</Text>}
                  {release.build_number && <Text size="sm"><Text span fw={600}>Build Number:</Text> {release.build_number}</Text>}
                </Stack>
              </Paper>
              <ApprovalPanel tableName="releases" recordId={release.id} />
              <WorkflowActivity tableName="releases" recordId={release.id} />
              <AttachmentPanel tableName="releases" recordId={release.id} />
            </Stack>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
