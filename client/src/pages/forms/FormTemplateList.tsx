import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Stack, Title, Table, Button, Badge, Group, Loader, ActionIcon, Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash, IconEye } from '@tabler/icons-react';
import { formsApi } from '../../api/common.api';
import type { FormTemplate } from '@shared/interfaces';

export function FormTemplateList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [page] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['form-templates', page],
    queryFn: () => formsApi.list({ page, pageSize: 50 }),
  });

  const templates: FormTemplate[] = data?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => formsApi.delete(id),
    onSuccess: () => {
      notifications.show({ title: 'Deleted', message: 'Form template removed', color: 'green' });
      qc.invalidateQueries({ queryKey: ['form-templates'] });
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Delete failed', color: 'red' }),
  });

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2} className="page-title">Form Templates</Title>
        <Button className="gradient-btn" onClick={() => navigate('/forms/new')}>Create Form</Button>
      </Group>

      <Table striped highlightOnHover withTableBorder className="glass-table">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th w={80}>Fields</Table.Th>
            <Table.Th w={110}>Submissions</Table.Th>
            <Table.Th w={80}>Active</Table.Th>
            <Table.Th w={130}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {templates.length === 0 ? (
            <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="lg">No form templates yet</Text></Table.Td></Table.Tr>
          ) : templates.map((t) => (
            <Table.Tr key={t.id}>
              <Table.Td><Text fw={500} size="sm">{t.name}</Text></Table.Td>
              <Table.Td><Text size="sm" lineClamp={1}>{t.description || '-'}</Text></Table.Td>
              <Table.Td><Badge variant="light">{t.field_count ?? 0}</Badge></Table.Td>
              <Table.Td><Badge variant="light" color="blue">{t.submission_count ?? 0}</Badge></Table.Td>
              <Table.Td><Badge color={t.active ? 'green' : 'gray'}>{t.active ? 'Yes' : 'No'}</Badge></Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => navigate(`/forms/${t.id}/fill`)} title="Preview">
                    <IconEye size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" onClick={() => navigate(`/forms/${t.id}/edit`)} title="Edit">
                    <IconPencil size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => deleteMutation.mutate(t.id)} title="Delete">
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
