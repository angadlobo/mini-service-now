import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Title, Paper, TextInput, PasswordInput, Button, Group, Stack, Divider, Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { settingsApi } from '../../api/common.api';
import type { SystemSetting } from '@shared/interfaces';

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  auth: 'Authentication',
  email: 'Email',
  slack: 'Slack',
  ai: 'AI',
};

const CATEGORY_ORDER = ['general', 'auth', 'email', 'slack', 'ai'];

export function SystemSettings() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: settingsApi.getAll,
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s) => {
        map[s.key] = s.value ?? '';
      });
      setValues(map);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (payload: { key: string; value: string }[]) => settingsApi.update(payload),
    onSuccess: () => {
      notifications.show({ title: 'Saved', message: 'Settings updated successfully', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save settings', color: 'red' });
    },
  });

  const grouped = (settings || []).reduce<Record<string, SystemSetting[]>>((acc, s) => {
    const cat = s.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveCategory = (category: string) => {
    const catSettings = grouped[category] || [];
    const payload = catSettings.map((s) => ({ key: s.key, value: values[s.key] ?? '' }));
    updateMutation.mutate(payload);
  };

  const categories = CATEGORY_ORDER.filter((c) => grouped[c]?.length);
  const extraCategories = Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c));

  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <Title order={2} mb="lg">System Settings</Title>
        <Text c="dimmed">Loading settings...</Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="lg">System Settings</Title>

      <Stack gap="lg">
        {[...categories, ...extraCategories].map((category) => (
          <Paper key={category} shadow="xs" p="lg" radius="md" withBorder>
            <Title order={4} mb="xs">{CATEGORY_LABELS[category] || category}</Title>
            <Divider mb="md" />

            <Stack gap="sm">
              {grouped[category].map((setting) => {
                const InputComponent = setting.encrypted ? PasswordInput : TextInput;
                return (
                  <InputComponent
                    key={setting.key}
                    label={setting.key}
                    description={setting.description || undefined}
                    value={values[setting.key] ?? ''}
                    onChange={(e) => handleChange(setting.key, e.currentTarget.value)}
                  />
                );
              })}
            </Stack>

            <Group justify="flex-end" mt="md">
              <Button
                onClick={() => handleSaveCategory(category)}
                loading={updateMutation.isPending}
              >
                Save {CATEGORY_LABELS[category] || category}
              </Button>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Container>
  );
}
