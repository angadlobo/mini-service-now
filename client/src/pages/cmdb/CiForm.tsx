import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Select, NumberInput, Group, Button,
  Paper, Text, LoadingOverlay, Divider, Table, ActionIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { cmdbApi, usersApi } from '../../api/common.api';
import { StateIndicator } from '../../components/common/StateIndicator';
import type { CiStatus, CiRelationship } from '@shared/interfaces';

const STATUS_OPTIONS: { value: CiStatus; label: string }[] = [
  { value: 'inventory', label: 'Inventory' },
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

const REL_TYPE_OPTIONS = [
  { value: 'depends_on', label: 'Depends On' },
  { value: 'runs_on', label: 'Runs On' },
  { value: 'connected_to', label: 'Connected To' },
];

export function CiForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    name: '',
    ci_type_id: '',
    serial_number: '',
    status: 'inventory' as CiStatus,
    owner_id: '',
    location: '',
    cost: 0,
  });

  const [newRel, setNewRel] = useState({ child_ci_id: '', type: 'depends_on' });

  const { data: ci, isLoading } = useQuery({
    queryKey: ['cmdb-ci', id],
    queryFn: () => cmdbApi.getCi(id!),
    enabled: !isNew,
  });

  const { data: ciTypes } = useQuery({
    queryKey: ['cmdb-types'],
    queryFn: () => cmdbApi.listTypes(),
  });

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ pageSize: 100 }),
  });

  const { data: allCis } = useQuery({
    queryKey: ['cmdb-cis-all'],
    queryFn: () => cmdbApi.listCis({ pageSize: 200 }),
    enabled: !isNew,
  });

  const { data: relationships } = useQuery({
    queryKey: ['cmdb-relationships', id],
    queryFn: () => cmdbApi.getRelationships(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (ci) {
      setForm({
        name: ci.name || '',
        ci_type_id: ci.ci_type_id || '',
        serial_number: ci.serial_number || '',
        status: ci.status,
        owner_id: ci.owner_id || '',
        location: ci.location || '',
        cost: ci.cost ?? 0,
      });
    }
  }, [ci]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        ci_type_id: form.ci_type_id,
        serial_number: form.serial_number || null,
        status: form.status,
        owner_id: form.owner_id || null,
        location: form.location || null,
        cost: form.cost,
      };
      return isNew ? cmdbApi.createCi(payload) : cmdbApi.updateCi(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'CI created' : 'CI updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['cmdb-cis'] });
      if (isNew) navigate(`/cmdb/cis/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['cmdb-ci', id] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' });
    },
  });

  const addRel = useMutation({
    mutationFn: () => cmdbApi.addRelationship(id!, newRel),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Relationship added', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['cmdb-relationships', id] });
      setNewRel({ child_ci_id: '', type: 'depends_on' });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add', color: 'red' });
    },
  });

  const removeRel = useMutation({
    mutationFn: (relId: string) => cmdbApi.removeRelationship(id!, relId),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Relationship removed', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['cmdb-relationships', id] });
    },
  });

  const typeOptions = (ciTypes || []).map((t) => ({ value: t.id, label: t.name }));
  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));
  const ciOptions = (allCis?.data || [])
    .filter((c) => c.id !== id)
    .map((c) => ({ value: c.id, label: `${c.number} - ${c.name}` }));

  const ciNameMap = Object.fromEntries((allCis?.data || []).map((c) => [c.id, `${c.number} - ${c.name}`]));

  const renderRelRow = (rel: CiRelationship, direction: 'outgoing' | 'incoming') => (
    <Table.Tr key={rel.id}>
      <Table.Td>{rel.type.replace(/_/g, ' ')}</Table.Td>
      <Table.Td>{direction === 'outgoing' ? ciNameMap[rel.child_ci_id] || rel.child_ci_id : ciNameMap[rel.parent_ci_id] || rel.parent_ci_id}</Table.Td>
      <Table.Td>{direction}</Table.Td>
      <Table.Td w={50}>
        <ActionIcon color="red" variant="subtle" onClick={() => removeRel.mutate(rel.id)}>
          <IconTrash size={16} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  );

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/cmdb/cis')}>
          Back
        </Button>
        <Title order={2}>{isNew ? 'New Configuration Item' : `${ci?.number || ''}`}</Title>
        {ci && <StateIndicator state={ci.status} />}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Stack>
              <TextInput label="Name" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
              <Grid>
                <Grid.Col span={6}>
                  <Select label="CI Type" required data={typeOptions} value={form.ci_type_id}
                    onChange={(v) => setForm({ ...form, ci_type_id: v || '' })} searchable />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select label="Status" data={STATUS_OPTIONS} value={form.status}
                    onChange={(v) => setForm({ ...form, status: (v as CiStatus) || 'inventory' })} />
                </Grid.Col>
              </Grid>
              <Grid>
                <Grid.Col span={6}>
                  <TextInput label="Serial Number" value={form.serial_number}
                    onChange={(e) => setForm({ ...form, serial_number: e.currentTarget.value })} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput label="Cost" min={0} decimalScale={2} prefix="$" value={form.cost}
                    onChange={(v) => setForm({ ...form, cost: Number(v) || 0 })} />
                </Grid.Col>
              </Grid>
              <Grid>
                <Grid.Col span={6}>
                  <Select label="Owner" data={userOptions} value={form.owner_id}
                    onChange={(v) => setForm({ ...form, owner_id: v || '' })} clearable searchable />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput label="Location" value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.currentTarget.value })} />
                </Grid.Col>
              </Grid>
              <Group justify="flex-end">
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                  {isNew ? 'Create' : 'Update'}
                </Button>
              </Group>
            </Stack>
          </Paper>

          {!isNew && (
            <Paper withBorder p="md" mt="md">
              <Title order={4} mb="sm">Relationships</Title>
              <Table striped withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Related CI</Table.Th>
                    <Table.Th>Direction</Table.Th>
                    <Table.Th w={50} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(relationships?.outgoing || []).map((r) => renderRelRow(r, 'outgoing'))}
                  {(relationships?.incoming || []).map((r) => renderRelRow(r, 'incoming'))}
                  {!(relationships?.outgoing?.length || relationships?.incoming?.length) && (
                    <Table.Tr>
                      <Table.Td colSpan={4}><Text c="dimmed" ta="center" size="sm">No relationships</Text></Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>

              <Divider my="sm" />
              <Text size="sm" fw={600} mb="xs">Add Relationship</Text>
              <Group>
                <Select placeholder="Target CI" data={ciOptions} value={newRel.child_ci_id}
                  onChange={(v) => setNewRel({ ...newRel, child_ci_id: v || '' })} searchable style={{ flex: 1 }} />
                <Select data={REL_TYPE_OPTIONS} value={newRel.type}
                  onChange={(v) => setNewRel({ ...newRel, type: v || 'depends_on' })} w={180} />
                <Button leftSection={<IconPlus size={16} />} disabled={!newRel.child_ci_id}
                  onClick={() => addRel.mutate()} loading={addRel.isPending}>
                  Add
                </Button>
              </Group>
            </Paper>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && ci && (
            <Paper withBorder p="md">
              <Stack gap="xs">
                <Text size="sm"><Text span fw={600}>Number:</Text> {ci.number}</Text>
                <Text size="sm"><Text span fw={600}>Type:</Text> {ci.ci_type_name || '-'}</Text>
                <Text size="sm"><Text span fw={600}>Owner:</Text> {ci.owner_name || '-'}</Text>
                <Text size="sm"><Text span fw={600}>Location:</Text> {ci.location || '-'}</Text>
                <Text size="sm"><Text span fw={600}>Serial:</Text> {ci.serial_number || '-'}</Text>
                <Text size="sm"><Text span fw={600}>Cost:</Text> ${ci.cost?.toFixed(2) ?? '0.00'}</Text>
                <Text size="sm"><Text span fw={600}>Created by:</Text> {ci.created_by || '-'}</Text>
              </Stack>
            </Paper>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
