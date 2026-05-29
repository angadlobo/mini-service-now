import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Paper, Table, Badge, Switch, Text, LoadingOverlay } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { alertRulesApi } from '../../api/events.api';
import { notifications } from '@mantine/notifications';

export function AlertRuleList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => alertRulesApi.list(),
  });

  const toggleEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      alertRulesApi.update(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      notifications.show({ title: 'Updated', message: 'Alert rule toggled', color: 'green' });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to update', color: 'red' });
    },
  });

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Alert Rules</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/events/alert-rules/new')} className="gradient-btn">
          New Alert Rule
        </Button>
      </Group>

      <Paper withBorder pos="relative">
        <LoadingOverlay visible={isLoading} />
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Source</Table.Th>
              <Table.Th>Severity Override</Table.Th>
              <Table.Th>Assignment Group</Table.Th>
              <Table.Th>Cooldown</Table.Th>
              <Table.Th>Enabled</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(rules || []).map((rule: any) => (
              <Table.Tr key={rule.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/events/alert-rules/${rule.id}`)}>
                <Table.Td>
                  <Text size="sm" fw={600} c="blue">{rule.name}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" size="sm">{rule.source}</Badge>
                </Table.Td>
                <Table.Td>
                  {rule.severity_override ? (
                    <Badge variant="filled" size="sm" color={
                      rule.severity_override === 'critical' ? 'red' :
                      rule.severity_override === 'major' ? 'orange' :
                      rule.severity_override === 'minor' ? 'yellow' :
                      rule.severity_override === 'warning' ? 'blue' :
                      rule.severity_override === 'clear' ? 'green' : 'gray'
                    }>
                      {rule.severity_override}
                    </Badge>
                  ) : '-'}
                </Table.Td>
                <Table.Td>{rule.assignment_group_name || '-'}</Table.Td>
                <Table.Td>{rule.cooldown_minutes} min</Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={rule.enabled}
                    onChange={(e) => toggleEnabled.mutate({ id: rule.id, enabled: e.currentTarget.checked })}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
            {(!rules || rules.length === 0) && !isLoading && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center" py="md">No alert rules configured</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
