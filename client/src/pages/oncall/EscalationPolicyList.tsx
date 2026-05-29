import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Paper, Table, Badge, Switch, Text, LoadingOverlay } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { escalationApi } from '../../api/oncall.api';
import { notifications } from '@mantine/notifications';

export function EscalationPolicyList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ['escalation-policies'],
    queryFn: () => escalationApi.listPolicies(),
  });

  const toggleEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      escalationApi.updatePolicy(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-policies'] });
      notifications.show({ title: 'Updated', message: 'Policy toggled', color: 'green' });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to update', color: 'red' });
    },
  });

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Escalation Policies</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/oncall/policies/new')} className="gradient-btn">
          New Policy
        </Button>
      </Group>

      <Paper withBorder pos="relative">
        <LoadingOverlay visible={isLoading} />
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Assignment Group</Table.Th>
              <Table.Th>Enabled</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(policies || []).map((policy: any) => (
              <Table.Tr key={policy.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/oncall/policies/${policy.id}`)}>
                <Table.Td>
                  <Text size="sm" fw={600} c="blue">{policy.name}</Text>
                </Table.Td>
                <Table.Td>{policy.group_name || '-'}</Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={policy.enabled}
                    onChange={(e) => toggleEnabled.mutate({ id: policy.id, enabled: e.currentTarget.checked })}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
            {(!policies || policies.length === 0) && !isLoading && (
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Text c="dimmed" ta="center" py="md">No escalation policies configured</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
