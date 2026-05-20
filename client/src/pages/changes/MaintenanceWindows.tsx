import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Paper, Badge, Text, TextInput, Textarea, Select, Modal, Table, Tabs, ActionIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash, IconCalendarEvent, IconShieldOff } from '@tabler/icons-react';
import { changesApi } from '../../api/changes.api';
import dayjs from 'dayjs';

export function MaintenanceWindows() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>('maintenance');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [modalType, setModalType] = useState<'maintenance' | 'blackout'>('maintenance');

  const [form, setForm] = useState({
    name: '', description: '', reason: '', start_time: '', end_time: '',
    recurrence: 'none', severity: 'hard',
  });

  const { data: maintenanceWindows = [] } = useQuery({
    queryKey: ['maintenance-windows'],
    queryFn: () => changesApi.listMaintenanceWindows(),
  });

  const { data: blackoutWindows = [] } = useQuery({
    queryKey: ['blackout-windows'],
    queryFn: () => changesApi.listBlackoutWindows(),
  });

  const saveMaintenance = useMutation({
    mutationFn: () => {
      const data = { name: form.name, description: form.description, start_time: form.start_time, end_time: form.end_time, recurrence: form.recurrence };
      if (editingItem) return changesApi.updateMaintenanceWindow(editingItem.id, data);
      return changesApi.createMaintenanceWindow(data);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: editingItem ? 'Window updated' : 'Window created', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['maintenance-windows'] });
      closeModal();
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  const saveBlackout = useMutation({
    mutationFn: () => {
      const data = { name: form.name, reason: form.reason, start_time: form.start_time, end_time: form.end_time, severity: form.severity };
      if (editingItem) return changesApi.updateBlackoutWindow(editingItem.id, data);
      return changesApi.createBlackoutWindow(data);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: editingItem ? 'Window updated' : 'Window created', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['blackout-windows'] });
      closeModal();
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  const deleteMaintenance = useMutation({
    mutationFn: (id: string) => changesApi.deleteMaintenanceWindow(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenance-windows'] }); notifications.show({ title: 'Deleted', message: 'Window removed', color: 'green' }); },
  });

  const deleteBlackout = useMutation({
    mutationFn: (id: string) => changesApi.deleteBlackoutWindow(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blackout-windows'] }); notifications.show({ title: 'Deleted', message: 'Window removed', color: 'green' }); },
  });

  const openCreate = (type: 'maintenance' | 'blackout') => {
    setModalType(type);
    setEditingItem(null);
    setForm({ name: '', description: '', reason: '', start_time: '', end_time: '', recurrence: 'none', severity: 'hard' });
    setModalOpen(true);
  };

  const openEdit = (item: any, type: 'maintenance' | 'blackout') => {
    setModalType(type);
    setEditingItem(item);
    setForm({
      name: item.name || '', description: item.description || '', reason: item.reason || '',
      start_time: item.start_time ? item.start_time.slice(0, 16) : '',
      end_time: item.end_time ? item.end_time.slice(0, 16) : '',
      recurrence: item.recurrence || 'none', severity: item.severity || 'hard',
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingItem(null); };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2} className="page-title">Maintenance & Blackout Windows</Title>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="maintenance" leftSection={<IconCalendarEvent size={16} />}>Maintenance Windows</Tabs.Tab>
          <Tabs.Tab value="blackout" leftSection={<IconShieldOff size={16} />}>Blackout Windows</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="maintenance" pt="md">
          <Stack>
            <Group justify="flex-end">
              <Button leftSection={<IconPlus size={16} />} onClick={() => openCreate('maintenance')}>New Maintenance Window</Button>
            </Group>
            <Paper withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Start</Table.Th>
                    <Table.Th>End</Table.Th>
                    <Table.Th>Recurrence</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(maintenanceWindows as any[]).map((w: any) => (
                    <Table.Tr key={w.id}>
                      <Table.Td><Text fw={500}>{w.name}</Text>{w.description && <Text size="xs" c="dimmed">{w.description}</Text>}</Table.Td>
                      <Table.Td>{dayjs(w.start_time).format('MMM D, YYYY HH:mm')}</Table.Td>
                      <Table.Td>{dayjs(w.end_time).format('MMM D, YYYY HH:mm')}</Table.Td>
                      <Table.Td><Badge variant="light">{w.recurrence || 'none'}</Badge></Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon variant="subtle" onClick={() => openEdit(w, 'maintenance')}><IconEdit size={16} /></ActionIcon>
                          <ActionIcon variant="subtle" color="red" onClick={() => deleteMaintenance.mutate(w.id)}><IconTrash size={16} /></ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {(maintenanceWindows as any[]).length === 0 && (
                    <Table.Tr><Table.Td colSpan={5}><Text c="dimmed" ta="center" py="md">No maintenance windows configured</Text></Table.Td></Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="blackout" pt="md">
          <Stack>
            <Group justify="flex-end">
              <Button leftSection={<IconPlus size={16} />} color="red" onClick={() => openCreate('blackout')}>New Blackout Window</Button>
            </Group>
            <Paper withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Reason</Table.Th>
                    <Table.Th>Start</Table.Th>
                    <Table.Th>End</Table.Th>
                    <Table.Th>Severity</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(blackoutWindows as any[]).map((w: any) => (
                    <Table.Tr key={w.id}>
                      <Table.Td><Text fw={500}>{w.name}</Text></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{w.reason || '-'}</Text></Table.Td>
                      <Table.Td>{dayjs(w.start_time).format('MMM D, YYYY HH:mm')}</Table.Td>
                      <Table.Td>{dayjs(w.end_time).format('MMM D, YYYY HH:mm')}</Table.Td>
                      <Table.Td><Badge color={w.severity === 'hard' ? 'red' : 'orange'}>{w.severity}</Badge></Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon variant="subtle" onClick={() => openEdit(w, 'blackout')}><IconEdit size={16} /></ActionIcon>
                          <ActionIcon variant="subtle" color="red" onClick={() => deleteBlackout.mutate(w.id)}><IconTrash size={16} /></ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {(blackoutWindows as any[]).length === 0 && (
                    <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="md">No blackout windows configured</Text></Table.Td></Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Create/Edit Modal */}
      <Modal opened={modalOpen} onClose={closeModal} title={`${editingItem ? 'Edit' : 'New'} ${modalType === 'maintenance' ? 'Maintenance' : 'Blackout'} Window`}>
        <Stack>
          <TextInput label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
          {modalType === 'maintenance' && (
            <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />
          )}
          {modalType === 'blackout' && (
            <Textarea label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.currentTarget.value })} />
          )}
          <TextInput label="Start Time" type="datetime-local" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.currentTarget.value })} />
          <TextInput label="End Time" type="datetime-local" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.currentTarget.value })} />
          {modalType === 'maintenance' && (
            <Select label="Recurrence" data={[
              { value: 'none', label: 'None' }, { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' },
            ]} value={form.recurrence} onChange={(v) => setForm({ ...form, recurrence: v || 'none' })} />
          )}
          {modalType === 'blackout' && (
            <Select label="Severity" description="Hard = no changes allowed. Soft = emergency only." data={[
              { value: 'hard', label: 'Hard (No changes)' }, { value: 'soft', label: 'Soft (Emergency only)' },
            ]} value={form.severity} onChange={(v) => setForm({ ...form, severity: v || 'hard' })} />
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal}>Cancel</Button>
            <Button onClick={() => modalType === 'maintenance' ? saveMaintenance.mutate() : saveBlackout.mutate()}
              loading={saveMaintenance.isPending || saveBlackout.isPending}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
