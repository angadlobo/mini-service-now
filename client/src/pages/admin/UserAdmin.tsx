import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, Modal, TextInput, MultiSelect, Switch, Group, Button, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { usersApi } from '../../api/common.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import dayjs from 'dayjs';

const ALL_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'itil', label: 'ITIL' },
  { value: 'user', label: 'User' },
  { value: 'approver', label: 'Approver' },
  { value: 'knowledge_manager', label: 'Knowledge Manager' },
];

export function UserAdmin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<any>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editActive, setEditActive] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => usersApi.list({ page, pageSize: 20, search }),
  });

  const openEdit = async (user: any) => {
    const full = await usersApi.get(user.id);
    setEditUser(full);
    setEditRoles(full.roles || []);
    setEditActive(full.active);
  };

  const saveUser = useMutation({
    mutationFn: async () => {
      await usersApi.update(editUser.id, { active: editActive });
      await usersApi.updateRoles(editUser.id, editRoles);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'User updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditUser(null);
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  const columns = [
    { key: 'username', label: 'Username', sortable: true, render: (r: any) => <Text size="sm" fw={500}>{r.username}</Text> },
    { key: 'email', label: 'Email' },
    { key: 'first_name', label: 'Name', render: (r: any) => `${r.first_name} ${r.last_name}` },
    { key: 'active', label: 'Active', width: 80, render: (r: any) => r.active ? <Text c="green" size="sm">Yes</Text> : <Text c="red" size="sm">No</Text> },
    { key: 'created_at', label: 'Created', width: 120, render: (r: any) => dayjs(r.created_at).format('MMM D, YYYY') },
  ];

  return (
    <Stack>
      <Title order={2}>User Administration</Title>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        onClear={() => { setSearch(''); setPage(1); }}
      />

      <DataTable
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        onRowClick={openEdit}
      />

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      <Modal opened={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        {editUser && (
          <Stack>
            <TextInput label="Username" value={editUser.username} disabled />
            <TextInput label="Email" value={editUser.email} disabled />
            <TextInput label="Name" value={`${editUser.first_name} ${editUser.last_name}`} disabled />
            <MultiSelect
              label="Roles"
              data={ALL_ROLES}
              value={editRoles}
              onChange={setEditRoles}
            />
            <Switch
              label="Active"
              checked={editActive}
              onChange={(e) => setEditActive(e.currentTarget.checked)}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={() => saveUser.mutate()} loading={saveUser.isPending}>Save</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
