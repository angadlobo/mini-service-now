import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Stack, Title, Group, Paper, Text, Table, Select, Button, Badge, Box } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { chargebackApi } from '../../api/cost-management.api';

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function generatePeriodOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

export function ChargebackReport() {
  const [period, setPeriod] = useState('');
  const periodOptions = generatePeriodOptions();

  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ['chargeback-records', period],
    queryFn: () => chargebackApi.listRecords(period ? { period } : {}),
  });

  const generate = useMutation({
    mutationFn: () => {
      if (!period) {
        throw new Error('Please select a period');
      }
      return chargebackApi.generate(period);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Chargeback records generated', color: 'green' });
      refetch();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || err.message || 'Failed to generate', color: 'red' });
    },
  });

  const recordList: any[] = records?.data || records || [];

  const grouped = recordList.reduce((acc: Record<string, any[]>, record: any) => {
    const key = record.cost_center_name || record.cost_center_id || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(record);
    return acc;
  }, {});

  const groupTotals = Object.entries(grouped).map(([name, items]) => ({
    name,
    items,
    total: items.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0),
  }));

  const grandTotal = groupTotals.reduce((sum, g) => sum + g.total, 0);

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Chargeback Report</Title>
        <Group>
          <Select
            placeholder="Select period"
            data={periodOptions}
            value={period}
            onChange={(v) => setPeriod(v || '')}
            w={200}
            clearable
          />
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={() => generate.mutate()}
            loading={generate.isPending}
            disabled={!period}
            variant="light"
          >
            Generate
          </Button>
        </Group>
      </Group>

      {recordList.length === 0 && !isLoading ? (
        <Paper withBorder p="xl">
          <Text c="dimmed" ta="center">
            No chargeback records found. Select a period and click Generate to create records.
          </Text>
        </Paper>
      ) : (
        <Stack>
          {groupTotals.map((group) => (
            <Paper key={group.name} withBorder p="md" radius="md">
              <Group justify="space-between" mb="sm">
                <Text fw={600} size="lg">{group.name}</Text>
                <Badge variant="filled" color="blue" size="lg">{formatCurrency(group.total)}</Badge>
              </Group>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Rule</Table.Th>
                    <Table.Th>Period</Table.Th>
                    <Table.Th style={{ width: 140 }}>Amount</Table.Th>
                    <Table.Th style={{ width: 120 }}>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {group.items.map((record: any) => (
                    <Table.Tr key={record.id}>
                      <Table.Td>{record.rule_name || record.chargeback_rule_id || '-'}</Table.Td>
                      <Table.Td>{record.period || '-'}</Table.Td>
                      <Table.Td>
                        <Text fw={500}>{formatCurrency(record.amount)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={record.status === 'approved' ? 'green' : record.status === 'pending' ? 'yellow' : 'gray'} size="sm">
                          {record.status || 'pending'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          ))}

          {groupTotals.length > 0 && (
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <Text fw={700} size="lg">Grand Total</Text>
                <Text fw={700} size="xl" c="blue">{formatCurrency(grandTotal)}</Text>
              </Group>
            </Paper>
          )}
        </Stack>
      )}
    </Stack>
  );
}
