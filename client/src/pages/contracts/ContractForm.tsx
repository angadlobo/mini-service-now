import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Textarea, Select, Group, Button, Paper, Text,
  LoadingOverlay, Box, Tabs, Table, NumberInput, ActionIcon, Switch, Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { contractsApi, vendorsApi } from '../../api/contracts.api';
import { usersApi } from '../../api/common.api';
import { ActivityStream } from '../../components/common/ActivityStream';
import { AttachmentPanel } from '../../components/common/AttachmentPanel';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  active: 'green',
  expired: 'red',
  cancelled: 'orange',
  renewed: 'blue',
};

function formatCurrency(value: number | null, currency: string) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(value);
}

export function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    short_description: '',
    vendor_id: '',
    type: 'support',
    status: 'draft',
    start_date: '',
    end_date: '',
    value: '' as string | number,
    currency: 'USD',
    auto_renew: false,
    renewal_period_days: '' as string | number,
    payment_terms: '',
    owner_id: '',
    notification_days_before_expiry: '' as string | number,
  });

  const [lineItemForm, setLineItemForm] = useState({
    description: '',
    quantity: 1,
    unit_cost: 0,
    item_type: '',
  });

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsApi.get(id!),
    enabled: !isNew,
  });

  const { data: lineItems, refetch: refetchLineItems } = useQuery({
    queryKey: ['contract-line-items', id],
    queryFn: () => contractsApi.getLineItems(id!),
    enabled: !isNew,
  });

  const { data: vendorsList } = useQuery({
    queryKey: ['vendors-select'],
    queryFn: () => vendorsApi.list({ pageSize: 200 }),
  });

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ pageSize: 100 }),
  });

  useEffect(() => {
    if (contract) {
      setForm({
        short_description: contract.short_description || '',
        vendor_id: contract.vendor_id || '',
        type: contract.type || 'support',
        status: contract.status || 'draft',
        start_date: contract.start_date ? dayjs(contract.start_date).format('YYYY-MM-DD') : '',
        end_date: contract.end_date ? dayjs(contract.end_date).format('YYYY-MM-DD') : '',
        value: contract.value != null ? Number(contract.value) : '',
        currency: contract.currency || 'USD',
        auto_renew: contract.auto_renew || false,
        renewal_period_days: contract.renewal_period_days || '',
        payment_terms: contract.payment_terms || '',
        owner_id: contract.owner_id || '',
        notification_days_before_expiry: contract.notification_days_before_expiry || '',
      });
    }
  }, [contract]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        short_description: form.short_description,
        vendor_id: form.vendor_id || null,
        type: form.type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        value: form.value !== '' ? Number(form.value) : null,
        currency: form.currency,
        auto_renew: form.auto_renew,
        renewal_period_days: form.renewal_period_days !== '' ? Number(form.renewal_period_days) : null,
        payment_terms: form.payment_terms || null,
        owner_id: form.owner_id || null,
        notification_days_before_expiry: form.notification_days_before_expiry !== '' ? Number(form.notification_days_before_expiry) : null,
      };
      if (isNew) return contractsApi.create(payload);
      payload.status = form.status;
      return contractsApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Contract created' : 'Contract updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      if (isNew) navigate(`/contracts/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['contract', id] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' });
    },
  });

  const addLineItem = useMutation({
    mutationFn: () => contractsApi.addLineItem(id!, {
      description: lineItemForm.description,
      quantity: lineItemForm.quantity,
      unit_cost: lineItemForm.unit_cost,
      item_type: lineItemForm.item_type || null,
    }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Line item added', color: 'green' });
      setLineItemForm({ description: '', quantity: 1, unit_cost: 0, item_type: '' });
      refetchLineItems();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add line item', color: 'red' });
    },
  });

  const removeLineItem = useMutation({
    mutationFn: (lineItemId: string) => contractsApi.removeLineItem(id!, lineItemId),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Line item removed', color: 'green' });
      refetchLineItems();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to remove line item', color: 'red' });
    },
  });

  const vendorOptions = (vendorsList?.data || []).map((v: any) => ({ value: v.id, label: `${v.number} - ${v.name}` }));
  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));

  const lineItemsTotal = (lineItems || []).reduce((sum: number, item: any) => sum + Number(item.total_cost || 0), 0);

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/contracts')}>
          Back
        </Button>
        <Title order={2}>{isNew ? 'New Contract' : `${contract?.number || ''}`}</Title>
        {contract && <Badge variant="filled" color={STATUS_COLORS[contract.status] || 'gray'}>{contract.status}</Badge>}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Tabs defaultValue="details">
              <Tabs.List>
                <Tabs.Tab value="details">Details</Tabs.Tab>
                {!isNew && <Tabs.Tab value="line-items">Line Items</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="journal">Journal</Tabs.Tab>}
              </Tabs.List>

              <Tabs.Panel value="details" pt="md">
                <Stack>
                  <TextInput label="Short Description" required value={form.short_description}
                    onChange={(e) => setForm({ ...form, short_description: e.currentTarget.value })} />

                  <Grid>
                    <Grid.Col span={6}>
                      <Select label="Vendor" data={vendorOptions} value={form.vendor_id}
                        onChange={(v) => setForm({ ...form, vendor_id: v || '' })} clearable searchable />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select label="Type" data={[
                        { value: 'lease', label: 'Lease' }, { value: 'maintenance', label: 'Maintenance' },
                        { value: 'support', label: 'Support' }, { value: 'subscription', label: 'Subscription' },
                        { value: 'nda', label: 'NDA' }, { value: 'msa', label: 'MSA' },
                      ]} value={form.type} onChange={(v) => setForm({ ...form, type: v || 'support' })} />
                    </Grid.Col>
                  </Grid>

                  {!isNew && (
                    <Select label="Status" data={[
                      { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' },
                      { value: 'expired', label: 'Expired' }, { value: 'cancelled', label: 'Cancelled' },
                      { value: 'renewed', label: 'Renewed' },
                    ]} value={form.status} onChange={(v) => setForm({ ...form, status: v || form.status })} />
                  )}

                  <Grid>
                    <Grid.Col span={6}>
                      <TextInput label="Start Date" type="date" value={form.start_date}
                        onChange={(e) => setForm({ ...form, start_date: e.currentTarget.value })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput label="End Date" type="date" value={form.end_date}
                        onChange={(e) => setForm({ ...form, end_date: e.currentTarget.value })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={4}>
                      <NumberInput label="Value" min={0} decimalScale={2} thousandSeparator=","
                        value={form.value !== '' ? Number(form.value) : ''}
                        onChange={(v) => setForm({ ...form, value: v })} />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <Select label="Currency" data={[
                        { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' },
                        { value: 'GBP', label: 'GBP' }, { value: 'CAD', label: 'CAD' },
                        { value: 'AUD', label: 'AUD' }, { value: 'JPY', label: 'JPY' },
                      ]} value={form.currency} onChange={(v) => setForm({ ...form, currency: v || 'USD' })} />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <Select label="Owner" data={userOptions} value={form.owner_id}
                        onChange={(v) => setForm({ ...form, owner_id: v || '' })} clearable searchable />
                    </Grid.Col>
                  </Grid>

                  <TextInput label="Payment Terms" value={form.payment_terms}
                    onChange={(e) => setForm({ ...form, payment_terms: e.currentTarget.value })} />

                  <Grid>
                    <Grid.Col span={4}>
                      <Switch label="Auto Renew" checked={form.auto_renew}
                        onChange={(e) => setForm({ ...form, auto_renew: e.currentTarget.checked })} mt="md" />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <NumberInput label="Renewal Period (days)" min={1}
                        value={form.renewal_period_days !== '' ? Number(form.renewal_period_days) : ''}
                        onChange={(v) => setForm({ ...form, renewal_period_days: v })} />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <NumberInput label="Notify Before Expiry (days)" min={1}
                        value={form.notification_days_before_expiry !== '' ? Number(form.notification_days_before_expiry) : ''}
                        onChange={(v) => setForm({ ...form, notification_days_before_expiry: v })} />
                    </Grid.Col>
                  </Grid>

                  <Group justify="flex-end">
                    <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                      {isNew ? 'Create' : 'Update'}
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              {!isNew && (
                <Tabs.Panel value="line-items" pt="md">
                  <Stack>
                    <Paper withBorder p="sm">
                      <Text fw={600} mb="sm">Add Line Item</Text>
                      <Grid>
                        <Grid.Col span={4}>
                          <TextInput label="Description" value={lineItemForm.description} required
                            onChange={(e) => setLineItemForm({ ...lineItemForm, description: e.currentTarget.value })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <NumberInput label="Quantity" min={1} value={lineItemForm.quantity}
                            onChange={(v) => setLineItemForm({ ...lineItemForm, quantity: Number(v) || 1 })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <NumberInput label="Unit Cost" min={0} decimalScale={2} value={lineItemForm.unit_cost}
                            onChange={(v) => setLineItemForm({ ...lineItemForm, unit_cost: Number(v) || 0 })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <TextInput label="Type" value={lineItemForm.item_type}
                            onChange={(e) => setLineItemForm({ ...lineItemForm, item_type: e.currentTarget.value })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <Box mt={24}>
                            <Button size="sm" leftSection={<IconPlus size={14} />}
                              onClick={() => addLineItem.mutate()}
                              loading={addLineItem.isPending}
                              disabled={!lineItemForm.description}
                              fullWidth>
                              Add
                            </Button>
                          </Box>
                        </Grid.Col>
                      </Grid>
                    </Paper>

                    {lineItems && lineItems.length > 0 ? (
                      <>
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Description</Table.Th>
                              <Table.Th style={{ width: 80 }}>Qty</Table.Th>
                              <Table.Th style={{ width: 120 }}>Unit Cost</Table.Th>
                              <Table.Th style={{ width: 120 }}>Total</Table.Th>
                              <Table.Th style={{ width: 100 }}>Type</Table.Th>
                              <Table.Th style={{ width: 50 }}></Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {lineItems.map((item: any) => (
                              <Table.Tr key={item.id}>
                                <Table.Td>{item.description}</Table.Td>
                                <Table.Td>{item.quantity}</Table.Td>
                                <Table.Td>{formatCurrency(Number(item.unit_cost), form.currency)}</Table.Td>
                                <Table.Td fw={500}>{formatCurrency(Number(item.total_cost), form.currency)}</Table.Td>
                                <Table.Td>{item.item_type || '-'}</Table.Td>
                                <Table.Td>
                                  <ActionIcon variant="subtle" color="red" size="sm"
                                    onClick={() => removeLineItem.mutate(item.id)}>
                                    <IconTrash size={14} />
                                  </ActionIcon>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                          <Table.Tfoot>
                            <Table.Tr>
                              <Table.Td colSpan={3}><Text fw={700} ta="right">Total</Text></Table.Td>
                              <Table.Td><Text fw={700}>{formatCurrency(lineItemsTotal, form.currency)}</Text></Table.Td>
                              <Table.Td colSpan={2}></Table.Td>
                            </Table.Tr>
                          </Table.Tfoot>
                        </Table>
                      </>
                    ) : (
                      <Text c="dimmed" ta="center" py="lg">No line items yet</Text>
                    )}
                  </Stack>
                </Tabs.Panel>
              )}

              {!isNew && (
                <Tabs.Panel value="journal" pt="md">
                  <ActivityStream tableName="contracts" recordId={contract?.id} />
                </Tabs.Panel>
              )}
            </Tabs>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && contract && (
            <Stack>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {contract.number}</Text>
                  <Text size="sm"><Text span fw={600}>Vendor:</Text> {contract.vendor_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Owner:</Text> {contract.owner_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Value:</Text> {formatCurrency(contract.value, contract.currency)}</Text>
                  <Text size="sm"><Text span fw={600}>Created by:</Text> {contract.created_by_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(contract.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(contract.updated_at).format('MMM D, YYYY HH:mm')}</Text>
                  {contract.end_date && (
                    <Text size="sm" c={dayjs(contract.end_date).isBefore(dayjs()) ? 'red' : undefined}>
                      <Text span fw={600}>Expires:</Text> {dayjs(contract.end_date).format('MMM D, YYYY')}
                    </Text>
                  )}
                  {contract.auto_renew && (
                    <Badge variant="light" color="blue" size="sm">Auto-Renew</Badge>
                  )}
                </Stack>
              </Paper>
              <AttachmentPanel tableName="contracts" recordId={contract.id} />
            </Stack>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
