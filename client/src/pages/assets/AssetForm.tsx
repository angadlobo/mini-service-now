import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Textarea, Select, NumberInput, Group, Button,
  Paper, Text, LoadingOverlay, Box, Tabs, Badge, Table, ActionIcon, Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconPlus, IconTrash, IconTimeline } from '@tabler/icons-react';
import { assetsApi, licensesApi } from '../../api/assets.api';
import { usersApi } from '../../api/common.api';
import { ActivityStream } from '../../components/common/ActivityStream';
import { AttachmentPanel } from '../../components/common/AttachmentPanel';
import { useAuthStore } from '../../store/auth';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  on_order: 'blue',
  in_stock: 'cyan',
  in_use: 'green',
  in_repair: 'orange',
  retired: 'gray',
  disposed: 'red',
};

export function AssetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    name: '',
    type: 'hardware',
    status: 'in_stock',
    model: '',
    manufacturer: '',
    serial_number: '',
    asset_tag: '',
    purchase_date: '',
    purchase_cost: '' as string | number,
    warranty_expiry: '',
    depreciation_method: 'straight_line',
    salvage_value: '' as string | number,
    location: '',
    department: '',
    description: '',
    assigned_to: '',
    ci_id: '',
    model_id: '',
    parent_asset_id: '',
  });

  const [lifecycleModal, setLifecycleModal] = useState(false);
  const [lifecycleForm, setLifecycleForm] = useState({ event_type: 'deployed', notes: '' });
  const [installModal, setInstallModal] = useState(false);
  const [installForm, setInstallForm] = useState({ license_id: '', version: '' });

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetsApi.get(id!),
    enabled: !isNew,
  });

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ pageSize: 100 }),
  });

  const { data: lifecycleEvents } = useQuery({
    queryKey: ['asset-lifecycle', id],
    queryFn: () => assetsApi.getLifecycle(id!),
    enabled: !isNew,
  });

  const { data: installations } = useQuery({
    queryKey: ['asset-installations', id],
    queryFn: () => assetsApi.getInstallations(id!),
    enabled: !isNew,
  });

  const { data: licenses } = useQuery({
    queryKey: ['licenses-list'],
    queryFn: () => licensesApi.list({ pageSize: 100 }),
    enabled: !isNew,
  });

  useEffect(() => {
    if (asset) {
      setForm({
        name: asset.name || '',
        type: asset.type || 'hardware',
        status: asset.status || 'in_stock',
        model: asset.model || '',
        manufacturer: asset.manufacturer || '',
        serial_number: asset.serial_number || '',
        asset_tag: asset.asset_tag || '',
        purchase_date: asset.purchase_date || '',
        purchase_cost: asset.purchase_cost || '',
        warranty_expiry: asset.warranty_expiry || '',
        depreciation_method: asset.depreciation_method || 'straight_line',
        salvage_value: asset.salvage_value || '',
        location: asset.location || '',
        department: asset.department || '',
        description: asset.description || '',
        assigned_to: asset.assigned_to || '',
        ci_id: asset.ci_id || '',
        model_id: asset.model_id || '',
        parent_asset_id: asset.parent_asset_id || '',
      });
    }
  }, [asset]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: form.name,
        type: form.type,
        model: form.model || null,
        manufacturer: form.manufacturer || null,
        serial_number: form.serial_number || null,
        asset_tag: form.asset_tag || null,
        purchase_date: form.purchase_date || null,
        purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : null,
        warranty_expiry: form.warranty_expiry || null,
        depreciation_method: form.depreciation_method,
        salvage_value: form.salvage_value ? Number(form.salvage_value) : null,
        location: form.location || null,
        department: form.department || null,
        description: form.description || null,
        assigned_to: form.assigned_to || null,
        ci_id: form.ci_id || null,
        model_id: form.model_id || null,
        parent_asset_id: form.parent_asset_id || null,
      };
      if (isNew) {
        return assetsApi.create(payload);
      }
      if (form.status !== asset?.status) payload.status = form.status;
      return assetsApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Asset created' : 'Asset updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      if (isNew) navigate(`/assets/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['asset', id] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' });
    },
  });

  const addLifecycle = useMutation({
    mutationFn: () => assetsApi.addLifecycleEvent(id!, lifecycleForm),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Lifecycle event added', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['asset-lifecycle', id] });
      setLifecycleModal(false);
      setLifecycleForm({ event_type: 'deployed', notes: '' });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add event', color: 'red' });
    },
  });

  const addInstall = useMutation({
    mutationFn: () => assetsApi.addInstallation(id!, { license_id: installForm.license_id, version: installForm.version || null }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Software installed', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['asset-installations', id] });
      setInstallModal(false);
      setInstallForm({ license_id: '', version: '' });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to install', color: 'red' });
    },
  });

  const removeInstall = useMutation({
    mutationFn: (installationId: string) => assetsApi.removeInstallation(id!, installationId),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Installation removed', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['asset-installations', id] });
    },
  });

  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));
  const licenseOptions = (licenses?.data || []).map((l: any) => ({ value: l.id, label: `${l.number} - ${l.product_name}` }));

  const statusTransitions: Record<string, string[]> = {
    on_order: ['in_stock', 'disposed'],
    in_stock: ['in_use', 'in_repair', 'retired', 'disposed'],
    in_use: ['in_stock', 'in_repair', 'retired', 'disposed'],
    in_repair: ['in_stock', 'in_use', 'retired', 'disposed'],
    retired: ['disposed'],
    disposed: [],
  };

  const statusOptions = isNew
    ? [
        { value: 'on_order', label: 'On Order' },
        { value: 'in_stock', label: 'In Stock' },
      ]
    : (() => {
        const current = asset?.status || 'in_stock';
        const available = statusTransitions[current] || [];
        return [
          { value: current, label: current.replace(/_/g, ' ') },
          ...available.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
        ];
      })();

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/assets')}>
          Back
        </Button>
        <Title order={2}>{isNew ? 'New Asset' : `${asset?.number || ''}`}</Title>
        {asset && <Badge variant="light" color={STATUS_COLORS[asset.status] || 'gray'} size="lg">{asset.status?.replace(/_/g, ' ')}</Badge>}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />

            <Tabs defaultValue="details">
              <Tabs.List>
                <Tabs.Tab value="details">Details</Tabs.Tab>
                {!isNew && <Tabs.Tab value="lifecycle">Lifecycle</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="installations">Software</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="journal">Journal</Tabs.Tab>}
              </Tabs.List>

              <Tabs.Panel value="details" pt="md">
                <Stack>
                  <TextInput label="Name" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />

                  <Grid>
                    <Grid.Col span={6}>
                      <Select label="Type" data={[
                        { value: 'hardware', label: 'Hardware' },
                        { value: 'software', label: 'Software' },
                        { value: 'consumable', label: 'Consumable' },
                      ]} value={form.type} onChange={(v) => setForm({ ...form, type: v || 'hardware' })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select label="Status" data={statusOptions} value={form.status}
                        onChange={(v) => setForm({ ...form, status: v || form.status })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <TextInput label="Manufacturer" value={form.manufacturer}
                        onChange={(e) => setForm({ ...form, manufacturer: e.currentTarget.value })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput label="Model" value={form.model}
                        onChange={(e) => setForm({ ...form, model: e.currentTarget.value })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <TextInput label="Serial Number" value={form.serial_number}
                        onChange={(e) => setForm({ ...form, serial_number: e.currentTarget.value })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput label="Asset Tag" value={form.asset_tag}
                        onChange={(e) => setForm({ ...form, asset_tag: e.currentTarget.value })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <TextInput label="Purchase Date" type="date" value={form.purchase_date}
                        onChange={(e) => setForm({ ...form, purchase_date: e.currentTarget.value })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput label="Purchase Cost" prefix="$" decimalScale={2} value={form.purchase_cost as number}
                        onChange={(v) => setForm({ ...form, purchase_cost: v })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <TextInput label="Warranty Expiry" type="date" value={form.warranty_expiry}
                        onChange={(e) => setForm({ ...form, warranty_expiry: e.currentTarget.value })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select label="Depreciation Method" data={[
                        { value: 'straight_line', label: 'Straight Line' },
                        { value: 'declining_balance', label: 'Declining Balance' },
                        { value: 'none', label: 'None' },
                      ]} value={form.depreciation_method} onChange={(v) => setForm({ ...form, depreciation_method: v || 'straight_line' })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <NumberInput label="Salvage Value" prefix="$" decimalScale={2} value={form.salvage_value as number}
                        onChange={(v) => setForm({ ...form, salvage_value: v })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select label="Assigned To" data={userOptions} value={form.assigned_to}
                        onChange={(v) => setForm({ ...form, assigned_to: v || '' })} clearable searchable />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <TextInput label="Location" value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.currentTarget.value })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput label="Department" value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.currentTarget.value })} />
                    </Grid.Col>
                  </Grid>

                  <Textarea label="Description" minRows={3} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />

                  <Group justify="flex-end">
                    <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                      {isNew ? 'Create' : 'Update'}
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              {!isNew && (
                <Tabs.Panel value="lifecycle" pt="md">
                  <Stack>
                    <Group justify="space-between">
                      <Text fw={600}>Lifecycle Events</Text>
                      <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setLifecycleModal(true)}>
                        Add Event
                      </Button>
                    </Group>

                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Event</Table.Th>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Performed By</Table.Th>
                          <Table.Th>Notes</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {(lifecycleEvents || []).map((e: any) => (
                          <Table.Tr key={e.id}>
                            <Table.Td>
                              <Badge variant="light" size="sm">{e.event_type}</Badge>
                            </Table.Td>
                            <Table.Td>{dayjs(e.event_date).format('MMM D, YYYY HH:mm')}</Table.Td>
                            <Table.Td>{e.performed_by_name || '-'}</Table.Td>
                            <Table.Td>{e.notes || '-'}</Table.Td>
                          </Table.Tr>
                        ))}
                        {(!lifecycleEvents || lifecycleEvents.length === 0) && (
                          <Table.Tr>
                            <Table.Td colSpan={4}>
                              <Text c="dimmed" ta="center" py="md">No lifecycle events recorded</Text>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </Tabs.Panel>
              )}

              {!isNew && (
                <Tabs.Panel value="installations" pt="md">
                  <Stack>
                    <Group justify="space-between">
                      <Text fw={600}>Software Installations</Text>
                      <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setInstallModal(true)}>
                        Install Software
                      </Button>
                    </Group>

                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>License</Table.Th>
                          <Table.Th>Product</Table.Th>
                          <Table.Th>Version</Table.Th>
                          <Table.Th>Installed</Table.Th>
                          <Table.Th>Installed By</Table.Th>
                          <Table.Th w={50}></Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {(installations || []).map((i: any) => (
                          <Table.Tr key={i.id}>
                            <Table.Td><Text size="sm" fw={600} c="blue">{i.license_number}</Text></Table.Td>
                            <Table.Td>{i.product_name}</Table.Td>
                            <Table.Td>{i.version || '-'}</Table.Td>
                            <Table.Td>{i.installed_date ? dayjs(i.installed_date).format('MMM D, YYYY') : '-'}</Table.Td>
                            <Table.Td>{i.installed_by_name || '-'}</Table.Td>
                            <Table.Td>
                              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeInstall.mutate(i.id)}>
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                        {(!installations || installations.length === 0) && (
                          <Table.Tr>
                            <Table.Td colSpan={6}>
                              <Text c="dimmed" ta="center" py="md">No software installed</Text>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </Table.Tbody>
                    </Table>
                  </Stack>
                </Tabs.Panel>
              )}

              {!isNew && (
                <Tabs.Panel value="journal" pt="md">
                  <ActivityStream tableName="assets" recordId={asset?.id} />
                </Tabs.Panel>
              )}
            </Tabs>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && asset && (
            <Stack>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {asset.number}</Text>
                  <Text size="sm"><Text span fw={600}>Type:</Text> {asset.type}</Text>
                  <Text size="sm"><Text span fw={600}>Status:</Text> {asset.status?.replace(/_/g, ' ')}</Text>
                  <Text size="sm"><Text span fw={600}>Assigned To:</Text> {asset.assigned_to_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Created by:</Text> {asset.created_by_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(asset.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(asset.updated_at).format('MMM D, YYYY HH:mm')}</Text>
                  {asset.purchase_cost && (
                    <Text size="sm"><Text span fw={600}>Purchase Cost:</Text> ${Number(asset.purchase_cost).toFixed(2)}</Text>
                  )}
                  {asset.warranty_expiry && (
                    <Text size="sm" c={new Date(asset.warranty_expiry) < new Date() ? 'red' : undefined}>
                      <Text span fw={600}>Warranty Expiry:</Text> {dayjs(asset.warranty_expiry).format('MMM D, YYYY')}
                    </Text>
                  )}
                </Stack>
              </Paper>
              <AttachmentPanel tableName="assets" recordId={asset.id} />
            </Stack>
          )}
        </Grid.Col>
      </Grid>

      {/* Lifecycle Event Modal */}
      <Modal opened={lifecycleModal} onClose={() => setLifecycleModal(false)} title="Add Lifecycle Event">
        <Stack>
          <Select label="Event Type" required data={[
            { value: 'procured', label: 'Procured' },
            { value: 'deployed', label: 'Deployed' },
            { value: 'transferred', label: 'Transferred' },
            { value: 'repaired', label: 'Repaired' },
            { value: 'retired', label: 'Retired' },
            { value: 'disposed', label: 'Disposed' },
          ]} value={lifecycleForm.event_type} onChange={(v) => setLifecycleForm({ ...lifecycleForm, event_type: v || 'deployed' })} />
          <Textarea label="Notes" value={lifecycleForm.notes}
            onChange={(e) => setLifecycleForm({ ...lifecycleForm, notes: e.currentTarget.value })} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setLifecycleModal(false)}>Cancel</Button>
            <Button onClick={() => addLifecycle.mutate()} loading={addLifecycle.isPending}>Add Event</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Install Software Modal */}
      <Modal opened={installModal} onClose={() => setInstallModal(false)} title="Install Software">
        <Stack>
          <Select label="License" required data={licenseOptions} value={installForm.license_id}
            onChange={(v) => setInstallForm({ ...installForm, license_id: v || '' })} searchable />
          <TextInput label="Version" value={installForm.version}
            onChange={(e) => setInstallForm({ ...installForm, version: e.currentTarget.value })} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setInstallModal(false)}>Cancel</Button>
            <Button onClick={() => addInstall.mutate()} loading={addInstall.isPending} disabled={!installForm.license_id}>Install</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
