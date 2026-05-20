import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Tabs, TextInput, Textarea, Select, Switch, Button, Modal,
  Table, Badge, Group, Paper, ActionIcon, Text, Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';
import { appEngineApi } from '../../../api/app-engine.api';

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' },
  { value: 'violet', label: 'Violet' },
  { value: 'teal', label: 'Teal' },
];

const PAGE_TYPES = [
  { value: 'list', label: 'List' },
  { value: 'form', label: 'Form' },
  { value: 'dashboard', label: 'Dashboard' },
];

interface AppTable {
  id: string;
  name: string;
  label: string;
  number_prefix?: string;
  columns?: unknown[];
  db_table_created?: boolean;
  icon?: string;
}

interface AppPage {
  id: string;
  title: string;
  type: string;
  table_id?: string;
  config?: Record<string, unknown>;
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout?: unknown[];
  is_default?: boolean;
}

const emptyTable = { name: '', label: '', number_prefix: '', icon: '' };
const emptyPage = { title: '', type: 'list', table_id: '', config: '{}' };

export function AppDesigner() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Overview form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('blue');
  const [active, setActive] = useState(true);

  // Table modal
  const [tableModal, setTableModal] = useState(false);
  const [tableForm, setTableForm] = useState({ ...emptyTable });

  // Page modal
  const [pageModal, setPageModal] = useState(false);
  const [pageForm, setPageForm] = useState({ ...emptyPage });
  const [editPageId, setEditPageId] = useState<string | null>(null);

  const { data: app, isLoading } = useQuery({
    queryKey: ['app-engine-app', appId],
    queryFn: () => appEngineApi.getApp(appId!),
    enabled: !!appId,
  });

  const { data: tables = [] } = useQuery<AppTable[]>({
    queryKey: ['app-engine-tables', appId],
    queryFn: () => appEngineApi.listTables({ app_id: appId }),
    enabled: !!appId,
  });

  const { data: pages = [] } = useQuery<AppPage[]>({
    queryKey: ['app-engine-pages', appId],
    queryFn: () => appEngineApi.listPages(appId!),
    enabled: !!appId,
  });

  const { data: dashboards = [] } = useQuery<Dashboard[]>({
    queryKey: ['app-engine-dashboards', appId],
    queryFn: () => appEngineApi.listDashboards({ app_id: appId }),
    enabled: !!appId,
  });

  useEffect(() => {
    if (app) {
      setName(app.name || '');
      setSlug(app.slug || '');
      setDescription(app.description || '');
      setIcon(app.icon || '');
      setColor(app.color || 'blue');
      setActive(app.active ?? true);
    }
  }, [app]);

  // Mutations
  const updateAppMutation = useMutation({
    mutationFn: () => appEngineApi.updateApp(appId!, { name, slug, description, icon, color, active }),
    onSuccess: () => {
      notifications.show({ title: 'Saved', message: 'App updated', color: 'green' });
      qc.invalidateQueries({ queryKey: ['app-engine-app', appId] });
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' }),
  });

  const createTableMutation = useMutation({
    mutationFn: () => appEngineApi.createTable({ ...tableForm, app_id: appId }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Table created', color: 'green' });
      qc.invalidateQueries({ queryKey: ['app-engine-tables', appId] });
      setTableModal(false);
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Create failed', color: 'red' }),
  });

  const savePageMutation = useMutation({
    mutationFn: () => {
      let config: Record<string, unknown> = {};
      try { config = JSON.parse(pageForm.config); } catch { /* empty */ }
      const payload = { title: pageForm.title, type: pageForm.type, table_id: pageForm.table_id || undefined, config, app_id: appId };
      return editPageId ? appEngineApi.updatePage(editPageId, payload) : appEngineApi.createPage(payload);
    },
    onSuccess: () => {
      notifications.show({ title: 'Saved', message: `Page ${editPageId ? 'updated' : 'created'}`, color: 'green' });
      qc.invalidateQueries({ queryKey: ['app-engine-pages', appId] });
      setPageModal(false);
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' }),
  });

  const deletePageMutation = useMutation({
    mutationFn: (id: string) => appEngineApi.deletePage(id),
    onSuccess: () => {
      notifications.show({ title: 'Deleted', message: 'Page removed', color: 'green' });
      qc.invalidateQueries({ queryKey: ['app-engine-pages', appId] });
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Delete failed', color: 'red' }),
  });

  const openAddTable = () => {
    setTableForm({ ...emptyTable });
    setTableModal(true);
  };

  const openAddPage = () => {
    setEditPageId(null);
    setPageForm({ ...emptyPage });
    setPageModal(true);
  };

  const openEditPage = (page: AppPage) => {
    setEditPageId(page.id);
    setPageForm({
      title: page.title,
      type: page.type,
      table_id: page.table_id || '',
      config: JSON.stringify(page.config || {}, null, 2),
    });
    setPageModal(true);
  };

  const setTF = (key: string, val: unknown) => setTableForm((f) => ({ ...f, [key]: val }));
  const setPF = (key: string, val: unknown) => setPageForm((f) => ({ ...f, [key]: val }));

  if (isLoading) return <Loader />;

  const tableSelectData = tables.map((t) => ({ value: t.id, label: t.label || t.name }));

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2} className="page-title">{app?.name || 'App Designer'}</Title>
        <Button variant="subtle" onClick={() => navigate('/admin/app-engine')}>Back to Apps</Button>
      </Group>

      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="tables">Tables</Tabs.Tab>
          <Tabs.Tab value="pages">Pages</Tabs.Tab>
          <Tabs.Tab value="dashboards">Dashboards</Tabs.Tab>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Panel value="overview" pt="md">
          <Paper p="md" withBorder className="glass-panel">
            <Stack gap="sm">
              <TextInput label="Name" required value={name} onChange={(e) => setName(e.currentTarget.value)} />
              <TextInput label="Slug" value={slug} onChange={(e) => setSlug(e.currentTarget.value)} />
              <Textarea label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
              <TextInput label="Icon" value={icon} onChange={(e) => setIcon(e.currentTarget.value)} />
              <Select label="Color" data={COLOR_OPTIONS} value={color} onChange={(v) => setColor(v || 'blue')} />
              <Switch label="Active" checked={active} onChange={(e) => setActive(e.currentTarget.checked)} />
              <Group justify="flex-end">
                <Button className="gradient-btn" onClick={() => updateAppMutation.mutate()} loading={updateAppMutation.isPending}>Save</Button>
              </Group>
            </Stack>
          </Paper>
        </Tabs.Panel>

        {/* Tables Tab */}
        <Tabs.Panel value="tables" pt="md">
          <Stack>
            <Group justify="space-between">
              <Title order={4}>Tables ({tables.length})</Title>
              <Button size="sm" leftSection={<IconPlus size={16} />} onClick={openAddTable}>Add Table</Button>
            </Group>
            <Table className="glass-table" striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Label</Table.Th>
                  <Table.Th>Prefix</Table.Th>
                  <Table.Th>Columns</Table.Th>
                  <Table.Th>DB Created</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tables.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}><Text c="dimmed" ta="center" py="md">No tables yet</Text></Table.Td>
                  </Table.Tr>
                ) : tables.map((t) => (
                  <Table.Tr
                    key={t.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/app-engine/tables/${t.id}`)}
                  >
                    <Table.Td><Text fw={500} size="sm">{t.name}</Text></Table.Td>
                    <Table.Td>{t.label}</Table.Td>
                    <Table.Td>{t.number_prefix || '-'}</Table.Td>
                    <Table.Td>{t.columns?.length ?? 0}</Table.Td>
                    <Table.Td>
                      <Badge color={t.db_table_created ? 'green' : 'gray'}>
                        {t.db_table_created ? 'Yes' : 'No'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Tabs.Panel>

        {/* Pages Tab */}
        <Tabs.Panel value="pages" pt="md">
          <Stack>
            <Group justify="space-between">
              <Title order={4}>Pages ({pages.length})</Title>
              <Button size="sm" leftSection={<IconPlus size={16} />} onClick={openAddPage}>Add Page</Button>
            </Group>
            <Table className="glass-table" striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Table</Table.Th>
                  <Table.Th w={100}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pages.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={4}><Text c="dimmed" ta="center" py="md">No pages yet</Text></Table.Td>
                  </Table.Tr>
                ) : pages.map((p) => (
                  <Table.Tr key={p.id}>
                    <Table.Td><Text fw={500} size="sm">{p.title}</Text></Table.Td>
                    <Table.Td><Badge variant="light">{p.type}</Badge></Table.Td>
                    <Table.Td>{tables.find((t) => t.id === p.table_id)?.label || p.table_id || '-'}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" onClick={() => openEditPage(p)} title="Edit">
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => deletePageMutation.mutate(p.id)} title="Delete">
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Tabs.Panel>

        {/* Dashboards Tab */}
        <Tabs.Panel value="dashboards" pt="md">
          <Stack>
            <Group justify="space-between">
              <Title order={4}>Dashboards ({dashboards.length})</Title>
              <Button
                size="sm"
                leftSection={<IconPlus size={16} />}
                onClick={async () => {
                  try {
                    const d = await appEngineApi.createDashboard({ name: 'New Dashboard', app_id: appId, layout: [] });
                    navigate(`/admin/app-engine/dashboards/${d.id}`);
                  } catch (err: any) {
                    notifications.show({ title: 'Error', message: err.response?.data?.error || 'Create failed', color: 'red' });
                  }
                }}
              >
                New Dashboard
              </Button>
            </Group>
            <Table className="glass-table" striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Widgets</Table.Th>
                  <Table.Th>Default</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {dashboards.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={3}><Text c="dimmed" ta="center" py="md">No dashboards yet</Text></Table.Td>
                  </Table.Tr>
                ) : dashboards.map((d) => (
                  <Table.Tr
                    key={d.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/app-engine/dashboards/${d.id}`)}
                  >
                    <Table.Td><Text fw={500} size="sm">{d.name}</Text></Table.Td>
                    <Table.Td>{d.layout?.length ?? 0}</Table.Td>
                    <Table.Td>
                      <Badge color={d.is_default ? 'green' : 'gray'}>
                        {d.is_default ? 'Yes' : 'No'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Add Table Modal */}
      <Modal opened={tableModal} onClose={() => setTableModal(false)} title="Add Table">
        <Stack>
          <TextInput
            label="Name"
            required
            description='Use "x_" prefix for custom tables'
            value={tableForm.name}
            onChange={(e) => setTF('name', e.currentTarget.value)}
          />
          <TextInput label="Label" required value={tableForm.label} onChange={(e) => setTF('label', e.currentTarget.value)} />
          <TextInput label="Number Prefix" placeholder="e.g. INC, REQ" value={tableForm.number_prefix} onChange={(e) => setTF('number_prefix', e.currentTarget.value)} />
          <TextInput label="Icon" placeholder="e.g. IconTable" value={tableForm.icon} onChange={(e) => setTF('icon', e.currentTarget.value)} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setTableModal(false)}>Cancel</Button>
            <Button onClick={() => createTableMutation.mutate()} loading={createTableMutation.isPending} disabled={!tableForm.name || !tableForm.label}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Page Modal */}
      <Modal opened={pageModal} onClose={() => setPageModal(false)} title={editPageId ? 'Edit Page' : 'Add Page'}>
        <Stack>
          <TextInput label="Title" required value={pageForm.title} onChange={(e) => setPF('title', e.currentTarget.value)} />
          <Select label="Type" required data={PAGE_TYPES} value={pageForm.type} onChange={(v) => setPF('type', v)} />
          <Select
            label="Table"
            data={tableSelectData}
            value={pageForm.table_id}
            onChange={(v) => setPF('table_id', v)}
            clearable
          />
          <Textarea
            label="Config (JSON)"
            minRows={4}
            autosize
            value={pageForm.config}
            onChange={(e) => setPF('config', e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setPageModal(false)}>Cancel</Button>
            <Button className="gradient-btn" onClick={() => savePageMutation.mutate()} loading={savePageMutation.isPending} disabled={!pageForm.title}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
