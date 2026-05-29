import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Textarea, Select, NumberInput, Group, Button,
  Paper, Text, LoadingOverlay, Switch,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft } from '@tabler/icons-react';
import { alertRulesApi } from '../../api/events.api';
import { usersApi } from '../../api/common.api';

export function AlertRuleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    name: '',
    source: 'monitoring',
    enabled: true,
    conditions: '{}',
    actions: '{}',
    severity_override: '',
    assignment_group: '',
    cooldown_minutes: 5 as string | number,
  });

  const { data: rule, isLoading } = useQuery({
    queryKey: ['alert-rule', id],
    queryFn: () => alertRulesApi.get(id!),
    enabled: !isNew,
  });

  const { data: groups } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => usersApi.listGroups(),
  });

  useEffect(() => {
    if (rule) {
      setForm({
        name: rule.name || '',
        source: rule.source || 'monitoring',
        enabled: rule.enabled ?? true,
        conditions: rule.conditions ? (typeof rule.conditions === 'string' ? rule.conditions : JSON.stringify(rule.conditions, null, 2)) : '{}',
        actions: rule.actions ? (typeof rule.actions === 'string' ? rule.actions : JSON.stringify(rule.actions, null, 2)) : '{}',
        severity_override: rule.severity_override || '',
        assignment_group: rule.assignment_group || rule.assignment_group_id || '',
        cooldown_minutes: rule.cooldown_minutes ?? 5,
      });
    }
  }, [rule]);

  const save = useMutation({
    mutationFn: () => {
      let parsedConditions: any;
      let parsedActions: any;

      try {
        parsedConditions = JSON.parse(form.conditions);
      } catch {
        throw new Error('Invalid JSON in conditions field');
      }

      try {
        parsedActions = JSON.parse(form.actions);
      } catch {
        throw new Error('Invalid JSON in actions field');
      }

      const payload: any = {
        name: form.name,
        source: form.source,
        enabled: form.enabled,
        conditions: parsedConditions,
        actions: parsedActions,
        severity_override: form.severity_override || null,
        assignment_group: form.assignment_group || null,
        cooldown_minutes: form.cooldown_minutes ? Number(form.cooldown_minutes) : 5,
      };

      if (isNew) return alertRulesApi.create(payload);
      return alertRulesApi.update(id!, payload);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: isNew ? 'Alert rule created' : 'Alert rule updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      if (!isNew) queryClient.invalidateQueries({ queryKey: ['alert-rule', id] });
      navigate('/events/alert-rules');
    },
    onError: (err: any) => {
      const message = err.message?.includes('Invalid JSON')
        ? err.message
        : err.response?.data?.error || 'Failed to save';
      notifications.show({ title: 'Error', message, color: 'red' });
    },
  });

  const groupOptions = ((groups as any[]) || []).map((g: any) => ({ value: g.id, label: g.name }));

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/events/alert-rules')}>
          Back
        </Button>
        <Title order={2}>{isNew ? 'New Alert Rule' : `Edit: ${rule?.name || ''}`}</Title>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Stack>
              <TextInput label="Name" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />

              <Grid>
                <Grid.Col span={6}>
                  <Select label="Source" data={[
                    { value: 'monitoring', label: 'Monitoring' },
                    { value: 'siem', label: 'SIEM' },
                    { value: 'apm', label: 'APM' },
                    { value: 'infrastructure', label: 'Infrastructure' },
                    { value: 'cloud', label: 'Cloud' },
                    { value: 'custom', label: 'Custom' },
                  ]} value={form.source} onChange={(v) => setForm({ ...form, source: v || 'monitoring' })} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Stack gap={4} mt={24}>
                    <Switch label="Enabled" checked={form.enabled}
                      onChange={(e) => setForm({ ...form, enabled: e.currentTarget.checked })} />
                  </Stack>
                </Grid.Col>
              </Grid>

              <Textarea
                label="Conditions (JSON)"
                description="Define the conditions that trigger this alert rule"
                minRows={4}
                value={form.conditions}
                onChange={(e) => setForm({ ...form, conditions: e.currentTarget.value })}
                styles={{ input: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
              />

              <Textarea
                label="Actions (JSON)"
                description="Define the actions to perform when conditions are met"
                minRows={4}
                value={form.actions}
                onChange={(e) => setForm({ ...form, actions: e.currentTarget.value })}
                styles={{ input: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
              />

              <Grid>
                <Grid.Col span={6}>
                  <Select label="Severity Override" data={[
                    { value: 'critical', label: 'Critical' },
                    { value: 'major', label: 'Major' },
                    { value: 'minor', label: 'Minor' },
                    { value: 'warning', label: 'Warning' },
                    { value: 'clear', label: 'Clear' },
                  ]} value={form.severity_override} onChange={(v) => setForm({ ...form, severity_override: v || '' })} clearable />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select label="Assignment Group" data={groupOptions} value={form.assignment_group}
                    onChange={(v) => setForm({ ...form, assignment_group: v || '' })} clearable searchable />
                </Grid.Col>
              </Grid>

              <NumberInput label="Cooldown (minutes)" description="Minimum time between repeated alerts"
                min={0} value={form.cooldown_minutes as number}
                onChange={(v) => setForm({ ...form, cooldown_minutes: v })} />

              <Group justify="flex-end">
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}
                  disabled={!form.name.trim()}>
                  {isNew ? 'Create' : 'Update'}
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && rule && (
            <Paper withBorder p="md">
              <Stack gap="xs">
                <Text size="sm"><Text span fw={600}>Name:</Text> {rule.name}</Text>
                <Text size="sm"><Text span fw={600}>Source:</Text> {rule.source}</Text>
                <Text size="sm"><Text span fw={600}>Enabled:</Text> {rule.enabled ? 'Yes' : 'No'}</Text>
                {rule.severity_override && (
                  <Text size="sm"><Text span fw={600}>Severity:</Text> {rule.severity_override}</Text>
                )}
                {rule.assignment_group_name && (
                  <Text size="sm"><Text span fw={600}>Group:</Text> {rule.assignment_group_name}</Text>
                )}
                <Text size="sm"><Text span fw={600}>Cooldown:</Text> {rule.cooldown_minutes} min</Text>
                {rule.created_at && (
                  <Text size="sm"><Text span fw={600}>Created:</Text> {new Date(rule.created_at).toLocaleDateString()}</Text>
                )}
                {rule.updated_at && (
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {new Date(rule.updated_at).toLocaleDateString()}</Text>
                )}
              </Stack>
            </Paper>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
