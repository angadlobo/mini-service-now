import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Select, NumberInput, Group, Button,
  Paper, Text, LoadingOverlay, Badge, Table,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft } from '@tabler/icons-react';
import { licensesApi } from '../../api/assets.api';
import dayjs from 'dayjs';

const COMPLIANCE_COLORS: Record<string, string> = {
  compliant: 'green',
  over_licensed: 'blue',
  under_licensed: 'red',
};

export function LicenseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    product_name: '',
    license_type: 'perpetual',
    total_entitlements: '' as string | number,
    cost_per_unit: '' as string | number,
    start_date: '',
    expiry_date: '',
  });

  const { data: license, isLoading } = useQuery({
    queryKey: ['license', id],
    queryFn: () => licensesApi.get(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (license) {
      setForm({
        product_name: license.product_name || '',
        license_type: license.license_type || 'perpetual',
        total_entitlements: license.total_entitlements ?? '',
        cost_per_unit: license.cost_per_unit ?? '',
        start_date: license.start_date ? license.start_date.substring(0, 10) : '',
        expiry_date: license.expiry_date ? license.expiry_date.substring(0, 10) : '',
      });
    }
  }, [license]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        product_name: form.product_name,
        license_type: form.license_type,
        total_entitlements: form.total_entitlements ? Number(form.total_entitlements) : null,
        cost_per_unit: form.cost_per_unit ? Number(form.cost_per_unit) : null,
        start_date: form.start_date || null,
        expiry_date: form.expiry_date || null,
      };
      if (isNew) return licensesApi.create(payload);
      return licensesApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'License created' : 'License updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      if (isNew) navigate(`/assets/licenses/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['license', id] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' });
    },
  });

  const installations = license?.installations || [];

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/assets/licenses')}>
          Back
        </Button>
        <Title order={2}>{isNew ? 'New License' : `${license?.number || ''} - ${license?.product_name || ''}`}</Title>
        {license?.compliance_status && (
          <Badge variant="filled" color={COMPLIANCE_COLORS[license.compliance_status] || 'gray'} tt="capitalize">
            {(license.compliance_status || '').replace(/_/g, ' ')}
          </Badge>
        )}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Stack>
              <TextInput label="Product Name" required value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.currentTarget.value })} />

              <Grid>
                <Grid.Col span={6}>
                  <Select label="License Type" data={[
                    { value: 'perpetual', label: 'Perpetual' },
                    { value: 'subscription', label: 'Subscription' },
                    { value: 'open_source', label: 'Open Source' },
                    { value: 'trial', label: 'Trial' },
                    { value: 'oem', label: 'OEM' },
                  ]} value={form.license_type} onChange={(v) => setForm({ ...form, license_type: v || 'perpetual' })} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput label="Total Entitlements" min={0} value={form.total_entitlements as number}
                    onChange={(v) => setForm({ ...form, total_entitlements: v })} />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={6}>
                  <NumberInput label="Cost Per Unit" prefix="$" decimalScale={2} min={0} value={form.cost_per_unit as number}
                    onChange={(v) => setForm({ ...form, cost_per_unit: v })} />
                </Grid.Col>
                <Grid.Col span={6}>
                  {!isNew && license && (
                    <Stack gap={4} mt={24}>
                      <Text size="sm" fw={600}>Compliance Status</Text>
                      <Badge variant="filled" size="lg"
                        color={COMPLIANCE_COLORS[license.compliance_status] || 'gray'} tt="capitalize">
                        {(license.compliance_status || 'unknown').replace(/_/g, ' ')}
                      </Badge>
                    </Stack>
                  )}
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={6}>
                  <TextInput label="Start Date" type="date" value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.currentTarget.value })} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput label="Expiry Date" type="date" value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.currentTarget.value })} />
                </Grid.Col>
              </Grid>

              <Group justify="flex-end">
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                  {isNew ? 'Create' : 'Update'}
                </Button>
              </Group>
            </Stack>
          </Paper>

          {/* Installations */}
          {!isNew && (
            <Paper withBorder p="md" mt="md">
              <Stack>
                <Group justify="space-between">
                  <Text fw={600}>Installations</Text>
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      {license?.allocated_count || 0} / {license?.total_entitlements || 0} allocated
                    </Text>
                  </Group>
                </Group>

                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Asset</Table.Th>
                      <Table.Th>Version</Table.Th>
                      <Table.Th>Installed Date</Table.Th>
                      <Table.Th>Installed By</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {installations.map((inst: any) => (
                      <Table.Tr key={inst.id}>
                        <Table.Td>
                          <Text size="sm" fw={600} c="blue">{inst.asset_name || inst.asset_number || '-'}</Text>
                        </Table.Td>
                        <Table.Td>{inst.version || '-'}</Table.Td>
                        <Table.Td>{inst.installed_date ? dayjs(inst.installed_date).format('MMM D, YYYY') : '-'}</Table.Td>
                        <Table.Td>{inst.installed_by_name || '-'}</Table.Td>
                      </Table.Tr>
                    ))}
                    {installations.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={4}>
                          <Text c="dimmed" ta="center" py="md">No installations</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Stack>
            </Paper>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && license && (
            <Paper withBorder p="md">
              <Stack gap="xs">
                <Text size="sm"><Text span fw={600}>Number:</Text> {license.number}</Text>
                <Text size="sm"><Text span fw={600}>Product:</Text> {license.product_name}</Text>
                <Text size="sm"><Text span fw={600}>Type:</Text> {(license.license_type || '').replace(/_/g, ' ')}</Text>
                <Text size="sm"><Text span fw={600}>Entitlements:</Text> {license.total_entitlements ?? '-'}</Text>
                <Text size="sm"><Text span fw={600}>Allocated:</Text> {license.allocated_count ?? 0}</Text>
                {license.cost_per_unit && (
                  <Text size="sm"><Text span fw={600}>Cost/Unit:</Text> ${Number(license.cost_per_unit).toFixed(2)}</Text>
                )}
                {license.start_date && (
                  <Text size="sm"><Text span fw={600}>Start:</Text> {dayjs(license.start_date).format('MMM D, YYYY')}</Text>
                )}
                {license.expiry_date && (
                  <Text size="sm" c={new Date(license.expiry_date) < new Date() ? 'red' : undefined}>
                    <Text span fw={600}>Expiry:</Text> {dayjs(license.expiry_date).format('MMM D, YYYY')}
                  </Text>
                )}
                <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(license.created_at).format('MMM D, YYYY HH:mm')}</Text>
                <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(license.updated_at).format('MMM D, YYYY HH:mm')}</Text>
              </Stack>
            </Paper>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
