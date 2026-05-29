import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Select, Group, Button, Paper, Text,
  LoadingOverlay, Switch, ActionIcon, Table, Badge, NumberInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { escalationApi } from '../../api/oncall.api';
import { usersApi } from '../../api/common.api';

export function EscalationPolicyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState<Record<string, any>>({
    name: '',
    assignment_group_id: '',
    enabled: true,
  });

  const [levelForm, setLevelForm] = useState<Record<string, any>>({
    level: 1,
    delay_minutes: 15,
    notify_oncall: true,
    notify_user_id: '',
    notify_group_id: '',
    action: 'notify',
  });

  const { data: policy, isLoading } = useQuery({
    queryKey: ['escalation-policy', id],
    queryFn: () => escalationApi.getPolicy(id!),
    enabled: !isNew,
  });

  const { data: users } = useQuery({ queryKey: ['users-list'], queryFn: () => usersApi.list({ pageSize: 100 }) });
  const { data: groups } = useQuery({ queryKey: ['groups-list'], queryFn: () => usersApi.listGroups() });

  useEffect(() => {
    if (policy) {
      setForm({
        name: policy.name || '',
        assignment_group_id: policy.assignment_group_id || '',
        enabled: policy.enabled ?? true,
      });
      // Auto-set next level number
      const maxLevel = policy.levels?.reduce((max: number, l: any) => Math.max(max, l.level), 0) || 0;
      setLevelForm(prev => ({ ...prev, level: maxLevel + 1 }));
    }
  }, [policy]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: form.name,
        assignment_group_id: form.assignment_group_id || null,
        enabled: form.enabled,
      };
      if (isNew) return escalationApi.createPolicy(payload);
      return escalationApi.updatePolicy(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Policy created' : 'Policy updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['escalation-policies'] });
      if (isNew) navigate(`/oncall/policies/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['escalation-policy', id] });
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  const handleAddLevel = async () => {
    if (!id) return;
    try {
      await escalationApi.addLevel(id, {
        level: levelForm.level,
        delay_minutes: levelForm.delay_minutes,
        notify_oncall: levelForm.notify_oncall,
        notify_user_id: levelForm.notify_user_id || null,
        notify_group_id: levelForm.notify_group_id || null,
        action: levelForm.action,
      });
      queryClient.invalidateQueries({ queryKey: ['escalation-policy', id] });
      notifications.show({ title: 'Success', message: 'Escalation level added', color: 'green' });
      setLevelForm(prev => ({
        ...prev,
        level: prev.level + 1,
        notify_user_id: '',
        notify_group_id: '',
      }));
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add level', color: 'red' });
    }
  };

  const handleDeleteLevel = async (levelId: string) => {
    try {
      await escalationApi.deleteLevel(levelId);
      queryClient.invalidateQueries({ queryKey: ['escalation-policy', id] });
      notifications.show({ title: 'Success', message: 'Level removed', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this policy?')) return;
    try {
      await escalationApi.deletePolicy(id);
      queryClient.invalidateQueries({ queryKey: ['escalation-policies'] });
      notifications.show({ title: 'Success', message: 'Policy deleted', color: 'green' });
      navigate('/oncall/policies');
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' });
    }
  };

  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));
  const groupOptions = ((groups as any[]) || []).map((g: any) => ({ value: g.id, label: g.name }));

  const actionColors: Record<string, string> = { notify: 'blue', reassign: 'orange', page: 'red' };

  return (
    <Stack className="fade-in">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/oncall/policies')}>Back</Button>
        <Title order={2}>{isNew ? 'New Escalation Policy' : policy?.name || ''}</Title>
        {policy && (
          <Badge color={policy.enabled ? 'green' : 'gray'} variant="filled">
            {policy.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        )}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative" className="glass-panel">
            <LoadingOverlay visible={isLoading} />
            <Stack>
              <TextInput label="Policy Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
              <Grid>
                <Grid.Col span={8}>
                  <Select label="Assignment Group" data={groupOptions} value={form.assignment_group_id} onChange={(v) => setForm({ ...form, assignment_group_id: v || '' })} clearable searchable />
                </Grid.Col>
                <Grid.Col span={4}>
                  <Group mt={25}>
                    <Switch label="Enabled" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.currentTarget.checked })} />
                  </Group>
                </Grid.Col>
              </Grid>

              {!isNew && (
                <>
                  <Title order={4} mt="md">Escalation Levels</Title>
                  <Paper withBorder p="sm">
                    <Text size="sm" fw={600} mb="sm">Add Level</Text>
                    <Grid>
                      <Grid.Col span={2}>
                        <NumberInput label="Level" value={levelForm.level} onChange={(v) => setLevelForm({ ...levelForm, level: v })} min={1} />
                      </Grid.Col>
                      <Grid.Col span={2}>
                        <NumberInput label="Delay (min)" value={levelForm.delay_minutes} onChange={(v) => setLevelForm({ ...levelForm, delay_minutes: v })} min={0} />
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <Select label="Action" data={[
                          { value: 'notify', label: 'Notify' },
                          { value: 'reassign', label: 'Reassign' },
                          { value: 'page', label: 'Page' },
                        ]} value={levelForm.action} onChange={(v) => setLevelForm({ ...levelForm, action: v || 'notify' })} />
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <Select label="Notify User" data={userOptions} value={levelForm.notify_user_id} onChange={(v) => setLevelForm({ ...levelForm, notify_user_id: v || '' })} clearable searchable />
                      </Grid.Col>
                      <Grid.Col span={2}>
                        <Group mt={25}>
                          <Switch label="On-Call" checked={levelForm.notify_oncall} onChange={(e) => setLevelForm({ ...levelForm, notify_oncall: e.currentTarget.checked })} size="sm" />
                        </Group>
                      </Grid.Col>
                    </Grid>
                    <Group mt="sm">
                      <Select label="Notify Group" data={groupOptions} value={levelForm.notify_group_id} onChange={(v) => setLevelForm({ ...levelForm, notify_group_id: v || '' })} clearable searchable style={{ flex: 1 }} />
                      <Button leftSection={<IconPlus size={16} />} onClick={handleAddLevel} mt={25}>Add Level</Button>
                    </Group>
                  </Paper>

                  {policy?.levels?.length > 0 && (
                    <Table striped highlightOnHover className="glass-table">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Level</Table.Th>
                          <Table.Th>Delay</Table.Th>
                          <Table.Th>Action</Table.Th>
                          <Table.Th>Notify On-Call</Table.Th>
                          <Table.Th>Notify User</Table.Th>
                          <Table.Th>Notify Group</Table.Th>
                          <Table.Th w={50}></Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {policy.levels.map((level: any) => (
                          <Table.Tr key={level.id}>
                            <Table.Td><Badge size="lg" variant="filled" color="blue">{level.level}</Badge></Table.Td>
                            <Table.Td>{level.delay_minutes} min</Table.Td>
                            <Table.Td><Badge color={actionColors[level.action] || 'gray'} variant="light">{level.action}</Badge></Table.Td>
                            <Table.Td>{level.notify_oncall ? 'Yes' : 'No'}</Table.Td>
                            <Table.Td>{level.notify_user_name || '-'}</Table.Td>
                            <Table.Td>{level.notify_group_name || '-'}</Table.Td>
                            <Table.Td>
                              <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleDeleteLevel(level.id)}>
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </>
              )}
            </Stack>

            <Group justify="space-between" mt="md">
              {!isNew && (
                <Button color="red" variant="subtle" onClick={handleDelete}>Delete Policy</Button>
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
          {!isNew && policy && (
            <Paper withBorder p="md" className="glass-panel hover-glow">
              <Stack gap="xs">
                <Text size="sm"><Text span fw={600}>Policy:</Text> {policy.name}</Text>
                <Text size="sm"><Text span fw={600}>Status:</Text> <Badge size="sm" color={policy.enabled ? 'green' : 'gray'}>{policy.enabled ? 'Enabled' : 'Disabled'}</Badge></Text>
                <Text size="sm"><Text span fw={600}>Group:</Text> {policy.group_name || '-'}</Text>
                <Text size="sm"><Text span fw={600}>Levels:</Text> {policy.levels?.length || 0}</Text>
              </Stack>
            </Paper>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
