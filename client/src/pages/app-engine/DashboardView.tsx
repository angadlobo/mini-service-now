import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Stack,
  Title,
  Text,
  Paper,
  SimpleGrid,
  LoadingOverlay,
  Center,
  Table,
} from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { appEngineApi } from '../../api/app-engine.api';
import type { AppEngineDashboard, WidgetConfig } from '@shared/interfaces';

const COLORS = ['#228be6', '#40c057', '#fab005', '#fa5252', '#7950f2', '#15aabf'];

// --- Individual Widget component ---
function DashboardWidget({
  widget,
  dashboardId,
}: {
  widget: WidgetConfig;
  dashboardId: string;
}) {
  const { data: widgetData, isLoading } = useQuery({
    queryKey: ['widget-data', dashboardId, widget.id],
    queryFn: () => appEngineApi.getWidgetData(dashboardId, widget.id),
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <Center mih={120}>
          <LoadingOverlay visible />
        </Center>
      );
    }

    if (!widgetData) {
      return (
        <Center mih={80}>
          <Text c="dimmed" size="sm">No data</Text>
        </Center>
      );
    }

    switch (widget.type) {
      case 'stat_card':
        return (
          <Stack align="center" gap="xs" py="md">
            <Text
              size="2.5rem"
              fw={700}
              c={widget.color || undefined}
            >
              {widgetData.value ?? 0}
            </Text>
          </Stack>
        );

      case 'bar_chart': {
        const chartData: Record<string, unknown>[] = widgetData.data ?? [];
        const groupField = widget.group_by || 'name';
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <XAxis dataKey={groupField} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS[0]}>
                {chartData.map((_: unknown, index: number) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case 'pie_chart': {
        const chartData: Record<string, unknown>[] = widgetData.data ?? [];
        const nameField = widget.group_by || 'name';
        return (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey={nameField}
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {chartData.map((_: unknown, index: number) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case 'line_chart': {
        const chartData: Record<string, unknown>[] = widgetData.data ?? [];
        const xField = widget.group_by || 'name';
        const yField = widget.value_field || 'count';
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <XAxis dataKey={xField} />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey={yField}
                stroke={COLORS[0]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      }

      case 'table':
      case 'list': {
        const rows: Record<string, unknown>[] = widgetData.data ?? [];
        if (rows.length === 0) {
          return (
            <Text c="dimmed" ta="center" py="md">
              No data
            </Text>
          );
        }
        // Determine columns from widget config or from data keys
        const columnKeys: string[] =
          widget.columns && widget.columns.length > 0
            ? widget.columns
            : rows.length > 0
              ? Object.keys(rows[0])
              : [];

        return (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {columnKeys.map((key) => (
                  <Table.Th key={key}>{key}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row, rowIndex) => (
                <Table.Tr key={rowIndex}>
                  {columnKeys.map((key) => (
                    <Table.Td key={key}>
                      {row[key] != null ? String(row[key]) : '-'}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        );
      }

      default:
        return (
          <Text c="dimmed" ta="center" py="md">
            Unsupported widget type: {widget.type}
          </Text>
        );
    }
  };

  return (
    <Paper
      withBorder
      p="md"
      pos="relative"
      style={{ gridColumn: `span ${widget.col_span}` }}
    >
      <Text fw={600} mb="sm">
        {widget.title}
      </Text>
      {renderContent()}
    </Paper>
  );
}

// --- Main Dashboard View ---
export function DashboardView() {
  const { dashboardId } = useParams<{ dashboardId: string }>();

  const { data: dashboard, isLoading } = useQuery<AppEngineDashboard>({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => appEngineApi.getDashboard(dashboardId!),
    enabled: !!dashboardId,
  });

  if (isLoading) {
    return (
      <Paper pos="relative" mih={300}>
        <LoadingOverlay visible />
      </Paper>
    );
  }

  if (!dashboard) {
    return (
      <Center mih={300}>
        <Text size="lg" c="dimmed">
          Dashboard not found.
        </Text>
      </Center>
    );
  }

  // Sort widgets by row_order
  const sortedWidgets = [...(dashboard.layout ?? [])].sort(
    (a, b) => a.row_order - b.row_order,
  );

  return (
    <Stack>
      <Title order={2}>{dashboard.name}</Title>
      {dashboard.description && (
        <Text c="dimmed">{dashboard.description}</Text>
      )}

      <SimpleGrid cols={4}>
        {sortedWidgets.map((widget) => (
          <DashboardWidget
            key={widget.id}
            widget={widget}
            dashboardId={dashboardId!}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
