import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, Grid, TextInput, Textarea, Select, Group, Button, Paper, Text, LoadingOverlay, Box, Badge, Table, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconCheck, IconCircleCheck } from '@tabler/icons-react';
import { eventsApi } from '../../api/events.api';
import { ActivityStream } from '../../components/common/ActivityStream';
import dayjs from 'dayjs';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'red',
  major: 'orange',
  minor: 'yellow',
  warning: 'blue',
  info: 'gray',
  clear: 'green',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'red',
  acknowledged: 'blue',
  resolved: 'green',
  closed: 'gray',
};

export function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    source: 'custom',
    severity: 'info',
    node: '',
    type: '',
    metric_name: '',
    metric_value: '',
    threshold: '',
    message_key: '',
    description: '',
    ci_id: '',
  });

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id!),
    enabled: !isNew,
  });

  const { data: correlations } = useQuery({
    queryKey: ['event-correlations', id],
    queryFn: () => eventsApi.getCorrelations(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (event) {
      setForm({
        source: event.source || 'custom',
        severity: event.severity || 'info',
        node: event.node || '',
        type: event.type || '',
        metric_name: event.metric_name || '',
        metric_value: event.metric_value || '',
        threshold: event.threshold || '',
        message_key: event.message_key || '',
        description: event.description || '',
        ci_id: event.ci_id || '',
      });
    }
  }, [event]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        source: form.source,
        severity: form.severity,
        node: form.node || undefined,
        type: form.type || undefined,
        metric_name: form.metric_name || undefined,
        metric_value: form.metric_value || undefined,
        threshold: form.threshold || undefined,
        message_key: form.message_key || undefined,
        description: form.description || undefined,
        ci_id: form.ci_id || null,
      };
      if (isNew) {
        return eventsApi.create(payload);
      }
      return eventsApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Event created' : 'Event updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      if (isNew) navigate(`/events/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' });
    },
  });

  const acknowledge = useMutation({
    mutationFn: () => eventsApi.acknowledge(id!),
    onSuccess: () => {
      notifications.show({ title: 'Acknowledged', message: 'Event has been acknowledged', color: 'blue' });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to acknowledge', color: 'red' });
    },
  });

  const resolve = useMutation({
    mutationFn: () => eventsApi.resolve(id!),
    onSuccess: () => {
      notifications.show({ title: 'Resolved', message: 'Event has been resolved', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to resolve', color: 'red' });
    },
  });

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/events')}>
          Back
        </Button>
        <Title order={2}>{isNew ? 'New Event' : `${event?.number || ''}`}</Title>
        {event && (
          <Badge color={SEVERITY_COLORS[event.severity] || 'gray'} variant="filled" size="lg">
            {event.severity}
          </Badge>
        )}
        {event && (
          <Badge color={STATUS_COLORS[event.status] || 'gray'} variant="outline" size="lg">
            {event.status}
          </Badge>
        )}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Stack>
              <Grid>
                <Grid.Col span={6}>
                  <Select
                    label="Source"
                    required
                    data={[
                      { value: 'datadog', label: 'Datadog' },
                      { value: 'grafana', label: 'Grafana' },
                      { value: 'pagerduty', label: 'PagerDuty' },
                      { value: 'custom', label: 'Custom' },
                      { value: 'email', label: 'Email' },
                    ]}
                    value={form.source}
                    onChange={(v) => setForm({ ...form, source: v || 'custom' })}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="Severity"
                    data={[
                      { value: 'critical', label: 'Critical' },
                      { value: 'major', label: 'Major' },
                      { value: 'minor', label: 'Minor' },
                      { value: 'warning', label: 'Warning' },
                      { value: 'info', label: 'Info' },
                      { value: 'clear', label: 'Clear' },
                    ]}
                    value={form.severity}
                    onChange={(v) => setForm({ ...form, severity: v || 'info' })}
                  />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={6}>
                  <TextInput label="Node" value={form.node} onChange={(e) => setForm({ ...form, node: e.currentTarget.value })} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="Type"
                    data={[
                      { value: 'availability', label: 'Availability' },
                      { value: 'performance', label: 'Performance' },
                      { value: 'security', label: 'Security' },
                      { value: 'capacity', label: 'Capacity' },
                    ]}
                    value={form.type}
                    onChange={(v) => setForm({ ...form, type: v || '' })}
                    clearable
                  />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={4}>
                  <TextInput label="Metric Name" value={form.metric_name} onChange={(e) => setForm({ ...form, metric_name: e.currentTarget.value })} />
                </Grid.Col>
                <Grid.Col span={4}>
                  <TextInput label="Metric Value" value={form.metric_value} onChange={(e) => setForm({ ...form, metric_value: e.currentTarget.value })} />
                </Grid.Col>
                <Grid.Col span={4}>
                  <TextInput label="Threshold" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.currentTarget.value })} />
                </Grid.Col>
              </Grid>

              <TextInput label="Message Key" value={form.message_key} onChange={(e) => setForm({ ...form, message_key: e.currentTarget.value })} />

              <Textarea label="Description" minRows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />

              <Group justify="flex-end">
                {!isNew && event && event.status === 'open' && (
                  <Button
                    variant="light"
                    color="blue"
                    leftSection={<IconCheck size={16} />}
                    onClick={() => acknowledge.mutate()}
                    loading={acknowledge.isPending}
                  >
                    Acknowledge
                  </Button>
                )}
                {!isNew && event && (event.status === 'open' || event.status === 'acknowledged') && (
                  <Button
                    variant="light"
                    color="green"
                    leftSection={<IconCircleCheck size={16} />}
                    onClick={() => resolve.mutate()}
                    loading={resolve.isPending}
                  >
                    Resolve
                  </Button>
                )}
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                  {isNew ? 'Create' : 'Update'}
                </Button>
              </Group>
            </Stack>
          </Paper>

          {/* Correlated Events */}
          {!isNew && correlations && correlations.length > 0 && (
            <Paper withBorder p="md" mt="md">
              <Title order={4} mb="sm">Correlated Events</Title>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Number</Table.Th>
                    <Table.Th>Severity</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Node</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Created</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {correlations.map((c: any) => (
                    <Table.Tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/events/${c.id}`)}>
                      <Table.Td>
                        <Text size="sm" fw={600} c="blue">{c.number}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={SEVERITY_COLORS[c.severity] || 'gray'} variant="filled" size="sm">
                          {c.severity}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={STATUS_COLORS[c.status] || 'gray'} variant="outline" size="sm">
                          {c.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{c.node || '-'}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" size="xs">{c.correlation_type}</Badge>
                      </Table.Td>
                      <Table.Td>{dayjs(c.created_at).format('MMM D, HH:mm')}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}

          {!isNew && event && (
            <Box mt="md">
              <ActivityStream tableName="monitoring_events" recordId={event.id} />
            </Box>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && event && (
            <Stack>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {event.number}</Text>
                  <Text size="sm"><Text span fw={600}>Source:</Text> {event.source}</Text>
                  <Text size="sm"><Text span fw={600}>Severity:</Text> {event.severity}</Text>
                  <Text size="sm"><Text span fw={600}>Status:</Text> {event.status}</Text>
                  <Text size="sm"><Text span fw={600}>Node:</Text> {event.node || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Type:</Text> {event.type || '-'}</Text>
                  <Divider />
                  <Text size="sm"><Text span fw={600}>Metric:</Text> {event.metric_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Value:</Text> {event.metric_value || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Threshold:</Text> {event.threshold || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Message Key:</Text> {event.message_key || '-'}</Text>
                  <Divider />
                  {event.ci_name && <Text size="sm"><Text span fw={600}>CI:</Text> {event.ci_name}</Text>}
                  {event.incident_number && (
                    <Text size="sm" style={{ cursor: 'pointer' }} c="blue" onClick={() => navigate(`/incidents/${event.incident_id}`)}>
                      <Text span fw={600}>Incident:</Text> {event.incident_number}
                    </Text>
                  )}
                  <Divider />
                  {event.acknowledged_by_name && (
                    <Text size="sm"><Text span fw={600}>Acknowledged By:</Text> {event.acknowledged_by_name}</Text>
                  )}
                  {event.acknowledged_at && (
                    <Text size="sm"><Text span fw={600}>Acknowledged At:</Text> {dayjs(event.acknowledged_at).format('MMM D, YYYY HH:mm')}</Text>
                  )}
                  <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(event.created_at).format('MMM D, YYYY HH:mm:ss')}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(event.updated_at).format('MMM D, YYYY HH:mm:ss')}</Text>
                  {event.created_by_name && (
                    <Text size="sm"><Text span fw={600}>Created by:</Text> {event.created_by_name}</Text>
                  )}
                </Stack>
              </Paper>
            </Stack>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
