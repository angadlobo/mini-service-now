import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Stack, Title, Paper, Text, Group, Button, TextInput, Textarea, Select, Checkbox, Grid, Badge, LoadingOverlay, Box, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconShoppingCart } from '@tabler/icons-react';
import { catalogApi } from '../../api/catalog.api';

export function CatalogItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [variables, setVariables] = useState<Record<string, any>>({});

  const { data: item, isLoading } = useQuery({
    queryKey: ['catalog-item', id],
    queryFn: () => catalogApi.getItem(id!),
  });

  const submit = useMutation({
    mutationFn: () => catalogApi.createRequest({ catalog_item_id: id!, variables }),
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: `Request ${data.number} submitted`, color: 'green' });
      navigate('/catalog/requests');
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  const renderVariable = (v: any) => {
    const value = variables[v.name] || '';
    const onChange = (val: any) => setVariables({ ...variables, [v.name]: val });

    switch (v.type) {
      case 'select': {
        const opts = v.options?.choices || [];
        return <Select key={v.id} label={v.label} required={v.required} data={opts.map((o: any) => ({ value: o.value, label: o.label }))} value={value} onChange={onChange} />;
      }
      case 'textarea':
        return <Textarea key={v.id} label={v.label} required={v.required} value={value} onChange={(e) => onChange(e.currentTarget.value)} minRows={2} />;
      case 'checkbox':
        return <Checkbox key={v.id} label={v.label} checked={!!value} onChange={(e) => onChange(e.currentTarget.checked)} />;
      case 'date':
        return <TextInput key={v.id} label={v.label} required={v.required} type="date" value={value} onChange={(e) => onChange(e.currentTarget.value)} />;
      case 'number':
        return <TextInput key={v.id} label={v.label} required={v.required} type="number" value={value} onChange={(e) => onChange(e.currentTarget.value)} />;
      default:
        return <TextInput key={v.id} label={v.label} required={v.required} value={value} onChange={(e) => onChange(e.currentTarget.value)} />;
    }
  };

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/catalog')}>Back</Button>
        <Title order={2}>{item?.name || 'Catalog Item'}</Title>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            {item && (
              <Stack>
                <Text>{item.description || item.short_description}</Text>
                <Divider />
                <Text fw={600}>Request Form</Text>
                {(item.variables || []).map(renderVariable)}
                <Group justify="flex-end" mt="md">
                  <Button leftSection={<IconShoppingCart size={16} />} onClick={() => submit.mutate()} loading={submit.isPending}>
                    Submit Request
                  </Button>
                </Group>
              </Stack>
            )}
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          {item && (
            <Paper withBorder p="md">
              <Stack gap="xs">
                <Text size="sm"><Text span fw={600}>Category:</Text> {item.category_name || '-'}</Text>
                <Text size="sm"><Text span fw={600}>Price:</Text> {item.price > 0 ? `$${Number(item.price).toFixed(2)}` : 'Free'}</Text>
                <Text size="sm"><Text span fw={600}>Delivery:</Text> {item.delivery_days} days</Text>
                {item.approval_required && <Badge color="orange" variant="light">Requires Approval</Badge>}
              </Stack>
            </Paper>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
