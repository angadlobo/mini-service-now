import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Title, Paper, TextInput, PasswordInput, Button, Group, Stack, Divider, Text,
  Tabs, SimpleGrid, Box, ColorSwatch, UnstyledButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { settingsApi } from '../../api/common.api';
import { useUiStore } from '../../store/ui';
import type { SystemSetting } from '@shared/interfaces';

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  auth: 'Authentication',
  email: 'Email',
  slack: 'Slack',
  ai: 'AI',
  catalog: 'Service Catalog',
};

const CATEGORY_ORDER = ['general', 'auth', 'email', 'slack', 'ai', 'catalog'];

const COLOR_PALETTE = [
  { name: 'indigo', color: '#667eea', label: 'Indigo' },
  { name: 'blue', color: '#3b82f6', label: 'Blue' },
  { name: 'teal', color: '#14b8a6', label: 'Teal' },
  { name: 'green', color: '#22c55e', label: 'Green' },
  { name: 'red', color: '#ef4444', label: 'Red' },
  { name: 'orange', color: '#f97316', label: 'Orange' },
  { name: 'violet', color: '#8b5cf6', label: 'Violet' },
  { name: 'pink', color: '#ec4899', label: 'Pink' },
];

export function SystemSettings() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const { primaryColor, appName, logoUrl, setPrimaryColor, setAppName, setLogoUrl } = useUiStore();

  // Local branding state
  const [brandAppName, setBrandAppName] = useState(appName);
  const [brandColor, setBrandColor] = useState(primaryColor);
  const [brandLogoUrl, setBrandLogoUrl] = useState(logoUrl);

  useEffect(() => {
    setBrandAppName(appName);
    setBrandColor(primaryColor);
    setBrandLogoUrl(logoUrl);
  }, [appName, primaryColor, logoUrl]);

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

  const saveBrandingMutation = useMutation({
    mutationFn: () => settingsApi.update([
      { key: 'branding.app_name', value: brandAppName },
      { key: 'branding.primary_color', value: brandColor },
      { key: 'branding.logo_url', value: brandLogoUrl },
    ]),
    onSuccess: () => {
      setPrimaryColor(brandColor);
      setAppName(brandAppName);
      setLogoUrl(brandLogoUrl);
      notifications.show({ title: 'Saved', message: 'Branding updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' });
    },
  });

  const grouped = (settings || []).reduce<Record<string, SystemSetting[]>>((acc, s) => {
    const cat = s.category || 'general';
    if (cat === 'branding') return acc; // handled separately
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
        <Title order={2} mb="lg" className="page-title">System Settings</Title>
        <Text c="dimmed">Loading settings...</Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="lg" className="page-title">System Settings</Title>

      <Tabs defaultValue="branding">
        <Tabs.List>
          <Tabs.Tab value="branding">Branding</Tabs.Tab>
          <Tabs.Tab value="system">System</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="branding" pt="md">
          <Paper p="lg" withBorder className="glass-panel">
            <Title order={4} mb="xs">Branding & Appearance</Title>
            <Text size="sm" c="dimmed" mb="md">Customize the look and feel of your platform.</Text>
            <Divider mb="md" />

            <Stack gap="lg">
              <TextInput
                label="Application Name"
                description="Displayed in the header, login page, and browser tab"
                value={brandAppName}
                onChange={(e) => setBrandAppName(e.currentTarget.value)}
              />

              <div>
                <Text size="sm" fw={500} mb={4}>Primary Color</Text>
                <Text size="xs" c="dimmed" mb="sm">Choose a theme color for the entire application</Text>
                <SimpleGrid cols={8} spacing="xs">
                  {COLOR_PALETTE.map((c) => (
                    <UnstyledButton
                      key={c.name}
                      onClick={() => setBrandColor(c.name)}
                      style={{ textAlign: 'center' }}
                    >
                      <Box
                        style={{
                          padding: 3,
                          borderRadius: 12,
                          border: brandColor === c.name ? `2px solid ${c.color}` : '2px solid transparent',
                          display: 'inline-flex',
                          transition: 'all 0.2s',
                        }}
                      >
                        <ColorSwatch color={c.color} size={36} />
                      </Box>
                      <Text size="xs" mt={4} c={brandColor === c.name ? undefined : 'dimmed'} fw={brandColor === c.name ? 600 : 400}>
                        {c.label}
                      </Text>
                    </UnstyledButton>
                  ))}
                </SimpleGrid>
              </div>

              <TextInput
                label="Logo URL"
                description="Enter a URL to a logo image. Leave blank to use the default icon."
                placeholder="https://example.com/logo.png"
                value={brandLogoUrl}
                onChange={(e) => setBrandLogoUrl(e.currentTarget.value)}
              />

              {brandLogoUrl && (
                <Group>
                  <Text size="sm" fw={500}>Preview:</Text>
                  <img
                    src={brandLogoUrl}
                    alt="Logo preview"
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', border: '1px solid #eee' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </Group>
              )}

              <Group justify="flex-end">
                <Button
                  className="gradient-btn"
                  onClick={() => saveBrandingMutation.mutate()}
                  loading={saveBrandingMutation.isPending}
                >
                  Save Branding
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="system" pt="md">
          <Stack gap="lg">
            {[...categories, ...extraCategories].map((category) => (
              <Paper key={category} p="lg" withBorder className="glass-panel">
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
                    className="gradient-btn"
                    onClick={() => handleSaveCategory(category)}
                    loading={updateMutation.isPending}
                  >
                    Save {CATEGORY_LABELS[category] || category}
                  </Button>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
