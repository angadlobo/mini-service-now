import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, TextInput, Select, NumberInput, Button, Modal, Textarea,
  Badge, Group, Paper, ActionIcon, Text, Loader, SimpleGrid, Box, Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';
import { appEngineApi } from '../../../api/app-engine.api';
import { ConditionBuilder, ConditionField } from '../../../components/common/ConditionBuilder';

const WIDGET_TYPES = [
  { value: 'stat_card', label: 'Stat Card' },
  { value: 'bar_chart', label: 'Bar Chart' },
  { value: 'pie_chart', label: 'Pie Chart' },
  { value: 'line_chart', label: 'Line Chart' },
  { value: 'table', label: 'Table' },
  { value: 'list', label: 'List' },
];

const AGGREGATE_TYPES = [
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
];

const COMMON_FILTER_FIELDS: ConditionField[] = [
  { key: 'state', label: 'State', type: 'select', operatorLabel: 'is', options: [
    { value: 'new', label: 'New' }, { value: 'in_progress', label: 'In Progress' }, { value: 'on_hold', label: 'On Hold' }, { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' },
  ], hint: 'Filter by record state.' },
  { key: 'priority', label: 'Priority', type: 'select', operatorLabel: 'is', options: [
    { value: '1', label: '1 — Critical' }, { value: '2', label: '2 — High' }, { value: '3', label: '3 — Moderate' }, { value: '4', label: '4 — Low' }, { value: '5', label: '5 — Planning' },
  ], hint: 'Filter by priority level.' },
  { key: 'assigned_to_id', label: 'Assigned To', type: 'text', operatorLabel: 'is', placeholder: 'User ID', hint: 'Filter by assigned user.' },
  { key: 'created_after', label: 'Created After', type: 'text', operatorLabel: 'is after', placeholder: 'YYYY-MM-DD', hint: 'Filter records created on/after this date.' },
  { key: 'created_before', label: 'Created Before', type: 'text', operatorLabel: 'is before', placeholder: 'YYYY-MM-DD', hint: 'Filter records created on/before this date.' },
];

interface Widget {
  id: string;
  type: string;
  title: string;
  table_name: string;
  col_span: number;
  aggregate?: string;
  aggregate_field?: string;
  group_by?: string;
  columns?: string[];
  filters?: Record<string, unknown>;
  color?: string;
  icon?: string;
}

const emptyWidget: Omit<Widget, 'id'> = {
  type: 'stat_card',
  title: '',
  table_name: '',
  col_span: 1,
  aggregate: 'count',
  aggregate_field: '',
  group_by: '',
  columns: [],
  filters: {},
  color: '',
  icon: '',
};

let widgetIdCounter = 0;
function nextWidgetId() {
  widgetIdCounter += 1;
  return `widget_${Date.now()}_${widgetIdCounter}`;
}

export function DashboardDesigner() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [widgets, setWidgets] = useState<Widget[]>([]);

  // Widget modal state
  const [widgetModal, setWidgetModal] = useState(false);
  const [widgetForm, setWidgetForm] = useState<Omit<Widget, 'id'>>({ ...emptyWidget });
  const [columnsStr, setColumnsStr] = useState('');
  const [editWidgetId, setEditWidgetId] = useState<string | null>(null);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['app-engine-dashboard', dashboardId],
    queryFn: () => appEngineApi.getDashboard(dashboardId!),
    enabled: !!dashboardId,
  });

  useEffect(() => {
    if (dashboard) {
      setName(dashboard.name || '');
      setDescription(dashboard.description || '');
      if (dashboard.layout) {
        setWidgets(
          dashboard.layout.map((w: any) => ({
            id: w.id || nextWidgetId(),
            type: w.type || 'stat_card',
            title: w.title || '',
            table_name: w.table_name || '',
            col_span: w.col_span ?? 1,
            aggregate: w.aggregate,
            aggregate_field: w.aggregate_field,
            group_by: w.group_by,
            columns: w.columns,
            filters: w.filters,
            color: w.color,
            icon: w.icon,
          }))
        );
      }
    }
  }, [dashboard]);

  const setWF = (key: string, val: unknown) => setWidgetForm((f) => ({ ...f, [key]: val }));

  const openAddWidget = () => {
    setEditWidgetId(null);
    setWidgetForm({ ...emptyWidget });
    setColumnsStr('');
    setWidgetModal(true);
  };

  const openEditWidget = (widget: Widget) => {
    setEditWidgetId(widget.id);
    setWidgetForm({
      type: widget.type,
      title: widget.title,
      table_name: widget.table_name,
      col_span: widget.col_span,
      aggregate: widget.aggregate || 'count',
      aggregate_field: widget.aggregate_field || '',
      group_by: widget.group_by || '',
      columns: widget.columns || [],
      filters: widget.filters || {},
      color: widget.color || '',
      icon: widget.icon || '',
    });
    setColumnsStr((widget.columns || []).join(', '));
    setWidgetModal(true);
  };

  const saveWidget = () => {
    const cols = columnsStr.split(',').map((s) => s.trim()).filter(Boolean);

    const widgetData: Widget = {
      id: editWidgetId || nextWidgetId(),
      ...widgetForm,
      columns: cols,
      filters: widgetForm.filters || {},
    };

    if (editWidgetId) {
      setWidgets((prev) => prev.map((w) => (w.id === editWidgetId ? widgetData : w)));
    } else {
      setWidgets((prev) => [...prev, widgetData]);
    }
    setWidgetModal(false);
  };

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      appEngineApi.updateDashboard(dashboardId!, {
        name,
        description,
        layout: widgets,
      }),
    onSuccess: () => {
      notifications.show({ title: 'Saved', message: 'Dashboard updated', color: 'green' });
      qc.invalidateQueries({ queryKey: ['app-engine-dashboard', dashboardId] });
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' }),
  });

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Dashboard Designer</Title>
        <Button variant="subtle" onClick={() => navigate(-1)}>Back</Button>
      </Group>

      <Paper p="md" withBorder>
        <Stack gap="sm">
          <TextInput label="Dashboard Name" required value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <Textarea label="Description" value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.currentTarget.value)} />
        </Stack>
      </Paper>

      <Group justify="space-between">
        <Title order={4}>Widgets ({widgets.length})</Title>
        <Button size="sm" leftSection={<IconPlus size={16} />} onClick={openAddWidget}>Add Widget</Button>
      </Group>

      {widgets.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text c="dimmed" ta="center">No widgets yet. Add a widget to build your dashboard.</Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          {widgets.map((w) => (
            <Paper key={w.id} p="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm" lineClamp={1}>{w.title || 'Untitled'}</Text>
                <Group gap={4}>
                  <ActionIcon variant="subtle" size="sm" onClick={() => openEditWidget(w)} title="Edit">
                    <IconPencil size={14} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" size="sm" color="red" onClick={() => removeWidget(w.id)} title="Delete">
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
              <Badge variant="light" size="sm" mb="xs">{w.type}</Badge>
              <Text size="xs" c="dimmed">{w.table_name || 'No table'}</Text>
              <Text size="xs" c="dimmed">Span: {w.col_span}</Text>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      <Group justify="flex-end">
        <Button variant="subtle" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!name}>
          Save Dashboard
        </Button>
      </Group>

      {/* Widget Modal */}
      <Modal
        opened={widgetModal}
        onClose={() => setWidgetModal(false)}
        title={editWidgetId ? 'Edit Widget' : 'Add Widget'}
        size="lg"
      >
        <Stack>
          <Select label="Type" required data={WIDGET_TYPES} value={widgetForm.type} onChange={(v) => setWF('type', v)} />
          <TextInput label="Title" required value={widgetForm.title} onChange={(e) => setWF('title', e.currentTarget.value)} />
          <TextInput
            label="Table Name"
            description="e.g. incidents, x_my_table"
            value={widgetForm.table_name}
            onChange={(e) => setWF('table_name', e.currentTarget.value)}
          />
          <NumberInput
            label="Column Span"
            min={1}
            max={4}
            value={widgetForm.col_span}
            onChange={(v) => setWF('col_span', v)}
          />

          {widgetForm.type === 'stat_card' && (
            <>
              <Select label="Aggregate" data={AGGREGATE_TYPES} value={widgetForm.aggregate} onChange={(v) => setWF('aggregate', v)} />
              <TextInput
                label="Aggregate Field"
                description="Field to aggregate (leave empty for count)"
                value={widgetForm.aggregate_field}
                onChange={(e) => setWF('aggregate_field', e.currentTarget.value)}
              />
            </>
          )}

          {(widgetForm.type === 'bar_chart' || widgetForm.type === 'pie_chart' || widgetForm.type === 'line_chart') && (
            <TextInput
              label="Group By"
              description="Field to group data by"
              value={widgetForm.group_by}
              onChange={(e) => setWF('group_by', e.currentTarget.value)}
            />
          )}

          {(widgetForm.type === 'table' || widgetForm.type === 'list') && (
            <TextInput
              label="Columns"
              description="Comma-separated column names"
              value={columnsStr}
              onChange={(e) => setColumnsStr(e.currentTarget.value)}
            />
          )}

          <Divider />
          <Box>
            <Text size="sm" fw={500} mb={4}>Filters</Text>
            <Text size="xs" c="dimmed" mb={8}>Optionally filter which records appear in this widget. Leave empty for all records.</Text>
            <ConditionBuilder
              fields={COMMON_FILTER_FIELDS}
              value={widgetForm.filters || {}}
              onChange={(filters) => setWF('filters', filters)}
              emptyLabel="No filters — shows all records."
            />
          </Box>

          <Group grow>
            <TextInput label="Color" placeholder="e.g. blue, #4c6ef5" value={widgetForm.color} onChange={(e) => setWF('color', e.currentTarget.value)} />
            <TextInput label="Icon" placeholder="e.g. IconChartBar" value={widgetForm.icon} onChange={(e) => setWF('icon', e.currentTarget.value)} />
          </Group>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setWidgetModal(false)}>Cancel</Button>
            <Button onClick={saveWidget} disabled={!widgetForm.title}>
              {editWidgetId ? 'Update' : 'Add'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
